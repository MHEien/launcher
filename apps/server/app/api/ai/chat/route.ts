/**
 * AI Chat Handler - Streaming chat endpoint with Vercel AI SDK
 */

import { NextRequest, NextResponse } from "next/server";
import { streamText, tool, type CoreMessage, type CoreTool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

import { getModelById, isModelAvailable, getDefaultModel } from "@/lib/ai/models";
import { executeBuiltinTool, isBuiltinTool, getToolsForTier } from "@/lib/ai/tools";
import type { ChatMessage, ChatRequest, ToolDefinition } from "@/lib/ai/types";
import { getAuthUser } from "@/lib/auth";
import { checkUsageLimit, trackUsage } from "@/lib/usage";

// Initialize AI providers
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

/**
 * Get the AI model instance based on model ID
 */
function getModelInstance(modelId: string) {
  const modelConfig = getModelById(modelId);
  if (!modelConfig) {
    // Default to GPT-4o-mini
    return openai("gpt-4o-mini");
  }

  switch (modelConfig.provider) {
    case "openai":
      return openai(modelConfig.id);
    case "anthropic":
      return anthropic(modelConfig.id);
    case "google":
      return google(modelConfig.id);
    default:
      return openai("gpt-4o-mini");
  }
}

/**
 * Convert chat messages to CoreMessage format for AI SDK
 */
function convertMessages(messages: ChatMessage[]): CoreMessage[] {
  return messages.map((msg) => {
    if (msg.role === "tool") {
      return {
        role: "tool" as const,
        content: [
          {
            type: "tool-result" as const,
            toolCallId: msg.toolCallId || "",
            toolName: msg.toolName || "",
            result: msg.content,
          },
        ],
      };
    }
    return {
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
    };
  });
}

/**
 * Build Zod schema from tool parameter definition
 */
function buildZodSchema(toolDef: ToolDefinition) {
  const parameters: Record<string, z.ZodTypeAny> = {};
  
  for (const [key, prop] of Object.entries(toolDef.parameters.properties)) {
    let zodType: z.ZodTypeAny;
    
    switch (prop.type) {
      case "string":
        zodType = prop.enum 
          ? z.enum(prop.enum as [string, ...string[]])
          : z.string();
        break;
      case "number":
        zodType = z.number();
        break;
      case "boolean":
        zodType = z.boolean();
        break;
      case "array":
        zodType = z.array(z.unknown());
        break;
      default:
        zodType = z.unknown();
    }
    
    if (prop.description) {
      zodType = zodType.describe(prop.description);
    }
    
    // Make optional if not required
    if (!toolDef.parameters.required?.includes(key)) {
      zodType = zodType.optional();
    }
    
    parameters[key] = zodType;
  }
  
  return z.object(parameters);
}

/**
 * Build tools object for AI SDK from tool definitions
 * Only includes built-in tools with execute functions
 */
function buildTools(toolDefs: ToolDefinition[]): Record<string, CoreTool> {
  const tools: Record<string, CoreTool> = {};

  for (const toolDef of toolDefs) {
    // Only include built-in tools that we can execute server-side
    if (isBuiltinTool(toolDef.name)) {
      tools[toolDef.name] = tool({
        description: toolDef.description,
        parameters: buildZodSchema(toolDef),
        execute: async (args) => {
          return await executeBuiltinTool(toolDef.name, args as Record<string, unknown>);
        },
      });
    } else {
      // For plugin tools, create tool without execute
      // They will be returned as tool calls for client-side execution
      tools[toolDef.name] = tool({
        description: toolDef.description,
        parameters: buildZodSchema(toolDef),
      });
    }
  }

  return tools;
}

/**
 * Build system prompt with context
 */
function buildSystemPrompt(context?: ChatRequest["context"]): string {
  let systemPrompt = `You are an intelligent AI assistant integrated into a desktop launcher application. You help users with tasks, answer questions, and can execute actions through tools.

Key capabilities:
- Answer questions and provide information
- Execute built-in tools (web search, calculations, time)
- Trigger plugin tools that run on the user's device
- Help with productivity tasks

Guidelines:
- Be concise but helpful
- Use tools when they would help answer the question
- For file operations, system commands, or plugin actions, use the appropriate tools
- Format code with proper syntax highlighting using markdown code blocks
- When showing files, use descriptive names`;

  if (context?.files?.length) {
    systemPrompt += `\n\nRelevant files from user's system:\n${context.files.join("\n")}`;
  }

  if (context?.apps?.length) {
    systemPrompt += `\n\nInstalled applications:\n${context.apps.join("\n")}`;
  }

  return systemPrompt;
}

export async function POST(request: NextRequest) {
  // Validate authentication
  const session = await getAuthUser();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check usage limit before processing
  const usageCheck = await checkUsageLimit(session.userId, "ai_query", session.tier);
  
  if (!usageCheck.allowed) {
    return NextResponse.json(
      { 
        error: "Usage limit exceeded",
        message: `You have reached your monthly AI query limit (${usageCheck.limit}). Upgrade your plan for more queries.`,
        remaining: 0,
        limit: usageCheck.limit,
      },
      { status: 429 }
    );
  }

  // Parse request body
  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { messages, model: requestedModel, tools: clientTools, context } = body;

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "Messages are required" }, { status: 400 });
  }

  // Determine which model to use
  let modelId = requestedModel || getDefaultModel(session.tier).id;
  
  // Check if user has access to the requested model
  if (!isModelAvailable(modelId, session.tier)) {
    // Fall back to default model for their tier
    modelId = getDefaultModel(session.tier).id;
  }

  const modelInstance = getModelInstance(modelId);

  // Build tools - filter built-in tools by tier, then add client-provided plugin tools
  const tierTools = getToolsForTier(session.tier);
  const allTools = [...tierTools];
  if (clientTools) {
    allTools.push(...clientTools);
  }
  const tools = buildTools(allTools);

  // Build system prompt with context
  const systemPrompt = buildSystemPrompt(context);

  // Convert messages
  const coreMessages = convertMessages(messages);

  // Add system message at the beginning
  const messagesWithSystem: CoreMessage[] = [
    { role: "system", content: systemPrompt },
    ...coreMessages,
  ];

  // Stream the response using Response with ReadableStream
  const encoder = new TextEncoder();
  
  // Track tool calls for usage metadata
  const toolCallsUsed: { name: string; isBuiltin: boolean; pluginId?: string }[] = [];
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = streamText({
          model: modelInstance,
          messages: messagesWithSystem,
          tools: Object.keys(tools).length > 0 ? tools : undefined,
          maxSteps: 5, // Allow multi-step tool use
          onStepFinish: async ({ toolCalls, toolResults }) => {
            // Send tool call events and track tool usage
            if (toolCalls && toolCalls.length > 0) {
              for (const toolCall of toolCalls) {
                // Track tool call for usage metadata
                const builtin = isBuiltinTool(toolCall.toolName);
                toolCallsUsed.push({
                  name: toolCall.toolName,
                  isBuiltin: builtin,
                  // Plugin ID would come from the tool definition source
                  pluginId: builtin ? undefined : toolCall.toolName.split(":")[0],
                });
                
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({
                    type: "tool_call",
                    toolCall: {
                      id: toolCall.toolCallId,
                      name: toolCall.toolName,
                      arguments: toolCall.args,
                    },
                  })}\n\n`
                ));
              }
            }
            
            // Send tool result events
            if (toolResults && toolResults.length > 0) {
              for (const tr of toolResults) {
                const toolResultAny = tr as { toolCallId?: string; result?: unknown };
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({
                    type: "tool_result",
                    toolResult: {
                      toolCallId: toolResultAny.toolCallId || "",
                      result: toolResultAny.result,
                    },
                  })}\n\n`
                ));
              }
            }
          },
        });

        // Stream text chunks
        for await (const chunk of result.textStream) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`
          ));
        }

        // Get final usage stats
        const usage = await result.usage;
        
        // Build tool usage summary
        const builtinToolsCalled = toolCallsUsed.filter(t => t.isBuiltin).map(t => t.name);
        const pluginToolsCalled = toolCallsUsed.filter(t => !t.isBuiltin).map(t => t.name);
        
        // Track usage after successful completion
        try {
          await trackUsage(session.userId, "ai_query", 1, {
            model: modelId,
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
            toolsUsed: {
              builtin: builtinToolsCalled,
              plugin: pluginToolsCalled,
              totalCalls: toolCallsUsed.length,
            },
          });
        } catch (trackError) {
          console.error("Failed to track usage:", trackError);
          // Don't fail the request if tracking fails
        }
        
        // Send completion event with remaining usage info
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: "done",
            usage: {
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
            },
            remaining: usageCheck.remaining > 0 ? usageCheck.remaining - 1 : 0,
          })}\n\n`
        ));

        controller.close();
        
      } catch (error) {
        console.error("Chat streaming error:", error);
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "An error occurred",
          })}\n\n`
        ));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}


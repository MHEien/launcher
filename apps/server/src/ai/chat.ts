/**
 * AI Chat Handler - Streaming chat endpoint with Vercel AI SDK
 */

import { streamText, tool, type CoreMessage, type CoreTool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import type { Context } from "hono";

import { getModelById, getModelsForTier, isModelAvailable, getDefaultModel } from "./models";
import { builtinTools, executeBuiltinTool, isBuiltinTool } from "./tools";
import type { ChatMessage, ChatRequest, ToolDefinition, UserSession } from "./types";

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

/**
 * Validate user session and extract tier info
 * In production, this would validate the auth token
 */
async function validateSession(authHeader: string | undefined): Promise<UserSession | null> {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  
  // TODO: Validate token with your auth provider
  // For now, decode a simple JWT-like structure or use a test user
  
  // Placeholder: In production, validate against your auth service
  if (token === "test-free") {
    return { userId: "test-free", tier: "free", limits: { aiQueriesPerMonth: 50, aiEmbeddingsPerMonth: 100, maxPlugins: 5 } };
  }
  if (token === "test-pro") {
    return { userId: "test-pro", tier: "pro", limits: { aiQueriesPerMonth: 1000, aiEmbeddingsPerMonth: 5000, maxPlugins: 50 } };
  }
  if (token === "test-pro-plus") {
    return { userId: "test-pro-plus", tier: "pro_plus", limits: { aiQueriesPerMonth: 10000, aiEmbeddingsPerMonth: 50000, maxPlugins: -1 } };
  }

  // Default to free tier for any valid-looking token
  // In production, properly validate and extract user info
  if (token.length > 10) {
    return { userId: "user", tier: "free", limits: { aiQueriesPerMonth: 50, aiEmbeddingsPerMonth: 100, maxPlugins: 5 } };
  }

  return null;
}

/**
 * Chat endpoint handler - streams AI responses
 */
export async function chatHandler(c: Context) {
  // Validate authentication
  const session = await validateSession(c.req.header("Authorization"));
  
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Parse request body
  let body: ChatRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }

  const { messages, model: requestedModel, tools: clientTools, context } = body;

  if (!messages || messages.length === 0) {
    return c.json({ error: "Messages are required" }, 400);
  }

  // Determine which model to use
  let modelId = requestedModel || getDefaultModel(session.tier).id;
  
  // Check if user has access to the requested model
  if (!isModelAvailable(modelId, session.tier)) {
    // Fall back to default model for their tier
    modelId = getDefaultModel(session.tier).id;
  }

  const modelInstance = getModelInstance(modelId);

  // Build tools - combine built-in tools with any client-provided plugin tools
  const allTools = [...builtinTools];
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

  // Set SSE headers
  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");

  // Stream the response using Response with ReadableStream
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = streamText({
          model: modelInstance,
          messages: messagesWithSystem,
          tools: Object.keys(tools).length > 0 ? tools : undefined,
          maxSteps: 5, // Allow multi-step tool use
          onStepFinish: async ({ toolCalls, toolResults }) => {
            // Send tool call events
            if (toolCalls && toolCalls.length > 0) {
              for (const toolCall of toolCalls) {
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
        
        // Send completion event
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: "done",
            usage: {
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
            },
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

/**
 * Models endpoint handler - returns available models for the user's tier
 */
export async function modelsHandler(c: Context) {
  // Validate authentication
  const session = await validateSession(c.req.header("Authorization"));
  
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const models = getModelsForTier(session.tier);
  const defaultModel = getDefaultModel(session.tier);

  return c.json({
    models: models.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      description: m.description,
      supportsTools: m.supportsTools,
    })),
    default: defaultModel.id,
    tier: session.tier,
  });
}


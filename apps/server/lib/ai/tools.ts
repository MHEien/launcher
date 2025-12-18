/**
 * Built-in AI Tools - Server-side tools that don't require plugin context
 */

import { z } from "zod";
import type { ToolDefinition, ModelTier } from "./types";

// Define built-in tools with Zod schemas for validation
export const toolSchemas = {
  web_search: z.object({
    query: z.string().describe("The search query"),
    num_results: z.number().optional().default(5).describe("Number of results to return"),
  }),
  
  get_current_time: z.object({
    timezone: z.string().optional().describe("Timezone (e.g., 'America/New_York')"),
  }),
  
  calculate: z.object({
    expression: z.string().describe("Mathematical expression to evaluate"),
  }),
  
  generate_code: z.object({
    language: z.string().describe("Programming language"),
    description: z.string().describe("What the code should do"),
  }),
};

// Tier requirements for each tool
// Tools not listed here are available to all tiers
const TOOL_TIER_REQUIREMENTS: Record<string, ModelTier[]> = {
  // Free tier tools - available to everyone
  get_current_time: ["free", "pro", "pro_plus"],
  calculate: ["free", "pro", "pro_plus"],
  // Pro and Pro+ tier tools
  web_search: ["pro", "pro_plus"],
  generate_code: ["pro", "pro_plus"],
};

// Tool definitions for the AI model
export const builtinTools: ToolDefinition[] = [
  {
    name: "web_search",
    description: "Search the web for information. Use this when the user asks about current events, facts, or needs up-to-date information.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
        num_results: { type: "number", description: "Number of results to return (default: 5)" },
      },
      required: ["query"],
    },
    source: "builtin",
  },
  {
    name: "get_current_time",
    description: "Get the current date and time, optionally in a specific timezone.",
    parameters: {
      type: "object",
      properties: {
        timezone: { type: "string", description: "Timezone (e.g., 'America/New_York', 'Europe/London')" },
      },
    },
    source: "builtin",
  },
  {
    name: "calculate",
    description: "Evaluate a mathematical expression. Supports basic arithmetic, trigonometry, logarithms, etc.",
    parameters: {
      type: "object",
      properties: {
        expression: { type: "string", description: "Mathematical expression to evaluate (e.g., '2 + 2 * 3')" },
      },
      required: ["expression"],
    },
    source: "builtin",
  },
  {
    name: "generate_code",
    description: "Generate code in a specific programming language based on a description.",
    parameters: {
      type: "object",
      properties: {
        language: { type: "string", description: "Programming language (e.g., 'python', 'javascript', 'rust')" },
        description: { type: "string", description: "What the code should do" },
      },
      required: ["language", "description"],
    },
    source: "builtin",
  },
];

/**
 * Check if a tool is available for a given tier
 */
export function isToolAvailableForTier(toolName: string, tier: ModelTier): boolean {
  const allowedTiers = TOOL_TIER_REQUIREMENTS[toolName];
  // If not in the requirements map, available to all tiers
  if (!allowedTiers) return true;
  return allowedTiers.includes(tier);
}

/**
 * Get all built-in tools available for a given tier
 */
export function getToolsForTier(tier: ModelTier): ToolDefinition[] {
  return builtinTools.filter((tool) => isToolAvailableForTier(tool.name, tier));
}

/**
 * Execute a built-in tool
 */
export async function executeBuiltinTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "web_search":
      return await executeWebSearch(args.query as string, args.num_results as number);
    
    case "get_current_time":
      return executeGetCurrentTime(args.timezone as string | undefined);
    
    case "calculate":
      return executeCalculate(args.expression as string);
    
    case "generate_code":
      // This is a placeholder - in production, you might use the AI to generate code
      return `Code generation for ${args.language}: ${args.description}\n\n// Generated code would appear here`;
    
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

/**
 * Web search implementation
 * In production, this would use a real search API (Tavily, Serper, etc.)
 */
async function executeWebSearch(query: string, numResults: number = 5): Promise<string> {
  // Placeholder implementation - in production, integrate with a search API
  // For now, return a message indicating this needs an API key
  
  // Check if we have a search API key
  const searchApiKey = process.env.TAVILY_API_KEY || process.env.SERPER_API_KEY;
  
  if (!searchApiKey) {
    return JSON.stringify({
      note: "Web search is not configured. Please set TAVILY_API_KEY or SERPER_API_KEY.",
      query,
      results: [],
    });
  }
  
  // If using Tavily
  if (process.env.TAVILY_API_KEY) {
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query,
          max_results: numResults,
          include_answer: true,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Search API error: ${response.status}`);
      }
      
      const data = await response.json();
      return JSON.stringify({
        query,
        answer: data.answer,
        results: data.results?.map((r: { title: string; url: string; content: string }) => ({
          title: r.title,
          url: r.url,
          snippet: r.content,
        })) || [],
      });
    } catch (error) {
      return JSON.stringify({
        error: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        query,
      });
    }
  }
  
  return JSON.stringify({
    note: "Search API not fully configured",
    query,
    results: [],
  });
}

/**
 * Get current time implementation
 */
function executeGetCurrentTime(timezone?: string): string {
  try {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      dateStyle: "full",
      timeStyle: "long",
      timeZone: timezone || "UTC",
    };
    
    const formatted = new Intl.DateTimeFormat("en-US", options).format(now);
    
    return JSON.stringify({
      formatted,
      iso: now.toISOString(),
      timezone: timezone || "UTC",
      unix: Math.floor(now.getTime() / 1000),
    });
  } catch {
    return JSON.stringify({
      error: `Invalid timezone: ${timezone}`,
      formatted: new Date().toISOString(),
    });
  }
}

/**
 * Calculate mathematical expression
 */
function executeCalculate(expression: string): string {
  try {
    // Basic safe math evaluation
    // In production, use a proper math library like mathjs
    const sanitized = expression.replace(/[^0-9+\-*/().%\s^]/g, "");
    
    // Replace ^ with ** for exponentiation
    const jsExpression = sanitized.replace(/\^/g, "**");
    
    // Use Function constructor for safer eval
    const result = new Function(`return ${jsExpression}`)();
    
    return JSON.stringify({
      expression,
      result,
      formatted: typeof result === "number" ? result.toLocaleString() : String(result),
    });
  } catch (error) {
    return JSON.stringify({
      error: `Failed to calculate: ${error instanceof Error ? error.message : "Invalid expression"}`,
      expression,
    });
  }
}

/**
 * Get tool definition by name
 */
export function getBuiltinTool(name: string): ToolDefinition | undefined {
  return builtinTools.find((tool) => tool.name === name);
}

/**
 * Check if a tool is a built-in tool
 */
export function isBuiltinTool(name: string): boolean {
  return builtinTools.some((tool) => tool.name === name);
}


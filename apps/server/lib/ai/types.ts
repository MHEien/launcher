/**
 * AI Types for the Server
 */

export type ModelTier = "free" | "pro" | "pro_plus";

export interface ModelConfig {
  id: string;
  name: string;
  provider: "openai" | "anthropic" | "google";
  description: string;
  contextWindow: number;
  maxOutput: number;
  supportsTools: boolean;
  supportsStreaming: boolean;
  tiers: ModelTier[];
}

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCallId?: string;
  toolName?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
  // Source of the tool - "builtin" or plugin ID
  source: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  result: string;
  isError?: boolean;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  tools?: ToolDefinition[];
  toolResults?: ToolResult[];
  // Context from the desktop app
  context?: {
    files?: string[];
    apps?: string[];
    query?: string;
  };
}

export interface ChatStreamChunk {
  type: "text" | "tool_call" | "tool_result" | "done" | "error";
  content?: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface UsageLimits {
  aiQueriesPerMonth: number;
  aiEmbeddingsPerMonth: number;
  maxPlugins: number;
}

export interface UserSession {
  userId: string;
  tier: ModelTier;
  limits: UsageLimits;
}


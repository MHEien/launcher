/**
 * AI Types for the Desktop App
 */

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  // Where the tool should be executed
  source: "builtin" | string; // "builtin" or plugin ID
}

export interface ToolResult {
  toolCallId: string;
  result: string;
  isError?: boolean;
}

export interface AIMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  // For tool messages
  toolCallId?: string;
  toolName?: string;
  // For assistant messages with tool calls
  toolCalls?: ToolCall[];
  // UI-specific state
  isStreaming?: boolean;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  supportsTools: boolean;
}

export interface StreamChunk {
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
  source: string;
}

export interface ChatContext {
  files?: string[];
  apps?: string[];
  query?: string;
}

export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Generative UI component types
export type GenerativeUIType =
  | "code"
  | "file"
  | "step_progress"
  | "chart"
  | "confirmation"
  | "markdown";

export interface CodeBlockData {
  language: string;
  code: string;
  filename?: string;
}

export interface FileCardData {
  path: string;
  name: string;
  size?: number;
  type?: string;
  preview?: string;
}

export interface StepProgressData {
  steps: {
    id: string;
    title: string;
    status: "pending" | "in_progress" | "completed" | "error";
    details?: string;
  }[];
  currentStep: number;
}

export interface ChartData {
  type: "bar" | "line" | "pie";
  title?: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

export interface ConfirmationData {
  title: string;
  message: string;
  action: string;
  details?: Record<string, unknown>;
  confirmed?: boolean;
}

// Union type for all generative UI data
export type GenerativeUIData =
  | { type: "code"; data: CodeBlockData }
  | { type: "file"; data: FileCardData }
  | { type: "step_progress"; data: StepProgressData }
  | { type: "chart"; data: ChartData }
  | { type: "confirmation"; data: ConfirmationData };


import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type {
  AIMessage,
  AIModel,
  ToolCall,
  ToolResult,
  StreamChunk,
  ToolDefinition,
  ChatContext,
  AIUsage,
} from "@/types/ai";

// Generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

interface AIState {
  // Chat state
  messages: AIMessage[];
  isStreaming: boolean;
  isAIMode: boolean;
  currentStreamingId: string | null;
  
  // Model state
  availableModels: AIModel[];
  selectedModel: string | null;
  
  // Tool state
  availableTools: ToolDefinition[];
  pendingToolCalls: ToolCall[];
  
  // Usage tracking
  usage: AIUsage | null;
  
  // Error state
  error: string | null;
  
  // Actions
  enterAIMode: (initialQuery: string) => Promise<void>;
  exitAIMode: () => void;
  sendMessage: (content: string) => Promise<void>;
  continueWithToolResults: (results: ToolResult[]) => Promise<void>;
  selectModel: (modelId: string) => void;
  loadModels: () => Promise<void>;
  loadPluginTools: () => Promise<void>;
  clearMessages: () => void;
  executePluginTool: (toolCall: ToolCall) => Promise<string>;
  confirmAction: (toolCallId: string, confirmed: boolean) => Promise<void>;
}

// API base URL from environment
const API_BASE = import.meta.env.LAUNCHER_API_URL || "http://localhost:3001";

export const useAIStore = create<AIState>((set, get) => ({
  // Initial state
  messages: [],
  isStreaming: false,
  isAIMode: false,
  currentStreamingId: null,
  availableModels: [],
  selectedModel: null,
  availableTools: [],
  pendingToolCalls: [],
  usage: null,
  error: null,

  enterAIMode: async (initialQuery: string) => {
    set({ isAIMode: true, messages: [], error: null });
    
    // Load models if not loaded
    if (get().availableModels.length === 0) {
      await get().loadModels();
    }
    
    // Load plugin tools
    await get().loadPluginTools();
    
    // Send the initial query
    await get().sendMessage(initialQuery);
  },

  exitAIMode: () => {
    set({
      isAIMode: false,
      messages: [],
      isStreaming: false,
      currentStreamingId: null,
      pendingToolCalls: [],
      error: null,
    });
  },

  sendMessage: async (content: string) => {
    const { messages, selectedModel, availableTools } = get();
    
    // Add user message
    const userMessage: AIMessage = {
      id: generateId(),
      role: "user",
      content,
      timestamp: Date.now(),
    };
    
    // Create streaming assistant message placeholder
    const assistantId = generateId();
    const assistantMessage: AIMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    };
    
    set({
      messages: [...messages, userMessage, assistantMessage],
      isStreaming: true,
      currentStreamingId: assistantId,
      error: null,
    });
    
    try {
      // Get auth token
      let authToken = "test-free"; // Default for testing
      try {
        authToken = await invoke<string>("get_auth_token");
      } catch {
        console.log("Using test token");
      }
      
      // Build context from indexer
      let context: ChatContext = {};
      try {
        const files = await invoke<string[]>("get_recent_files", { limit: 10 });
        const apps = await invoke<string[]>("get_indexed_apps", { limit: 10 });
        context = { files, apps, query: content };
      } catch {
        // Context is optional
      }
      
      // Prepare request
      const requestMessages = get().messages
        .filter(m => m.id !== assistantId) // Exclude the streaming placeholder
        .map(m => ({
          role: m.role,
          content: m.content,
          ...(m.toolCallId && { toolCallId: m.toolCallId }),
          ...(m.toolName && { toolName: m.toolName }),
        }));
      
      // Make streaming request
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          messages: requestMessages,
          model: selectedModel,
          tools: availableTools,
          context,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      // Process SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");
      
      const decoder = new TextDecoder();
      let buffer = "";
      const toolCalls: ToolCall[] = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            
            try {
              const chunk: StreamChunk = JSON.parse(data);
              
              switch (chunk.type) {
                case "text":
                  // Append text to the streaming message
                  set((state) => ({
                    messages: state.messages.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: m.content + (chunk.content || "") }
                        : m
                    ),
                  }));
                  break;
                  
                case "tool_call":
                  if (chunk.toolCall) {
                    toolCalls.push(chunk.toolCall);
                  }
                  break;
                  
                case "tool_result":
                  // Server-executed tool result
                  if (chunk.toolResult) {
                    const toolMsg: AIMessage = {
                      id: generateId(),
                      role: "tool",
                      content: chunk.toolResult.result,
                      timestamp: Date.now(),
                      toolCallId: chunk.toolResult.toolCallId,
                    };
                    set((state) => ({
                      messages: [...state.messages, toolMsg],
                    }));
                  }
                  break;
                  
                case "done":
                  set({ usage: chunk.usage || null });
                  break;
                  
                case "error":
                  set({ error: chunk.error || "Unknown error" });
                  break;
              }
            } catch (e) {
              console.error("Failed to parse chunk:", e);
            }
          }
        }
      }
      
      // Update assistant message with tool calls and finish streaming
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === assistantId
            ? { ...m, isStreaming: false, toolCalls: toolCalls.length > 0 ? toolCalls : undefined }
            : m
        ),
        isStreaming: false,
        currentStreamingId: null,
        pendingToolCalls: toolCalls.filter(tc => tc.source !== "builtin"),
      }));
      
      // If there are plugin tool calls, execute them
      const pluginToolCalls = toolCalls.filter(tc => tc.source !== "builtin");
      if (pluginToolCalls.length > 0) {
        const results: ToolResult[] = [];
        
        for (const toolCall of pluginToolCalls) {
          try {
            const result = await get().executePluginTool(toolCall);
            results.push({
              toolCallId: toolCall.id,
              result,
            });
          } catch (error) {
            results.push({
              toolCallId: toolCall.id,
              result: JSON.stringify({ error: String(error) }),
              isError: true,
            });
          }
        }
        
        // Continue conversation with tool results
        if (results.length > 0) {
          await get().continueWithToolResults(results);
        }
      }
      
    } catch (error) {
      console.error("AI chat error:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to send message",
        isStreaming: false,
        currentStreamingId: null,
        messages: get().messages.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m
        ),
      });
    }
  },

  continueWithToolResults: async (results: ToolResult[]) => {
    const { messages, selectedModel, availableTools } = get();
    
    // Add tool result messages
    const toolMessages: AIMessage[] = results.map((r) => ({
      id: generateId(),
      role: "tool" as const,
      content: r.result,
      timestamp: Date.now(),
      toolCallId: r.toolCallId,
    }));
    
    // Create new streaming assistant message
    const assistantId = generateId();
    const assistantMessage: AIMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    };
    
    set({
      messages: [...messages, ...toolMessages, assistantMessage],
      isStreaming: true,
      currentStreamingId: assistantId,
      pendingToolCalls: [],
    });
    
    try {
      let authToken = "test-free";
      try {
        authToken = await invoke<string>("get_auth_token");
      } catch {
        // Use test token
      }
      
      const requestMessages = get().messages
        .filter(m => m.id !== assistantId)
        .map(m => ({
          role: m.role,
          content: m.content,
          ...(m.toolCallId && { toolCallId: m.toolCallId }),
          ...(m.toolName && { toolName: m.toolName }),
        }));
      
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          messages: requestMessages,
          model: selectedModel,
          tools: availableTools,
          toolResults: results,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");
      
      const decoder = new TextDecoder();
      let buffer = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            
            try {
              const chunk: StreamChunk = JSON.parse(data);
              
              if (chunk.type === "text" && chunk.content) {
                set((state) => ({
                  messages: state.messages.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + chunk.content }
                      : m
                  ),
                }));
              } else if (chunk.type === "done") {
                set({ usage: chunk.usage || null });
              } else if (chunk.type === "error") {
                set({ error: chunk.error || "Unknown error" });
              }
            } catch {
              // Skip invalid chunks
            }
          }
        }
      }
      
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m
        ),
        isStreaming: false,
        currentStreamingId: null,
      }));
      
    } catch (error) {
      console.error("Continue with tool results error:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to continue",
        isStreaming: false,
        currentStreamingId: null,
      });
    }
  },

  selectModel: (modelId: string) => {
    set({ selectedModel: modelId });
  },

  loadModels: async () => {
    try {
      let authToken = "test-free";
      try {
        authToken = await invoke<string>("get_auth_token");
      } catch {
        // Use test token
      }
      
      const response = await fetch(`${API_BASE}/api/ai/models`, {
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load models: ${response.status}`);
      }
      
      const data = await response.json();
      set({
        availableModels: data.models,
        selectedModel: data.default,
      });
    } catch (error) {
      console.error("Failed to load models:", error);
      // Set defaults
      set({
        availableModels: [
          { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", description: "Fast and efficient", supportsTools: true },
        ],
        selectedModel: "gpt-4o-mini",
      });
    }
  },

  loadPluginTools: async () => {
    try {
      // Get tools from enabled plugins
      const pluginTools = await invoke<ToolDefinition[]>("get_plugin_ai_tools");
      
      // Fetch built-in tools from server
      const response = await fetch(`${API_BASE}/api/ai/tools`);
      let builtinTools: ToolDefinition[] = [];
      
      if (response.ok) {
        const data = await response.json();
        builtinTools = data.tools;
      }
      
      set({ availableTools: [...builtinTools, ...pluginTools] });
    } catch (error) {
      console.error("Failed to load plugin tools:", error);
      // Try to at least get built-in tools
      try {
        const response = await fetch(`${API_BASE}/api/ai/tools`);
        if (response.ok) {
          const data = await response.json();
          set({ availableTools: data.tools });
        }
      } catch {
        set({ availableTools: [] });
      }
    }
  },

  clearMessages: () => {
    set({ messages: [], error: null, usage: null });
  },

  executePluginTool: async (toolCall: ToolCall) => {
    try {
      const result = await invoke<string>("execute_plugin_ai_tool", {
        pluginId: toolCall.source,
        toolName: toolCall.name,
        args: JSON.stringify(toolCall.arguments),
      });
      return result;
    } catch (error) {
      console.error("Plugin tool execution error:", error);
      throw error;
    }
  },

  confirmAction: async (toolCallId: string, confirmed: boolean) => {
    const { pendingToolCalls } = get();
    const toolCall = pendingToolCalls.find(tc => tc.id === toolCallId);
    
    if (!toolCall) return;
    
    if (confirmed) {
      // Execute the tool
      try {
        const result = await get().executePluginTool(toolCall);
        await get().continueWithToolResults([{
          toolCallId,
          result,
        }]);
      } catch (error) {
        await get().continueWithToolResults([{
          toolCallId,
          result: JSON.stringify({ error: String(error) }),
          isError: true,
        }]);
      }
    } else {
      // User declined - continue with cancellation message
      await get().continueWithToolResults([{
        toolCallId,
        result: JSON.stringify({ cancelled: true, message: "User declined to execute this action" }),
      }]);
    }
    
    // Remove from pending
    set({
      pendingToolCalls: pendingToolCalls.filter(tc => tc.id !== toolCallId),
    });
  },
}));


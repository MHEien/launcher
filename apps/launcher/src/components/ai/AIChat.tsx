import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { useAIStore } from "@/stores/ai";
import { AIMessage } from "./AIMessage";
import { cn } from "@/lib/utils";

export function AIChat() {
  const {
    messages,
    isStreaming,
    error,
    exitAIMode,
    availableModels,
    selectedModel,
    selectModel,
  } = useAIStore();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  return (
    <div className="flex flex-col h-full max-h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <button
          onClick={exitAIMode}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md",
            "text-sm text-muted-foreground hover:text-foreground",
            "hover:bg-muted/50 transition-colors"
          )}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back</span>
        </button>
        
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">AI Assistant</span>
        </div>
        
        {/* Model selector */}
        <select
          value={selectedModel || ""}
          onChange={(e) => selectModel(e.target.value)}
          disabled={isStreaming}
          className={cn(
            "text-xs px-2 py-1 rounded-md",
            "bg-muted/30 border border-border/50",
            "text-muted-foreground hover:text-foreground",
            "focus:outline-none focus:ring-1 focus:ring-primary/50",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-3"
      >
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <AIMessage message={message} />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Streaming indicator */}
        {isStreaming && messages[messages.length - 1]?.content === "" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-muted-foreground text-sm"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Thinking...</span>
          </motion.div>
        )}
        
        {/* Error display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex items-start gap-2 p-3 rounded-lg",
              "bg-destructive/10 text-destructive"
            )}
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Error</p>
              <p className="text-destructive/80">{error}</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}


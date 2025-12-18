import { memo } from "react";
import { User, Bot, Wrench } from "lucide-react";
import type { AIMessage as AIMessageType } from "@/types/ai";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { cn } from "@/lib/utils";

interface AIMessageProps {
  message: AIMessageType;
}

export const AIMessage = memo(function AIMessage({ message }: AIMessageProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isTool = message.role === "tool";
  
  return (
    <div
      className={cn(
        "flex gap-2.5",
        isUser && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
          isUser && "bg-primary text-primary-foreground",
          isAssistant && "bg-muted text-muted-foreground",
          isTool && "bg-amber-500/20 text-amber-500"
        )}
      >
        {isUser && <User className="h-3.5 w-3.5" />}
        {isAssistant && <Bot className="h-3.5 w-3.5" />}
        {isTool && <Wrench className="h-3.5 w-3.5" />}
      </div>
      
      {/* Content */}
      <div
        className={cn(
          "flex-1 min-w-0",
          isUser && "text-right"
        )}
      >
        {/* Message bubble */}
        <div
          className={cn(
            "inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm",
            isUser && "bg-primary text-primary-foreground",
            isAssistant && "bg-muted/50 text-foreground",
            isTool && "bg-amber-500/10 text-foreground border border-amber-500/20"
          )}
        >
          {/* Tool badge */}
          {isTool && message.toolName && (
            <div className="text-xs text-amber-500 mb-1 font-medium">
              Tool: {message.toolName}
            </div>
          )}
          
          {/* Message content */}
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <MarkdownRenderer content={message.content} />
            </div>
          )}
          
          {/* Streaming cursor */}
          {message.isStreaming && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-current animate-pulse" />
          )}
          
          {/* Tool calls indicator */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/30">
              <p className="text-xs text-muted-foreground mb-1">
                Using tools:
              </p>
              <div className="flex flex-wrap gap-1">
                {message.toolCalls.map((tc) => (
                  <span
                    key={tc.id}
                    className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs",
                      "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    )}
                  >
                    <Wrench className="h-3 w-3" />
                    {tc.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});


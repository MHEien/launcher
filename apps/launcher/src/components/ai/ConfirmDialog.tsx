import { memo, useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { useAIStore } from "@/stores/ai";
import type { ConfirmationData } from "@/types/ai";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  data: ConfirmationData;
  toolCallId?: string;
}

export const ConfirmDialog = memo(function ConfirmDialog({ data, toolCallId }: ConfirmDialogProps) {
  const { confirmAction } = useAIStore();
  const [responded, setResponded] = useState(data.confirmed !== undefined);
  const [confirmed, setConfirmed] = useState(data.confirmed || false);
  
  const handleConfirm = async () => {
    setResponded(true);
    setConfirmed(true);
    if (toolCallId) {
      await confirmAction(toolCallId, true);
    }
  };
  
  const handleDecline = async () => {
    setResponded(true);
    setConfirmed(false);
    if (toolCallId) {
      await confirmAction(toolCallId, false);
    }
  };
  
  return (
    <div
      className={cn(
        "my-2 rounded-lg border overflow-hidden",
        responded
          ? confirmed
            ? "border-green-500/30 bg-green-500/5"
            : "border-red-500/30 bg-red-500/5"
          : "border-amber-500/30 bg-amber-500/5"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2",
          responded
            ? confirmed
              ? "bg-green-500/10"
              : "bg-red-500/10"
            : "bg-amber-500/10"
        )}
      >
        {!responded && <AlertTriangle className="h-4 w-4 text-amber-500" />}
        {responded && confirmed && <Check className="h-4 w-4 text-green-500" />}
        {responded && !confirmed && <X className="h-4 w-4 text-red-500" />}
        <span className="text-sm font-medium">
          {responded
            ? confirmed
              ? "Action Confirmed"
              : "Action Declined"
            : "Confirmation Required"}
        </span>
      </div>
      
      {/* Content */}
      <div className="p-3">
        <h4 className="text-sm font-medium">{data.title}</h4>
        <p className="text-sm text-muted-foreground mt-1">{data.message}</p>
        
        {/* Action details */}
        {data.details && (
          <div className="mt-2 p-2 rounded bg-muted/50">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Action: {data.action}
            </p>
            <pre className="text-xs font-mono overflow-x-auto">
              {JSON.stringify(data.details, null, 2)}
            </pre>
          </div>
        )}
        
        {/* Buttons */}
        {!responded && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleConfirm}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium",
                "bg-green-500 text-white hover:bg-green-600 transition-colors"
              )}
            >
              <Check className="h-3.5 w-3.5" />
              Confirm
            </button>
            <button
              onClick={handleDecline}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium",
                "bg-muted text-foreground hover:bg-muted/80 transition-colors"
              )}
            >
              <X className="h-3.5 w-3.5" />
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  );
});


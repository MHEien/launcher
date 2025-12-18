import { memo } from "react";
import { Check, Loader2, Circle, AlertCircle } from "lucide-react";
import type { StepProgressData } from "@/types/ai";
import { cn } from "@/lib/utils";

interface StepProgressProps {
  data: StepProgressData;
}

export const StepProgress = memo(function StepProgress({ data }: StepProgressProps) {
  const { steps, currentStep } = data;
  
  return (
    <div className="my-2 rounded-lg border border-border/50 bg-muted/20 p-3">
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = step.status === "completed";
          const isError = step.status === "error";
          const isPending = step.status === "pending";
          const isInProgress = step.status === "in_progress";
          
          return (
            <div key={step.id} className="flex gap-3">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full",
                    isCompleted && "bg-green-500 text-white",
                    isError && "bg-red-500 text-white",
                    isInProgress && "bg-primary text-primary-foreground",
                    isPending && "bg-muted border-2 border-border"
                  )}
                >
                  {isCompleted && <Check className="h-3.5 w-3.5" />}
                  {isError && <AlertCircle className="h-3.5 w-3.5" />}
                  {isInProgress && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isPending && <Circle className="h-2 w-2 fill-muted-foreground/30" />}
                </div>
                
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 mt-1",
                      isCompleted ? "bg-green-500" : "bg-border"
                    )}
                  />
                )}
              </div>
              
              {/* Step content */}
              <div className={cn("flex-1 pb-3", index === steps.length - 1 && "pb-0")}>
                <h4
                  className={cn(
                    "text-sm font-medium",
                    isActive && "text-foreground",
                    isPending && "text-muted-foreground",
                    isCompleted && "text-foreground",
                    isError && "text-red-500"
                  )}
                >
                  {step.title}
                </h4>
                {step.details && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.details}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});


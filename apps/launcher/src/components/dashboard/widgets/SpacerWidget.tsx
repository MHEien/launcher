import { cn } from "@/lib/utils";

interface SpacerWidgetProps {
  config?: Record<string, unknown> | null;
}

export function SpacerWidget(_props: SpacerWidgetProps) {
  // Spacer is invisible in normal mode, shows dashed border in edit mode
  // The edit mode visual is handled by the parent, so this is just a placeholder
  return (
    <div 
      className={cn(
        "h-full w-full",
        // Border is shown via CSS when in edit mode (parent adds a class)
      )}
    />
  );
}


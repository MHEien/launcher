import { cn } from "@/lib/utils";

interface SeparatorWidgetProps {
  config?: Record<string, unknown> | null;
}

export function SeparatorWidget({ config }: SeparatorWidgetProps) {
  const orientation = (config?.orientation as string) || "horizontal";
  const style = (config?.style as string) || "solid";
  const thickness = (config?.thickness as number) || 1;
  const color = (config?.color as string) || "rgba(255, 255, 255, 0.1)";

  const isHorizontal = orientation === "horizontal";

  return (
    <div className="h-full w-full flex items-center justify-center p-1">
      <div
        className={cn(
          isHorizontal ? "w-full" : "h-full",
        )}
        style={{
          [isHorizontal ? "height" : "width"]: `${thickness}px`,
          [isHorizontal ? "minHeight" : "minWidth"]: `${thickness}px`,
          backgroundColor: style === "solid" ? color : "transparent",
          backgroundImage: style !== "solid" 
            ? `${style === "dashed" ? "repeating-linear-gradient" : "repeating-linear-gradient"}(
                ${isHorizontal ? "to right" : "to bottom"},
                ${color} 0px,
                ${color} ${style === "dashed" ? "8px" : "2px"},
                transparent ${style === "dashed" ? "8px" : "2px"},
                transparent ${style === "dashed" ? "16px" : "6px"}
              )`
            : undefined,
        }}
      />
    </div>
  );
}


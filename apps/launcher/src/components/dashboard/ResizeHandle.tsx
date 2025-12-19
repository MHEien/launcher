import { useCallback, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export type ResizeDirection = 
  | "n" | "s" | "e" | "w" 
  | "ne" | "nw" | "se" | "sw";

interface ResizeHandleProps {
  direction: ResizeDirection;
  onResize: (deltaX: number, deltaY: number, direction: ResizeDirection) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  disabled?: boolean;
}

// Get cursor style for each direction
const CURSOR_MAP: Record<ResizeDirection, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
};

// Position styles for each handle
const POSITION_STYLES: Record<ResizeDirection, React.CSSProperties> = {
  n: { top: -4, left: "50%", transform: "translateX(-50%)", width: "60%", height: 8 },
  s: { bottom: -4, left: "50%", transform: "translateX(-50%)", width: "60%", height: 8 },
  e: { right: -4, top: "50%", transform: "translateY(-50%)", width: 8, height: "60%" },
  w: { left: -4, top: "50%", transform: "translateY(-50%)", width: 8, height: "60%" },
  ne: { top: -4, right: -4, width: 12, height: 12 },
  nw: { top: -4, left: -4, width: 12, height: 12 },
  se: { bottom: -4, right: -4, width: 12, height: 12 },
  sw: { bottom: -4, left: -4, width: 12, height: 12 },
};

export function ResizeHandle({ 
  direction, 
  onResize, 
  onResizeStart, 
  onResizeEnd,
  disabled = false,
}: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    onResizeStart?.();
  }, [disabled, onResizeStart]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;
      
      startPosRef.current = { x: e.clientX, y: e.clientY };
      onResize(deltaX, deltaY, direction);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onResizeEnd?.();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, direction, onResize, onResizeEnd]);

  const isCorner = ["ne", "nw", "se", "sw"].includes(direction);

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        ...POSITION_STYLES[direction],
        cursor: disabled ? "default" : CURSOR_MAP[direction],
        position: "absolute",
        zIndex: 30,
      }}
      className={cn(
        "group touch-none",
        disabled && "pointer-events-none"
      )}
    >
      {/* Visual indicator */}
      {isCorner ? (
        <div 
          className={cn(
            "absolute inset-1 rounded-full transition-all",
            "bg-primary/50 opacity-0 group-hover:opacity-100",
            isDragging && "opacity-100 bg-primary scale-110"
          )}
        />
      ) : (
        <div 
          className={cn(
            "absolute rounded-full transition-all",
            direction === "n" || direction === "s" 
              ? "inset-x-2 inset-y-2" 
              : "inset-x-2 inset-y-2",
            "bg-primary/50 opacity-0 group-hover:opacity-100",
            isDragging && "opacity-100 bg-primary"
          )}
        />
      )}
    </div>
  );
}

// Composite component with all 8 resize handles
interface ResizeHandlesProps {
  onResize: (deltaX: number, deltaY: number, direction: ResizeDirection) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  disabled?: boolean;
  showIndicator?: boolean;
  currentSize?: { width: number; height: number };
}

export function ResizeHandles({ 
  onResize, 
  onResizeStart, 
  onResizeEnd, 
  disabled = false,
  showIndicator = false,
  currentSize,
}: ResizeHandlesProps) {
  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
    onResizeStart?.();
  }, [onResizeStart]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    onResizeEnd?.();
  }, [onResizeEnd]);

  const directions: ResizeDirection[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

  return (
    <>
      {directions.map((dir) => (
        <ResizeHandle
          key={dir}
          direction={dir}
          onResize={onResize}
          onResizeStart={handleResizeStart}
          onResizeEnd={handleResizeEnd}
          disabled={disabled}
        />
      ))}
      
      {/* Size indicator tooltip */}
      {showIndicator && isResizing && currentSize && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-background/90 rounded text-xs font-mono shadow-lg border border-border/50 whitespace-nowrap z-50">
          {Math.round(currentSize.width)} × {Math.round(currentSize.height)}
        </div>
      )}
    </>
  );
}


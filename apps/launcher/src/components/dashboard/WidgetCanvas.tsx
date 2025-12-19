import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, X, Settings, ChevronUp, ChevronDown } from "lucide-react";
import { useSettingsStore } from "@/stores/settings";
import { widgetRegistry } from "@/lib/widgetRegistry";
import type { WidgetPlacement, WidgetTheme } from "@/types";
import { ResizeHandles, type ResizeDirection } from "./ResizeHandle";
import { WidgetContextMenu, type ContextMenuItem } from "./WidgetContextMenu";
import { WidgetContextProvider } from "./WidgetContext";
import { cn } from "@/lib/utils";

// Import core widgets
import { ClockWidget } from "./widgets/ClockWidget";
import { QuickActionsWidget } from "./widgets/QuickActionsWidget";
import { RecentFilesWidget } from "./widgets/RecentFilesWidget";
import { PluginWidget } from "./widgets/PluginWidget";
import { TerminalWidget } from "./widgets/TerminalWidget";
import { SpacerWidget } from "./widgets/SpacerWidget";
import { FolderWidget } from "./widgets/FolderWidget";
import { CalculatorWidget } from "./widgets/CalculatorWidget";
import { SeparatorWidget } from "./widgets/SeparatorWidget";

// Map widget types to components
const CORE_WIDGETS: Record<string, React.ComponentType<{ config?: Record<string, unknown> | null; instanceId?: string }>> = {
  "clock": ClockWidget,
  "quick-actions": QuickActionsWidget,
  "recent-files": RecentFilesWidget,
  "terminal": TerminalWidget,
  "spacer": SpacerWidget,
  "folder": FolderWidget,
  "calculator": CalculatorWidget,
  "separator": SeparatorWidget,
};

interface WidgetCanvasProps {
  editMode?: boolean;
  disabled?: boolean;
}

// Check if two rectangles overlap
function rectsOverlap(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number },
  padding = 4 // Small gap between widgets
): boolean {
  return !(
    rect1.x + rect1.width + padding <= rect2.x ||
    rect2.x + rect2.width + padding <= rect1.x ||
    rect1.y + rect1.height + padding <= rect2.y ||
    rect2.y + rect2.height + padding <= rect1.y
  );
}


export function WidgetCanvas({ editMode = false, disabled = false }: WidgetCanvasProps) {
  const { 
    settings, 
    removeWidget, 
    updateWidgetPosition, 
    updateWidgetSize,
    bringWidgetToFront,
    sendWidgetToBack,
    openConfigPanel,
  } = useSettingsStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [contextMenu, setContextMenu] = useState<{
    items: ContextMenuItem[];
    position: { x: number; y: number };
  } | null>(null);

  // Track canvas size
  useEffect(() => {
    if (!canvasRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(canvasRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  if (!settings) {
    return null;
  }

  // Sort widgets by z-index to ensure proper rendering order
  // Widgets with higher z-index should be rendered later (on top)
  const widgets = [...settings.widget_layout].sort((a, b) => a.z_index - b.z_index);
  const dashboardSettings = settings.dashboard_settings;

  // Snap value to grid if enabled
  const snapToGrid = useCallback((value: number): number => {
    if (!dashboardSettings.snap_to_grid) return value;
    const gridSize = dashboardSettings.grid_size;
    return Math.round(value / gridSize) * gridSize;
  }, [dashboardSettings.snap_to_grid, dashboardSettings.grid_size]);

  // Check collision with other widgets - iteratively resolve all overlaps
  const checkCollision = useCallback((
    instanceId: string,
    newX: number,
    newY: number,
    width: number,
    height: number
  ): { x: number; y: number } => {
    const GAP = 4; // Gap between widgets
    const MAX_ITERATIONS = 10; // Prevent infinite loops
    
    let currentX = newX;
    let currentY = newY;
    
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      let hasCollision = false;
      const movingRect = { x: currentX, y: currentY, width, height };
      
      for (const widget of widgets) {
        if (widget.instance_id === instanceId) continue;
        
        const otherRect = {
          x: widget.x,
          y: widget.y,
          width: widget.width,
          height: widget.height,
        };
        
        if (rectsOverlap(movingRect, otherRect, GAP)) {
          hasCollision = true;
          
          // Calculate the push distances for each direction
          const pushLeft = otherRect.x - width - GAP;
          const pushRight = otherRect.x + otherRect.width + GAP;
          const pushUp = otherRect.y - height - GAP;
          const pushDown = otherRect.y + otherRect.height + GAP;
          
          // Calculate distances from current position for each push direction
          const distLeft = Math.abs(currentX - pushLeft);
          const distRight = Math.abs(currentX - pushRight);
          const distUp = Math.abs(currentY - pushUp);
          const distDown = Math.abs(currentY - pushDown);
          
          // Find the minimum push that keeps us in bounds
          const options: Array<{ x: number; y: number; dist: number }> = [];
          
          if (pushLeft >= 0) {
            options.push({ x: pushLeft, y: currentY, dist: distLeft });
          }
          if (pushRight + width <= canvasSize.width) {
            options.push({ x: pushRight, y: currentY, dist: distRight });
          }
          if (pushUp >= 0) {
            options.push({ x: currentX, y: pushUp, dist: distUp });
          }
          if (pushDown + height <= canvasSize.height) {
            options.push({ x: currentX, y: pushDown, dist: distDown });
          }
          
          if (options.length > 0) {
            // Pick the option with minimum movement
            options.sort((a, b) => a.dist - b.dist);
            currentX = options[0].x;
            currentY = options[0].y;
          }
          
          break; // Re-check all widgets with new position
        }
      }
      
      if (!hasCollision) break;
    }
    
    // Ensure still within canvas bounds
    currentX = Math.max(0, Math.min(currentX, canvasSize.width - width));
    currentY = Math.max(0, Math.min(currentY, canvasSize.height - height));
    
    return { x: currentX, y: currentY };
  }, [widgets, canvasSize]);

  // Show empty state in edit mode
  if (widgets.length === 0) {
    if (editMode) {
      return (
        <div className="space-y-2 h-full flex flex-col">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 shrink-0">
            Widgets
          </h3>
          <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center text-muted-foreground flex-1 flex flex-col items-center justify-center">
            <p className="text-sm">No widgets added</p>
            <p className="text-xs mt-1">Click the + button to add widgets</p>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-2 h-full flex flex-col">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 shrink-0">
        Widgets {editMode && <span className="text-primary text-[10px] normal-case">(drag to move, edges to resize)</span>}
      </h3>
      
      <div 
        ref={canvasRef}
        className={cn(
          "relative flex-1 min-h-0 overflow-hidden rounded-lg",
          editMode && dashboardSettings.show_grid && "bg-[repeating-linear-gradient(0deg,transparent,transparent_19px,rgba(255,255,255,0.03)_19px,rgba(255,255,255,0.03)_20px),repeating-linear-gradient(90deg,transparent,transparent_19px,rgba(255,255,255,0.03)_19px,rgba(255,255,255,0.03)_20px)]",
          disabled && "pointer-events-none opacity-50"
        )}
        style={{
          backgroundSize: editMode && dashboardSettings.show_grid 
            ? `${dashboardSettings.grid_size}px ${dashboardSettings.grid_size}px` 
            : undefined,
        }}
      >
        <AnimatePresence>
          {widgets.map((placement) => (
            <DraggableWidget
              key={placement.instance_id}
              placement={placement}
              editMode={editMode && !disabled}
              canvasSize={canvasSize}
              snapToGrid={snapToGrid}
              checkCollision={(x, y, w, h) => checkCollision(placement.instance_id, x, y, w, h)}
              onRemove={() => removeWidget(placement.instance_id)}
              onPositionChange={(x, y) => updateWidgetPosition(placement.instance_id, x, y)}
              onSizeChange={(w, h) => updateWidgetSize(placement.instance_id, w, h)}
              onBringToFront={() => bringWidgetToFront(placement.instance_id)}
              onSendToBack={() => sendWidgetToBack(placement.instance_id)}
              onConfigure={() => openConfigPanel(placement.instance_id)}
              onContextMenu={(items, position) => {
                if (!editMode && items.length > 0) {
                  setContextMenu({ items, position });
                }
              }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Context Menu */}
      <WidgetContextMenu
        items={contextMenu?.items || []}
        position={contextMenu?.position || null}
        onClose={() => setContextMenu(null)}
      />
    </div>
  );
}

interface DraggableWidgetProps {
  placement: WidgetPlacement;
  editMode: boolean;
  canvasSize: { width: number; height: number };
  snapToGrid: (value: number) => number;
  checkCollision: (x: number, y: number, width: number, height: number) => { x: number; y: number };
  onRemove: () => void;
  onPositionChange: (x: number, y: number) => void;
  onSizeChange: (width: number, height: number) => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onConfigure: () => void;
  onContextMenu: (items: ContextMenuItem[], position: { x: number; y: number }) => void;
}

function DraggableWidget({
  placement,
  editMode,
  canvasSize,
  snapToGrid,
  checkCollision,
  onRemove,
  onPositionChange,
  onSizeChange,
  onBringToFront,
  onSendToBack,
  onConfigure,
  onContextMenu,
}: DraggableWidgetProps) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState({ x: placement.x, y: placement.y });
  const [size, setSize] = useState({ width: placement.width, height: placement.height });
  
  // Track drag state
  const dragState = useRef({
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
    pointerId: -1,
  });
  
  const widgetDef = widgetRegistry.get(placement.widget_type);

  // Get size constraints from widget definition
  const sizeConstraints = widgetDef?.sizeConstraints || {
    minWidth: 50,
    minHeight: 50,
    defaultWidth: 100,
    defaultHeight: 100,
  };

  // Update position when placement changes from external source
  useEffect(() => {
    if (!isDragging) {
      setPosition({ x: placement.x, y: placement.y });
    }
  }, [placement.x, placement.y, isDragging]);

  // Update size when placement changes
  useEffect(() => {
    if (!isResizing) {
      setSize({ width: placement.width, height: placement.height });
    }
  }, [placement.width, placement.height, isResizing]);

  // Check if this is a plugin widget
  const isPluginWidget = !!placement.plugin_id;
  
  // Get the widget component for core widgets
  const WidgetComponent = !isPluginWidget 
    ? CORE_WIDGETS[placement.widget_type]
    : null;

  // Store context menu items from widget in ref to avoid re-renders
  const widgetContextItemsRef = useRef<ContextMenuItem[]>([]);

  // Callback that stores items in ref - no state updates
  const handleItemsChange = useCallback((items: ContextMenuItem[]) => {
    widgetContextItemsRef.current = items;
  }, []);

  // Handle right-click context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (editMode) return; // Don't show context menu in edit mode
    
    e.preventDefault();
    e.stopPropagation();

    // Use items provided by widget via ref
    const items = widgetContextItemsRef.current;
    if (items.length > 0) {
      onContextMenu(items, { x: e.clientX, y: e.clientY });
    }
  }, [editMode, onContextMenu]);

  // Manual drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!editMode || isResizing) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    onBringToFront();
    
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
      pointerId: e.pointerId,
    };
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [editMode, isResizing, position, onBringToFront]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || e.pointerId !== dragState.current.pointerId) return;
    
    e.preventDefault();
    
    const deltaX = e.clientX - dragState.current.startX;
    const deltaY = e.clientY - dragState.current.startY;
    
    let newX = dragState.current.startPosX + deltaX;
    let newY = dragState.current.startPosY + deltaY;
    
    // Constrain to canvas bounds
    newX = Math.max(0, Math.min(newX, canvasSize.width - size.width));
    newY = Math.max(0, Math.min(newY, canvasSize.height - size.height));
    
    // Check for collisions in real-time and adjust position
    const adjusted = checkCollision(newX, newY, size.width, size.height);
    
    setPosition({ x: adjusted.x, y: adjusted.y });
  }, [isDragging, canvasSize, size, checkCollision]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging || e.pointerId !== dragState.current.pointerId) return;
    
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsDragging(false);
    
    // Apply grid snapping
    let newX = snapToGrid(position.x);
    let newY = snapToGrid(position.y);
    
    // Check for collisions and adjust if needed
    const adjusted = checkCollision(newX, newY, size.width, size.height);
    newX = snapToGrid(adjusted.x);
    newY = snapToGrid(adjusted.y);
    
    setPosition({ x: newX, y: newY });
    onPositionChange(newX, newY);
  }, [isDragging, position, size, snapToGrid, checkCollision, onPositionChange]);

  // Handle resize
  const handleResize = useCallback((deltaX: number, deltaY: number, direction: ResizeDirection) => {
    setSize((prevSize) => {
      let newWidth = prevSize.width;
      let newHeight = prevSize.height;
      let newX = position.x;
      let newY = position.y;

      // Handle width changes
      if (direction.includes("e")) {
        newWidth = Math.max(sizeConstraints.minWidth, prevSize.width + deltaX);
        if (sizeConstraints.maxWidth) {
          newWidth = Math.min(newWidth, sizeConstraints.maxWidth);
        }
        // Constrain to canvas
        newWidth = Math.min(newWidth, canvasSize.width - position.x);
      }
      if (direction.includes("w")) {
        const potentialWidth = prevSize.width - deltaX;
        if (potentialWidth >= sizeConstraints.minWidth) {
          newWidth = potentialWidth;
          newX = position.x + deltaX;
          if (newX < 0) {
            newWidth += newX;
            newX = 0;
          }
          if (sizeConstraints.maxWidth && newWidth > sizeConstraints.maxWidth) {
            newX += newWidth - sizeConstraints.maxWidth;
            newWidth = sizeConstraints.maxWidth;
          }
        }
      }

      // Handle height changes
      if (direction.includes("s")) {
        newHeight = Math.max(sizeConstraints.minHeight, prevSize.height + deltaY);
        if (sizeConstraints.maxHeight) {
          newHeight = Math.min(newHeight, sizeConstraints.maxHeight);
        }
        // Constrain to canvas
        newHeight = Math.min(newHeight, canvasSize.height - position.y);
      }
      if (direction.includes("n")) {
        const potentialHeight = prevSize.height - deltaY;
        if (potentialHeight >= sizeConstraints.minHeight) {
          newHeight = potentialHeight;
          newY = position.y + deltaY;
          if (newY < 0) {
            newHeight += newY;
            newY = 0;
          }
          if (sizeConstraints.maxHeight && newHeight > sizeConstraints.maxHeight) {
            newY += newHeight - sizeConstraints.maxHeight;
            newHeight = sizeConstraints.maxHeight;
          }
        }
      }

      // Update position if it changed (from n/w resize)
      if (newX !== position.x || newY !== position.y) {
        setPosition({ x: newX, y: newY });
      }

      return { width: newWidth, height: newHeight };
    });
  }, [position, canvasSize, sizeConstraints]);

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
    onBringToFront();
  }, [onBringToFront]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    const snappedWidth = snapToGrid(size.width);
    const snappedHeight = snapToGrid(size.height);
    const snappedX = snapToGrid(position.x);
    const snappedY = snapToGrid(position.y);
    
    setSize({ width: snappedWidth, height: snappedHeight });
    setPosition({ x: snappedX, y: snappedY });
    
    onSizeChange(snappedWidth, snappedHeight);
    onPositionChange(snappedX, snappedY);
  }, [size, position, snapToGrid, onSizeChange, onPositionChange]);

  // Widget not found for core widgets
  if (!isPluginWidget && !WidgetComponent) {
    return (
      <div
        style={{
          position: "absolute",
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
          zIndex: placement.z_index,
        }}
        className={cn(
          "rounded-lg bg-muted/30 p-3 flex items-center justify-center",
          "text-muted-foreground text-sm"
        )}
      >
        Widget not found: {placement.widget_type}
      </div>
    );
  }

  // Build style object with theme overrides
  const themeStyles = buildThemeStyles(placement.theme_overrides);

  const isActive = isDragging || isResizing;

  return (
    <motion.div
      ref={widgetRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onPointerDown={editMode ? handlePointerDown : undefined}
      onPointerMove={isDragging ? handlePointerMove : undefined}
      onPointerUp={isDragging ? handlePointerUp : undefined}
      onPointerCancel={isDragging ? handlePointerUp : undefined}
      onContextMenu={handleContextMenu}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: isActive ? 1000 : placement.z_index,
        touchAction: editMode ? "none" : "auto",
        userSelect: editMode ? "none" : "auto",
        ...themeStyles,
      }}
      className={cn(
        "rounded-lg overflow-visible relative group",
        "transition-shadow duration-200",
        isActive && "shadow-2xl ring-2 ring-primary",
        editMode && !isActive && "ring-1 ring-primary/30",
        editMode && "cursor-move",
        !editMode && "cursor-default"
      )}
    >
      {/* Widget Background */}
      <div 
        className={cn(
          "absolute inset-0 rounded-lg overflow-hidden",
          !placement.theme_overrides?.background && "bg-muted/20"
        )}
        style={{
          background: placement.theme_overrides?.background,
          opacity: placement.theme_overrides?.background_opacity !== undefined 
            ? placement.theme_overrides.background_opacity / 100 
            : 1,
        }}
      />

      {/* Resize handles (only in edit mode) */}
      {editMode && (
        <ResizeHandles
          onResize={handleResize}
          onResizeStart={handleResizeStart}
          onResizeEnd={handleResizeEnd}
          showIndicator={true}
          currentSize={size}
        />
      )}

      {/* Edit mode controls */}
      {editMode && (
        <div 
          className="absolute inset-x-0 top-0 z-20 flex items-start justify-between p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onPointerDown={(e) => e.stopPropagation()} // Prevent drag when clicking controls
        >
          {/* Drag indicator */}
          <div 
            className={cn(
              "p-1.5 bg-background/90 rounded",
              "hover:bg-background transition-colors",
              "shadow-sm backdrop-blur-sm pointer-events-none"
            )}
            title="Drag anywhere to move"
          >
            <GripVertical className="h-4 w-4 text-foreground" />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-0.5">
            {/* Layer controls */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBringToFront();
              }}
              className="p-1 rounded bg-background/90 hover:bg-background text-muted-foreground hover:text-foreground transition-colors shadow-sm backdrop-blur-sm"
              title="Bring to front"
            >
              <ChevronUp className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSendToBack();
              }}
              className="p-1 rounded bg-background/90 hover:bg-background text-muted-foreground hover:text-foreground transition-colors shadow-sm backdrop-blur-sm"
              title="Send to back"
            >
              <ChevronDown className="h-3 w-3" />
            </button>

            {/* Configure button */}
            {widgetDef?.configSchema && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConfigure();
                }}
                className="p-1 rounded bg-background/90 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors shadow-sm backdrop-blur-sm"
                title="Configure widget"
              >
                <Settings className="h-3 w-3" />
              </button>
            )}

            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1 rounded bg-red-500/80 text-white hover:bg-red-500 transition-colors shadow-sm"
              title="Remove widget"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Widget content with CSS variable injection */}
      <WidgetContextProvider
        onItemsChange={handleItemsChange}
      >
        <div 
          className={cn(
            "relative h-full w-full overflow-hidden rounded-lg",
            editMode && "pointer-events-none opacity-80"
          )}
          style={buildWidgetCSSVariables(placement.theme_overrides)}
        >
          {isPluginWidget ? (
            <PluginWidget
              pluginId={placement.plugin_id!}
              widgetId={placement.widget_type}
              config={placement.config}
            />
          ) : (
            WidgetComponent && <WidgetComponent config={placement.config} instanceId={placement.instance_id} />
          )}
        </div>
      </WidgetContextProvider>
    </motion.div>
  );
}

// Build CSS custom properties for widget theming
function buildWidgetCSSVariables(theme: WidgetTheme | null | undefined): React.CSSProperties {
  const vars: Record<string, string | undefined> = {};
  
  if (theme?.text_color) {
    vars["--widget-text"] = theme.text_color;
    vars["color"] = theme.text_color;
  }
  
  if (theme?.accent_color) {
    vars["--widget-accent"] = theme.accent_color;
  }
  
  if (theme?.background) {
    vars["--widget-bg"] = theme.background;
  }
  
  if (theme?.border_color) {
    vars["--widget-border"] = theme.border_color;
  }
  
  return vars as React.CSSProperties;
}

// Build CSS styles from theme overrides
function buildThemeStyles(theme: WidgetTheme | null | undefined): React.CSSProperties {
  if (!theme) return {};

  const styles: React.CSSProperties = {};

  if (theme.border_color) {
    styles.borderColor = theme.border_color;
    styles.borderStyle = "solid";
  }

  if (theme.border_width !== undefined) {
    styles.borderWidth = theme.border_width;
  }

  if (theme.border_radius !== undefined) {
    styles.borderRadius = theme.border_radius;
  }

  if (theme.shadow) {
    switch (theme.shadow) {
      case "sm":
        styles.boxShadow = "0 1px 2px 0 rgb(0 0 0 / 0.05)";
        break;
      case "md":
        styles.boxShadow = "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)";
        break;
      case "lg":
        styles.boxShadow = "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)";
        break;
    }
  }

  return styles;
}

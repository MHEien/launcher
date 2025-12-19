import { useMemo, useState, useRef, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { X, GripVertical, MoveHorizontal } from "lucide-react";
import { useSettingsStore } from "@/stores/settings";
import type { WidgetPlacement, WidgetSize } from "@/types";
import { cn } from "@/lib/utils";

// Import core widgets
import { ClockWidget } from "./widgets/ClockWidget";
import { QuickActionsWidget } from "./widgets/QuickActionsWidget";
import { RecentFilesWidget } from "./widgets/RecentFilesWidget";
import { PluginWidget } from "./widgets/PluginWidget";
import { TerminalWidget } from "./widgets/TerminalWidget";

// Map widget IDs to components
const CORE_WIDGETS: Record<string, React.ComponentType<{ config?: Record<string, unknown> | null }>> = {
  "clock": ClockWidget,
  "quick-actions": QuickActionsWidget,
  "recent-files": RecentFilesWidget,
  "terminal": TerminalWidget,
};

// Widget size to grid span mapping
function getGridSpan(size: WidgetSize): { colSpan: number; rowSpan: number } {
  switch (size) {
    case "1x1":
      return { colSpan: 1, rowSpan: 1 };
    case "2x1":
      return { colSpan: 2, rowSpan: 1 };
    case "2x2":
      return { colSpan: 2, rowSpan: 2 };
    case "4x2":
      return { colSpan: 4, rowSpan: 2 };
    default:
      return { colSpan: 1, rowSpan: 1 };
  }
}

interface WidgetGridProps {
  editMode?: boolean;
}

export function WidgetGrid({ editMode = false }: WidgetGridProps) {
  const { settings, removeWidget, updateWidgetLayout } = useSettingsStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [activeRect, setActiveRect] = useState<{ width: number; height: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sort widgets by position
  const sortedWidgets = useMemo(() => {
    if (!settings) return [];
    return [...settings.widget_layout].sort((a, b) => a.position - b.position);
  }, [settings]);

  const activeWidget = useMemo(() => {
    if (!activeId) return null;
    return sortedWidgets.find(w => w.widget_id === activeId) || null;
  }, [activeId, sortedWidgets]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveId(id);
    setOverId(null);
    
    // Capture the original size of the dragged element
    const activeNode = event.active.rect.current.initial;
    if (activeNode) {
      setActiveRect({
        width: activeNode.width,
        height: activeNode.height,
      });
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    // Only update overId if it's different from the active widget
    if (over && over.id !== activeId) {
      setOverId(over.id as string);
    } else {
      setOverId(null);
    }
  }, [activeId]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setOverId(null);
    setActiveRect(null);

    if (!over || active.id === over.id || !settings) {
      return;
    }

    const oldIndex = sortedWidgets.findIndex(w => w.widget_id === active.id);
    const newIndex = sortedWidgets.findIndex(w => w.widget_id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Create new array with moved widget
    const newWidgets = [...sortedWidgets];
    const [movedWidget] = newWidgets.splice(oldIndex, 1);
    newWidgets.splice(newIndex, 0, movedWidget);
    
    // Update positions
    const updatedWidgets = newWidgets.map((widget, index) => ({
      ...widget,
      position: index,
    }));

    await updateWidgetLayout(updatedWidgets);
  }, [settings, sortedWidgets, updateWidgetLayout]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
    setActiveRect(null);
  }, []);

  if (!settings) {
    return null;
  }

  // Show empty state in edit mode
  if (sortedWidgets.length === 0) {
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

  const handleRemove = async (widgetId: string) => {
    await removeWidget(widgetId);
  };

  // Render widget content for the overlay
  const renderWidgetContent = (placement: WidgetPlacement) => {
    const isPluginWidget = !!placement.plugin_id;
    const WidgetComponent = !isPluginWidget ? CORE_WIDGETS[placement.widget_id] : null;

    if (isPluginWidget) {
      return (
        <PluginWidget
          pluginId={placement.plugin_id!}
          widgetId={placement.widget_id}
          config={placement.config}
        />
      );
    }
    
    return WidgetComponent ? <WidgetComponent config={placement.config} /> : null;
  };

  return (
    <div className="space-y-2 h-full flex flex-col">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 shrink-0">
        Widgets {editMode && <span className="text-primary text-[10px] normal-case">(drag handle to reorder)</span>}
      </h3>
      
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
      >
        <div 
          ref={gridRef}
          className="grid gap-2 flex-1 content-start"
          style={{
            gridTemplateColumns: "repeat(4, 1fr)",
            gridAutoRows: "minmax(80px, auto)",
          }}
        >
          {sortedWidgets.map((placement) => (
            <DroppableWidget
              key={placement.widget_id}
              placement={placement}
              editMode={editMode}
              onRemove={handleRemove}
              isDragActive={!!activeId}
              isBeingDragged={activeId === placement.widget_id}
              isDropTarget={overId === placement.widget_id}
            />
          ))}
        </div>

        {/* Drag overlay - maintains original size, doesn't affect layout */}
        <DragOverlay
          dropAnimation={{
            duration: 250,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
          style={{ cursor: 'grabbing' }}
        >
          {activeWidget && activeRect && (
            <div
              className={cn(
                "rounded-lg bg-background/95 overflow-hidden",
                "border-2 border-primary shadow-2xl",
                "ring-4 ring-primary/30",
                "backdrop-blur-sm"
              )}
              style={{
                width: activeRect.width,
                height: activeRect.height,
              }}
            >
              {/* Drag handle indicator */}
              <div className="absolute top-1 left-1 z-10 p-1.5 bg-primary rounded shadow-md">
                <GripVertical className="h-4 w-4 text-primary-foreground" />
              </div>
              
              {/* Widget content - slightly transparent */}
              <div className="opacity-90">
                {renderWidgetContent(activeWidget)}
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// Separate component for droppable widgets
import { useDroppable, useDraggable } from "@dnd-kit/core";

interface DroppableWidgetProps {
  placement: WidgetPlacement;
  editMode: boolean;
  onRemove: (widgetId: string) => void;
  isDragActive: boolean;
  isBeingDragged: boolean;
  isDropTarget: boolean;
}

function DroppableWidget(props: DroppableWidgetProps) {
  const { placement, editMode } = props;
  
  // Make each widget both draggable and droppable
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: placement.widget_id,
    disabled: !editMode,
  });

  const { 
    attributes, 
    listeners, 
    setNodeRef: setDraggableRef,
    isDragging,
  } = useDraggable({
    id: placement.widget_id,
    disabled: !editMode,
  });

  // Combine refs
  const setNodeRef = useCallback((node: HTMLElement | null) => {
    setDroppableRef(node);
    setDraggableRef(node);
  }, [setDroppableRef, setDraggableRef]);

  const { colSpan, rowSpan } = getGridSpan(placement.size);

  // Check if this is a plugin widget
  const isPluginWidget = !!placement.plugin_id;
  
  // Get the widget component for core widgets
  const WidgetComponent = !isPluginWidget 
    ? CORE_WIDGETS[placement.widget_id]
    : null;

  // Widget not found for core widgets
  if (!isPluginWidget && !WidgetComponent) {
    return (
      <div
        ref={setNodeRef}
        style={{
          gridColumn: `span ${colSpan}`,
          gridRow: `span ${rowSpan}`,
        }}
        className={cn(
          "rounded-lg bg-muted/30 p-3 flex items-center justify-center",
          "text-muted-foreground text-sm"
        )}
      >
        Widget not found: {placement.widget_id}
      </div>
    );
  }

  const actualIsDropTarget = props.isDropTarget || isOver;
  const actualIsBeingDragged = props.isBeingDragged || isDragging;

  return (
    <div
      ref={setNodeRef}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
      }}
      className={cn(
        "rounded-lg bg-muted/20 overflow-hidden relative group",
        "border-2 transition-all duration-200",
        // When this item is being dragged, show a placeholder
        actualIsBeingDragged && "opacity-40 border-dashed border-primary/60 bg-primary/5 scale-[0.98]",
        // When this is the drop target
        actualIsDropTarget && !actualIsBeingDragged && "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary shadow-lg shadow-primary/20",
        // Normal state
        !actualIsBeingDragged && !actualIsDropTarget && "border-border/20 hover:border-border/40",
        // Edit mode highlight (but not when any drag is active)
        editMode && !actualIsBeingDragged && !props.isDragActive && "ring-2 ring-primary/30 ring-offset-1 ring-offset-background"
      )}
    >
      {/* Drop target indicator overlay */}
      {actualIsDropTarget && !actualIsBeingDragged && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-primary/10 backdrop-blur-[1px] pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary rounded-full text-primary-foreground text-xs font-medium shadow-lg animate-pulse">
            <MoveHorizontal className="h-3 w-3" />
            Drop here to swap
          </div>
        </div>
      )}

      {/* Edit mode overlay with drag handle */}
      {editMode && !actualIsBeingDragged && (
        <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between p-1">
          <div 
            {...attributes}
            {...listeners}
            className={cn(
              "p-1.5 bg-muted/90 rounded cursor-grab active:cursor-grabbing hover:bg-muted touch-none select-none",
              "transition-colors duration-150",
              props.isDragActive && "cursor-grabbing"
            )}
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4 text-foreground" />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              props.onRemove(placement.widget_id);
            }}
            className={cn(
              "p-1 rounded-md",
              "bg-red-500/80 text-white hover:bg-red-500",
              "transition-colors"
            )}
            title="Remove widget"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      
      {/* Widget content */}
      <div className={cn(
        "transition-opacity duration-200",
        editMode && "opacity-60 pointer-events-none",
        actualIsBeingDragged && "opacity-30"
      )}>
        {isPluginWidget ? (
          <PluginWidget
            pluginId={placement.plugin_id!}
            widgetId={placement.widget_id}
            config={placement.config}
          />
        ) : (
          WidgetComponent && <WidgetComponent config={placement.config} />
        )}
      </div>
    </div>
  );
}

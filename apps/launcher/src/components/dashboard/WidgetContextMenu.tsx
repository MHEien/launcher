import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  separator?: boolean;
}

interface WidgetContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number } | null;
  onClose: () => void;
}

export function WidgetContextMenu({ items, position, onClose }: WidgetContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Add listeners after a short delay to avoid immediate close
    const timeout = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("contextmenu", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 10);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("contextmenu", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [position, onClose]);

  if (!position) return null;

  // Group items by separators
  const groupedItems: ContextMenuItem[][] = [];
  let currentGroup: ContextMenuItem[] = [];

  items.forEach((item) => {
    if (item.separator && currentGroup.length > 0) {
      groupedItems.push(currentGroup);
      currentGroup = [];
    } else if (!item.separator) {
      currentGroup.push(item);
    }
  });
  if (currentGroup.length > 0) {
    groupedItems.push(currentGroup);
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className="fixed z-[10000] bg-popover border border-border rounded-md shadow-lg py-1 min-w-[180px]"
        style={{
          left: position.x,
          top: position.y,
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {groupedItems.map((group, groupIndex) => (
          <div key={groupIndex}>
            {group.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    onClose();
                  }
                }}
                disabled={item.disabled}
                className={cn(
                  "w-full px-3 py-1.5 text-left text-sm flex items-center gap-2",
                  "hover:bg-accent hover:text-accent-foreground",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors"
                )}
              >
                {item.icon && <span className="h-4 w-4 flex-shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))}
            {groupIndex < groupedItems.length - 1 && (
              <div className="my-1 h-px bg-border" />
            )}
          </div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}


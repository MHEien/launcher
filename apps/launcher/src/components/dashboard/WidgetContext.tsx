import { createContext, useContext, useCallback, useRef, useEffect, ReactNode } from "react";
import type { ContextMenuItem } from "./WidgetContextMenu";

interface WidgetContextValue {
  setContextMenuItems: (items: ContextMenuItem[]) => void;
  getContextMenuItems: () => ContextMenuItem[];
  clearContextMenuItems: () => void;
}

const WidgetContext = createContext<WidgetContextValue | null>(null);

export function useWidgetContext() {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error("useWidgetContext must be used within WidgetContextProvider");
  }
  return context;
}

interface WidgetContextProviderProps {
  children: ReactNode;
  onItemsChange: (items: ContextMenuItem[]) => void;
}

export function WidgetContextProvider({ children, onItemsChange }: WidgetContextProviderProps) {
  // Use ref to store items - no state to avoid re-renders
  const itemsRef = useRef<ContextMenuItem[]>([]);
  const onItemsChangeRef = useRef(onItemsChange);
  
  // Update callback ref when it changes
  useEffect(() => {
    onItemsChangeRef.current = onItemsChange;
  }, [onItemsChange]);

  const setContextMenuItems = useCallback((newItems: ContextMenuItem[]) => {
    itemsRef.current = newItems;
    // Notify parent without causing re-render in provider
    onItemsChangeRef.current(newItems);
  }, []);

  const getContextMenuItems = useCallback(() => {
    return itemsRef.current;
  }, []);

  const clearContextMenuItems = useCallback(() => {
    itemsRef.current = [];
    onItemsChangeRef.current([]);
  }, []);

  return (
    <WidgetContext.Provider value={{ setContextMenuItems, getContextMenuItems, clearContextMenuItems }}>
      {children}
    </WidgetContext.Provider>
  );
}


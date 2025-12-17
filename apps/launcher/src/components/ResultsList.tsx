import { useRef, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useLauncherStore } from "@/stores/launcher";
import { ResultItem } from "./ResultItem";

export function ResultsList() {
  const listRef = useRef<HTMLDivElement>(null);
  const { results, selectedIndex, setSelectedIndex, executeSelected } =
    useLauncherStore();

  useEffect(() => {
    if (listRef.current && results.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex, results.length]);

  if (results.length === 0) {
    return null;
  }

  return (
    <div
      ref={listRef}
      className="flex flex-col py-2 max-h-[360px] overflow-y-auto"
    >
      <AnimatePresence mode="popLayout">
        {results.map((result, index) => (
          <ResultItem
            key={result.id}
            result={result}
            isSelected={index === selectedIndex}
            index={index}
            onSelect={() => setSelectedIndex(index)}
            onExecute={executeSelected}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

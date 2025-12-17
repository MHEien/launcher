import { motion } from "framer-motion";
import { Calculator, AppWindow, File, Terminal, Puzzle } from "lucide-react";
import type { SearchResult, ResultCategory } from "@/types";
import { cn } from "@/lib/utils";

interface ResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  index: number;
  onSelect: () => void;
  onExecute: () => void;
}

function getCategoryIcon(category: ResultCategory) {
  switch (category) {
    case "Calculator":
      return Calculator;
    case "Application":
      return AppWindow;
    case "File":
      return File;
    case "Command":
      return Terminal;
    case "Plugin":
      return Puzzle;
    default:
      return AppWindow;
  }
}

function renderIcon(result: SearchResult) {
  const { icon, category } = result;

  if (icon.type === "Emoji") {
    return <span className="text-xl">{icon.value}</span>;
  }

  if (icon.type === "Text") {
    return <span className="text-sm font-medium truncate max-w-[24px]">{icon.value}</span>;
  }

  const IconComponent = getCategoryIcon(category);
  return <IconComponent className="h-5 w-5" />;
}

export function ResultItem({
  result,
  isSelected,
  index,
  onSelect,
  onExecute,
}: ResultItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: index * 0.02 }}
      onClick={onExecute}
      onMouseEnter={onSelect}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
        "rounded-lg mx-2",
        isSelected
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-md",
          "bg-secondary/50",
          isSelected && "bg-background/20"
        )}
      >
        {renderIcon(result)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{result.title}</div>
        {result.subtitle && (
          <div className="text-sm text-muted-foreground truncate">
            {result.subtitle}
          </div>
        )}
      </div>

      {isSelected && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <kbd className="px-1.5 py-0.5 bg-background/30 rounded text-[10px]">
            ↵
          </kbd>
        </div>
      )}
    </motion.div>
  );
}

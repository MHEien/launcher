import { motion } from "framer-motion";
import { Calculator, AppWindow, File, Terminal, Puzzle, Globe, Github, Cpu } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
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
    case "WebSearch":
      return Globe;
    case "GitHub":
      return Github;
    case "System":
      return Cpu;
    default:
      return AppWindow;
  }
}

function renderIcon(result: SearchResult) {
  const { icon, category } = result;

  if (icon.type === "Emoji") {
    return <span className="text-xl drop-shadow-sm">{icon.value}</span>;
  }

  if (icon.type === "Path") {
    // Convert local file path to asset URL for Tauri webview
    const assetUrl = convertFileSrc(icon.value);
    return (
      <img 
        src={assetUrl} 
        alt="" 
        className="w-5 h-5 object-contain"
        onError={(e) => {
          // Hide broken images and let fallback show
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  if (icon.type === "Text") {
    return <span className="text-sm font-semibold truncate max-w-[24px]">{icon.value}</span>;
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
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        duration: 0.2, 
        delay: index * 0.03,
        ease: [0.175, 0.885, 0.32, 1.275]
      }}
      onClick={onExecute}
      onMouseEnter={onSelect}
      className={cn(
        "result-item relative flex items-center gap-3 px-4 py-3 cursor-pointer",
        "rounded-xl mx-2 transition-all duration-150",
        isSelected
          ? "selected bg-[var(--theme-selected)] shadow-lg"
          : "hover:bg-[var(--theme-hover)]"
      )}
    >
      {/* Icon container with gradient background */}
      <motion.div
        animate={{ 
          scale: isSelected ? 1.05 : 1,
        }}
        transition={{ duration: 0.15 }}
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-xl",
          "transition-all duration-200",
          isSelected 
            ? "bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-secondary,var(--theme-accent-hover))] text-[var(--theme-bg)] shadow-md"
            : "bg-[var(--theme-bg-tertiary)] text-[var(--theme-fg-muted)]"
        )}
        style={isSelected ? {
          boxShadow: `0 4px 15px -2px var(--theme-accent)40`,
        } : undefined}
      >
        {renderIcon(result)}
      </motion.div>

      <div className="flex-1 min-w-0">
        <motion.div 
          className={cn(
            "font-medium truncate transition-colors",
            isSelected ? "text-[var(--theme-fg)]" : "text-[var(--theme-fg)]"
          )}
          animate={{ x: isSelected ? 2 : 0 }}
          transition={{ duration: 0.15 }}
        >
          {result.title}
        </motion.div>
        {result.subtitle && (
          <div className={cn(
            "text-sm truncate transition-colors",
            isSelected ? "text-[var(--theme-fg-muted)]" : "text-[var(--theme-fg-subtle)]"
          )}>
            {result.subtitle}
          </div>
        )}
      </div>

      {/* Category badge */}
      <div className={cn(
        "text-[10px] font-medium px-2 py-0.5 rounded-full transition-all",
        isSelected 
          ? "bg-[var(--theme-accent)] text-[var(--theme-bg)]"
          : "bg-[var(--theme-bg-tertiary)] text-[var(--theme-fg-subtle)]"
      )}>
        {result.category}
      </div>

      {isSelected && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1"
        >
          <kbd className={cn(
            "px-2 py-1 rounded-md text-[10px] font-medium",
            "bg-[var(--theme-bg-tertiary)] text-[var(--theme-fg-muted)]",
            "border border-[var(--theme-border)]"
          )}>
            ↵
          </kbd>
        </motion.div>
      )}
    </motion.div>
  );
}

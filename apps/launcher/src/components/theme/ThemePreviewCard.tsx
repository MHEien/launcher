import { motion } from "framer-motion";
import { Check, Sparkles, Briefcase, Gamepad2, Leaf, Snowflake, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThemePreset, ThemeCategory } from "@/lib/themes";

interface ThemePreviewCardProps {
  theme: ThemePreset;
  isSelected: boolean;
  onSelect: () => void;
  index?: number;
}

const categoryIcons: Record<ThemeCategory, React.ReactNode> = {
  minimal: <Palette className="h-3 w-3" />,
  vibrant: <Sparkles className="h-3 w-3" />,
  gaming: <Gamepad2 className="h-3 w-3" />,
  professional: <Briefcase className="h-3 w-3" />,
  nature: <Leaf className="h-3 w-3" />,
  seasonal: <Snowflake className="h-3 w-3" />,
  custom: <Palette className="h-3 w-3" />,
};

export function ThemePreviewCard({ theme, isSelected, onSelect, index = 0 }: ThemePreviewCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      onClick={onSelect}
      className={cn(
        "group relative w-full rounded-xl overflow-hidden text-left transition-all duration-200",
        "hover:scale-[1.02] active:scale-[0.98]",
        isSelected && "ring-2 ring-offset-2 ring-offset-background"
      )}
      style={{
        ["--card-accent" as string]: theme.colors.accent,
        ["--card-bg" as string]: theme.colors.background,
        ringColor: isSelected ? theme.colors.accent : undefined,
      }}
    >
      {/* Preview gradient background */}
      <div 
        className="h-20 relative overflow-hidden"
        style={{ background: theme.preview }}
      >
        {/* Animated overlay for themes with animation */}
        {theme.gradient?.animated && (
          <div 
            className="absolute inset-0 opacity-50 animated-gradient"
            style={{
              background: `linear-gradient(${theme.gradient.angle || 135}deg, ${theme.gradient.colors.join(", ")})`,
              backgroundSize: "400% 400%",
            }}
          />
        )}
        
        {/* Glow effect preview */}
        {theme.effects.glow !== "none" && (
          <div 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-8 rounded-full blur-xl"
            style={{ 
              background: theme.effects.glowColor || theme.colors.accent,
              opacity: theme.effects.glow === "intense" ? 0.6 : theme.effects.glow === "medium" ? 0.4 : 0.2,
            }}
          />
        )}
        
        {/* Selected checkmark */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: theme.colors.accent }}
          >
            <Check className="h-3 w-3" style={{ color: theme.colors.background }} />
          </motion.div>
        )}
        
        {/* Mini preview UI elements */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1">
          <div 
            className="h-1.5 rounded-full flex-1"
            style={{ background: `${theme.colors.foreground}30` }}
          />
          <div 
            className="h-1.5 w-4 rounded-full"
            style={{ background: theme.colors.accent }}
          />
        </div>
      </div>
      
      {/* Theme info */}
      <div 
        className="p-3 space-y-1"
        style={{ background: theme.colors.backgroundSecondary }}
      >
        <div className="flex items-center justify-between">
          <h4 
            className="font-medium text-sm truncate"
            style={{ color: theme.colors.foreground }}
          >
            {theme.name}
          </h4>
          <span 
            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ 
              background: `${theme.colors.accent}20`,
              color: theme.colors.accent,
            }}
          >
            {categoryIcons[theme.category]}
            {theme.category}
          </span>
        </div>
        <p 
          className="text-xs truncate"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {theme.description}
        </p>
        
        {/* Effect indicators */}
        <div className="flex items-center gap-1.5 pt-1">
          {theme.effects.glow !== "none" && (
            <span 
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{ 
                background: `${theme.colors.accent}15`,
                color: theme.colors.accent,
              }}
            >
              Glow
            </span>
          )}
          {theme.gradient?.animated && (
            <span 
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{ 
                background: `${theme.colors.accent}15`,
                color: theme.colors.accent,
              }}
            >
              Animated
            </span>
          )}
          {theme.effects.glassmorphism && (
            <span 
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{ 
                background: `${theme.colors.accent}15`,
                color: theme.colors.accent,
              }}
            >
              Glass
            </span>
          )}
          {theme.effects.particles && (
            <span 
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{ 
                background: `${theme.colors.accent}15`,
                color: theme.colors.accent,
              }}
            >
              Particles
            </span>
          )}
        </div>
      </div>
      
      {/* Hover border glow */}
      <div 
        className={cn(
          "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none",
          "border"
        )}
        style={{ 
          borderColor: theme.colors.accent,
          boxShadow: `0 0 20px ${theme.colors.accent}40`,
        }}
      />
    </motion.button>
  );
}

export default ThemePreviewCard;

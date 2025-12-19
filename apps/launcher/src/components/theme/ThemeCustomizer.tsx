import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Palette, 
  Sparkles, 
  Gamepad2, 
  Briefcase, 
  Leaf, 
  Snowflake,
  Sun,
  Moon,
  Sliders,
  Eye,
  Zap,
  Layers
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { ThemePreviewCard } from "./ThemePreviewCard";
import { useSettingsStore } from "@/stores/settings";
import { cn } from "@/lib/utils";
import type { ThemeCategory, EffectIntensity } from "@/lib/themes";

const categoryConfig: Record<ThemeCategory, { icon: React.ReactNode; label: string; description: string }> = {
  minimal: { 
    icon: <Palette className="h-4 w-4" />, 
    label: "Minimal", 
    description: "Clean and focused designs" 
  },
  vibrant: { 
    icon: <Sparkles className="h-4 w-4" />, 
    label: "Vibrant", 
    description: "Colorful and energetic" 
  },
  gaming: { 
    icon: <Gamepad2 className="h-4 w-4" />, 
    label: "Gaming", 
    description: "Bold RGB aesthetics" 
  },
  professional: { 
    icon: <Briefcase className="h-4 w-4" />, 
    label: "Professional", 
    description: "Elegant business themes" 
  },
  nature: { 
    icon: <Leaf className="h-4 w-4" />, 
    label: "Nature", 
    description: "Earth-inspired colors" 
  },
  seasonal: { 
    icon: <Snowflake className="h-4 w-4" />, 
    label: "Seasonal", 
    description: "Holiday and season themes" 
  },
  custom: { 
    icon: <Sliders className="h-4 w-4" />, 
    label: "Custom", 
    description: "Your custom themes" 
  },
};

export function ThemeCustomizer() {
  const { currentTheme, themeId, setTheme, themes, categories } = useTheme();
  const { settings, updateLauncherTheme } = useSettingsStore();
  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory | "all">("all");
  const [activeTab, setActiveTab] = useState<"gallery" | "customize">("gallery");
  
  // Filter themes by category
  const filteredThemes = useMemo(() => {
    if (selectedCategory === "all") return themes;
    return themes.filter((t) => t.category === selectedCategory);
  }, [themes, selectedCategory]);
  
  // Group themes by dark/light
  const { darkThemes, lightThemes } = useMemo(() => {
    return {
      darkThemes: filteredThemes.filter((t) => t.isDark),
      lightThemes: filteredThemes.filter((t) => !t.isDark),
    };
  }, [filteredThemes]);
  
  // Get current effect settings from launcher_theme or use defaults
  const currentEffects = useMemo(() => ({
    blur: settings?.launcher_theme?.blur_intensity ?? currentTheme.effects.blur,
    opacity: settings?.launcher_theme?.opacity ?? currentTheme.effects.opacity,
    glow: settings?.launcher_theme?.glow_intensity ?? currentTheme.effects.glow,
  }), [settings?.launcher_theme, currentTheme]);
  
  const handleBlurChange = async (value: number) => {
    await updateLauncherTheme({ blur_intensity: value });
  };
  
  const handleOpacityChange = async (value: number) => {
    await updateLauncherTheme({ opacity: value });
  };
  
  const handleGlowChange = async (intensity: EffectIntensity) => {
    await updateLauncherTheme({ glow_intensity: intensity });
  };

  return (
    <div className="space-y-6">
      {/* Header with tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ 
              background: `linear-gradient(135deg, ${currentTheme.colors.accent}, ${currentTheme.colors.accentSecondary || currentTheme.colors.accentHover})`,
            }}
          >
            <Palette className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Theme Customization</h3>
            <p className="text-xs text-muted-foreground">
              Current: {currentTheme.name}
            </p>
          </div>
        </div>
        
        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg">
          <button
            onClick={() => setActiveTab("gallery")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              activeTab === "gallery" 
                ? "bg-primary/20 text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Eye className="h-3 w-3 inline mr-1" />
            Gallery
          </button>
          <button
            onClick={() => setActiveTab("customize")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              activeTab === "customize" 
                ? "bg-primary/20 text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sliders className="h-3 w-3 inline mr-1" />
            Customize
          </button>
        </div>
      </div>
      
      <AnimatePresence mode="wait">
        {activeTab === "gallery" ? (
          <motion.div
            key="gallery"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Category filters */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                  selectedCategory === "all"
                    ? "bg-primary/20 text-primary"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Layers className="h-3 w-3 inline mr-1" />
                All Themes
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1",
                    selectedCategory === category
                      ? "bg-primary/20 text-primary"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {categoryConfig[category].icon}
                  {categoryConfig[category].label}
                </button>
              ))}
            </div>
            
            {/* Dark themes section */}
            {darkThemes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Moon className="h-3 w-3" />
                  Dark Themes ({darkThemes.length})
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {darkThemes.map((theme, index) => (
                    <ThemePreviewCard
                      key={theme.id}
                      theme={theme}
                      isSelected={themeId === theme.id}
                      onSelect={() => setTheme(theme.id)}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Light themes section */}
            {lightThemes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Sun className="h-3 w-3" />
                  Light Themes ({lightThemes.length})
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {lightThemes.map((theme, index) => (
                    <ThemePreviewCard
                      key={theme.id}
                      theme={theme}
                      isSelected={themeId === theme.id}
                      onSelect={() => setTheme(theme.id)}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="customize"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Current theme preview */}
            <div 
              className="p-4 rounded-xl relative overflow-hidden"
              style={{ 
                background: currentTheme.preview,
              }}
            >
              {currentTheme.gradient?.animated && (
                <div 
                  className="absolute inset-0 animated-gradient"
                  style={{
                    background: `linear-gradient(${currentTheme.gradient.angle || 135}deg, ${currentTheme.gradient.colors.join(", ")})`,
                    backgroundSize: "400% 400%",
                    opacity: 0.7,
                  }}
                />
              )}
              <div className="relative z-10">
                <h4 
                  className="font-semibold text-lg"
                  style={{ color: currentTheme.colors.foreground }}
                >
                  {currentTheme.name}
                </h4>
                <p 
                  className="text-sm opacity-80"
                  style={{ color: currentTheme.colors.foreground }}
                >
                  {currentTheme.description}
                </p>
              </div>
            </div>
            
            {/* Effect customization */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Visual Effects
              </h4>
              
              {/* Blur intensity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Blur Intensity</label>
                  <span className="text-xs font-mono text-primary">{currentEffects.blur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={currentEffects.blur}
                  onChange={(e) => handleBlurChange(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              {/* Opacity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Window Opacity</label>
                  <span className="text-xs font-mono text-primary">{currentEffects.opacity}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={currentEffects.opacity}
                  onChange={(e) => handleOpacityChange(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              {/* Glow intensity */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground block">Glow Effect</label>
                <div className="flex gap-2">
                  {(["none", "subtle", "medium", "intense"] as EffectIntensity[]).map((intensity) => (
                    <button
                      key={intensity}
                      onClick={() => handleGlowChange(intensity)}
                      className={cn(
                        "flex-1 py-2 text-xs font-medium rounded-lg transition-all capitalize",
                        currentEffects.glow === intensity
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-transparent"
                      )}
                    >
                      {intensity}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Color preview */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Theme Colors</h4>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Accent", color: currentTheme.colors.accent },
                  { label: "Secondary", color: currentTheme.colors.accentSecondary || currentTheme.colors.accentHover },
                  { label: "Success", color: currentTheme.colors.success },
                  { label: "Error", color: currentTheme.colors.error },
                ].map(({ label, color }) => (
                  <div key={label} className="text-center">
                    <div 
                      className="w-full aspect-square rounded-lg mb-1 border border-border/50"
                      style={{ background: color }}
                    />
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Effect tags */}
            <div className="flex flex-wrap gap-2">
              {currentTheme.effects.glassmorphism && (
                <span className="badge badge-primary">Glassmorphism</span>
              )}
              {currentTheme.effects.noise && (
                <span className="badge badge-primary">Noise Texture</span>
              )}
              {currentTheme.gradient?.animated && (
                <span className="badge badge-primary">Animated Gradient</span>
              )}
              {currentTheme.effects.shimmer && (
                <span className="badge badge-primary">Shimmer Effect</span>
              )}
              {currentTheme.effects.borderGlow && (
                <span className="badge badge-primary">Border Glow</span>
              )}
              {currentTheme.effects.particles && (
                <span className="badge badge-primary">Particles</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ThemeCustomizer;

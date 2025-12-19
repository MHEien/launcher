// ============================================================================
// THEME SYSTEM - Stunning visual themes for the launcher
// ============================================================================

export type ThemeCategory = 
  | "minimal" 
  | "vibrant" 
  | "gaming" 
  | "professional" 
  | "nature" 
  | "seasonal"
  | "custom";

export type EffectIntensity = "none" | "subtle" | "medium" | "intense";

export interface ThemeColors {
  // Background
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  
  // Foreground
  foreground: string;
  foregroundMuted: string;
  foregroundSubtle: string;
  
  // Accent colors
  accent: string;
  accentHover: string;
  accentMuted: string;
  
  // Secondary accent (for gradients)
  accentSecondary?: string;
  accentTertiary?: string;
  
  // UI elements
  border: string;
  borderSubtle: string;
  
  // Interactive states
  hover: string;
  active: string;
  selected: string;
  
  // Status
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface ThemeGradient {
  type: "linear" | "radial" | "conic" | "mesh";
  colors: string[];
  angle?: number;
  positions?: string[];
  animated?: boolean;
  animationDuration?: number;
}

export interface ThemeEffects {
  blur: number;
  opacity: number;
  glow: EffectIntensity;
  glowColor?: string;
  glassmorphism: boolean;
  noise: boolean;
  noiseOpacity?: number;
  particles?: boolean;
  particleColor?: string;
  shimmer?: boolean;
  borderGlow?: boolean;
}

export interface ThemeTypography {
  fontFamily?: string;
  fontWeight?: string;
  letterSpacing?: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  category: ThemeCategory;
  preview: string; // Gradient or color for preview card
  colors: ThemeColors;
  gradient?: ThemeGradient;
  effects: ThemeEffects;
  typography?: ThemeTypography;
  isDark: boolean;
}

// ============================================================================
// THEME PRESETS
// ============================================================================

export const themePresets: ThemePreset[] = [
  // -------------------------------------------------------------------------
  // MINIMAL THEMES
  // -------------------------------------------------------------------------
  {
    id: "midnight-dark",
    name: "Midnight Dark",
    description: "Clean, minimal dark theme for focus",
    category: "minimal",
    preview: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
    isDark: true,
    colors: {
      background: "#0a0a0a",
      backgroundSecondary: "#141414",
      backgroundTertiary: "#1e1e1e",
      foreground: "#fafafa",
      foregroundMuted: "#a0a0a0",
      foregroundSubtle: "#666666",
      accent: "#3b82f6",
      accentHover: "#60a5fa",
      accentMuted: "#3b82f620",
      border: "#2a2a2a",
      borderSubtle: "#1a1a1a",
      hover: "#ffffff10",
      active: "#ffffff15",
      selected: "#3b82f620",
      success: "#22c55e",
      warning: "#eab308",
      error: "#ef4444",
      info: "#3b82f6",
    },
    effects: {
      blur: 20,
      opacity: 95,
      glow: "none",
      glassmorphism: true,
      noise: false,
    },
  },
  {
    id: "snow-white",
    name: "Snow White",
    description: "Bright and airy light theme",
    category: "minimal",
    preview: "linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)",
    isDark: false,
    colors: {
      background: "#ffffff",
      backgroundSecondary: "#f8f8f8",
      backgroundTertiary: "#f0f0f0",
      foreground: "#0a0a0a",
      foregroundMuted: "#666666",
      foregroundSubtle: "#999999",
      accent: "#2563eb",
      accentHover: "#1d4ed8",
      accentMuted: "#2563eb15",
      border: "#e0e0e0",
      borderSubtle: "#f0f0f0",
      hover: "#00000008",
      active: "#00000012",
      selected: "#2563eb15",
      success: "#16a34a",
      warning: "#ca8a04",
      error: "#dc2626",
      info: "#2563eb",
    },
    effects: {
      blur: 16,
      opacity: 98,
      glow: "none",
      glassmorphism: true,
      noise: false,
    },
  },

  // -------------------------------------------------------------------------
  // VIBRANT THEMES
  // -------------------------------------------------------------------------
  {
    id: "neon-dreams",
    name: "Neon Dreams",
    description: "Cyberpunk-inspired neon glow",
    category: "vibrant",
    preview: "linear-gradient(135deg, #0f0f23 0%, #1a0a2e 50%, #16213e 100%)",
    isDark: true,
    colors: {
      background: "#0f0f23",
      backgroundSecondary: "#1a1a35",
      backgroundTertiary: "#252550",
      foreground: "#f0f0ff",
      foregroundMuted: "#a0a0d0",
      foregroundSubtle: "#6060a0",
      accent: "#00f5ff",
      accentHover: "#00d4ff",
      accentMuted: "#00f5ff20",
      accentSecondary: "#ff00ff",
      accentTertiary: "#ff6b6b",
      border: "#3030a040",
      borderSubtle: "#2020a020",
      hover: "#ffffff15",
      active: "#ffffff20",
      selected: "#00f5ff25",
      success: "#00ff88",
      warning: "#ffcc00",
      error: "#ff4466",
      info: "#00f5ff",
    },
    gradient: {
      type: "mesh",
      colors: ["#00f5ff", "#ff00ff", "#ff6b6b"],
      animated: true,
      animationDuration: 20,
    },
    effects: {
      blur: 24,
      opacity: 88,
      glow: "intense",
      glowColor: "#00f5ff",
      glassmorphism: true,
      noise: true,
      noiseOpacity: 0.03,
      shimmer: true,
      borderGlow: true,
    },
  },
  {
    id: "aurora-borealis",
    name: "Aurora Borealis",
    description: "Northern lights dancing in the sky",
    category: "vibrant",
    preview: "linear-gradient(135deg, #0a1628 0%, #1a3a4a 50%, #0d2818 100%)",
    isDark: true,
    colors: {
      background: "#0a1628",
      backgroundSecondary: "#0f2030",
      backgroundTertiary: "#152838",
      foreground: "#e8fff8",
      foregroundMuted: "#88ccbb",
      foregroundSubtle: "#4a9988",
      accent: "#00ffc8",
      accentHover: "#00e6b4",
      accentMuted: "#00ffc820",
      accentSecondary: "#4facfe",
      accentTertiary: "#f5576c",
      border: "#00ffc830",
      borderSubtle: "#00ffc815",
      hover: "#ffffff12",
      active: "#ffffff18",
      selected: "#00ffc825",
      success: "#00ffc8",
      warning: "#ffeaa7",
      error: "#f5576c",
      info: "#4facfe",
    },
    gradient: {
      type: "linear",
      colors: ["#00ffc8", "#4facfe", "#f5576c"],
      angle: 135,
      animated: true,
      animationDuration: 15,
    },
    effects: {
      blur: 22,
      opacity: 85,
      glow: "medium",
      glowColor: "#00ffc8",
      glassmorphism: true,
      noise: true,
      noiseOpacity: 0.02,
      shimmer: true,
      borderGlow: true,
    },
  },
  {
    id: "sunset-vibes",
    name: "Sunset Vibes",
    description: "Warm golden hour colors",
    category: "vibrant",
    preview: "linear-gradient(135deg, #1a0a0a 0%, #2d1810 50%, #1a1205 100%)",
    isDark: true,
    colors: {
      background: "#1a0a0a",
      backgroundSecondary: "#251412",
      backgroundTertiary: "#302018",
      foreground: "#fff5e8",
      foregroundMuted: "#d4a574",
      foregroundSubtle: "#8b6b4a",
      accent: "#ff6b35",
      accentHover: "#ff8855",
      accentMuted: "#ff6b3520",
      accentSecondary: "#f7931e",
      accentTertiary: "#ffd700",
      border: "#ff6b3530",
      borderSubtle: "#ff6b3515",
      hover: "#ffffff12",
      active: "#ffffff18",
      selected: "#ff6b3525",
      success: "#7ed321",
      warning: "#f7931e",
      error: "#ff4444",
      info: "#4a90d9",
    },
    gradient: {
      type: "linear",
      colors: ["#ff6b35", "#f7931e", "#ffd700"],
      angle: 135,
      animated: true,
      animationDuration: 12,
    },
    effects: {
      blur: 20,
      opacity: 88,
      glow: "medium",
      glowColor: "#ff6b35",
      glassmorphism: true,
      noise: true,
      noiseOpacity: 0.025,
      borderGlow: true,
    },
  },

  // -------------------------------------------------------------------------
  // GAMING THEMES
  // -------------------------------------------------------------------------
  {
    id: "rgb-gamer",
    name: "RGB Gamer",
    description: "Full RGB spectrum for gamers",
    category: "gaming",
    preview: "linear-gradient(135deg, #0a0a0a 0%, #1a0a1a 50%, #0a0a1a 100%)",
    isDark: true,
    colors: {
      background: "#0a0a0a",
      backgroundSecondary: "#121218",
      backgroundTertiary: "#1a1a24",
      foreground: "#ffffff",
      foregroundMuted: "#b0b0c0",
      foregroundSubtle: "#6666aa",
      accent: "#ff0080",
      accentHover: "#ff1a8c",
      accentMuted: "#ff008020",
      accentSecondary: "#00ff80",
      accentTertiary: "#8000ff",
      border: "#ffffff20",
      borderSubtle: "#ffffff10",
      hover: "#ffffff15",
      active: "#ffffff20",
      selected: "#ff008025",
      success: "#00ff80",
      warning: "#ffff00",
      error: "#ff0040",
      info: "#00c8ff",
    },
    gradient: {
      type: "conic",
      colors: ["#ff0000", "#ff8000", "#ffff00", "#80ff00", "#00ff00", "#00ff80", "#00ffff", "#0080ff", "#0000ff", "#8000ff", "#ff00ff", "#ff0080", "#ff0000"],
      animated: true,
      animationDuration: 10,
    },
    effects: {
      blur: 20,
      opacity: 90,
      glow: "intense",
      glowColor: "#ff0080",
      glassmorphism: true,
      noise: true,
      noiseOpacity: 0.04,
      shimmer: true,
      borderGlow: true,
      particles: true,
      particleColor: "#ffffff",
    },
  },
  {
    id: "matrix-code",
    name: "Matrix Code",
    description: "Digital rain aesthetic",
    category: "gaming",
    preview: "linear-gradient(135deg, #000000 0%, #001a00 50%, #000a00 100%)",
    isDark: true,
    colors: {
      background: "#000000",
      backgroundSecondary: "#001500",
      backgroundTertiary: "#002000",
      foreground: "#00ff00",
      foregroundMuted: "#00cc00",
      foregroundSubtle: "#008800",
      accent: "#00ff00",
      accentHover: "#00ff44",
      accentMuted: "#00ff0025",
      accentSecondary: "#88ff88",
      border: "#00ff0030",
      borderSubtle: "#00ff0015",
      hover: "#00ff0015",
      active: "#00ff0020",
      selected: "#00ff0030",
      success: "#00ff00",
      warning: "#ccff00",
      error: "#ff0000",
      info: "#00ccff",
    },
    gradient: {
      type: "linear",
      colors: ["#00ff00", "#00cc00"],
      angle: 180,
      animated: true,
      animationDuration: 5,
    },
    effects: {
      blur: 16,
      opacity: 92,
      glow: "intense",
      glowColor: "#00ff00",
      glassmorphism: true,
      noise: true,
      noiseOpacity: 0.05,
      shimmer: true,
      borderGlow: true,
    },
  },
  {
    id: "dragon-fire",
    name: "Dragon Fire",
    description: "Fierce flames for warriors",
    category: "gaming",
    preview: "linear-gradient(135deg, #1a0500 0%, #2d0a00 50%, #1a0800 100%)",
    isDark: true,
    colors: {
      background: "#1a0500",
      backgroundSecondary: "#250a05",
      backgroundTertiary: "#301008",
      foreground: "#fff5e0",
      foregroundMuted: "#ffb380",
      foregroundSubtle: "#aa6644",
      accent: "#ff4400",
      accentHover: "#ff6622",
      accentMuted: "#ff440025",
      accentSecondary: "#ff8800",
      accentTertiary: "#ffcc00",
      border: "#ff440035",
      borderSubtle: "#ff440018",
      hover: "#ff440015",
      active: "#ff440025",
      selected: "#ff440035",
      success: "#88ff00",
      warning: "#ffcc00",
      error: "#ff0000",
      info: "#ff8800",
    },
    gradient: {
      type: "linear",
      colors: ["#ff4400", "#ff8800", "#ffcc00"],
      angle: 135,
      animated: true,
      animationDuration: 8,
    },
    effects: {
      blur: 18,
      opacity: 90,
      glow: "intense",
      glowColor: "#ff4400",
      glassmorphism: true,
      noise: true,
      noiseOpacity: 0.04,
      shimmer: true,
      borderGlow: true,
    },
  },

  // -------------------------------------------------------------------------
  // PROFESSIONAL THEMES
  // -------------------------------------------------------------------------
  {
    id: "corporate-blue",
    name: "Corporate Blue",
    description: "Professional and trustworthy",
    category: "professional",
    preview: "linear-gradient(135deg, #0a1929 0%, #132f4c 100%)",
    isDark: true,
    colors: {
      background: "#0a1929",
      backgroundSecondary: "#0f2744",
      backgroundTertiary: "#15345a",
      foreground: "#ffffff",
      foregroundMuted: "#94a3b8",
      foregroundSubtle: "#64748b",
      accent: "#3399ff",
      accentHover: "#5cb3ff",
      accentMuted: "#3399ff20",
      border: "#3399ff30",
      borderSubtle: "#3399ff15",
      hover: "#ffffff08",
      active: "#ffffff12",
      selected: "#3399ff20",
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#3399ff",
    },
    effects: {
      blur: 20,
      opacity: 95,
      glow: "subtle",
      glowColor: "#3399ff",
      glassmorphism: true,
      noise: false,
    },
  },
  {
    id: "executive-dark",
    name: "Executive Dark",
    description: "Elegant and sophisticated",
    category: "professional",
    preview: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)",
    isDark: true,
    colors: {
      background: "#1a1a1a",
      backgroundSecondary: "#242424",
      backgroundTertiary: "#2e2e2e",
      foreground: "#f8f8f8",
      foregroundMuted: "#a8a8a8",
      foregroundSubtle: "#686868",
      accent: "#c9a962",
      accentHover: "#d4b872",
      accentMuted: "#c9a96220",
      border: "#c9a96230",
      borderSubtle: "#c9a96215",
      hover: "#ffffff08",
      active: "#ffffff12",
      selected: "#c9a96220",
      success: "#4ade80",
      warning: "#fbbf24",
      error: "#f87171",
      info: "#60a5fa",
    },
    effects: {
      blur: 18,
      opacity: 95,
      glow: "subtle",
      glowColor: "#c9a962",
      glassmorphism: true,
      noise: false,
    },
  },

  // -------------------------------------------------------------------------
  // NATURE THEMES
  // -------------------------------------------------------------------------
  {
    id: "forest-depths",
    name: "Forest Depths",
    description: "Deep forest green tranquility",
    category: "nature",
    preview: "linear-gradient(135deg, #0a1a0f 0%, #0f2a18 50%, #051510 100%)",
    isDark: true,
    colors: {
      background: "#0a1a0f",
      backgroundSecondary: "#0f2518",
      backgroundTertiary: "#153020",
      foreground: "#e8fff0",
      foregroundMuted: "#88cc99",
      foregroundSubtle: "#4a8855",
      accent: "#22c55e",
      accentHover: "#4ade80",
      accentMuted: "#22c55e20",
      accentSecondary: "#34d399",
      border: "#22c55e30",
      borderSubtle: "#22c55e15",
      hover: "#ffffff10",
      active: "#ffffff15",
      selected: "#22c55e25",
      success: "#22c55e",
      warning: "#eab308",
      error: "#ef4444",
      info: "#06b6d4",
    },
    gradient: {
      type: "linear",
      colors: ["#22c55e", "#34d399", "#10b981"],
      angle: 135,
      animated: true,
      animationDuration: 20,
    },
    effects: {
      blur: 20,
      opacity: 88,
      glow: "subtle",
      glowColor: "#22c55e",
      glassmorphism: true,
      noise: true,
      noiseOpacity: 0.02,
    },
  },
  {
    id: "ocean-depths",
    name: "Ocean Depths",
    description: "Calm deep sea blues",
    category: "nature",
    preview: "linear-gradient(135deg, #050a18 0%, #0a1828 50%, #051020 100%)",
    isDark: true,
    colors: {
      background: "#050a18",
      backgroundSecondary: "#0a1525",
      backgroundTertiary: "#0f2030",
      foreground: "#e0f4ff",
      foregroundMuted: "#7eb8dd",
      foregroundSubtle: "#4080aa",
      accent: "#06b6d4",
      accentHover: "#22d3ee",
      accentMuted: "#06b6d420",
      accentSecondary: "#0ea5e9",
      border: "#06b6d430",
      borderSubtle: "#06b6d415",
      hover: "#ffffff10",
      active: "#ffffff15",
      selected: "#06b6d425",
      success: "#34d399",
      warning: "#fbbf24",
      error: "#f87171",
      info: "#06b6d4",
    },
    gradient: {
      type: "linear",
      colors: ["#06b6d4", "#0ea5e9", "#3b82f6"],
      angle: 135,
      animated: true,
      animationDuration: 25,
    },
    effects: {
      blur: 22,
      opacity: 86,
      glow: "subtle",
      glowColor: "#06b6d4",
      glassmorphism: true,
      noise: true,
      noiseOpacity: 0.015,
    },
  },

  // -------------------------------------------------------------------------
  // SEASONAL THEMES
  // -------------------------------------------------------------------------
  {
    id: "cherry-blossom",
    name: "Cherry Blossom",
    description: "Spring sakura petals",
    category: "seasonal",
    preview: "linear-gradient(135deg, #1a0f15 0%, #2a1520 50%, #1a1018 100%)",
    isDark: true,
    colors: {
      background: "#1a0f15",
      backgroundSecondary: "#251520",
      backgroundTertiary: "#301a28",
      foreground: "#fff5f8",
      foregroundMuted: "#dda0b8",
      foregroundSubtle: "#aa6080",
      accent: "#ff6b9d",
      accentHover: "#ff8bb5",
      accentMuted: "#ff6b9d20",
      accentSecondary: "#ffb7ce",
      border: "#ff6b9d30",
      borderSubtle: "#ff6b9d15",
      hover: "#ffffff10",
      active: "#ffffff15",
      selected: "#ff6b9d25",
      success: "#4ade80",
      warning: "#fbbf24",
      error: "#f87171",
      info: "#60a5fa",
    },
    gradient: {
      type: "linear",
      colors: ["#ff6b9d", "#ffb7ce", "#ffc8dd"],
      angle: 135,
      animated: true,
      animationDuration: 18,
    },
    effects: {
      blur: 20,
      opacity: 88,
      glow: "medium",
      glowColor: "#ff6b9d",
      glassmorphism: true,
      noise: true,
      noiseOpacity: 0.02,
      particles: true,
      particleColor: "#ffb7ce",
    },
  },
  {
    id: "autumn-leaves",
    name: "Autumn Leaves",
    description: "Fall colors warmth",
    category: "seasonal",
    preview: "linear-gradient(135deg, #1a0f05 0%, #2a1508 50%, #1a1005 100%)",
    isDark: true,
    colors: {
      background: "#1a0f05",
      backgroundSecondary: "#251810",
      backgroundTertiary: "#302015",
      foreground: "#fff5e8",
      foregroundMuted: "#d4a574",
      foregroundSubtle: "#9a6b44",
      accent: "#e67e22",
      accentHover: "#f39c12",
      accentMuted: "#e67e2220",
      accentSecondary: "#c0392b",
      accentTertiary: "#f1c40f",
      border: "#e67e2230",
      borderSubtle: "#e67e2215",
      hover: "#ffffff10",
      active: "#ffffff15",
      selected: "#e67e2225",
      success: "#27ae60",
      warning: "#f1c40f",
      error: "#c0392b",
      info: "#3498db",
    },
    gradient: {
      type: "linear",
      colors: ["#e67e22", "#c0392b", "#f1c40f"],
      angle: 135,
      animated: true,
      animationDuration: 20,
    },
    effects: {
      blur: 20,
      opacity: 88,
      glow: "subtle",
      glowColor: "#e67e22",
      glassmorphism: true,
      noise: true,
      noiseOpacity: 0.025,
    },
  },
  {
    id: "winter-frost",
    name: "Winter Frost",
    description: "Icy blue winter wonderland",
    category: "seasonal",
    preview: "linear-gradient(135deg, #0a1520 0%, #102030 50%, #081825 100%)",
    isDark: true,
    colors: {
      background: "#0a1520",
      backgroundSecondary: "#102535",
      backgroundTertiary: "#153045",
      foreground: "#f0faff",
      foregroundMuted: "#a0d0e8",
      foregroundSubtle: "#6090b0",
      accent: "#87ceeb",
      accentHover: "#a0dcf5",
      accentMuted: "#87ceeb25",
      accentSecondary: "#e0f5ff",
      border: "#87ceeb30",
      borderSubtle: "#87ceeb15",
      hover: "#ffffff10",
      active: "#ffffff15",
      selected: "#87ceeb25",
      success: "#48dbfb",
      warning: "#ffeaa7",
      error: "#ff6b6b",
      info: "#87ceeb",
    },
    gradient: {
      type: "linear",
      colors: ["#87ceeb", "#e0f5ff", "#a0dcf5"],
      angle: 135,
      animated: true,
      animationDuration: 25,
    },
    effects: {
      blur: 22,
      opacity: 86,
      glow: "medium",
      glowColor: "#87ceeb",
      glassmorphism: true,
      noise: true,
      noiseOpacity: 0.03,
      shimmer: true,
      particles: true,
      particleColor: "#e0f5ff",
    },
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getThemeById(id: string): ThemePreset | undefined {
  return themePresets.find((theme) => theme.id === id);
}

export function getThemesByCategory(category: ThemeCategory): ThemePreset[] {
  return themePresets.filter((theme) => theme.category === category);
}

export function generateCSSVariables(theme: ThemePreset): Record<string, string> {
  const { colors, effects, gradient } = theme;
  
  const vars: Record<string, string> = {
    // Background colors
    "--theme-bg": colors.background,
    "--theme-bg-secondary": colors.backgroundSecondary,
    "--theme-bg-tertiary": colors.backgroundTertiary,
    
    // Foreground colors
    "--theme-fg": colors.foreground,
    "--theme-fg-muted": colors.foregroundMuted,
    "--theme-fg-subtle": colors.foregroundSubtle,
    
    // Accent colors
    "--theme-accent": colors.accent,
    "--theme-accent-hover": colors.accentHover,
    "--theme-accent-muted": colors.accentMuted,
    
    // Borders
    "--theme-border": colors.border,
    "--theme-border-subtle": colors.borderSubtle,
    
    // Interactive states
    "--theme-hover": colors.hover,
    "--theme-active": colors.active,
    "--theme-selected": colors.selected,
    
    // Status colors
    "--theme-success": colors.success,
    "--theme-warning": colors.warning,
    "--theme-error": colors.error,
    "--theme-info": colors.info,
    
    // Effects
    "--theme-blur": `${effects.blur}px`,
    "--theme-opacity": `${effects.opacity}%`,
  };
  
  // Add secondary/tertiary accent if present
  if (colors.accentSecondary) {
    vars["--theme-accent-secondary"] = colors.accentSecondary;
  }
  if (colors.accentTertiary) {
    vars["--theme-accent-tertiary"] = colors.accentTertiary;
  }
  
  // Add glow color
  if (effects.glowColor) {
    vars["--theme-glow-color"] = effects.glowColor;
  }
  
  // Generate gradient
  if (gradient) {
    if (gradient.type === "linear") {
      vars["--theme-gradient"] = `linear-gradient(${gradient.angle || 135}deg, ${gradient.colors.join(", ")})`;
    } else if (gradient.type === "radial") {
      vars["--theme-gradient"] = `radial-gradient(ellipse at center, ${gradient.colors.join(", ")})`;
    } else if (gradient.type === "conic") {
      vars["--theme-gradient"] = `conic-gradient(from 0deg, ${gradient.colors.join(", ")})`;
    }
    
    vars["--theme-gradient-colors"] = gradient.colors.join(", ");
    vars["--theme-gradient-animated"] = gradient.animated ? "1" : "0";
    vars["--theme-gradient-duration"] = `${gradient.animationDuration || 15}s`;
  }
  
  // Effect flags
  vars["--theme-glow-intensity"] = effects.glow === "intense" ? "1" : effects.glow === "medium" ? "0.6" : effects.glow === "subtle" ? "0.3" : "0";
  vars["--theme-glassmorphism"] = effects.glassmorphism ? "1" : "0";
  vars["--theme-noise-opacity"] = `${effects.noiseOpacity || 0}`;
  vars["--theme-has-particles"] = effects.particles ? "1" : "0";
  vars["--theme-has-shimmer"] = effects.shimmer ? "1" : "0";
  vars["--theme-has-border-glow"] = effects.borderGlow ? "1" : "0";
  
  if (effects.particleColor) {
    vars["--theme-particle-color"] = effects.particleColor;
  }
  
  return vars;
}

export const defaultThemeId = "neon-dreams";

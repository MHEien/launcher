import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useSettingsStore } from "@/stores/settings";
import { 
  themePresets, 
  defaultThemeId, 
  generateCSSVariables, 
  getThemeById,
  type ThemePreset, 
  type ThemeCategory 
} from "@/lib/themes";

interface ThemeContextValue {
  currentTheme: ThemePreset;
  themeId: string;
  setTheme: (themeId: string) => Promise<void>;
  themes: ThemePreset[];
  getThemesByCategory: (category: ThemeCategory) => ThemePreset[];
  categories: ThemeCategory[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { settings, updateLauncherTheme } = useSettingsStore();
  
  // Get current theme ID from settings, fallback to default
  const themeId = settings?.launcher_theme?.theme_id || defaultThemeId;
  
  // Get the current theme preset
  const currentTheme = useMemo(() => {
    return getThemeById(themeId) || themePresets[0];
  }, [themeId]);
  
  // Generate CSS variables from theme
  const cssVariables = useMemo(() => {
    return generateCSSVariables(currentTheme);
  }, [currentTheme]);
  
  // Apply CSS variables to document root
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply all CSS variables
    Object.entries(cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    // Set color scheme
    root.style.colorScheme = currentTheme.isDark ? "dark" : "light";
    
    // Add/remove effect classes from body
    const body = document.body;
    
    // Handle glow effect
    if (currentTheme.effects.glow !== "none") {
      body.classList.add("has-glow");
    } else {
      body.classList.remove("has-glow");
    }
    
    // Handle noise effect
    if (currentTheme.effects.noise) {
      body.classList.add("has-noise");
    } else {
      body.classList.remove("has-noise");
    }
    
    // Handle particles
    if (currentTheme.effects.particles) {
      body.classList.add("has-particles");
    } else {
      body.classList.remove("has-particles");
    }
    
    // Handle shimmer
    if (currentTheme.effects.shimmer) {
      body.classList.add("has-shimmer");
    } else {
      body.classList.remove("has-shimmer");
    }
    
    // Handle border glow
    if (currentTheme.effects.borderGlow) {
      body.classList.add("has-border-glow");
    } else {
      body.classList.remove("has-border-glow");
    }
    
    return () => {
      // Cleanup classes on unmount
      body.classList.remove("has-glow", "has-noise", "has-particles", "has-shimmer", "has-border-glow");
    };
  }, [cssVariables, currentTheme]);
  
  // Set theme function
  const setTheme = async (newThemeId: string) => {
    await updateLauncherTheme({ theme_id: newThemeId });
  };
  
  // Get themes by category
  const getThemesByCategoryFn = (category: ThemeCategory) => {
    return themePresets.filter((theme) => theme.category === category);
  };
  
  // Get all unique categories
  const categories = useMemo(() => {
    const uniqueCategories = new Set(themePresets.map((t) => t.category));
    return Array.from(uniqueCategories) as ThemeCategory[];
  }, []);
  
  const contextValue = useMemo(
    () => ({
      currentTheme,
      themeId,
      setTheme,
      themes: themePresets,
      getThemesByCategory: getThemesByCategoryFn,
      categories,
    }),
    [currentTheme, themeId, categories]
  );
  
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;

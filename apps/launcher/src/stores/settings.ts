import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { 
  UserSettings, 
  WidgetPlacement, 
  WidgetTheme,
  DashboardSettings,
  LauncherTheme,
  SearchResult 
} from "@/types";

interface SettingsState {
  settings: UserSettings | null;
  suggestedApps: SearchResult[];
  isLoading: boolean;
  isInitialized: boolean;

  // Selected widget for configuration panel
  selectedWidgetId: string | null;
  configPanelOpen: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;

  // Window
  setWindowPosition: (x: number, y: number) => Promise<void>;
  setWindowSize: (width: number, height: number) => Promise<void>;

  // Dashboard
  toggleDashboard: (enabled: boolean) => Promise<void>;
  setShowSuggestedApps: (show: boolean) => Promise<void>;
  setSuggestedAppsCount: (count: number) => Promise<void>;
  updateDashboardSettings: (settings: Partial<DashboardSettings>) => Promise<void>;

  // Window behavior
  toggleCloseOnBlur: (closeOnBlur: boolean) => Promise<void>;

  // Widgets
  updateWidgetLayout: (layout: WidgetPlacement[]) => Promise<void>;
  addWidget: (widget: WidgetPlacement) => Promise<void>;
  removeWidget: (instanceId: string) => Promise<void>;
  updateWidgetPosition: (instanceId: string, x: number, y: number) => Promise<void>;
  updateWidgetSize: (instanceId: string, width: number, height: number) => Promise<void>;
  updateWidgetConfig: (instanceId: string, config: Record<string, unknown> | null) => Promise<void>;
  updateWidgetTheme: (instanceId: string, theme: WidgetTheme | null) => Promise<void>;
  updateWidgetZIndex: (instanceId: string, zIndex: number) => Promise<void>;
  bringWidgetToFront: (instanceId: string) => Promise<void>;
  sendWidgetToBack: (instanceId: string) => Promise<void>;

  // Widget configuration panel
  openConfigPanel: (instanceId: string) => void;
  closeConfigPanel: () => void;

  // Launcher theme
  updateLauncherTheme: (theme: Partial<LauncherTheme>) => Promise<void>;

  // Pinned apps
  pinApp: (appId: string) => Promise<void>;
  unpinApp: (appId: string) => Promise<void>;
  reorderPinnedApps: (appIds: string[]) => Promise<void>;

  // Suggested apps
  loadSuggestedApps: () => Promise<void>;
}

const defaultSettings: UserSettings = {
  window_position: null,
  window_size: null,
  dashboard_enabled: true,
  widget_layout: [],
  pinned_apps: [],
  show_suggested_apps: true,
  suggested_apps_count: 8,
  dashboard_settings: {
    snap_to_grid: true,
    grid_size: 20,
    show_grid: false,
  },
  show_on_startup: false,
  close_on_blur: true,
  theme_mode: "system",
  custom_shortcut: null,
  launcher_theme: {
    background_type: "solid",
    gradient_angle: 135,
    blur_intensity: 20,
    opacity: 85,
  },
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  suggestedApps: [],
  isLoading: false,
  isInitialized: false,
  selectedWidgetId: null,
  configPanelOpen: false,

  loadSettings: async () => {
    if (get().isLoading) return;
    
    set({ isLoading: true });
    try {
      const settings = await invoke<UserSettings>("get_user_settings");
      set({ settings, isInitialized: true, isLoading: false });
      // Also load suggested apps
      get().loadSuggestedApps();
    } catch (error) {
      console.error("Failed to load settings:", error);
      set({ settings: defaultSettings, isInitialized: true, isLoading: false });
    }
  },

  updateSettings: async (updates) => {
    const current = get().settings;
    if (!current) return;

    const newSettings = { ...current, ...updates };
    
    // Optimistic update
    set({ settings: newSettings });
    
    try {
      await invoke("set_user_settings", { settings: newSettings });
    } catch (error) {
      console.error("Failed to save settings:", error);
      // Revert on error
      set({ settings: current });
    }
  },

  resetSettings: async () => {
    try {
      await invoke("reset_user_settings");
      const settings = await invoke<UserSettings>("get_user_settings");
      set({ settings });
    } catch (error) {
      console.error("Failed to reset settings:", error);
    }
  },

  setWindowPosition: async (x, y) => {
    try {
      await invoke("set_window_position", { x, y });
      const current = get().settings;
      if (current) {
        set({ settings: { ...current, window_position: [x, y] } });
      }
    } catch (error) {
      console.error("Failed to save window position:", error);
    }
  },

  setWindowSize: async (width, height) => {
    try {
      await invoke("set_window_size", { width, height });
      const current = get().settings;
      if (current) {
        set({ settings: { ...current, window_size: [width, height] } });
      }
    } catch (error) {
      console.error("Failed to save window size:", error);
    }
  },

  toggleDashboard: async (enabled) => {
    await get().updateSettings({ dashboard_enabled: enabled });
  },

  setShowSuggestedApps: async (show) => {
    await get().updateSettings({ show_suggested_apps: show });
  },

  setSuggestedAppsCount: async (count) => {
    await get().updateSettings({ suggested_apps_count: count });
    // Reload suggested apps with new count
    get().loadSuggestedApps();
  },

  updateDashboardSettings: async (updates) => {
    const current = get().settings;
    if (!current) return;

    const newDashboardSettings = { ...current.dashboard_settings, ...updates };
    await get().updateSettings({ dashboard_settings: newDashboardSettings });
  },

  toggleCloseOnBlur: async (closeOnBlur) => {
    await get().updateSettings({ close_on_blur: closeOnBlur });
  },

  updateWidgetLayout: async (layout) => {
    const current = get().settings;
    if (!current) return;

    const newSettings = { ...current, widget_layout: layout };
    set({ settings: newSettings });

    try {
      await invoke("update_widget_layout", { layout });
    } catch (error) {
      console.error("Failed to update widget layout:", error);
      set({ settings: current });
    }
  },

  addWidget: async (widget) => {
    const current = get().settings;
    if (!current) return;

    // Add new widget (multi-instance allowed, each has unique instance_id)
    const newLayout = [...current.widget_layout, widget];
    await get().updateWidgetLayout(newLayout);
  },

  removeWidget: async (instanceId) => {
    const current = get().settings;
    if (!current) return;

    const newLayout = current.widget_layout.filter(
      (w) => w.instance_id !== instanceId
    );

    // Close config panel if the removed widget was selected
    if (get().selectedWidgetId === instanceId) {
      set({ selectedWidgetId: null, configPanelOpen: false });
    }

    await get().updateWidgetLayout(newLayout);
  },

  updateWidgetPosition: async (instanceId, x, y) => {
    const current = get().settings;
    if (!current) return;

    const newLayout = current.widget_layout.map((w) =>
      w.instance_id === instanceId ? { ...w, x, y } : w
    );

    await get().updateWidgetLayout(newLayout);
  },

  updateWidgetSize: async (instanceId, width, height) => {
    const current = get().settings;
    if (!current) return;

    const newLayout = current.widget_layout.map((w) =>
      w.instance_id === instanceId ? { ...w, width, height } : w
    );

    await get().updateWidgetLayout(newLayout);
  },

  updateWidgetConfig: async (instanceId, config) => {
    const current = get().settings;
    if (!current) return;

    const newLayout = current.widget_layout.map((w) =>
      w.instance_id === instanceId ? { ...w, config } : w
    );

    await get().updateWidgetLayout(newLayout);
  },

  updateWidgetTheme: async (instanceId, theme) => {
    const current = get().settings;
    if (!current) return;

    const newLayout = current.widget_layout.map((w) =>
      w.instance_id === instanceId ? { ...w, theme_overrides: theme } : w
    );

    await get().updateWidgetLayout(newLayout);
  },

  updateWidgetZIndex: async (instanceId, zIndex) => {
    const current = get().settings;
    if (!current) return;

    const newLayout = current.widget_layout.map((w) =>
      w.instance_id === instanceId ? { ...w, z_index: zIndex } : w
    );

    await get().updateWidgetLayout(newLayout);
  },

  bringWidgetToFront: async (instanceId) => {
    const current = get().settings;
    if (!current) return;

    const maxZ = Math.max(...current.widget_layout.map((w) => w.z_index), 0);
    
    const newLayout = current.widget_layout.map((w) =>
      w.instance_id === instanceId ? { ...w, z_index: maxZ + 1 } : w
    );

    await get().updateWidgetLayout(newLayout);
  },

  sendWidgetToBack: async (instanceId) => {
    const current = get().settings;
    if (!current) return;

    const minZ = Math.min(...current.widget_layout.map((w) => w.z_index), 0);
    
    const newLayout = current.widget_layout.map((w) =>
      w.instance_id === instanceId ? { ...w, z_index: minZ - 1 } : w
    );

    await get().updateWidgetLayout(newLayout);
  },

  openConfigPanel: (instanceId) => {
    set({ selectedWidgetId: instanceId, configPanelOpen: true });
  },

  closeConfigPanel: () => {
    set({ selectedWidgetId: null, configPanelOpen: false });
  },

  updateLauncherTheme: async (updates) => {
    const current = get().settings;
    if (!current) return;

    const newTheme = { ...current.launcher_theme, ...updates };
    await get().updateSettings({ launcher_theme: newTheme });
  },

  pinApp: async (appId) => {
    const current = get().settings;
    if (!current) return;

    if (current.pinned_apps.includes(appId)) return;

    const newPinnedApps = [...current.pinned_apps, appId];
    set({ settings: { ...current, pinned_apps: newPinnedApps } });

    try {
      await invoke("pin_app", { appId });
      get().loadSuggestedApps();
    } catch (error) {
      console.error("Failed to pin app:", error);
      set({ settings: current });
    }
  },

  unpinApp: async (appId) => {
    const current = get().settings;
    if (!current) return;

    const newPinnedApps = current.pinned_apps.filter((id) => id !== appId);
    set({ settings: { ...current, pinned_apps: newPinnedApps } });

    try {
      await invoke("unpin_app", { appId });
      get().loadSuggestedApps();
    } catch (error) {
      console.error("Failed to unpin app:", error);
      set({ settings: current });
    }
  },

  reorderPinnedApps: async (appIds) => {
    await get().updateSettings({ pinned_apps: appIds });
    get().loadSuggestedApps();
  },

  loadSuggestedApps: async () => {
    try {
      const apps = await invoke<SearchResult[]>("get_suggested_apps");
      set({ suggestedApps: apps });
    } catch (error) {
      console.error("Failed to load suggested apps:", error);
    }
  },
}));

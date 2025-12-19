use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use uuid::Uuid;

/// Theme mode preference
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ThemeMode {
    System,
    Light,
    Dark,
}

impl Default for ThemeMode {
    fn default() -> Self {
        Self::System
    }
}

/// Shadow intensity for widgets
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "snake_case")]
pub enum WidgetShadow {
    #[default]
    None,
    Sm,
    Md,
    Lg,
}

/// Per-widget theme overrides
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WidgetTheme {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub background: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub background_opacity: Option<f32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text_color: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub accent_color: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub border_color: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub border_radius: Option<f32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub border_width: Option<f32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub shadow: Option<WidgetShadow>,
}

/// Placement of a widget on the canvas (free-form positioning)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetPlacement {
    /// Unique instance ID (UUID)
    pub instance_id: String,
    /// Widget type identifier (e.g., "clock", "terminal")
    pub widget_type: String,
    /// Plugin ID if this is a plugin widget
    pub plugin_id: Option<String>,
    /// X position in pixels
    pub x: f32,
    /// Y position in pixels
    pub y: f32,
    /// Width in pixels
    pub width: f32,
    /// Height in pixels
    pub height: f32,
    /// Z-index for layering
    #[serde(default)]
    pub z_index: i32,
    /// Widget-specific configuration
    pub config: Option<serde_json::Value>,
    /// Per-instance theme overrides
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub theme_overrides: Option<WidgetTheme>,
}

impl WidgetPlacement {
    /// Create a new widget placement with a generated instance ID
    pub fn new(widget_type: String, x: f32, y: f32, width: f32, height: f32) -> Self {
        Self {
            instance_id: Uuid::new_v4().to_string(),
            widget_type,
            plugin_id: None,
            x,
            y,
            width,
            height,
            z_index: 0,
            config: None,
            theme_overrides: None,
        }
    }
}

/// Dashboard settings for grid snapping and other behaviors
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardSettings {
    /// Enable grid snapping
    #[serde(default = "default_true")]
    pub snap_to_grid: bool,
    /// Grid cell size in pixels
    #[serde(default = "default_grid_size")]
    pub grid_size: u32,
    /// Show grid lines in edit mode
    #[serde(default)]
    pub show_grid: bool,
}

fn default_grid_size() -> u32 {
    20
}

impl Default for DashboardSettings {
    fn default() -> Self {
        Self {
            snap_to_grid: true,
            grid_size: 20,
            show_grid: false,
        }
    }
}

/// Global launcher theme settings
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LauncherTheme {
    /// Background type: "solid", "gradient", or "image"
    #[serde(default)]
    pub background_type: BackgroundType,
    /// Solid background color
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub background_color: Option<String>,
    /// Gradient colors (start, end)
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub gradient_colors: Option<(String, String)>,
    /// Gradient angle in degrees
    #[serde(default)]
    pub gradient_angle: f32,
    /// Background image path or URL
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub background_image: Option<String>,
    /// Background blur intensity (0-100)
    #[serde(default = "default_blur")]
    pub blur_intensity: f32,
    /// Overall opacity (0-100)
    #[serde(default = "default_opacity")]
    pub opacity: f32,
    /// Accent color override
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub accent_color: Option<String>,
}

fn default_blur() -> f32 {
    20.0
}

fn default_opacity() -> f32 {
    85.0
}

/// Background type for the launcher
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum BackgroundType {
    #[default]
    Solid,
    Gradient,
    Image,
}

/// User settings that persist across sessions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettings {
    // Window
    #[serde(default)]
    pub window_position: Option<(i32, i32)>,
    #[serde(default)]
    pub window_size: Option<(u32, u32)>,

    // Dashboard
    #[serde(default = "default_dashboard_enabled")]
    pub dashboard_enabled: bool,
    #[serde(default)]
    pub widget_layout: Vec<WidgetPlacement>,
    #[serde(default)]
    pub pinned_apps: Vec<String>,
    #[serde(default = "default_true")]
    pub show_suggested_apps: bool,
    #[serde(default = "default_suggested_apps_count")]
    pub suggested_apps_count: usize,
    #[serde(default)]
    pub dashboard_settings: DashboardSettings,

    // Behavior
    #[serde(default)]
    pub show_on_startup: bool,
    #[serde(default = "default_true")]
    pub close_on_blur: bool,
    #[serde(default)]
    pub theme_mode: ThemeMode,

    // Global shortcut
    #[serde(default)]
    pub custom_shortcut: Option<String>,

    // Launcher theme
    #[serde(default)]
    pub launcher_theme: LauncherTheme,
}

fn default_true() -> bool {
    true
}

fn default_dashboard_enabled() -> bool {
    true
}

fn default_suggested_apps_count() -> usize {
    8
}

impl Default for UserSettings {
    fn default() -> Self {
        Self {
            window_position: None,
            window_size: None,
            dashboard_enabled: true,
            widget_layout: Self::default_widget_layout(),
            pinned_apps: Vec::new(),
            show_suggested_apps: true,
            suggested_apps_count: 8,
            dashboard_settings: DashboardSettings::default(),
            show_on_startup: false,
            close_on_blur: true,
            theme_mode: ThemeMode::System,
            custom_shortcut: None,
            launcher_theme: LauncherTheme::default(),
        }
    }
}

impl UserSettings {
    fn default_widget_layout() -> Vec<WidgetPlacement> {
        vec![
            WidgetPlacement {
                instance_id: Uuid::new_v4().to_string(),
                widget_type: "clock".to_string(),
                plugin_id: None,
                x: 0.0,
                y: 0.0,
                width: 100.0,
                height: 100.0,
                z_index: 0,
                config: None,
                theme_overrides: None,
            },
            WidgetPlacement {
                instance_id: Uuid::new_v4().to_string(),
                widget_type: "quick-actions".to_string(),
                plugin_id: None,
                x: 110.0,
                y: 0.0,
                width: 210.0,
                height: 100.0,
                z_index: 0,
                config: None,
                theme_overrides: None,
            },
            WidgetPlacement {
                instance_id: Uuid::new_v4().to_string(),
                widget_type: "recent-files".to_string(),
                plugin_id: None,
                x: 0.0,
                y: 110.0,
                width: 210.0,
                height: 200.0,
                z_index: 0,
                config: None,
                theme_overrides: None,
            },
        ]
    }
}

/// Settings store with persistence
pub struct SettingsStore {
    settings: RwLock<UserSettings>,
    path: PathBuf,
}

impl SettingsStore {
    pub fn new() -> Self {
        let path = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("launcher")
            .join("settings.json");

        let settings = Self::load_from_file(&path).unwrap_or_default();

        Self {
            settings: RwLock::new(settings),
            path,
        }
    }

    fn load_from_file(path: &PathBuf) -> Option<UserSettings> {
        let content = std::fs::read_to_string(path).ok()?;
        serde_json::from_str(&content).ok()
    }

    pub fn get(&self) -> UserSettings {
        self.settings.read().clone()
    }

    pub fn set(&self, settings: UserSettings) {
        *self.settings.write() = settings;
        self.save();
    }

    pub fn update<F>(&self, updater: F)
    where
        F: FnOnce(&mut UserSettings),
    {
        let mut settings = self.settings.write();
        updater(&mut settings);
        drop(settings);
        self.save();
    }

    pub fn save(&self) {
        let settings = self.settings.read();

        if let Some(parent) = self.path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        if let Ok(json) = serde_json::to_string_pretty(&*settings) {
            let _ = std::fs::write(&self.path, json);
        }
    }

    pub fn reset(&self) {
        *self.settings.write() = UserSettings::default();
        self.save();
    }

    // Window position helpers
    pub fn set_window_position(&self, x: i32, y: i32) {
        self.update(|s| {
            s.window_position = Some((x, y));
        });
    }

    pub fn get_window_position(&self) -> Option<(i32, i32)> {
        self.settings.read().window_position
    }

    pub fn set_window_size(&self, width: u32, height: u32) {
        self.update(|s| {
            s.window_size = Some((width, height));
        });
    }

    // Widget layout helpers
    pub fn add_widget(&self, placement: WidgetPlacement) {
        self.update(|s| {
            s.widget_layout.push(placement);
        });
    }

    pub fn remove_widget(&self, instance_id: &str) {
        self.update(|s| {
            s.widget_layout.retain(|w| w.instance_id != instance_id);
        });
    }

    pub fn update_widget(&self, instance_id: &str, updater: impl FnOnce(&mut WidgetPlacement)) {
        self.update(|s| {
            if let Some(widget) = s
                .widget_layout
                .iter_mut()
                .find(|w| w.instance_id == instance_id)
            {
                updater(widget);
            }
        });
    }

    pub fn update_widget_position(&self, instance_id: &str, x: f32, y: f32) {
        self.update_widget(instance_id, |w| {
            w.x = x;
            w.y = y;
        });
    }

    pub fn update_widget_size(&self, instance_id: &str, width: f32, height: f32) {
        self.update_widget(instance_id, |w| {
            w.width = width;
            w.height = height;
        });
    }

    pub fn update_widget_config(&self, instance_id: &str, config: Option<serde_json::Value>) {
        self.update_widget(instance_id, |w| {
            w.config = config;
        });
    }

    pub fn update_widget_theme(&self, instance_id: &str, theme: Option<WidgetTheme>) {
        self.update_widget(instance_id, |w| {
            w.theme_overrides = theme;
        });
    }

    pub fn update_widget_layout(&self, layout: Vec<WidgetPlacement>) {
        self.update(|s| {
            s.widget_layout = layout;
        });
    }

    pub fn update_dashboard_settings(&self, settings: DashboardSettings) {
        self.update(|s| {
            s.dashboard_settings = settings;
        });
    }

    pub fn update_launcher_theme(&self, theme: LauncherTheme) {
        self.update(|s| {
            s.launcher_theme = theme;
        });
    }

    // Pinned apps helpers
    pub fn pin_app(&self, app_id: String) {
        self.update(|s| {
            if !s.pinned_apps.contains(&app_id) {
                s.pinned_apps.push(app_id);
            }
        });
    }

    pub fn unpin_app(&self, app_id: &str) {
        self.update(|s| {
            s.pinned_apps.retain(|id| id != app_id);
        });
    }

    pub fn reorder_pinned_apps(&self, app_ids: Vec<String>) {
        self.update(|s| {
            s.pinned_apps = app_ids;
        });
    }
}

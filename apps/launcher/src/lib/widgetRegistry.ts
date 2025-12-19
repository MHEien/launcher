import type { WidgetDefinition, WidgetConfigSchema } from "@/types/widget";

// Common timezone list (fallback since supportedValuesOf may not be available)
const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
];

// Generate timezone options
const timezoneOptions = COMMON_TIMEZONES.map((tz: string) => ({
  value: tz,
  label: tz.replace(/_/g, " ").replace(/\//g, " / "),
}));

// Clock widget configuration schema
const clockConfigSchema: WidgetConfigSchema = {
  fields: [
    {
      key: "timezone",
      type: "select",
      label: "Timezone",
      description: "Select the timezone for this clock",
      options: [
        { value: "local", label: "Local Time" },
        ...timezoneOptions,
      ],
    },
    {
      key: "use24Hour",
      type: "toggle",
      label: "24-Hour Format",
      description: "Display time in 24-hour format",
      defaultValue: false,
    },
    {
      key: "showSeconds",
      type: "toggle",
      label: "Show Seconds",
      description: "Display seconds in the time",
      defaultValue: false,
    },
    {
      key: "showDate",
      type: "toggle",
      label: "Show Date",
      description: "Display the date below the time",
      defaultValue: true,
    },
    {
      key: "clockStyle",
      type: "select",
      label: "Clock Style",
      description: "Choose between digital and analog clock",
      options: [
        { value: "digital", label: "Digital" },
        { value: "analog", label: "Analog" },
      ],
    },
  ],
};

// Terminal widget configuration schema
const terminalConfigSchema: WidgetConfigSchema = {
  fields: [
    {
      key: "cwd",
      type: "path",
      label: "Initial Directory",
      description: "The directory to start the terminal in",
      pathType: "directory",
    },
    {
      key: "shell",
      type: "text",
      label: "Shell Override",
      description: "Custom shell command (leave empty for default)",
      placeholder: "/bin/zsh or powershell.exe",
    },
    {
      key: "fontSize",
      type: "slider",
      label: "Font Size",
      description: "Terminal font size in pixels",
      min: 8,
      max: 24,
      step: 1,
      unit: "px",
    },
    {
      key: "scrollback",
      type: "number",
      label: "Scrollback Lines",
      description: "Number of lines to keep in history",
      min: 100,
      max: 10000,
      step: 100,
    },
  ],
};

// Quick actions widget configuration schema
const quickActionsConfigSchema: WidgetConfigSchema = {
  fields: [
    {
      key: "actions",
      type: "shortcut-list",
      label: "Quick Actions",
      description: "Configure which actions to show",
      maxItems: 8,
    },
    {
      key: "showLabels",
      type: "toggle",
      label: "Show Labels",
      description: "Display labels under action icons",
      defaultValue: true,
    },
    {
      key: "iconSize",
      type: "select",
      label: "Icon Size",
      description: "Size of the action icons",
      options: [
        { value: "sm", label: "Small" },
        { value: "md", label: "Medium" },
        { value: "lg", label: "Large" },
      ],
    },
  ],
};

// Recent files widget configuration schema
const recentFilesConfigSchema: WidgetConfigSchema = {
  fields: [
    {
      key: "maxFiles",
      type: "slider",
      label: "Maximum Files",
      description: "Number of recent files to display",
      min: 3,
      max: 20,
      step: 1,
    },
    {
      key: "showIcons",
      type: "toggle",
      label: "Show File Icons",
      description: "Display icons for file types",
      defaultValue: true,
    },
    {
      key: "filterExtensions",
      type: "text",
      label: "Filter Extensions",
      description: "Comma-separated list of extensions to show (empty for all)",
      placeholder: ".txt, .pdf, .doc",
    },
    {
      key: "showPath",
      type: "toggle",
      label: "Show File Path",
      description: "Display the file path below the filename",
      defaultValue: true,
    },
  ],
};

// Spacer widget configuration schema
const spacerConfigSchema: WidgetConfigSchema = {
  fields: [
    {
      key: "showBorderInEditMode",
      type: "toggle",
      label: "Show Border in Edit Mode",
      description: "Display a dashed border when editing the dashboard",
      defaultValue: true,
    },
  ],
};

// Folder/Shortcuts widget configuration schema
const folderConfigSchema: WidgetConfigSchema = {
  fields: [
    {
      key: "name",
      type: "text",
      label: "Folder Name",
      description: "Display name for this folder",
      placeholder: "My Apps",
    },
    {
      key: "apps",
      type: "app-list",
      label: "Applications",
      description: "Apps to show in this folder",
      maxItems: 16,
    },
    {
      key: "columns",
      type: "slider",
      label: "Columns",
      description: "Number of columns in the grid",
      min: 2,
      max: 6,
      step: 1,
    },
    {
      key: "iconSize",
      type: "select",
      label: "Icon Size",
      description: "Size of app icons",
      options: [
        { value: "sm", label: "Small (24px)" },
        { value: "md", label: "Medium (32px)" },
        { value: "lg", label: "Large (48px)" },
      ],
    },
    {
      key: "showLabels",
      type: "toggle",
      label: "Show App Names",
      description: "Display app names below icons",
      defaultValue: true,
    },
  ],
};

// Calculator widget configuration schema
const calculatorConfigSchema: WidgetConfigSchema = {
  fields: [
    {
      key: "showHistory",
      type: "toggle",
      label: "Show History",
      description: "Display calculation history",
      defaultValue: true,
    },
    {
      key: "historyCount",
      type: "slider",
      label: "History Items",
      description: "Number of history items to show",
      min: 3,
      max: 10,
      step: 1,
    },
    {
      key: "precision",
      type: "slider",
      label: "Decimal Precision",
      description: "Number of decimal places",
      min: 0,
      max: 10,
      step: 1,
    },
  ],
};

// Separator widget configuration schema
const separatorConfigSchema: WidgetConfigSchema = {
  fields: [
    {
      key: "orientation",
      type: "select",
      label: "Orientation",
      description: "Direction of the separator line",
      options: [
        { value: "horizontal", label: "Horizontal" },
        { value: "vertical", label: "Vertical" },
      ],
    },
    {
      key: "style",
      type: "select",
      label: "Line Style",
      description: "Style of the separator line",
      options: [
        { value: "solid", label: "Solid" },
        { value: "dashed", label: "Dashed" },
        { value: "dotted", label: "Dotted" },
      ],
    },
    {
      key: "thickness",
      type: "slider",
      label: "Thickness",
      description: "Line thickness in pixels",
      min: 1,
      max: 8,
      step: 1,
      unit: "px",
    },
    {
      key: "color",
      type: "color",
      label: "Color",
      description: "Line color",
    },
  ],
};

// Core widget definitions
const CORE_WIDGETS: WidgetDefinition[] = [
  {
    id: "clock",
    name: "Clock",
    description: "Display current time and date with customizable timezone and format",
    icon: "Clock",
    category: "utility",
    allowMultiple: true,
    sizeConstraints: {
      minWidth: 80,
      minHeight: 80,
      maxWidth: 300,
      maxHeight: 300,
      defaultWidth: 100,
      defaultHeight: 100,
    },
    configSchema: clockConfigSchema,
    tags: ["time", "date", "clock", "timezone"],
    isCore: true,
  },
  {
    id: "terminal",
    name: "Terminal",
    description: "Embedded terminal with shell access",
    icon: "TerminalSquare",
    category: "development",
    allowMultiple: true,
    sizeConstraints: {
      minWidth: 200,
      minHeight: 150,
      defaultWidth: 400,
      defaultHeight: 250,
    },
    configSchema: terminalConfigSchema,
    tags: ["terminal", "shell", "command", "console", "cli"],
    isCore: true,
  },
  {
    id: "quick-actions",
    name: "Quick Actions",
    description: "Shortcuts to common actions and system commands",
    icon: "Zap",
    category: "utility",
    allowMultiple: true,
    sizeConstraints: {
      minWidth: 150,
      minHeight: 60,
      maxWidth: 600,
      maxHeight: 200,
      defaultWidth: 210,
      defaultHeight: 80,
    },
    configSchema: quickActionsConfigSchema,
    tags: ["shortcuts", "actions", "quick", "buttons"],
    isCore: true,
  },
  {
    id: "recent-files",
    name: "Recent Files",
    description: "Your recently accessed files",
    icon: "FileText",
    category: "productivity",
    allowMultiple: false,
    sizeConstraints: {
      minWidth: 180,
      minHeight: 150,
      defaultWidth: 250,
      defaultHeight: 200,
    },
    configSchema: recentFilesConfigSchema,
    tags: ["files", "recent", "documents", "history"],
    isCore: true,
  },
  {
    id: "spacer",
    name: "Spacer",
    description: "Invisible widget for layout spacing",
    icon: "Square",
    category: "layout",
    allowMultiple: true,
    sizeConstraints: {
      minWidth: 20,
      minHeight: 20,
      defaultWidth: 100,
      defaultHeight: 100,
    },
    configSchema: spacerConfigSchema,
    tags: ["spacer", "gap", "layout", "padding"],
    isCore: true,
  },
  {
    id: "folder",
    name: "App Folder",
    description: "Grid of app shortcuts like a folder",
    icon: "Folder",
    category: "utility",
    allowMultiple: true,
    sizeConstraints: {
      minWidth: 120,
      minHeight: 120,
      defaultWidth: 200,
      defaultHeight: 200,
    },
    configSchema: folderConfigSchema,
    tags: ["folder", "apps", "shortcuts", "grid", "launcher"],
    isCore: true,
  },
  {
    id: "calculator",
    name: "Calculator",
    description: "Inline calculator with history",
    icon: "Calculator",
    category: "utility",
    allowMultiple: false,
    sizeConstraints: {
      minWidth: 150,
      minHeight: 180,
      maxWidth: 300,
      maxHeight: 400,
      defaultWidth: 180,
      defaultHeight: 250,
    },
    configSchema: calculatorConfigSchema,
    tags: ["calculator", "math", "numbers", "compute"],
    isCore: true,
  },
  {
    id: "separator",
    name: "Separator",
    description: "Visual divider line for organizing widgets",
    icon: "Minus",
    category: "layout",
    allowMultiple: true,
    sizeConstraints: {
      minWidth: 20,
      minHeight: 4,
      defaultWidth: 200,
      defaultHeight: 4,
    },
    configSchema: separatorConfigSchema,
    tags: ["separator", "divider", "line", "layout"],
    isCore: true,
  },
];

// Widget registry class
class WidgetRegistryClass {
  private widgets: Map<string, WidgetDefinition> = new Map();

  constructor() {
    // Register core widgets
    CORE_WIDGETS.forEach((widget) => {
      this.widgets.set(widget.id, widget);
    });
  }

  // Get all registered widgets
  getAll(): WidgetDefinition[] {
    return Array.from(this.widgets.values());
  }

  // Get widgets by category
  getByCategory(category: string): WidgetDefinition[] {
    return this.getAll().filter((w) => w.category === category);
  }

  // Get a specific widget definition
  get(id: string): WidgetDefinition | undefined {
    return this.widgets.get(id);
  }

  // Check if a widget type exists
  has(id: string): boolean {
    return this.widgets.has(id);
  }

  // Register a plugin widget
  registerPluginWidget(widget: WidgetDefinition): void {
    if (!widget.pluginId) {
      throw new Error("Plugin widgets must have a pluginId");
    }
    this.widgets.set(widget.id, { ...widget, isCore: false });
  }

  // Unregister a plugin widget
  unregisterPluginWidget(id: string): void {
    const widget = this.widgets.get(id);
    if (widget && !widget.isCore) {
      this.widgets.delete(id);
    }
  }

  // Get core widgets only
  getCoreWidgets(): WidgetDefinition[] {
    return this.getAll().filter((w) => w.isCore);
  }

  // Get plugin widgets only
  getPluginWidgets(): WidgetDefinition[] {
    return this.getAll().filter((w) => !w.isCore);
  }

  // Search widgets by name or tags
  search(query: string): WidgetDefinition[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter((w) => {
      const nameMatch = w.name.toLowerCase().includes(lowerQuery);
      const descMatch = w.description.toLowerCase().includes(lowerQuery);
      const tagMatch = w.tags?.some((t) => t.toLowerCase().includes(lowerQuery));
      return nameMatch || descMatch || tagMatch;
    });
  }

  // Get default config for a widget type
  getDefaultConfig(id: string): Record<string, unknown> {
    const widget = this.get(id);
    if (!widget?.configSchema) return {};

    const config: Record<string, unknown> = {};
    widget.configSchema.fields.forEach((field) => {
      if ("defaultValue" in field && field.defaultValue !== undefined) {
        config[field.key] = field.defaultValue;
      } else if (field.type === "select" && field.options.length > 0) {
        config[field.key] = field.options[0].value;
      }
    });
    return config;
  }
}

// Export singleton instance
export const widgetRegistry = new WidgetRegistryClass();

// Export types for convenience
export type { WidgetDefinition, WidgetConfigSchema };


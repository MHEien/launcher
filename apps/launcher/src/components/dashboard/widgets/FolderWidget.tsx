import { useEffect, useCallback, useRef, useState } from "react";
import { Folder, Plus, Trash2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useWidgetContext } from "../WidgetContext";
import { AppPicker } from "../AppPicker";
import { useSettingsStore } from "@/stores/settings";
import type { SearchResult } from "@/types";
import { cn } from "@/lib/utils";

interface FolderWidgetProps {
  config?: Record<string, unknown> | null;
  instanceId?: string;
}

interface AppShortcut {
  id: string;
  name: string;
  icon?: string;
}

export function FolderWidget({ config, instanceId }: FolderWidgetProps) {
  const name = (config?.name as string) || "Apps";
  const apps = (config?.apps as AppShortcut[]) || [];
  const columns = (config?.columns as number) || 4;
  const iconSize = (config?.iconSize as string) || "md";
  const showLabels = (config?.showLabels as boolean) ?? true;
  
  const { setContextMenuItems } = useWidgetContext();
  const { updateWidgetConfig } = useSettingsStore();
  const [showAppPicker, setShowAppPicker] = useState(false);
  
  // Use refs to avoid recreating functions when config/apps change
  const configRef = useRef(config);
  const appsRef = useRef(apps);
  const instanceIdRef = useRef(instanceId);
  
  useEffect(() => {
    configRef.current = config;
    appsRef.current = apps;
    instanceIdRef.current = instanceId;
  }, [config, apps, instanceId]);

  const iconSizeMap = {
    sm: 24,
    md: 32,
    lg: 48,
  };

  const size = iconSizeMap[iconSize as keyof typeof iconSizeMap] || 32;

  const handleLaunchApp = async (appId: string) => {
    try {
      await invoke("execute_result", { resultId: appId });
    } catch (error) {
      console.error("Failed to launch app:", error);
    }
  };

  const handleAddApp = async (app: SearchResult) => {
    if (!instanceId) return;

    const getIconDisplay = (icon: SearchResult["icon"]): string => {
      if (icon.type === "Emoji") return icon.value;
      if (icon.type === "Text") return icon.value;
      return "📦";
    };

    const newApp: AppShortcut = {
      id: app.id,
      name: app.title,
      icon: getIconDisplay(app.icon),
    };

    const updatedApps = [...apps, newApp];
    const newConfig = {
      ...config,
      apps: updatedApps,
    };

    await updateWidgetConfig(instanceId, newConfig);
    setShowAppPicker(false);
  };

  const handleRemoveApp = useCallback(async (appId: string) => {
    if (!instanceIdRef.current) return;

    const updatedApps = appsRef.current.filter((app) => app.id !== appId);
    const newConfig = {
      ...configRef.current,
      apps: updatedApps,
    };

    await updateWidgetConfig(instanceIdRef.current, newConfig);
  }, [updateWidgetConfig]);

  // Set up context menu items - must be before any conditional returns
  useEffect(() => {
    setContextMenuItems([
      {
        id: "add-app",
        label: "Add Application",
        icon: <Plus className="h-4 w-4" />,
        onClick: () => setShowAppPicker(true),
      },
      ...(apps.length > 0
        ? [
            {
              id: "separator",
              label: "",
              onClick: () => {},
              separator: true,
            } as const,
            ...apps.map((app) => ({
              id: `remove-${app.id}`,
              label: `Remove ${app.name}`,
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => handleRemoveApp(app.id),
            })),
          ]
        : []),
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps.length, handleRemoveApp]);

  return (
    <>
      {/* App Picker Modal - rendered outside conditional so it works when apps is empty */}
      {showAppPicker && (
        <AppPicker
          onClose={() => setShowAppPicker(false)}
          onSelect={handleAddApp}
          excludeIds={apps.map((app) => app.id)}
        />
      )}

      {apps.length === 0 ? (
        <div className="h-full w-full flex flex-col items-center justify-center p-3 text-center">
          <div className="p-3 rounded-full bg-muted/30 mb-2">
            <Folder className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">{name}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Right-click to add apps
          </p>
        </div>
      ) : (
        <div className="h-full w-full flex flex-col p-2">
          {/* Folder header */}
          <div className="flex items-center gap-1.5 px-1 mb-2">
            <Folder className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground truncate">
              {name}
            </span>
          </div>

          {/* App grid */}
          <div 
            className="flex-1 grid gap-2 content-start"
            style={{
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
            }}
          >
            {apps.map((app) => (
              <button
                key={app.id}
                onClick={() => handleLaunchApp(app.id)}
                className={cn(
                  "flex flex-col items-center gap-1 p-1.5 rounded-lg",
                  "hover:bg-muted/50 transition-colors",
                  "text-muted-foreground hover:text-foreground"
                )}
                title={app.name}
              >
                <div 
                  className="rounded-lg bg-muted/30 flex items-center justify-center"
                  style={{ width: size, height: size }}
                >
                  {app.icon ? (
                    <img 
                      src={app.icon} 
                      alt={app.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-lg">{app.name.charAt(0)}</span>
                  )}
                </div>
                {showLabels && (
                  <span className="text-[10px] truncate max-w-full">
                    {app.name}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}


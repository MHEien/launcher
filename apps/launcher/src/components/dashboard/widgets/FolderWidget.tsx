import { useState } from "react";
import { Folder, Plus } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";

interface FolderWidgetProps {
  config?: Record<string, unknown> | null;
}

interface AppShortcut {
  id: string;
  name: string;
  icon?: string;
}

export function FolderWidget({ config }: FolderWidgetProps) {
  const name = (config?.name as string) || "Apps";
  const apps = (config?.apps as AppShortcut[]) || [];
  const columns = (config?.columns as number) || 4;
  const iconSize = (config?.iconSize as string) || "md";
  const showLabels = (config?.showLabels as boolean) ?? true;

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

  if (apps.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-3 text-center">
        <div className="p-3 rounded-full bg-muted/30 mb-2">
          <Folder className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">{name}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          Configure to add apps
        </p>
      </div>
    );
  }

  return (
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
  );
}


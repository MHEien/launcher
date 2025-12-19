import { Settings, FolderOpen, Terminal, Calculator, RefreshCw } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";

interface QuickActionsWidgetProps {
  config?: Record<string, unknown> | null;
}

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  action: () => void;
}

export function QuickActionsWidget({ config }: QuickActionsWidgetProps) {
  const actions: QuickAction[] = [
    {
      id: "settings",
      icon: <Settings className="h-4 w-4" />,
      label: "Settings",
      action: () => {
        // Dispatch event to open settings
        window.dispatchEvent(new CustomEvent("open-settings"));
      },
    },
    {
      id: "files",
      icon: <FolderOpen className="h-4 w-4" />,
      label: "Files",
      action: async () => {
        try {
          // Open file manager at home directory
          const home = await invoke<string[]>("get_recent_files", { limit: 1 });
          if (home.length > 0) {
            await invoke("reveal_in_folder", { path: home[0] });
          }
        } catch (error) {
          console.error("Failed to open files:", error);
        }
      },
    },
    {
      id: "terminal",
      icon: <Terminal className="h-4 w-4" />,
      label: "Terminal",
      action: async () => {
        try {
          // Try to find and open terminal app
          const results = await invoke<Array<{ id: string }>>("search", { query: "terminal" });
          if (results.length > 0) {
            await invoke("execute_result", { resultId: results[0].id });
          }
        } catch (error) {
          console.error("Failed to open terminal:", error);
        }
      },
    },
    {
      id: "refresh",
      icon: <RefreshCw className="h-4 w-4" />,
      label: "Reindex",
      action: async () => {
        try {
          await invoke("start_indexing");
        } catch (error) {
          console.error("Failed to start indexing:", error);
        }
      },
    },
  ];

  return (
    <div className="h-full flex items-center justify-center p-2">
      <div className="flex gap-1">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-md",
              "hover:bg-muted/50 transition-colors",
              "text-muted-foreground hover:text-foreground"
            )}
            title={action.label}
          >
            {action.icon}
            <span className="text-[10px]">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}


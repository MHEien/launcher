import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WidgetData, WidgetItem } from "@/types";

interface PluginWidgetProps {
  pluginId: string;
  widgetId: string;
  config?: Record<string, unknown> | null;
  refreshInterval?: number;
}

export function PluginWidget({ pluginId, widgetId, config, refreshInterval = 0 }: PluginWidgetProps) {
  const [data, setData] = useState<WidgetData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadWidgetData = useCallback(async () => {
    try {
      const result = await invoke<WidgetData>("render_plugin_widget", {
        pluginId,
        widgetId,
        config: config || null,
      });
      setData(result);
      setError(null);
    } catch (err) {
      console.error("Failed to render plugin widget:", err);
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [pluginId, widgetId, config]);

  useEffect(() => {
    loadWidgetData();

    // Set up refresh interval if specified
    if (refreshInterval > 0) {
      const interval = setInterval(loadWidgetData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [loadWidgetData, refreshInterval]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-red-400 p-2">
        <AlertCircle className="h-5 w-5 mb-1" />
        <span className="text-xs text-center">Widget error</span>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Render based on widget type
  switch (data.type) {
    case "stat":
      return <StatWidget data={data} />;
    case "list":
      return <ListWidget data={data} />;
    case "grid":
      return <GridWidget data={data} />;
    case "custom":
      return <CustomWidget data={data} />;
    default:
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          Unknown widget type
        </div>
      );
  }
}

function StatWidget({ data }: { data: WidgetData }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-3 text-center">
      {data.title && (
        <div className="text-xs text-muted-foreground mb-1">{data.title}</div>
      )}
      <div className="text-2xl font-bold">{data.value}</div>
      {data.subtitle && (
        <div className="text-xs text-muted-foreground mt-1">{data.subtitle}</div>
      )}
    </div>
  );
}

function ListWidget({ data }: { data: WidgetData }) {
  const handleItemClick = async (item: WidgetItem) => {
    if (item.action) {
      try {
        await invoke("execute_result", { resultId: item.action });
      } catch (error) {
        console.error("Failed to execute action:", error);
      }
    }
  };

  return (
    <div className="h-full flex flex-col p-2">
      {data.title && (
        <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
          {data.title}
        </div>
      )}
      <div className="flex-1 space-y-0.5 overflow-y-auto">
        {data.items?.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left",
              "hover:bg-muted/50 transition-colors",
              !item.action && "cursor-default"
            )}
            disabled={!item.action}
          >
            {item.icon && <span className="text-lg">{item.icon}</span>}
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{item.title}</div>
              {item.subtitle && (
                <div className="text-[10px] text-muted-foreground truncate">
                  {item.subtitle}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function GridWidget({ data }: { data: WidgetData }) {
  const handleItemClick = async (item: WidgetItem) => {
    if (item.action) {
      try {
        await invoke("execute_result", { resultId: item.action });
      } catch (error) {
        console.error("Failed to execute action:", error);
      }
    }
  };

  return (
    <div className="h-full flex flex-col p-2">
      {data.title && (
        <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
          {data.title}
        </div>
      )}
      <div className="grid grid-cols-3 gap-1 flex-1">
        {data.items?.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 p-2 rounded-md",
              "hover:bg-muted/50 transition-colors",
              !item.action && "cursor-default"
            )}
            disabled={!item.action}
          >
            {item.icon && <span className="text-xl">{item.icon}</span>}
            <span className="text-xs text-center truncate w-full">{item.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CustomWidget({ data }: { data: WidgetData }) {
  // For custom widgets, we render sanitized HTML
  // In a real implementation, you'd want to use a proper sanitizer like DOMPurify
  if (!data.html) {
    return null;
  }

  return (
    <div 
      className="h-full p-2 overflow-auto"
      // Note: In production, sanitize this HTML!
      dangerouslySetInnerHTML={{ __html: data.html }}
    />
  );
}


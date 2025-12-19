import { useState, useEffect } from "react";
import { FileText, FolderOpen, Image, Code, Music, Video, Archive, File } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";

interface RecentFilesWidgetProps {
  config?: Record<string, unknown> | null;
}

// Get file icon based on extension
function getFileIcon(path: string): React.ReactNode {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  
  const iconMap: Record<string, React.ReactNode> = {
    // Documents
    txt: <FileText className="h-4 w-4 text-blue-400" />,
    md: <FileText className="h-4 w-4 text-blue-400" />,
    pdf: <FileText className="h-4 w-4 text-red-400" />,
    doc: <FileText className="h-4 w-4 text-blue-500" />,
    docx: <FileText className="h-4 w-4 text-blue-500" />,
    
    // Images
    png: <Image className="h-4 w-4 text-green-400" />,
    jpg: <Image className="h-4 w-4 text-green-400" />,
    jpeg: <Image className="h-4 w-4 text-green-400" />,
    gif: <Image className="h-4 w-4 text-green-400" />,
    svg: <Image className="h-4 w-4 text-orange-400" />,
    
    // Code
    js: <Code className="h-4 w-4 text-yellow-400" />,
    ts: <Code className="h-4 w-4 text-blue-400" />,
    tsx: <Code className="h-4 w-4 text-blue-400" />,
    jsx: <Code className="h-4 w-4 text-yellow-400" />,
    py: <Code className="h-4 w-4 text-green-400" />,
    rs: <Code className="h-4 w-4 text-orange-400" />,
    go: <Code className="h-4 w-4 text-cyan-400" />,
    html: <Code className="h-4 w-4 text-orange-400" />,
    css: <Code className="h-4 w-4 text-blue-400" />,
    json: <Code className="h-4 w-4 text-yellow-400" />,
    
    // Media
    mp3: <Music className="h-4 w-4 text-pink-400" />,
    wav: <Music className="h-4 w-4 text-pink-400" />,
    mp4: <Video className="h-4 w-4 text-purple-400" />,
    mov: <Video className="h-4 w-4 text-purple-400" />,
    
    // Archives
    zip: <Archive className="h-4 w-4 text-amber-400" />,
    tar: <Archive className="h-4 w-4 text-amber-400" />,
    gz: <Archive className="h-4 w-4 text-amber-400" />,
  };

  return iconMap[ext] || <File className="h-4 w-4 text-muted-foreground" />;
}

function getFileName(path: string): string {
  return path.split(/[/\\]/).pop() || path;
}

function getFileDir(path: string): string {
  const parts = path.split(/[/\\]/);
  parts.pop();
  const dir = parts.slice(-2).join("/");
  return dir || "";
}

export function RecentFilesWidget({ config }: RecentFilesWidgetProps) {
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const limit = (config?.limit as number) ?? 5;

  useEffect(() => {
    loadRecentFiles();
  }, [limit]);

  const loadRecentFiles = async () => {
    setIsLoading(true);
    try {
      const files = await invoke<string[]>("get_recent_files", { limit });
      setRecentFiles(files);
    } catch (error) {
      console.error("Failed to load recent files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClick = async (path: string) => {
    try {
      await invoke("open_file", { path });
    } catch (error) {
      console.error("Failed to open file:", error);
    }
  };

  const handleReveal = async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    try {
      await invoke("reveal_in_folder", { path });
    } catch (error) {
      console.error("Failed to reveal file:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">
          Loading...
        </div>
      </div>
    );
  }

  if (recentFiles.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <FileText className="h-8 w-8 opacity-50 mb-2" />
        <span className="text-sm">No recent files</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-2">
      <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
        Recent Files
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto">
        {recentFiles.map((path) => (
          <div
            key={path}
            onClick={() => handleFileClick(path)}
            onKeyDown={(e) => e.key === "Enter" && handleFileClick(path)}
            role="button"
            tabIndex={0}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left cursor-pointer",
              "hover:bg-muted/50 transition-colors group"
            )}
          >
            {getFileIcon(path)}
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{getFileName(path)}</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {getFileDir(path)}
              </div>
            </div>
            <button
              onClick={(e) => handleReveal(e, path)}
              className={cn(
                "opacity-0 group-hover:opacity-100 p-1 rounded",
                "hover:bg-muted transition-all"
              )}
              title="Reveal in folder"
            >
              <FolderOpen className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


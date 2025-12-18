import { memo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { File, Folder, Image, FileText, FileCode, FileJson, ExternalLink, FolderOpen } from "lucide-react";
import type { FileCardData } from "@/types/ai";
import { cn } from "@/lib/utils";

interface FileCardProps {
  data: FileCardData;
}

// File type icons
function getFileIcon(type?: string, name?: string) {
  const ext = name?.split(".").pop()?.toLowerCase();
  
  if (type === "directory") {
    return <Folder className="h-5 w-5 text-amber-500" />;
  }
  
  // Image files
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "ico"].includes(ext || "")) {
    return <Image className="h-5 w-5 text-pink-500" />;
  }
  
  // Code files
  if (["js", "ts", "jsx", "tsx", "py", "rs", "go", "java", "c", "cpp", "h", "rb", "php"].includes(ext || "")) {
    return <FileCode className="h-5 w-5 text-blue-500" />;
  }
  
  // JSON/Config files
  if (["json", "yaml", "yml", "toml", "xml", "env"].includes(ext || "")) {
    return <FileJson className="h-5 w-5 text-orange-500" />;
  }
  
  // Text/Doc files
  if (["txt", "md", "doc", "docx", "pdf", "rtf"].includes(ext || "")) {
    return <FileText className="h-5 w-5 text-gray-500" />;
  }
  
  return <File className="h-5 w-5 text-gray-400" />;
}

// Format file size
function formatSize(bytes?: number): string {
  if (!bytes) return "";
  
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export const FileCard = memo(function FileCard({ data }: FileCardProps) {
  const { path, name, size, type, preview } = data;
  
  const handleOpen = async () => {
    try {
      await invoke("open_file", { path });
    } catch (error) {
      console.error("Failed to open file:", error);
    }
  };
  
  const handleReveal = async () => {
    try {
      await invoke("reveal_in_folder", { path });
    } catch (error) {
      console.error("Failed to reveal file:", error);
    }
  };
  
  return (
    <div className="my-2 rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
      <div className="flex items-start gap-3 p-3">
        {/* Icon */}
        <div className="flex-shrink-0 p-2 rounded-lg bg-muted/50">
          {getFileIcon(type, name)}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{name}</h4>
          <p className="text-xs text-muted-foreground truncate">{path}</p>
          {size && (
            <p className="text-xs text-muted-foreground mt-1">{formatSize(size)}</p>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleOpen}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title="Open file"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
          <button
            onClick={handleReveal}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title="Reveal in folder"
          >
            <FolderOpen className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Preview */}
      {preview && (
        <div className="px-3 pb-3">
          <pre className="p-2 rounded bg-muted/50 text-xs font-mono overflow-x-auto max-h-24 overflow-y-auto">
            {preview}
          </pre>
        </div>
      )}
    </div>
  );
});


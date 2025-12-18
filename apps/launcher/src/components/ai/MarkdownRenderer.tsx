import { memo, useMemo } from "react";
import { CodeBlock } from "./CodeBlock";
import { FileCard } from "./FileCard";
import { StepProgress } from "./StepProgress";
import { DataChart } from "./DataChart";
import { ConfirmDialog } from "./ConfirmDialog";
import type { 
  CodeBlockData, 
  FileCardData, 
  StepProgressData, 
  ChartData, 
  ConfirmationData 
} from "@/types/ai";

interface MarkdownRendererProps {
  content: string;
}

// Simple markdown parser that extracts special blocks and renders them
export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const elements = useMemo(() => {
    return parseMarkdown(content);
  }, [content]);
  
  return <>{elements}</>;
});

// Parse markdown content into React elements
function parseMarkdown(content: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  const lines = content.split("\n");
  let i = 0;
  let currentText = "";
  
  const flushText = () => {
    if (currentText.trim()) {
      elements.push(
        <div key={elements.length} className="whitespace-pre-wrap">
          {renderInlineMarkdown(currentText)}
        </div>
      );
    }
    currentText = "";
  };
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Check for code blocks
    if (line.startsWith("```")) {
      flushText();
      const lang = line.slice(3).trim() || "text";
      const codeLines: string[] = [];
      i++;
      
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      
      const code = codeLines.join("\n");
      const data: CodeBlockData = { language: lang, code };
      
      elements.push(
        <CodeBlock key={elements.length} data={data} />
      );
      i++; // Skip closing ```
      continue;
    }
    
    // Check for special JSON blocks (generative UI)
    if (line.startsWith(":::file")) {
      flushText();
      const jsonLines: string[] = [];
      i++;
      
      while (i < lines.length && !lines[i].startsWith(":::")) {
        jsonLines.push(lines[i]);
        i++;
      }
      
      try {
        const data: FileCardData = JSON.parse(jsonLines.join("\n"));
        elements.push(<FileCard key={elements.length} data={data} />);
      } catch {
        // Invalid JSON, render as text
        currentText += `:::file\n${jsonLines.join("\n")}\n:::\n`;
      }
      i++;
      continue;
    }
    
    if (line.startsWith(":::steps")) {
      flushText();
      const jsonLines: string[] = [];
      i++;
      
      while (i < lines.length && !lines[i].startsWith(":::")) {
        jsonLines.push(lines[i]);
        i++;
      }
      
      try {
        const data: StepProgressData = JSON.parse(jsonLines.join("\n"));
        elements.push(<StepProgress key={elements.length} data={data} />);
      } catch {
        currentText += `:::steps\n${jsonLines.join("\n")}\n:::\n`;
      }
      i++;
      continue;
    }
    
    if (line.startsWith(":::chart")) {
      flushText();
      const jsonLines: string[] = [];
      i++;
      
      while (i < lines.length && !lines[i].startsWith(":::")) {
        jsonLines.push(lines[i]);
        i++;
      }
      
      try {
        const data: ChartData = JSON.parse(jsonLines.join("\n"));
        elements.push(<DataChart key={elements.length} data={data} />);
      } catch {
        currentText += `:::chart\n${jsonLines.join("\n")}\n:::\n`;
      }
      i++;
      continue;
    }
    
    if (line.startsWith(":::confirm")) {
      flushText();
      const jsonLines: string[] = [];
      i++;
      
      while (i < lines.length && !lines[i].startsWith(":::")) {
        jsonLines.push(lines[i]);
        i++;
      }
      
      try {
        const data: ConfirmationData = JSON.parse(jsonLines.join("\n"));
        elements.push(<ConfirmDialog key={elements.length} data={data} />);
      } catch {
        currentText += `:::confirm\n${jsonLines.join("\n")}\n:::\n`;
      }
      i++;
      continue;
    }
    
    // Regular line
    currentText += line + "\n";
    i++;
  }
  
  flushText();
  return elements;
}

// Render inline markdown (bold, italic, code, links)
function renderInlineMarkdown(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index));
    }
    
    const content = match[0];
    
    // Bold
    if (content.startsWith("**") && content.endsWith("**")) {
      elements.push(
        <strong key={key++}>{content.slice(2, -2)}</strong>
      );
    }
    // Italic
    else if (content.startsWith("*") && content.endsWith("*")) {
      elements.push(
        <em key={key++}>{content.slice(1, -1)}</em>
      );
    }
    // Inline code
    else if (content.startsWith("`") && content.endsWith("`")) {
      elements.push(
        <code 
          key={key++}
          className="px-1 py-0.5 rounded bg-muted text-sm font-mono"
        >
          {content.slice(1, -1)}
        </code>
      );
    }
    // Link
    else if (content.startsWith("[")) {
      const linkMatch = content.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        elements.push(
          <a
            key={key++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {linkMatch[1]}
          </a>
        );
      }
    }
    
    lastIndex = match.index + content.length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }
  
  return elements.length > 0 ? elements : [text];
}


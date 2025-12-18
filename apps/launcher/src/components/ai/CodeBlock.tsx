import { memo, useState } from "react";
import { Check, Copy, FileCode } from "lucide-react";
import type { CodeBlockData } from "@/types/ai";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  data: CodeBlockData;
}

// Language display names
const LANG_NAMES: Record<string, string> = {
  js: "JavaScript",
  ts: "TypeScript",
  jsx: "React JSX",
  tsx: "React TSX",
  py: "Python",
  python: "Python",
  rs: "Rust",
  rust: "Rust",
  go: "Go",
  java: "Java",
  cpp: "C++",
  c: "C",
  cs: "C#",
  rb: "Ruby",
  php: "PHP",
  swift: "Swift",
  kt: "Kotlin",
  sql: "SQL",
  sh: "Shell",
  bash: "Bash",
  zsh: "Zsh",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  xml: "XML",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  md: "Markdown",
  toml: "TOML",
};

export const CodeBlock = memo(function CodeBlock({ data }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const { language, code, filename } = data;
  
  const displayLang = LANG_NAMES[language.toLowerCase()] || language;
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="my-2 rounded-lg overflow-hidden border border-border/50 bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileCode className="h-3.5 w-3.5" />
          <span>{filename || displayLang}</span>
        </div>
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded text-xs",
            "hover:bg-muted transition-colors",
            copied ? "text-green-500" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      
      {/* Code content */}
      <div className="overflow-x-auto">
        <pre className="p-3 text-sm font-mono leading-relaxed">
          <code className={`language-${language}`}>
            {highlightCode(code, language)}
          </code>
        </pre>
      </div>
    </div>
  );
});

// Simple syntax highlighting
function highlightCode(code: string, language: string): React.ReactNode[] {
  const lang = language.toLowerCase();
  const elements: React.ReactNode[] = [];
  
  // Define token patterns for common languages
  const patterns: { regex: RegExp; className: string }[] = [];
  
  // Comments
  if (["js", "ts", "jsx", "tsx", "java", "c", "cpp", "cs", "go", "rust", "rs", "swift", "kt"].includes(lang)) {
    patterns.push({ regex: /\/\/.*$/gm, className: "text-muted-foreground italic" });
    patterns.push({ regex: /\/\*[\s\S]*?\*\//g, className: "text-muted-foreground italic" });
  }
  if (["py", "python", "rb", "sh", "bash", "yaml", "yml", "toml"].includes(lang)) {
    patterns.push({ regex: /#.*$/gm, className: "text-muted-foreground italic" });
  }
  
  // Strings
  patterns.push({ regex: /"(?:[^"\\]|\\.)*"/g, className: "text-green-500 dark:text-green-400" });
  patterns.push({ regex: /'(?:[^'\\]|\\.)*'/g, className: "text-green-500 dark:text-green-400" });
  patterns.push({ regex: /`(?:[^`\\]|\\.)*`/g, className: "text-green-500 dark:text-green-400" });
  
  // Numbers
  patterns.push({ regex: /\b\d+\.?\d*\b/g, className: "text-orange-500 dark:text-orange-400" });
  
  // Keywords (language-specific)
  const keywords: Record<string, string[]> = {
    js: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "from", "async", "await", "try", "catch", "throw", "new", "this", "null", "undefined", "true", "false"],
    ts: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "from", "async", "await", "try", "catch", "throw", "new", "this", "null", "undefined", "true", "false", "type", "interface", "extends", "implements"],
    py: ["def", "return", "if", "else", "elif", "for", "while", "class", "import", "from", "as", "try", "except", "raise", "with", "None", "True", "False", "and", "or", "not", "in", "is", "lambda", "async", "await"],
    rust: ["fn", "let", "mut", "const", "if", "else", "for", "while", "loop", "match", "struct", "enum", "impl", "trait", "use", "pub", "mod", "self", "Self", "return", "async", "await", "move", "true", "false"],
    go: ["func", "var", "const", "if", "else", "for", "range", "switch", "case", "return", "import", "package", "type", "struct", "interface", "map", "chan", "go", "defer", "true", "false", "nil"],
  };
  
  // Map similar languages
  const langKeywords = keywords[lang] || keywords["js"] || [];
  if (langKeywords.length > 0) {
    const keywordRegex = new RegExp(`\\b(${langKeywords.join("|")})\\b`, "g");
    patterns.push({ regex: keywordRegex, className: "text-purple-500 dark:text-purple-400 font-medium" });
  }
  
  // If no patterns match the language, return plain code
  if (patterns.length === 0) {
    return [code];
  }
  
  // Apply highlighting
  const tokens: { start: number; end: number; className: string; text: string }[] = [];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(code)) !== null) {
      tokens.push({
        start: match.index,
        end: match.index + match[0].length,
        className: pattern.className,
        text: match[0],
      });
    }
  }
  
  // Sort tokens by start position
  tokens.sort((a, b) => a.start - b.start);
  
  // Remove overlapping tokens (keep first)
  const filteredTokens: typeof tokens = [];
  let lastEnd = 0;
  for (const token of tokens) {
    if (token.start >= lastEnd) {
      filteredTokens.push(token);
      lastEnd = token.end;
    }
  }
  
  // Build result
  let lastIndex = 0;
  let key = 0;
  
  for (const token of filteredTokens) {
    if (token.start > lastIndex) {
      elements.push(code.slice(lastIndex, token.start));
    }
    elements.push(
      <span key={key++} className={token.className}>
        {token.text}
      </span>
    );
    lastIndex = token.end;
  }
  
  if (lastIndex < code.length) {
    elements.push(code.slice(lastIndex));
  }
  
  return elements.length > 0 ? elements : [code];
}


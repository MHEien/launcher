import { useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { useLauncherStore } from "@/stores/launcher";
import { cn } from "@/lib/utils";

export function SearchInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery, moveSelection, executeSelected, hideWindow } =
    useLauncherStore();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        moveSelection("up");
        break;
      case "ArrowDown":
        e.preventDefault();
        moveSelection("down");
        break;
      case "Enter":
        e.preventDefault();
        executeSelected();
        break;
      case "Escape":
        e.preventDefault();
        hideWindow();
        break;
    }
  };

  return (
    <div className="relative flex items-center px-4 py-3">
      <Search
        className={cn(
          "absolute left-6 h-5 w-5 text-muted-foreground transition-colors",
          query && "text-foreground"
        )}
      />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search apps, files, or type a calculation..."
        className={cn(
          "w-full bg-transparent pl-10 pr-4 py-2 text-lg",
          "placeholder:text-muted-foreground/60",
          "focus:outline-none",
          "text-foreground"
        )}
        autoFocus
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
    </div>
  );
}

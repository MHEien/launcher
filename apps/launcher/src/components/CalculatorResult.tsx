import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useLauncherStore } from "@/stores/launcher";
import { cn } from "@/lib/utils";

export function CalculatorResult() {
  const [copied, setCopied] = useState(false);
  const { results } = useLauncherStore();

  const calcResult = results.find((r) => r.category === "Calculator");

  if (!calcResult) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(calcResult.title);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="border-b border-border/50"
      >
        <div
          onClick={handleCopy}
          className={cn(
            "flex items-center justify-between px-4 py-3",
            "cursor-pointer hover:bg-accent/30 transition-colors"
          )}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔢</span>
            <div>
              <div className="text-2xl font-semibold text-foreground">
                {calcResult.title}
              </div>
              <div className="text-sm text-muted-foreground">
                {calcResult.subtitle}
              </div>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md",
              "text-sm text-muted-foreground",
              "hover:bg-accent hover:text-accent-foreground",
              "transition-colors"
            )}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

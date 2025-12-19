import { useState, useCallback } from "react";
import { Copy, Delete, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalculatorWidgetProps {
  config?: Record<string, unknown> | null;
}

interface HistoryItem {
  expression: string;
  result: string;
}

export function CalculatorWidget({ config }: CalculatorWidgetProps) {
  const showHistory = (config?.showHistory as boolean) ?? true;
  const historyCount = (config?.historyCount as number) || 5;
  const precision = (config?.precision as number) ?? 6;

  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [hasResult, setHasResult] = useState(false);

  const handleInput = useCallback((value: string) => {
    if (hasResult) {
      // Start fresh after showing a result
      if (/[0-9.]/.test(value)) {
        setDisplay(value);
        setExpression(value);
      } else {
        setExpression(display + value);
      }
      setHasResult(false);
    } else {
      if (display === "0" && /[0-9]/.test(value)) {
        setDisplay(value);
        setExpression(expression + value);
      } else if (value === "." && display.includes(".")) {
        // Prevent multiple decimals
        return;
      } else {
        setDisplay(display === "0" && value !== "." ? value : display + value);
        setExpression(expression + value);
      }
    }
  }, [display, expression, hasResult]);

  const handleOperator = useCallback((op: string) => {
    setExpression(expression + ` ${op} `);
    setDisplay("0");
    setHasResult(false);
  }, [expression]);

  const handleClear = useCallback(() => {
    setDisplay("0");
    setExpression("");
    setHasResult(false);
  }, []);

  const handleDelete = useCallback(() => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
    }
  }, [display]);

  const handleEquals = useCallback(() => {
    try {
      // Simple expression evaluation (sanitized)
      const sanitized = expression.replace(/[^0-9+\-*/.() ]/g, "");
      // eslint-disable-next-line no-eval
      const result = eval(sanitized);
      const formatted = Number.isFinite(result) 
        ? parseFloat(result.toFixed(precision)).toString()
        : "Error";
      
      setDisplay(formatted);
      setHasResult(true);

      if (formatted !== "Error") {
        setHistory((prev) => [
          { expression: expression, result: formatted },
          ...prev.slice(0, historyCount - 1),
        ]);
      }
    } catch {
      setDisplay("Error");
      setHasResult(true);
    }
  }, [expression, precision, historyCount]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(display);
  }, [display]);

  const handleHistorySelect = useCallback((item: HistoryItem) => {
    setDisplay(item.result);
    setExpression(item.result);
    setHasResult(true);
  }, []);

  const buttons = [
    ["C", "⌫", "%", "÷"],
    ["7", "8", "9", "×"],
    ["4", "5", "6", "-"],
    ["1", "2", "3", "+"],
    ["0", ".", "="],
  ];

  const getButtonAction = (btn: string) => {
    switch (btn) {
      case "C": return handleClear;
      case "⌫": return handleDelete;
      case "=": return handleEquals;
      case "+": return () => handleOperator("+");
      case "-": return () => handleOperator("-");
      case "×": return () => handleOperator("*");
      case "÷": return () => handleOperator("/");
      case "%": return () => handleOperator("%");
      default: return () => handleInput(btn);
    }
  };

  const isOperator = (btn: string) => ["+", "-", "×", "÷", "%"].includes(btn);
  const isAction = (btn: string) => ["C", "⌫", "="].includes(btn);

  return (
    <div className="h-full w-full flex flex-col p-2 text-sm">
      {/* Display */}
      <div className="bg-muted/30 rounded-lg p-2 mb-2">
        <div className="text-[10px] text-muted-foreground truncate min-h-[14px]">
          {expression || " "}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xl font-mono font-bold truncate flex-1">
            {display}
          </div>
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            title="Copy result"
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex-1 grid grid-rows-5 gap-1">
        {buttons.map((row, rowIndex) => (
          <div key={rowIndex} className="grid gap-1" style={{ 
            gridTemplateColumns: rowIndex === 4 ? "2fr 1fr 1fr" : "repeat(4, 1fr)" 
          }}>
            {row.map((btn) => (
              <button
                key={btn}
                onClick={getButtonAction(btn)}
                className={cn(
                  "rounded-lg font-medium transition-colors",
                  "flex items-center justify-center",
                  isOperator(btn) && "bg-primary/20 text-primary hover:bg-primary/30",
                  btn === "=" && "bg-primary text-primary-foreground hover:bg-primary/90",
                  btn === "C" && "bg-red-500/20 text-red-400 hover:bg-red-500/30",
                  !isOperator(btn) && !isAction(btn) && "bg-muted/30 hover:bg-muted/50"
                )}
              >
                {btn}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* History */}
      {showHistory && history.length > 0 && (
        <div className="mt-2 border-t border-border/30 pt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">History</span>
            <button
              onClick={() => setHistory([])}
              className="p-0.5 rounded hover:bg-muted/50 text-muted-foreground"
              title="Clear history"
            >
              <RotateCcw className="h-2.5 w-2.5" />
            </button>
          </div>
          <div className="space-y-0.5 max-h-20 overflow-y-auto">
            {history.map((item, index) => (
              <button
                key={index}
                onClick={() => handleHistorySelect(item)}
                className="w-full text-left px-1.5 py-0.5 rounded text-[10px] hover:bg-muted/30 transition-colors"
              >
                <span className="text-muted-foreground">{item.expression} = </span>
                <span className="font-medium">{item.result}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


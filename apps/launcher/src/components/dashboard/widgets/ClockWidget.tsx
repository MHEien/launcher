import { useState, useEffect } from "react";

interface ClockWidgetProps {
  config?: Record<string, unknown> | null;
}

export function ClockWidget({ config }: ClockWidgetProps) {
  const [time, setTime] = useState(new Date());
  const showSeconds = config?.showSeconds as boolean ?? false;
  const use24Hour = config?.use24Hour as boolean ?? false;

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      ...(showSeconds && { second: "2-digit" }),
      hour12: !use24Hour,
    };
    return date.toLocaleTimeString(undefined, options);
  };

  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
    };
    return date.toLocaleDateString(undefined, options);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-3 text-center">
      <div className="text-2xl font-bold tracking-tight tabular-nums">
        {formatTime(time)}
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {formatDate(time)}
      </div>
    </div>
  );
}


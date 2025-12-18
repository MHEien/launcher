import { memo, useRef, useEffect } from "react";
import type { ChartData } from "@/types/ai";

interface DataChartProps {
  data: ChartData;
}

// Simple canvas-based chart rendering
export const DataChart = memo(function DataChart({ data }: DataChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { type, title, labels, datasets } = data;
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get computed styles for colors
    const style = getComputedStyle(document.documentElement);
    const textColor = style.getPropertyValue("--foreground").trim() || "#888";
    const mutedColor = style.getPropertyValue("--muted-foreground").trim() || "#666";
    
    // Default colors for datasets
    const defaultColors = [
      "#3b82f6", // blue
      "#10b981", // green
      "#f59e0b", // amber
      "#ef4444", // red
      "#8b5cf6", // purple
      "#06b6d4", // cyan
    ];
    
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    
    // Find max value
    const allValues = datasets.flatMap((d) => d.data);
    const maxValue = Math.max(...allValues, 0) * 1.1;
    
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "center";
    
    if (type === "bar") {
      drawBarChart(ctx, { labels, datasets, maxValue, padding, chartWidth, chartHeight, defaultColors, textColor, mutedColor });
    } else if (type === "line") {
      drawLineChart(ctx, { labels, datasets, maxValue, padding, chartWidth, chartHeight, defaultColors, textColor, mutedColor });
    } else if (type === "pie") {
      drawPieChart(ctx, { labels, datasets, padding, chartWidth, chartHeight, defaultColors, textColor, canvas });
    }
    
  }, [data, type, labels, datasets]);
  
  return (
    <div className="my-2 rounded-lg border border-border/50 bg-muted/20 p-3">
      {title && (
        <h4 className="text-sm font-medium mb-2">{title}</h4>
      )}
      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        className="w-full h-auto"
      />
      
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2 justify-center">
        {datasets.map((dataset, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: dataset.color || ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"][i % 4] }}
            />
            <span className="text-muted-foreground">{dataset.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

interface DrawOptions {
  labels: string[];
  datasets: ChartData["datasets"];
  maxValue?: number;
  padding: number;
  chartWidth: number;
  chartHeight: number;
  defaultColors: string[];
  textColor: string;
  mutedColor?: string;
  canvas?: HTMLCanvasElement;
}

function drawBarChart(ctx: CanvasRenderingContext2D, options: DrawOptions) {
  const { labels, datasets, maxValue = 100, padding, chartWidth, chartHeight, defaultColors, textColor, mutedColor } = options;
  
  const barGroupWidth = chartWidth / labels.length;
  const barWidth = (barGroupWidth * 0.6) / datasets.length;
  const barGap = barGroupWidth * 0.2;
  
  // Draw axes
  ctx.strokeStyle = mutedColor || "#666";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, padding + chartHeight);
  ctx.lineTo(padding + chartWidth, padding + chartHeight);
  ctx.stroke();
  
  // Draw bars
  labels.forEach((label, i) => {
    const x = padding + i * barGroupWidth + barGap / 2;
    
    datasets.forEach((dataset, j) => {
      const value = dataset.data[i] || 0;
      const barHeight = (value / maxValue) * chartHeight;
      const barX = x + j * barWidth;
      const barY = padding + chartHeight - barHeight;
      
      ctx.fillStyle = dataset.color || defaultColors[j % defaultColors.length];
      ctx.fillRect(barX, barY, barWidth - 2, barHeight);
    });
    
    // Label
    ctx.fillStyle = textColor;
    ctx.fillText(label, x + (barGroupWidth - barGap) / 2, padding + chartHeight + 15);
  });
}

function drawLineChart(ctx: CanvasRenderingContext2D, options: DrawOptions) {
  const { labels, datasets, maxValue = 100, padding, chartWidth, chartHeight, defaultColors, textColor, mutedColor } = options;
  
  const pointGap = chartWidth / (labels.length - 1 || 1);
  
  // Draw grid
  ctx.strokeStyle = mutedColor || "#666";
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = padding + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(padding + chartWidth, y);
    ctx.stroke();
  }
  
  // Draw lines
  datasets.forEach((dataset, j) => {
    const color = dataset.color || defaultColors[j % defaultColors.length];
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    dataset.data.forEach((value, i) => {
      const x = padding + i * pointGap;
      const y = padding + chartHeight - (value / maxValue) * chartHeight;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = color;
    dataset.data.forEach((value, i) => {
      const x = padding + i * pointGap;
      const y = padding + chartHeight - (value / maxValue) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  });
  
  // Labels
  ctx.fillStyle = textColor;
  labels.forEach((label, i) => {
    const x = padding + i * pointGap;
    ctx.fillText(label, x, padding + chartHeight + 15);
  });
}

function drawPieChart(ctx: CanvasRenderingContext2D, options: DrawOptions) {
  const { datasets, defaultColors, canvas } = options;
  
  if (!canvas || !datasets[0]) return;
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) / 2 - 30;
  
  const data = datasets[0].data;
  const total = data.reduce((a, b) => a + b, 0);
  
  let startAngle = -Math.PI / 2;
  
  data.forEach((value, i) => {
    const sliceAngle = (value / total) * Math.PI * 2;
    const color = defaultColors[i % defaultColors.length];
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    
    // Percentage label
    const labelAngle = startAngle + sliceAngle / 2;
    const labelX = centerX + Math.cos(labelAngle) * (radius * 0.6);
    const labelY = centerY + Math.sin(labelAngle) * (radius * 0.6);
    
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round((value / total) * 100)}%`, labelX, labelY);
    
    startAngle += sliceAngle;
  });
}


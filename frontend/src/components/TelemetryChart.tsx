import { useRef, useEffect, useMemo } from "react";
import * as d3 from "d3";
import { useClockStore } from "../stores/clockStore";
import { TelemetryPoint } from "../types/schema";
import { slidingWindow, timestampToIndex } from "../lib/slidingWindow";

interface Props {
  data: TelemetryPoint[];
}

const COLORS = ["#e94560", "#16c79a", "#f5a623", "#8b5cf6", "#06b6d4", "#ec4899"];
const WINDOW_SIZE = 2000;

export function TelemetryChart({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentTime = useClockStore((s) => s.currentTime);
  const duration = useClockStore((s) => s.duration);
  const seek = useClockStore((s) => s.seek);

  const channels = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0].values);
  }, [data]);

  const timestamps = useMemo(() => data.map((d) => d.timestamp), [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || data.length === 0) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Sliding window around current position
    const currentIdx = timestampToIndex(timestamps, currentTime);
    const { data: windowData } = slidingWindow(data, currentIdx, WINDOW_SIZE);

    if (windowData.length === 0) return;

    const tMin = windowData[0].timestamp;
    const tMax = windowData[windowData.length - 1].timestamp;

    const xScale = d3.scaleLinear().domain([tMin, tMax]).range([40, width - 10]);

    const padding = { top: 10, bottom: 20 };
    for (let c = 0; c < channels.length; c++) {
      const channel = channels[c];
      const values = windowData.map((d) => d.values[channel] ?? 0);
      const [yMin, yMax] = d3.extent(values) as [number, number];
      const yPad = (yMax - yMin) * 0.1 || 1;

      const yScale = d3
        .scaleLinear()
        .domain([yMin - yPad, yMax + yPad])
        .range([height - padding.bottom, padding.top]);

      ctx.beginPath();
      ctx.strokeStyle = COLORS[c % COLORS.length];
      ctx.lineWidth = 1.5;

      for (let i = 0; i < windowData.length; i++) {
        const x = xScale(windowData[i].timestamp);
        const y = yScale(values[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Channel label
      ctx.fillStyle = COLORS[c % COLORS.length];
      ctx.font = "11px monospace";
      ctx.fillText(channel, 44, padding.top + 14 + c * 14);
    }

    // Playhead
    if (currentTime >= tMin && currentTime <= tMax) {
      const px = xScale(currentTime);
      ctx.beginPath();
      ctx.strokeStyle = "#e94560";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 2]);
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Y axis
    ctx.beginPath();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.moveTo(40, 0);
    ctx.lineTo(40, height);
    ctx.stroke();
  }, [data, channels, timestamps, currentTime, duration]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0 || duration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frac = Math.max(0, Math.min(1, (x - 40) / (rect.width - 50)));

    const currentIdx = timestampToIndex(timestamps, currentTime);
    const { data: windowData } = slidingWindow(data, currentIdx, WINDOW_SIZE);
    if (windowData.length < 2) return;

    const tMin = windowData[0].timestamp;
    const tMax = windowData[windowData.length - 1].timestamp;
    seek(tMin + frac * (tMax - tMin));
  };

  return (
    <div ref={containerRef} className="telemetry-chart">
      <canvas ref={canvasRef} onClick={handleClick} style={{ cursor: "crosshair" }} />
      {data.length === 0 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "var(--text-secondary)",
            fontSize: 12,
          }}
        >
          No telemetry data
        </div>
      )}
    </div>
  );
}

"use client";

import { useRef, useEffect, useMemo, useState } from "react";

export interface CanvasHeatmapProps {
  /** Row-major data: rows top→bottom, cols left→right */
  data: (number | null)[];
  rows: number;
  cols: number;
  /** Color function: value in [-1, 1] → rgb string. null → dead zone color */
  colorFn: (v: number | null) => [number, number, number];
  width?: number;
  height?: number;
  className?: string;
  /** Optional tooltip label function */
  tooltipFn?: (row: number, col: number, value: number | null) => string;
  /** Optional overlay lines: each is array of {x,y} in 0-1 space */
  overlayLines?: { points: { x: number; y: number }[]; color: string; dash?: number[] }[];
  /** Optional scatter points: {x, y} in 0-1 space */
  scatterPoints?: { x: number; y: number; color: string; label: string; shape?: "circle" | "diamond" }[];
}

export function CanvasHeatmap({
  data,
  rows,
  cols,
  colorFn,
  width = 400,
  height = 280,
  className = "",
  tooltipFn,
  overlayLines = [],
  scatterPoints = [],
}: CanvasHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const cellW = width / cols;
    const cellH = height / rows;

    // Draw cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const val = data[idx] ?? null;
        const [red, green, blue] = colorFn(val);
        ctx.fillStyle = `rgb(${Math.round(red)},${Math.round(green)},${Math.round(blue)})`;
        ctx.fillRect(c * cellW, r * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    // Draw overlay lines
    for (const line of overlayLines) {
      if (line.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 1.5;
      if (line.dash) ctx.setLineDash(line.dash);
      else ctx.setLineDash([]);
      line.points.forEach((p, i) => {
        const px = p.x * width;
        const py = p.y * height;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw scatter points
    const R = 4;
    for (const pt of scatterPoints) {
      const px = pt.x * width;
      const py = pt.y * height;
      ctx.fillStyle = pt.color;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      if (pt.shape === "diamond") {
        ctx.beginPath();
        ctx.moveTo(px, py - R);
        ctx.lineTo(px + R, py);
        ctx.lineTo(px, py + R);
        ctx.lineTo(px - R, py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(px, py, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }, [data, rows, cols, colorFn, width, height, overlayLines, scatterPoints]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!tooltipFn) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const col = Math.floor((mx / width) * cols);
    const row = Math.floor((my / height) * rows);
    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      const idx = row * cols + col;
      const val = data[idx] ?? null;
      setTooltip({ x: mx, y: my, text: tooltipFn(row, col, val) });
    }
  };

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        className="rounded"
      />
      {tooltip && (
        <div
          className="pointer-events-none absolute z-50 rounded bg-background/95 border border-border px-2 py-1.5 text-[10px] text-foreground shadow-xl whitespace-pre-line"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 10,
            transform: tooltip.x > width * 0.7 ? "translateX(-110%)" : undefined,
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

/** Standard CV:DV color map: blue (-1) → white (0) → red (+1), dark gray for null */
export function cvDvColorFn(v: number | null): [number, number, number] {
  if (v === null) return [14, 18, 30]; // dark dead zone
  const clamped = Math.max(-1, Math.min(1, v));
  if (clamped < 0) {
    // DV better: deep blue to white
    const t = Math.abs(clamped);
    return [
      Math.round(255 - t * 220),
      Math.round(255 - t * 200),
      255,
    ];
  } else {
    // CV better: white to deep red
    const t = clamped;
    return [
      255,
      Math.round(255 - t * 220),
      Math.round(255 - t * 220),
    ];
  }
}

/** Color legend bar component */
export function ColorLegend({
  leftLabel,
  rightLabel,
  gradient,
  centerLabel,
}: {
  leftLabel: string;
  rightLabel: string;
  centerLabel?: string;
  gradient: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
      <span className="text-blue-300 font-medium">{leftLabel}</span>
      <div
        className="flex-1 h-3 rounded"
        style={{ background: gradient }}
      />
      {centerLabel && (
        <span className="absolute left-1/2 -translate-x-1/2 text-[9px] text-white/60">{centerLabel}</span>
      )}
      <span className="text-red-300 font-medium">{rightLabel}</span>
    </div>
  );
}

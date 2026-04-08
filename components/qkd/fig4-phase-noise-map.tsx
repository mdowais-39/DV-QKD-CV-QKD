"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Microscope } from "lucide-react";
import {
  generatePhaseNoiseSweep,
  K0_PANELS,
  EXPERIMENTAL_DATA,
  type PhaseNoiseCell,
} from "@/lib/qkd-physics";
import type { SimulationParams } from "./parameter-controls";

interface Fig4Props {
  params: SimulationParams;
}

const DIST_POINTS = 50;
const PHASE_POINTS = 40;
const MAX_DIST = 400;
const PHASE_MIN = 1e-10;
const PHASE_MAX = 10;

function phaseColor(v: number | null): [number, number, number] {
  if (v === null) return [10, 14, 26];
  const t = Math.max(-1, Math.min(1, v));
  if (t < 0) {
    const s = Math.abs(t);
    return [Math.round(50 + (1 - s) * 200), Math.round(100 + (1 - s) * 155), 255];
  } else {
    const s = t;
    return [255, Math.round(100 - s * 80), Math.round(100 - s * 80)];
  }
}

function logNormY(sigma: number): number {
  const lo = Math.log10(PHASE_MIN);
  const hi = Math.log10(PHASE_MAX);
  return 1 - (Math.log10(sigma) - lo) / (hi - lo);
}

function logNormX(dist: number): number {
  return dist / MAX_DIST;
}

function SingleMapPanel({
  label,
  K0,
  params,
  panelWidth,
  panelHeight,
}: {
  label: string;
  K0: number;
  params: SimulationParams;
  panelWidth: number;
  panelHeight: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const data = useMemo(() =>
    generatePhaseNoiseSweep(params.NTh, K0, params.VsqdB, DIST_POINTS, PHASE_POINTS, MAX_DIST),
    [params.NTh, K0, params.VsqdB]
  );

  // Experimental scatter points (normalized)
  const cvPoints = useMemo(() =>
    EXPERIMENTAL_DATA.CVQKD.map(exp => ({
      x: logNormX(Math.min(exp.distKm, MAX_DIST)),
      y: logNormY(Math.max(PHASE_MIN, Math.min(PHASE_MAX, exp.sigma2Theta))),
      label: exp.name,
      color: "#f87171" as const,
    })),
    []
  );
  const dvPoints = useMemo(() =>
    EXPERIMENTAL_DATA.DVQKD.map(exp => ({
      x: logNormX(Math.min(exp.distKm, MAX_DIST)),
      y: logNormY(Math.max(PHASE_MIN, Math.min(PHASE_MAX, exp.sigma2Theta))),
      label: exp.name,
      color: "#60a5fa" as const,
    })),
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = panelWidth * dpr;
    canvas.height = panelHeight * dpr;
    canvas.style.width = `${panelWidth}px`;
    canvas.style.height = `${panelHeight}px`;
    ctx.scale(dpr, dpr);

    const cw = panelWidth / DIST_POINTS;
    const ch = panelHeight / PHASE_POINTS;

    data.forEach((cell, idx) => {
      const col = idx % DIST_POINTS;
      const row = Math.floor(idx / DIST_POINTS);
      const [r, g, b] = phaseColor(cell.kTilde);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(col * cw, row * ch, cw + 0.7, ch + 0.7);
    });

    // Equality contour (green)
    ctx.beginPath();
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 1.5;
    let started = false;
    for (let col = 0; col < DIST_POINTS; col++) {
      for (let row = PHASE_POINTS - 1; row >= 0; row--) {
        const idx = row * DIST_POINTS + col;
        if (data[idx]?.kTilde !== null) {
          const px = (col + 0.5) * cw;
          const py = (row + 0.5) * ch;
          if (!started) { ctx.moveTo(px, py); started = true; }
          else ctx.lineTo(px, py);
          break;
        }
      }
    }
    ctx.stroke();

    // Experimental scatter points
    const R = 4;
    for (const pt of [...cvPoints, ...dvPoints]) {
      const px = pt.x * panelWidth;
      const py = pt.y * panelHeight;
      if (px < 0 || py < 0 || px > panelWidth || py > panelHeight) continue;
      ctx.fillStyle = pt.color;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }, [data, panelWidth, panelHeight, cvPoints, dvPoints]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check if near a scatter point
    const allPts = [...cvPoints.map(p => ({ ...p, type: "CV" })), ...dvPoints.map(p => ({ ...p, type: "DV" }))];
    for (const pt of allPts) {
      const px = pt.x * panelWidth;
      const py = pt.y * panelHeight;
      if (Math.hypot(mx - px, my - py) < 8) {
        setTooltip({ x: mx, y: my, text: `${pt.type}: ${pt.label}` });
        return;
      }
    }

    const col = Math.min(DIST_POINTS - 1, Math.floor((mx / panelWidth) * DIST_POINTS));
    const row = Math.min(PHASE_POINTS - 1, Math.floor((my / panelHeight) * PHASE_POINTS));
    const idx = row * DIST_POINTS + col;
    const cell = data[idx];
    if (cell) {
      setTooltip({
        x: mx, y: my,
        text: `Dist: ${cell.dist.toFixed(0)} km\nσ²_θ: ${cell.sigma2Theta.toExponential(1)}\nK̃: ${cell.kTilde !== null ? cell.kTilde.toFixed(3) : "dead zone"}\nCV: ${cell.kCV.toExponential(2)}\nDV: ${cell.kDV.toExponential(2)}`,
      });
    }
  };

  return (
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-medium text-white/60 mb-1.5 text-center">{label}</p>
      <div className="relative" style={{ width: panelWidth, height: panelHeight }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          className="rounded cursor-crosshair"
        />
        {tooltip && (
          <div
            className="pointer-events-none absolute z-50 rounded bg-[#0d1117]/95 border border-white/10 px-2 py-1.5 text-[10px] text-white shadow-xl whitespace-pre-line font-mono"
            style={{
              left: tooltip.x + 12,
              top: tooltip.y - 10,
              transform: tooltip.x > panelWidth * 0.65 ? "translateX(-110%)" : undefined,
            }}
          >
            {tooltip.text}
          </div>
        )}
        {/* Y ticks */}
        <div className="absolute -left-8 top-0 bottom-0 flex flex-col justify-between text-[8px] text-white/40 pointer-events-none">
          <span>10</span>
          <span>1</span>
          <span>10⁻⁴</span>
          <span>10⁻⁸</span>
          <span>10⁻¹⁰</span>
        </div>
      </div>
      <div className="flex justify-between text-[8px] text-white/40 mt-0.5" style={{ width: panelWidth }}>
        <span>0</span>
        <span>100</span>
        <span>200</span>
        <span>300</span>
        <span>400 km</span>
      </div>
    </div>
  );
}

export function Fig4PhaseNoiseMap({ params }: Fig4Props) {
  const [panelWidth, setPanelWidth] = useState(220);
  const panelHeight = 200;

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setPanelWidth(w > 1400 ? 260 : w > 1100 ? 220 : 180);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <Card className="bg-[#080c14] border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <Microscope className="w-4 h-4 text-amber-400" />
          Figure 4 — Phase Noise Tolerance (Distance vs σ²_θ)
        </CardTitle>
        <p className="text-xs text-white/50">
          Equivalent Fig. 7a from Kish et al. · N_Th = {params.NTh.toExponential(1)} ·
          Scatter: <span className="text-red-300">● CV-QKD</span> &nbsp;
          <span className="text-blue-300">● DV-QKD</span> experimental points (Table 1)
        </p>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mb-3 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#f87171] border border-white/30" />
            <span className="text-red-300">CV-QKD experiments</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#60a5fa] border border-white/30" />
            <span className="text-blue-300">DV-QKD experiments</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#4ade80" strokeWidth="1.5" /></svg>
            <span className="text-green-400">Equality contour</span>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-center mb-3 text-[10px]">
          <div className="w-8 h-8 rounded" style={{ background: "linear-gradient(to bottom, #3266ff, white, #ff3333)" }} />
          <div className="text-white/40 text-[9px]">
            <div>← DV wins</div>
            <div>Equal</div>
            <div>← CV wins</div>
          </div>
        </div>

        <div className="flex gap-8 pl-10 overflow-x-auto pb-4">
          <div className="flex-shrink-0 relative">
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] text-white/40 whitespace-nowrap">
              Phase Noise σ²_θ
            </div>
          </div>
          {K0_PANELS.map(p => (
            <SingleMapPanel
              key={p.label}
              label={p.label}
              K0={p.K0}
              params={params}
              panelWidth={panelWidth}
              panelHeight={panelHeight}
            />
          ))}
        </div>
        <p className="text-[9px] text-white/30 text-center mt-1">X-axis: Fiber Distance (km) · Y-axis: Phase noise σ²_θ (log scale)</p>
      </CardContent>
    </Card>
  );
}

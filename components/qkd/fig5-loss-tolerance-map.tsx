"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers } from "lucide-react";
import {
  generateLossToleranceSweep,
  K0_PANELS,
  type LossToleranceCell,
} from "@/lib/qkd-physics";
import type { SimulationParams } from "./parameter-controls";

interface Fig5Props {
  params: SimulationParams;
}

const NTH_POINTS = 40;
const PHASE_POINTS = 40;
const NTH_MIN = 1e-10;
const NTH_MAX = 1;
const PHASE_MIN = 1e-10;
const PHASE_MAX = 10;
// Fixed representative distance for Figure 5
const DIST_KM = 50;

function ltColor(v: number | null): [number, number, number] {
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
    generateLossToleranceSweep(DIST_KM, K0, params.VsqdB, NTH_POINTS, PHASE_POINTS),
    [K0, params.VsqdB]
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

    const cw = panelWidth / NTH_POINTS;
    const ch = panelHeight / PHASE_POINTS;

    data.forEach((cell, idx) => {
      const col = idx % NTH_POINTS;
      const row = Math.floor(idx / NTH_POINTS);
      const [r, g, b] = ltColor(cell.kTilde);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(col * cw, row * ch, cw + 0.7, ch + 0.7);
    });

    // Equality contour (green)
    ctx.beginPath();
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 1.5;
    // Find transition column-by-column from bottom
    let started = false;
    for (let col = 0; col < NTH_POINTS; col++) {
      for (let row = PHASE_POINTS - 1; row >= 0; row--) {
        const idx = row * NTH_POINTS + col;
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
  }, [data, panelWidth, panelHeight]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const col = Math.min(NTH_POINTS - 1, Math.floor((mx / panelWidth) * NTH_POINTS));
    const row = Math.min(PHASE_POINTS - 1, Math.floor((my / panelHeight) * PHASE_POINTS));
    const idx = row * NTH_POINTS + col;
    const cell = data[idx];
    if (cell) {
      setTooltip({
        x: mx, y: my,
        text: `N_Th: ${cell.nth.toExponential(1)}\nσ²_θ: ${cell.sigma2Theta.toExponential(1)}\nK̃: ${cell.kTilde !== null ? cell.kTilde.toFixed(3) : "dead zone"}\nCV: ${cell.kCV.toExponential(2)}\nDV: ${cell.kDV.toExponential(2)}`,
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
      {/* X ticks */}
      <div className="flex justify-between text-[8px] text-white/40 mt-0.5" style={{ width: panelWidth }}>
        <span>10⁻¹⁰</span>
        <span>10⁻⁵</span>
        <span>1</span>
      </div>
    </div>
  );
}

export function Fig5LossToleranceMap({ params }: Fig5Props) {
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
          <Layers className="w-4 h-4 text-orange-400" />
          Figure 5 — Loss Tolerance vs Phase Noise (N_Th vs σ²_θ)
        </CardTitle>
        <p className="text-xs text-white/50">
          Equivalent Fig. 7b from Kish et al. · Fixed distance = {DIST_KM} km ·
          Shows which protocol tolerates more noise for any (N_Th, σ²_θ) pair
        </p>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mb-4 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: "#3266ff" }} />
            <span className="text-blue-300">DV (Six-State) wins</span>
          </div>
          <div className="h-3 w-24 rounded" style={{ background: "linear-gradient(to right, #3266ff, white, #ff3333)" }} />
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: "#ff3333" }} />
            <span className="text-red-300">CV (Sqz-Hom) wins</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#4ade80" strokeWidth="1.5" /></svg>
            <span className="text-green-400">Parity line</span>
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
        <p className="text-[9px] text-white/30 text-center mt-1">
          X-axis: Thermal Noise N_Th (log) · Y-axis: Phase noise σ²_θ (log) · Dark = both below K₀
        </p>
      </CardContent>
    </Card>
  );
}

"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map } from "lucide-react";
import {
  generateCVDVMap,
  plobUpper,
  distanceToEta,
  K0_PANELS,
  type HeatCell,
} from "@/lib/qkd-physics";
import type { SimulationParams } from "./parameter-controls";

interface Fig3Props {
  params: SimulationParams;
}

const DIST_POINTS = 60;
const NTH_POINTS = 40;
const MAX_DIST = 400;
const NTH_MIN = 1e-10;
const NTH_MAX = 10;

function logNormY(nth: number): number {
  const lo = Math.log10(NTH_MIN);
  const hi = Math.log10(NTH_MAX);
  return 1 - (Math.log10(nth) - lo) / (hi - lo);
}

function logNormX(dist: number): number {
  return dist / MAX_DIST;
}

function cvdvColor(v: number | null): [number, number, number] {
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
  VsqdB,
  NTh,
  panelWidth,
  panelHeight,
}: {
  label: string;
  K0: number;
  VsqdB: number;
  NTh: number;
  panelWidth: number;
  panelHeight: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const data = useMemo(() =>
    generateCVDVMap(K0, VsqdB, DIST_POINTS, NTH_POINTS, MAX_DIST, NTH_MIN, NTH_MAX),
    [K0, VsqdB]
  );

  // Build PLOB contour: for each distance, find NTh where PLOB upper = K0
  const plobLine = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    const dists = Array.from({ length: 80 }, (_, i) => (i / 79) * MAX_DIST);
    for (const d of dists) {
      const eta = distanceToEta(d);
      // Binary search for NTh where plobUpper = K0
      let lo = NTH_MIN, hi = NTH_MAX;
      const plob0 = plobUpper(eta, lo);
      if (plob0 < K0) continue; // already below K0 at min NTh
      for (let iter = 0; iter < 30; iter++) {
        const mid = Math.sqrt(lo * hi);
        const v = plobUpper(eta, mid);
        if (v > K0) lo = mid; else hi = mid;
        if (hi / lo < 1.01) break;
      }
      pts.push({ x: logNormX(d), y: logNormY(Math.sqrt(lo * hi)) });
    }
    return pts;
  }, [K0]);

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
    const ch = panelHeight / NTH_POINTS;

    data.forEach((cell, idx) => {
      const col = idx % DIST_POINTS;
      const row = Math.floor(idx / DIST_POINTS);
      const [r, g, b] = cvdvColor(cell.kTilde);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(col * cw, row * ch, cw + 0.7, ch + 0.7);
    });

    // PLOB upper contour (purple dashed)
    if (plobLine.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "#c084fc";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      plobLine.forEach((p, i) => {
        const px = p.x * panelWidth;
        const py = p.y * panelHeight;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // K0 contour (green solid) — approximate from data
    ctx.beginPath();
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 1.5;
    let started = false;
    for (let col = 0; col < DIST_POINTS; col++) {
      // Find first row from bottom where kTilde is not null (= both protocols > K0)
      for (let row = NTH_POINTS - 1; row >= 0; row--) {
        const idx = row * DIST_POINTS + col;
        const cell = data[idx];
        if (cell.kTilde !== null) {
          const px = (col + 0.5) * (panelWidth / DIST_POINTS);
          const py = (row + 0.5) * (panelHeight / NTH_POINTS);
          if (!started) { ctx.moveTo(px, py); started = true; }
          else ctx.lineTo(px, py);
          break;
        }
      }
    }
    ctx.stroke();
  }, [data, plobLine, panelWidth, panelHeight]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const col = Math.min(DIST_POINTS - 1, Math.floor((mx / panelWidth) * DIST_POINTS));
    const row = Math.min(NTH_POINTS - 1, Math.floor((my / panelHeight) * NTH_POINTS));
    const idx = row * DIST_POINTS + col;
    const cell = data[idx];
    if (cell) {
      setTooltip({
        x: mx, y: my,
        text: `Dist: ${cell.dist.toFixed(0)} km\nN_Th: ${cell.nth.toExponential(1)}\nK̃: ${cell.kTilde !== null ? cell.kTilde.toFixed(3) : "dead zone"}\n6S: ${cell.k6S.toExponential(2)}\nSqz: ${cell.kSqz.toExponential(2)}`,
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
        {/* Y-axis ticks */}
        <div className="absolute -left-8 top-0 bottom-0 flex flex-col justify-between text-[8px] text-white/40 pointer-events-none">
          <span>10</span>
          <span>1</span>
          <span>10⁻⁴</span>
          <span>10⁻⁸</span>
          <span>10⁻¹⁰</span>
        </div>
      </div>
      {/* X-axis ticks */}
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

export function Fig3CVDVMap({ params }: Fig3Props) {
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
          <Map className="w-4 h-4 text-green-400" />
          Figure 3 — K̃_CV:DV Comparison Map
        </CardTitle>
        <p className="text-xs text-white/50">
          Color encodes K̃ = (K_CV − K_DV) / max(K_CV, K_DV, K₀) ·{" "}
          Blue = Six-State wins · Red = Sqz-Hom wins · Dark = both below K₀
        </p>
      </CardHeader>
      <CardContent>
        {/* Legends */}
        <div className="flex items-center justify-center gap-6 mb-4 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: "linear-gradient(to right, #6495ff, #3266ff)" }} />
            <span className="text-blue-300">DV (Six-State) wins</span>
          </div>
          <div className="h-3 w-24 rounded" style={{ background: "linear-gradient(to right, #3266ff, white, #ff3333)" }} />
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: "linear-gradient(to right, #ff3333, #cc0000)" }} />
            <span className="text-red-300">CV (Sqz-Hom) wins</span>
          </div>
        </div>
        <div className="flex items-center gap-4 mb-4 text-[10px] text-white/40 justify-center">
          <svg width="30" height="10"><line x1="0" y1="5" x2="30" y2="5" stroke="#4ade80" strokeWidth="1.5" /></svg>
          <span className="text-green-400">K₀ boundary</span>
          <svg width="30" height="10"><line x1="0" y1="5" x2="30" y2="5" stroke="#c084fc" strokeWidth="1.5" strokeDasharray="5 3" /></svg>
          <span className="text-purple-400">PLOB upper limit</span>
        </div>

        {/* 3-panel row */}
        <div className="flex gap-8 pl-10 overflow-x-auto pb-4">
          {/* Y-axis label */}
          <div className="flex-shrink-0 relative">
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] text-white/40 whitespace-nowrap">
              Thermal Noise N_Th
            </div>
          </div>
          {K0_PANELS.map(p => (
            <SingleMapPanel
              key={p.label}
              label={p.label}
              K0={p.K0}
              VsqdB={params.VsqdB}
              NTh={params.NTh}
              panelWidth={panelWidth}
              panelHeight={panelHeight}
            />
          ))}
        </div>
        <p className="text-[9px] text-white/30 text-center mt-1">X-axis: Fiber Distance (km) · Y-axis: N_Th (log scale)</p>
      </CardContent>
    </Card>
  );
}

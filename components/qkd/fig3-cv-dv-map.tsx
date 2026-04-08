"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map, Info, ZoomIn } from "lucide-react";
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

const DIST_POINTS = 80;
const NTH_POINTS = 60;
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

// Enhanced color mapping with better perceptual uniformity
function cvdvColor(v: number | null): [number, number, number] {
  if (v === null) return [8, 12, 20]; // Dark dead zone
  
  const t = Math.max(-1, Math.min(1, v));
  
  if (t < 0) {
    // Blue gradient for DV (Six-State) wins
    const s = Math.abs(t);
    const r = Math.round(30 + (1 - s) * 180);
    const g = Math.round(80 + (1 - s) * 140);
    const b = Math.round(180 + (1 - s) * 75);
    return [r, g, b];
  } else if (t > 0) {
    // Red-orange gradient for CV (Sqz-Hom) wins
    const s = t;
    const r = Math.round(255 - (1 - s) * 40);
    const g = Math.round(120 - s * 70);
    const b = Math.round(80 - s * 60);
    return [r, g, b];
  } else {
    // White for perfect equality
    return [240, 240, 245];
  }
}

function SingleMapPanel({
  label,
  K0,
  VsqdB,
  panelWidth,
  panelHeight,
}: {
  label: string;
  K0: number;
  VsqdB: number;
  panelWidth: number;
  panelHeight: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string; kTilde: number | null } | null>(null);

  const data = useMemo(() =>
    generateCVDVMap(K0, VsqdB, DIST_POINTS, NTH_POINTS, MAX_DIST, NTH_MIN, NTH_MAX),
    [K0, VsqdB]
  );

  // Build PLOB contour
  const plobLine = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    const dists = Array.from({ length: 100 }, (_, i) => (i / 99) * MAX_DIST);
    for (const d of dists) {
      const eta = distanceToEta(d);
      let lo = NTH_MIN, hi = NTH_MAX;
      const plob0 = plobUpper(eta, lo);
      if (plob0 < K0) continue;
      for (let iter = 0; iter < 40; iter++) {
        const mid = Math.sqrt(lo * hi);
        const v = plobUpper(eta, mid);
        if (v > K0) lo = mid; else hi = mid;
        if (hi / lo < 1.005) break;
      }
      pts.push({ x: logNormX(d), y: logNormY(Math.sqrt(lo * hi)) });
    }
    return pts;
  }, [K0]);

  // Build K0 boundary contour
  const k0Contour = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (let col = 0; col < DIST_POINTS; col++) {
      for (let row = NTH_POINTS - 1; row >= 0; row--) {
        const idx = row * DIST_POINTS + col;
        const cell = data[idx];
        if (cell && cell.kTilde !== null) {
          pts.push({ 
            x: (col + 0.5) / DIST_POINTS, 
            y: (row + 0.5) / NTH_POINTS 
          });
          break;
        }
      }
    }
    return pts;
  }, [data]);

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

    // Draw heatmap cells
    data.forEach((cell, idx) => {
      const col = idx % DIST_POINTS;
      const row = Math.floor(idx / DIST_POINTS);
      const [r, g, b] = cvdvColor(cell.kTilde);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(col * cw, row * ch, cw + 0.5, ch + 0.5);
    });

    // Draw PLOB upper contour (purple dashed)
    if (plobLine.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "#c084fc";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      plobLine.forEach((p, i) => {
        const px = p.x * panelWidth;
        const py = p.y * panelHeight;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw K0 contour (green solid)
    if (k0Contour.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "#4ade80";
      ctx.lineWidth = 2;
      k0Contour.forEach((p, i) => {
        const px = p.x * panelWidth;
        const py = p.y * panelHeight;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    // Draw equality contour (white dashed) where kTilde ≈ 0
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    let started = false;
    for (let col = 0; col < DIST_POINTS; col++) {
      for (let row = 0; row < NTH_POINTS; row++) {
        const idx = row * DIST_POINTS + col;
        const cell = data[idx];
        if (cell && cell.kTilde !== null && Math.abs(cell.kTilde) < 0.08) {
          const px = (col + 0.5) * cw;
          const py = (row + 0.5) * ch;
          if (!started) { ctx.moveTo(px, py); started = true; }
          else ctx.lineTo(px, py);
          break;
        }
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);

  }, [data, plobLine, k0Contour, panelWidth, panelHeight]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const col = Math.min(DIST_POINTS - 1, Math.floor((mx / panelWidth) * DIST_POINTS));
    const row = Math.min(NTH_POINTS - 1, Math.floor((my / panelHeight) * NTH_POINTS));
    const idx = row * DIST_POINTS + col;
    const cell = data[idx];
    if (cell) {
      const winner = cell.kTilde === null ? "Dead zone" : 
        cell.kTilde > 0.05 ? "CV (Sqz-Hom) wins" : 
        cell.kTilde < -0.05 ? "DV (Six-State) wins" : "Near parity";
      
      setTooltip({
        x: mx, y: my, kTilde: cell.kTilde,
        text: `Distance: ${cell.dist.toFixed(0)} km\nN_Th: ${cell.nth.toExponential(2)}\n\nK̃_CV:DV: ${cell.kTilde !== null ? cell.kTilde.toFixed(3) : "N/A"}\n${winner}\n\nK_6S: ${cell.k6S.toExponential(2)} bits/use\nK_Sqz: ${cell.kSqz.toExponential(2)} bits/use`,
      });
    }
  }, [data, panelWidth, panelHeight]);

  return (
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-semibold text-white/70 mb-2 text-center">{label}</p>
      <div className="relative rounded-lg overflow-hidden border border-white/10" style={{ width: panelWidth, height: panelHeight }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          className="cursor-crosshair"
        />
        
        {/* Tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-50 rounded-lg bg-[#0a0f18]/95 border border-white/20 px-3 py-2 text-[10px] text-white shadow-2xl whitespace-pre-line font-mono backdrop-blur-sm"
            style={{
              left: tooltip.x + 14,
              top: tooltip.y - 10,
              transform: tooltip.x > panelWidth * 0.6 ? "translateX(-110%)" : undefined,
            }}
          >
            {tooltip.text}
          </div>
        )}
        
        {/* Y-axis ticks */}
        <div className="absolute -left-9 top-0 bottom-0 flex flex-col justify-between text-[8px] text-white/50 pointer-events-none py-1">
          <span>10</span>
          <span>10⁰</span>
          <span>10⁻²</span>
          <span>10⁻⁵</span>
          <span>10⁻⁸</span>
          <span>10⁻¹⁰</span>
        </div>
      </div>
      
      {/* X-axis ticks */}
      <div className="flex justify-between text-[8px] text-white/50 mt-1 px-0.5" style={{ width: panelWidth }}>
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
  const [panelWidth, setPanelWidth] = useState(240);
  const panelHeight = 220;

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setPanelWidth(w > 1400 ? 280 : w > 1100 ? 240 : 200);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <Card className="bg-[#080c14] border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Map className="w-4 h-4 text-green-400" />
              Figure 3 — K̃_CV:DV Comparison Map
            </CardTitle>
            <p className="text-xs text-white/50 mt-1.5 max-w-2xl">
              Normalized comparison metric K̃ = (K_CV - K_DV) / max(K_CV, K_DV, K₀).
              Shows which protocol dominates across the (Distance, N_Th) parameter space.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-white/40 bg-white/5 px-2 py-1 rounded">
            <Info className="w-3 h-3" />
            <span>V_sq = {params.VsqdB} dB</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Enhanced Color Legend */}
        <div className="mb-5 p-3 bg-white/[0.02] rounded-lg border border-white/5">
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: "rgb(30, 80, 180)" }} />
              <span className="text-[10px] text-blue-300">DV (Six-State) dominates</span>
              <span className="text-[9px] text-white/30">K̃ = -1</span>
            </div>
            
            <div className="relative">
              <div 
                className="h-4 w-32 rounded" 
                style={{ 
                  background: "linear-gradient(to right, rgb(30, 80, 180), rgb(240, 240, 245), rgb(255, 100, 50))" 
                }} 
              />
              <div className="flex justify-between text-[8px] text-white/40 mt-0.5">
                <span>-1</span>
                <span>0</span>
                <span>+1</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: "rgb(255, 100, 50)" }} />
              <span className="text-[10px] text-orange-300">CV (Sqz-Hom) dominates</span>
              <span className="text-[9px] text-white/30">K̃ = +1</span>
            </div>
          </div>
          
          {/* Contour legend */}
          <div className="flex items-center justify-center gap-6 text-[10px]">
            <div className="flex items-center gap-1.5">
              <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#4ade80" strokeWidth="2" /></svg>
              <span className="text-green-400">K₀ threshold boundary</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#c084fc" strokeWidth="2" strokeDasharray="6 4" /></svg>
              <span className="text-purple-400">PLOB upper limit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
              <span className="text-white/50">Parity line (K̃ ≈ 0)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded" style={{ background: "rgb(8, 12, 20)" }} />
              <span className="text-white/30">Dead zone (both {`<`} K₀)</span>
            </div>
          </div>
        </div>

        {/* 3-panel row */}
        <div className="flex gap-6 pl-12 overflow-x-auto pb-4">
          {/* Y-axis label */}
          <div className="flex-shrink-0 relative">
            <div className="absolute -left-10 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-white/50 whitespace-nowrap font-medium">
              Thermal Noise N_Th (log scale)
            </div>
          </div>
          {K0_PANELS.map(p => (
            <SingleMapPanel
              key={p.label}
              label={p.label}
              K0={p.K0}
              VsqdB={params.VsqdB}
              panelWidth={panelWidth}
              panelHeight={panelHeight}
            />
          ))}
        </div>
        
        {/* X-axis label */}
        <p className="text-[10px] text-white/50 text-center mt-2 font-medium">
          Fiber Distance (km) — 0.2 dB/km attenuation
        </p>
        
        {/* Figure notes */}
        <div className="mt-4 pt-3 border-t border-white/5 text-[9px] text-white/30 space-y-1">
          <p><strong className="text-white/50">Metric:</strong> K̃ = (K_Sqz-Hom - K_Six-State) / max(K_Sqz-Hom, K_Six-State, K₀)</p>
          <p><strong className="text-white/50">Interpretation:</strong> Blue regions favor DV protocols; orange regions favor CV protocols</p>
          <p><strong className="text-white/50">K₀ panels:</strong> Different minimum rate thresholds show how protocol dominance changes with application requirements</p>
        </div>
      </CardContent>
    </Card>
  );
}

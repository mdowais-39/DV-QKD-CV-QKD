"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Microscope, Info, Circle } from "lucide-react";
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

const DIST_POINTS = 70;
const PHASE_POINTS = 55;
const MAX_DIST = 400;
const PHASE_MIN = 1e-10;
const PHASE_MAX = 10;

// Enhanced color mapping
function phaseColor(v: number | null): [number, number, number] {
  if (v === null) return [8, 12, 20];
  
  const t = Math.max(-1, Math.min(1, v));
  
  if (t < 0) {
    const s = Math.abs(t);
    const r = Math.round(30 + (1 - s) * 180);
    const g = Math.round(80 + (1 - s) * 140);
    const b = Math.round(180 + (1 - s) * 75);
    return [r, g, b];
  } else if (t > 0) {
    const s = t;
    const r = Math.round(255 - (1 - s) * 40);
    const g = Math.round(120 - s * 70);
    const b = Math.round(80 - s * 60);
    return [r, g, b];
  } else {
    return [240, 240, 245];
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

  // Experimental scatter points (normalized positions)
  const cvPoints = useMemo(() =>
    EXPERIMENTAL_DATA.CVQKD.map(exp => ({
      x: logNormX(Math.min(exp.distKm, MAX_DIST)),
      y: logNormY(Math.max(PHASE_MIN, Math.min(PHASE_MAX, exp.sigma2Theta))),
      label: exp.name,
      dist: exp.distKm,
      sigma: exp.sigma2Theta,
      notes: exp.notes,
      type: "CV" as const,
    })),
    []
  );
  
  const dvPoints = useMemo(() =>
    EXPERIMENTAL_DATA.DVQKD.map(exp => ({
      x: logNormX(Math.min(exp.distKm, MAX_DIST)),
      y: logNormY(Math.max(PHASE_MIN, Math.min(PHASE_MAX, exp.sigma2Theta))),
      label: exp.name,
      dist: exp.distKm,
      sigma: exp.sigma2Theta,
      notes: exp.notes,
      type: "DV" as const,
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

    // Draw heatmap
    data.forEach((cell, idx) => {
      const col = idx % DIST_POINTS;
      const row = Math.floor(idx / DIST_POINTS);
      const [r, g, b] = phaseColor(cell.kTilde);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(col * cw, row * ch, cw + 0.5, ch + 0.5);
    });

    // Draw equality contour (green solid)
    ctx.beginPath();
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 2;
    let started = false;
    for (let col = 0; col < DIST_POINTS; col++) {
      for (let row = 0; row < PHASE_POINTS; row++) {
        const idx = row * DIST_POINTS + col;
        if (data[idx]?.kTilde !== null && Math.abs(data[idx].kTilde!) < 0.08) {
          const px = (col + 0.5) * cw;
          const py = (row + 0.5) * ch;
          if (!started) { ctx.moveTo(px, py); started = true; }
          else ctx.lineTo(px, py);
          break;
        }
      }
    }
    ctx.stroke();

    // Draw K0 boundary contour
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    started = false;
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
    ctx.setLineDash([]);

    // Draw experimental scatter points
    const R = 5;
    
    // CV-QKD experiments (red circles)
    for (const pt of cvPoints) {
      const px = pt.x * panelWidth;
      const py = pt.y * panelHeight;
      if (px < 0 || py < 0 || px > panelWidth || py > panelHeight) continue;
      
      // Outer glow
      ctx.beginPath();
      ctx.arc(px, py, R + 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(248, 113, 113, 0.3)";
      ctx.fill();
      
      // Main circle
      ctx.beginPath();
      ctx.arc(px, py, R, 0, Math.PI * 2);
      ctx.fillStyle = "#f87171";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
    }
    
    // DV-QKD experiments (blue circles)
    for (const pt of dvPoints) {
      const px = pt.x * panelWidth;
      const py = pt.y * panelHeight;
      if (px < 0 || py < 0 || px > panelWidth || py > panelHeight) continue;
      
      // Outer glow
      ctx.beginPath();
      ctx.arc(px, py, R + 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(96, 165, 250, 0.3)";
      ctx.fill();
      
      // Main circle
      ctx.beginPath();
      ctx.arc(px, py, R, 0, Math.PI * 2);
      ctx.fillStyle = "#60a5fa";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
    }
    
  }, [data, panelWidth, panelHeight, cvPoints, dvPoints]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check if near a scatter point
    const allPts = [...cvPoints, ...dvPoints];
    for (const pt of allPts) {
      const px = pt.x * panelWidth;
      const py = pt.y * panelHeight;
      if (Math.hypot(mx - px, my - py) < 10) {
        setTooltip({ 
          x: mx, y: my, 
          text: `📍 ${pt.type}-QKD Experiment\n${pt.label}\n\nDistance: ${pt.dist} km\nσ²_θ: ${pt.sigma.toExponential(1)}\n\n${pt.notes}` 
        });
        return;
      }
    }

    const col = Math.min(DIST_POINTS - 1, Math.floor((mx / panelWidth) * DIST_POINTS));
    const row = Math.min(PHASE_POINTS - 1, Math.floor((my / panelHeight) * PHASE_POINTS));
    const idx = row * DIST_POINTS + col;
    const cell = data[idx];
    if (cell) {
      const winner = cell.kTilde === null ? "Dead zone" : 
        cell.kTilde > 0.05 ? "CV wins" : 
        cell.kTilde < -0.05 ? "DV wins" : "Near parity";
      
      setTooltip({
        x: mx, y: my,
        text: `Distance: ${cell.dist.toFixed(0)} km\nPhase noise σ²_θ: ${cell.sigma2Theta.toExponential(2)}\n\nÑ_Th metric: ${cell.kTilde !== null ? cell.kTilde.toFixed(3) : "N/A"}\n${winner}\n\nK_CV: ${cell.kCV.toExponential(2)}\nK_DV: ${cell.kDV.toExponential(2)}`,
      });
    }
  }, [data, panelWidth, panelHeight, cvPoints, dvPoints]);

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

export function Fig4PhaseNoiseMap({ params }: Fig4Props) {
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
              <Microscope className="w-4 h-4 text-amber-400" />
              Figure 4 — Phase Noise Tolerance (Ñ_Th^CV:DV)
            </CardTitle>
            <p className="text-xs text-white/50 mt-1.5 max-w-2xl">
              Equivalent to Fig. 7a from Kish et al. Shows thermal noise tolerance vs phase noise
              with experimental data points from published QKD demonstrations.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-white/40 bg-white/5 px-2 py-1 rounded">
            <Info className="w-3 h-3" />
            <span>N_Th = {params.NTh.toExponential(1)}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Legend */}
        <div className="mb-5 p-3 bg-white/[0.02] rounded-lg border border-white/5">
          {/* Color scale */}
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: "rgb(30, 80, 180)" }} />
              <span className="text-[10px] text-blue-300">DV better</span>
            </div>
            
            <div className="relative">
              <div 
                className="h-4 w-28 rounded" 
                style={{ background: "linear-gradient(to right, rgb(30, 80, 180), rgb(240, 240, 245), rgb(255, 100, 50))" }} 
              />
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: "rgb(255, 100, 50)" }} />
              <span className="text-[10px] text-orange-300">CV better</span>
            </div>
          </div>
          
          {/* Experimental points & contours */}
          <div className="flex items-center justify-center gap-5 text-[10px]">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-[#f87171] border border-white/50" />
              <span className="text-red-300">CV-QKD experiments</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-[#60a5fa] border border-white/50" />
              <span className="text-blue-300">DV-QKD experiments</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#4ade80" strokeWidth="2" /></svg>
              <span className="text-green-400">Equality contour</span>
            </div>
          </div>
        </div>

        {/* 3-panel row */}
        <div className="flex gap-6 pl-12 overflow-x-auto pb-4">
          <div className="flex-shrink-0 relative">
            <div className="absolute -left-10 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-white/50 whitespace-nowrap font-medium">
              Phase Noise σ²_θ (log scale)
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
        
        {/* X-axis label */}
        <p className="text-[10px] text-white/50 text-center mt-2 font-medium">
          Fiber Distance (km)
        </p>
        
        {/* Experimental data table */}
        <div className="mt-4 pt-3 border-t border-white/5">
          <p className="text-[10px] text-white/50 font-medium mb-2">Experimental Reference Points (Table 1, Kish et al.)</p>
          <div className="grid grid-cols-2 gap-3 text-[9px]">
            <div>
              <p className="text-red-400 font-medium mb-1">CV-QKD Demonstrations</p>
              {EXPERIMENTAL_DATA.CVQKD.map((exp, i) => (
                <div key={i} className="text-white/40 mb-0.5">
                  <span className="text-white/60">{exp.name}</span>: {exp.distKm} km, σ²_θ = {exp.sigma2Theta.toExponential(1)}
                </div>
              ))}
            </div>
            <div>
              <p className="text-blue-400 font-medium mb-1">DV-QKD Demonstrations</p>
              {EXPERIMENTAL_DATA.DVQKD.map((exp, i) => (
                <div key={i} className="text-white/40 mb-0.5">
                  <span className="text-white/60">{exp.name}</span>: {exp.distKm} km, σ²_θ = {exp.sigma2Theta.toExponential(1)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

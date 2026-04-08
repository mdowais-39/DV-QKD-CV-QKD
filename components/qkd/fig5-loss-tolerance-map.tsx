"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Info, Settings2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  generateLossToleranceSweep,
  K0_PANELS,
  distanceToEta,
  type LossToleranceCell,
} from "@/lib/qkd-physics";
import type { SimulationParams } from "./parameter-controls";

interface Fig5Props {
  params: SimulationParams;
}

const NTH_POINTS = 55;
const PHASE_POINTS = 55;
const NTH_MIN = 1e-10;
const NTH_MAX = 1;
const PHASE_MIN = 1e-10;
const PHASE_MAX = 10;

// Enhanced color mapping for loss tolerance
function ltColor(v: number | null): [number, number, number] {
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

function SingleMapPanel({
  label,
  K0,
  params,
  distKm,
  panelWidth,
  panelHeight,
}: {
  label: string;
  K0: number;
  params: SimulationParams;
  distKm: number;
  panelWidth: number;
  panelHeight: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const data = useMemo(() =>
    generateLossToleranceSweep(distKm, K0, params.VsqdB, NTH_POINTS, PHASE_POINTS),
    [distKm, K0, params.VsqdB]
  );

  // Calculate statistics for this panel
  const stats = useMemo(() => {
    let cvWins = 0;
    let dvWins = 0;
    let parity = 0;
    let deadZone = 0;
    
    data.forEach(cell => {
      if (cell.kTilde === null) deadZone++;
      else if (cell.kTilde > 0.05) cvWins++;
      else if (cell.kTilde < -0.05) dvWins++;
      else parity++;
    });
    
    const total = data.length - deadZone;
    return {
      cvWins: total > 0 ? (cvWins / total * 100).toFixed(0) : 0,
      dvWins: total > 0 ? (dvWins / total * 100).toFixed(0) : 0,
      deadZone: (deadZone / data.length * 100).toFixed(0),
    };
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

    const cw = panelWidth / NTH_POINTS;
    const ch = panelHeight / PHASE_POINTS;

    // Draw heatmap
    data.forEach((cell, idx) => {
      const col = idx % NTH_POINTS;
      const row = Math.floor(idx / NTH_POINTS);
      const [r, g, b] = ltColor(cell.kTilde);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(col * cw, row * ch, cw + 0.5, ch + 0.5);
    });

    // Draw equality contour (green)
    ctx.beginPath();
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 2;
    let started = false;
    for (let col = 0; col < NTH_POINTS; col++) {
      for (let row = 0; row < PHASE_POINTS; row++) {
        const idx = row * NTH_POINTS + col;
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

    // Draw K0 boundary contour (white dashed)
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    started = false;
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
    ctx.setLineDash([]);

    // Draw current params marker
    const markerX = (Math.log10(Math.max(NTH_MIN, Math.min(NTH_MAX, params.NTh))) - Math.log10(NTH_MIN)) / 
                    (Math.log10(NTH_MAX) - Math.log10(NTH_MIN)) * panelWidth;
    const markerY = (1 - (Math.log10(Math.max(PHASE_MIN, Math.min(PHASE_MAX, params.sigma2Theta))) - Math.log10(PHASE_MIN)) / 
                    (Math.log10(PHASE_MAX) - Math.log10(PHASE_MIN))) * panelHeight;
    
    if (markerX > 0 && markerX < panelWidth && markerY > 0 && markerY < panelHeight) {
      ctx.beginPath();
      ctx.arc(markerX, markerY, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Crosshairs
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(0, markerY);
      ctx.lineTo(panelWidth, markerY);
      ctx.moveTo(markerX, 0);
      ctx.lineTo(markerX, panelHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    }

  }, [data, panelWidth, panelHeight, params.NTh, params.sigma2Theta]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const col = Math.min(NTH_POINTS - 1, Math.floor((mx / panelWidth) * NTH_POINTS));
    const row = Math.min(PHASE_POINTS - 1, Math.floor((my / panelHeight) * PHASE_POINTS));
    const idx = row * NTH_POINTS + col;
    const cell = data[idx];
    if (cell) {
      const winner = cell.kTilde === null ? "Dead zone (both protocols fail)" : 
        cell.kTilde > 0.05 ? "CV tolerates more loss" : 
        cell.kTilde < -0.05 ? "DV tolerates more loss" : "Similar tolerance";
      
      setTooltip({
        x: mx, y: my,
        text: `Thermal noise N_Th: ${cell.nth.toExponential(2)}\nPhase noise σ²_θ: ${cell.sigma2Theta.toExponential(2)}\n\nL̃^CV:DV: ${cell.kTilde !== null ? cell.kTilde.toFixed(3) : "N/A"}\n${winner}\n\nK_CV: ${cell.kCV.toExponential(2)}\nK_DV: ${cell.kDV.toExponential(2)}`,
      });
    }
  }, [data, panelWidth, panelHeight]);

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold text-white/70">{label}</p>
        <div className="flex items-center gap-2 text-[8px] text-white/40">
          <span className="text-blue-400">DV: {stats.dvWins}%</span>
          <span className="text-orange-400">CV: {stats.cvWins}%</span>
        </div>
      </div>
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
        <span>10⁻¹⁰</span>
        <span>10⁻⁷</span>
        <span>10⁻⁴</span>
        <span>10⁻¹</span>
        <span>1</span>
      </div>
    </div>
  );
}

export function Fig5LossToleranceMap({ params }: Fig5Props) {
  const [panelWidth, setPanelWidth] = useState(240);
  const [distKm, setDistKm] = useState(50);
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

  const eta = distanceToEta(distKm);
  const lossdB = distKm * 0.2;

  return (
    <Card className="bg-[#080c14] border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Layers className="w-4 h-4 text-orange-400" />
              Figure 5 — Loss Tolerance Map (L̃^CV:DV)
            </CardTitle>
            <p className="text-xs text-white/50 mt-1.5 max-w-2xl">
              Equivalent to Fig. 7b from Kish et al. Shows which protocol tolerates more channel loss
              for any combination of thermal noise (N_Th) and phase noise (σ²_θ).
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-white/40 bg-white/5 px-2 py-1 rounded">
            <Info className="w-3 h-3" />
            <span>V_sq = {params.VsqdB} dB</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Distance control */}
        <div className="mb-5 p-3 bg-white/[0.02] rounded-lg border border-white/5">
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[10px] text-white/60 font-medium">Fixed Fiber Distance</span>
            </div>
            <div className="flex-1 max-w-xs">
              <Slider
                value={[distKm]}
                onValueChange={(v) => setDistKm(v[0])}
                min={10}
                max={200}
                step={10}
                className="w-full"
              />
            </div>
            <div className="text-right min-w-[100px]">
              <span className="text-sm font-mono text-orange-400">{distKm} km</span>
              <span className="text-[9px] text-white/30 block">{lossdB.toFixed(1)} dB · η = {eta.toExponential(2)}</span>
            </div>
          </div>
          
          {/* Color legend */}
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: "rgb(30, 80, 180)" }} />
              <span className="text-[10px] text-blue-300">DV tolerates more loss</span>
            </div>
            
            <div className="relative">
              <div 
                className="h-4 w-28 rounded" 
                style={{ background: "linear-gradient(to right, rgb(30, 80, 180), rgb(240, 240, 245), rgb(255, 100, 50))" }} 
              />
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: "rgb(255, 100, 50)" }} />
              <span className="text-[10px] text-orange-300">CV tolerates more loss</span>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-5 mt-3 text-[10px]">
            <div className="flex items-center gap-1.5">
              <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#4ade80" strokeWidth="2" /></svg>
              <span className="text-green-400">Parity contour (L̃ ≈ 0)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full border-2 border-white" />
              <span className="text-white/50">Current params marker</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded" style={{ background: "rgb(8, 12, 20)" }} />
              <span className="text-white/30">Dead zone</span>
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
              distKm={distKm}
              panelWidth={panelWidth}
              panelHeight={panelHeight}
            />
          ))}
        </div>
        
        {/* X-axis label */}
        <p className="text-[10px] text-white/50 text-center mt-2 font-medium">
          Thermal Noise N_Th (log scale)
        </p>
        
        {/* Figure notes */}
        <div className="mt-4 pt-3 border-t border-white/5 text-[9px] text-white/30 space-y-1">
          <p><strong className="text-white/50">Metric:</strong> L̃^CV:DV = (K_CV - K_DV) / max(K_CV, K_DV, K₀) at fixed distance</p>
          <p><strong className="text-white/50">Use case:</strong> Determines which protocol is better suited for specific noise environments</p>
          <p><strong className="text-white/50">Interactive:</strong> Adjust distance slider to see how protocol dominance shifts with channel length</p>
        </div>
      </CardContent>
    </Card>
  );
}

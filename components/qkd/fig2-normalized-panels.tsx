"use client";

import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Info, Target } from "lucide-react";
import {
  generateNormData,
  NOISE_PANELS,
  PROTOCOL_COLORS,
  type NormDataPoint,
} from "@/lib/qkd-physics";
import type { SimulationParams } from "./parameter-controls";

interface Fig2Props {
  params: SimulationParams;
}

const CustomTooltip = ({
  active, payload, label,
}: {
  active?: boolean;
  payload?: { value: number | null; name: string; color: string }[];
  label?: number;
}) => {
  if (!active || !payload?.length) return null;
  
  const lossdB = Number(label) || 0;
  const distKm = Math.round(lossdB / 0.2);
  
  return (
    <div className="bg-[#0a0f18] border border-violet-500/30 rounded-lg p-3 shadow-2xl text-[11px] min-w-[200px] backdrop-blur-sm">
      <div className="border-b border-white/10 pb-2 mb-2">
        <p className="text-violet-400 font-semibold mb-1">Channel Point</p>
        <div className="grid grid-cols-2 gap-x-4 text-white/70">
          <span>Loss:</span><span className="font-mono text-white">{lossdB.toFixed(1)} dB</span>
          <span>Distance:</span><span className="font-mono text-white">{distKm} km</span>
        </div>
      </div>
      <p className="text-white/50 text-[10px] mb-1.5">Efficiency (K / K_Upper)</p>
      {payload
        .filter(p => p.value !== null && (p.value as number) > 0.001)
        .sort((a, b) => ((b.value as number) || 0) - ((a.value as number) || 0))
        .map((e, i) => (
          <div key={i} className="flex justify-between gap-3 mb-0.5 items-center">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-0.5 rounded-full" style={{ background: e.color }} />
              <span style={{ color: e.color }} className="text-[10px]">{e.name}</span>
            </div>
            <span className="font-mono text-white text-[10px]">
              {((e.value as number) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
    </div>
  );
};

function clamp(v: number): number | null {
  return v > 1e-4 ? Math.min(1, v) : null;
}

function SinglePanel({
  title,
  subtitle,
  data,
  currentLoss,
  labelColor,
  maxLoss,
  NTh,
}: {
  title: string;
  subtitle?: string;
  data: NormDataPoint[];
  currentLoss: number;
  labelColor: string;
  maxLoss: number;
  NTh: number;
}) {
  const chartData = useMemo(() =>
    data.map(d => ({
      loss: Math.round(d.loss * 10) / 10,
      BB84: clamp(d.BB84_norm),
      SixState: clamp(d.SixState_norm),
      SqzHom: clamp(d.SqzHom_norm),
      GG02Het: clamp(d.GG02Het_norm),
    })),
    [data]
  );

  // Find peak efficiency for each protocol
  const peakEfficiencies = useMemo(() => {
    const peaks = {
      BB84: { value: 0, loss: 0 },
      SixState: { value: 0, loss: 0 },
      SqzHom: { value: 0, loss: 0 },
      GG02Het: { value: 0, loss: 0 },
    };
    
    data.forEach(d => {
      if (d.BB84_norm > peaks.BB84.value) { peaks.BB84 = { value: d.BB84_norm, loss: d.loss }; }
      if (d.SixState_norm > peaks.SixState.value) { peaks.SixState = { value: d.SixState_norm, loss: d.loss }; }
      if (d.SqzHom_norm > peaks.SqzHom.value) { peaks.SqzHom = { value: d.SqzHom_norm, loss: d.loss }; }
      if (d.GG02Het_norm > peaks.GG02Het.value) { peaks.GG02Het = { value: d.GG02Het_norm, loss: d.loss }; }
    });
    
    return peaks;
  }, [data]);

  const bestProtocol = Object.entries(peakEfficiencies).reduce((a, b) => 
    b[1].value > a[1].value ? b : a
  );

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-[#0d1117] to-[#0a0f16] p-3 relative overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className={`text-xs font-bold ${labelColor}`}>{title}</p>
          {subtitle && <p className="text-[9px] text-white/40">{subtitle}</p>}
        </div>
        <div className="text-right">
          <p className="text-[9px] text-white/40">Best: {bestProtocol[0]}</p>
          <p className="text-[8px] text-green-400/70">
            {(bestProtocol[1].value * 100).toFixed(0)}% @ {bestProtocol[1].loss.toFixed(0)} dB
          </p>
        </div>
      </div>
      
      {/* Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 5, bottom: 25 }}>
            <defs>
              <linearGradient id={`optimalGrad-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15}/>
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" />
            
            <XAxis
              dataKey="loss"
              stroke="#ffffff20"
              fontSize={9}
              tickLine={false}
              axisLine={{ stroke: '#ffffff15' }}
              ticks={[0, maxLoss/4, maxLoss/2, maxLoss*3/4, maxLoss]}
              label={{ 
                value: "Channel Loss (dB)", 
                position: "bottom", 
                offset: 8, 
                style: { fill: "#ffffff40", fontSize: 9, fontWeight: 500 } 
              }}
            />
            
            <YAxis
              domain={[0, 1]}
              stroke="#ffffff20"
              fontSize={8}
              tickLine={false}
              axisLine={{ stroke: '#ffffff15' }}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              label={{ 
                value: "K / K_Upper", 
                angle: -90, 
                position: "insideLeft", 
                offset: 5, 
                style: { fill: "#ffffff40", fontSize: 9, fontWeight: 500, textAnchor: "middle" } 
              }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* Reference lines for efficiency thresholds */}
            <ReferenceLine 
              y={1} 
              stroke="#22c55e" 
              strokeDasharray="6 3" 
              strokeWidth={1.5} 
              strokeOpacity={0.5}
              label={{ value: "100% (Optimal)", position: "right", fontSize: 8, fill: "#22c55e80" }}
            />
            <ReferenceLine 
              y={0.5} 
              stroke="rgba(255,255,255,0.15)" 
              strokeDasharray="3 3" 
              strokeWidth={1}
            />
            
            {/* Current loss marker */}
            {currentLoss <= maxLoss && (
              <ReferenceLine
                x={Math.round(currentLoss * 10) / 10}
                stroke="#ffffff"
                strokeDasharray="4 2"
                strokeWidth={1}
                strokeOpacity={0.4}
              />
            )}
            
            {/* Protocol lines */}
            <Line 
              type="monotone" 
              dataKey="BB84" 
              name="BB84" 
              stroke={PROTOCOL_COLORS.BB84} 
              strokeWidth={2} 
              dot={false} 
              connectNulls 
              isAnimationActive={false} 
            />
            <Line 
              type="monotone" 
              dataKey="SixState" 
              name="Six-State" 
              stroke={PROTOCOL_COLORS.SixState} 
              strokeWidth={2} 
              dot={false} 
              connectNulls 
              isAnimationActive={false} 
            />
            <Line 
              type="monotone" 
              dataKey="SqzHom" 
              name="Sqz-Hom" 
              stroke={PROTOCOL_COLORS.SqzHom} 
              strokeWidth={2.5} 
              dot={false} 
              connectNulls 
              isAnimationActive={false} 
            />
            <Line 
              type="monotone" 
              dataKey="GG02Het" 
              name="GG02-Het" 
              stroke={PROTOCOL_COLORS.GG02Het} 
              strokeWidth={2} 
              dot={false} 
              connectNulls 
              isAnimationActive={false} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Distance scale */}
      <div className="flex justify-between mt-1 px-1 text-[8px] text-white/30">
        <span>0 km</span>
        <span>{Math.round(maxLoss/4/0.2)} km</span>
        <span>{Math.round(maxLoss/2/0.2)} km</span>
        <span>{Math.round(maxLoss*3/4/0.2)} km</span>
        <span>{Math.round(maxLoss/0.2)} km</span>
      </div>
    </div>
  );
}

export function Fig2NormalizedPanels({ params }: Fig2Props) {
  const allData = useMemo(() =>
    NOISE_PANELS.map(p =>
      generateNormData(p.NTh, params.sigma2Theta, params.VsqdB, p.maxLoss, 100)
    ),
    [params.sigma2Theta, params.VsqdB]
  );

  return (
    <Card className="bg-[#080c14] border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <BarChart3 className="w-4 h-4 text-violet-400" />
              Figure 2 — Normalized Key Rate K / K_Upper
            </CardTitle>
            <p className="text-xs text-white/50 mt-1.5 max-w-2xl">
              Benchmarks each protocol as a fraction of the PLOB upper bound capacity.
              100% = protocol achieves the theoretical maximum rate for that channel.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-white/40 bg-white/5 px-2 py-1 rounded">
            <Target className="w-3 h-3 text-green-400" />
            <span>Efficiency metric</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Legend bar */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5 px-1 py-2.5 bg-white/[0.02] rounded-lg border border-white/5">
          <span className="text-[10px] text-white/40 font-medium">DV-QKD:</span>
          {[
            { label: "BB84", color: PROTOCOL_COLORS.BB84 },
            { label: "Six-State", color: PROTOCOL_COLORS.SixState },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <svg width="20" height="10">
                <line x1="0" y1="5" x2="20" y2="5" stroke={l.color} strokeWidth="2" />
              </svg>
              <span className="text-[10px]" style={{ color: l.color }}>{l.label}</span>
            </div>
          ))}
          
          <div className="w-px h-4 bg-white/10 mx-1" />
          
          <span className="text-[10px] text-white/40 font-medium">CV-QKD:</span>
          {[
            { label: "Sqz-Hom", color: PROTOCOL_COLORS.SqzHom },
            { label: "GG02-Het", color: PROTOCOL_COLORS.GG02Het },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <svg width="20" height="10">
                <line x1="0" y1="5" x2="20" y2="5" stroke={l.color} strokeWidth="2.5" />
              </svg>
              <span className="text-[10px]" style={{ color: l.color }}>{l.label}</span>
            </div>
          ))}
          
          <div className="w-px h-4 bg-white/10 mx-1" />
          
          <div className="flex items-center gap-1.5">
            <svg width="24" height="10">
              <line x1="0" y1="5" x2="24" y2="5" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="6 3" />
            </svg>
            <span className="text-[10px] text-green-400/70">100% PLOB (Optimal)</span>
          </div>
        </div>
        
        {/* 4-panel grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {NOISE_PANELS.map((p, i) => (
            <SinglePanel
              key={p.label}
              title={p.label}
              subtitle={p.NTh < 1e-10 ? "Pure loss channel" : `N_Th = ${p.NTh}`}
              data={allData[i]}
              currentLoss={params.lossdB}
              labelColor={p.color}
              maxLoss={p.maxLoss}
              NTh={p.NTh}
            />
          ))}
        </div>
        
        {/* Figure notes */}
        <div className="mt-4 pt-3 border-t border-white/5 text-[9px] text-white/30 space-y-1">
          <p><strong className="text-white/50">Y-axis:</strong> Normalized efficiency K/K_Upper (linear scale, 0-100%)</p>
          <p><strong className="text-white/50">Interpretation:</strong> Higher values indicate the protocol operates closer to the fundamental capacity limit</p>
          <p><strong className="text-white/50">Note:</strong> CV protocols typically show higher efficiency at low loss; DV protocols are more robust at high loss</p>
        </div>
      </CardContent>
    </Card>
  );
}

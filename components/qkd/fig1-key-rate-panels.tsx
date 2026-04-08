"use client";

import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Info } from "lucide-react";
import {
  generateKeyRateData,
  NOISE_PANELS,
  PROTOCOL_COLORS,
  type DataPoint,
} from "@/lib/qkd-physics";
import type { SimulationParams } from "./parameter-controls";

interface Fig1Props {
  params: SimulationParams;
}

const MIN_K = 1e-7;

function nullIfTiny(v: number): number | null {
  return v > MIN_K ? v : null;
}

function logTick(v: number) {
  if (v <= 0) return "";
  const e = Math.round(Math.log10(v));
  if (e === 0) return "1";
  return `10${toSuperscript(e)}`;
}

function toSuperscript(n: number): string {
  const superscripts: Record<string, string> = {
    '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
  };
  return String(n).split('').map(c => superscripts[c] || c).join('');
}

const CustomTooltip = ({
  active, payload, label,
}: {
  active?: boolean;
  payload?: { value: number | null; name: string; color: string; dataKey: string }[];
  label?: number;
}) => {
  if (!active || !payload?.length) return null;
  
  const lossdB = Number(label) || 0;
  const distKm = Math.round(lossdB / 0.2);
  const eta = Math.pow(10, -lossdB / 10);
  
  return (
    <div className="bg-[#0a0f18] border border-cyan-500/30 rounded-lg p-3 shadow-2xl text-[11px] min-w-[220px] backdrop-blur-sm">
      <div className="border-b border-white/10 pb-2 mb-2">
        <p className="text-cyan-400 font-semibold mb-1">Channel Parameters</p>
        <div className="grid grid-cols-2 gap-x-4 text-white/70">
          <span>Loss:</span><span className="font-mono text-white">{lossdB.toFixed(1)} dB</span>
          <span>Distance:</span><span className="font-mono text-white">{distKm} km</span>
          <span>η:</span><span className="font-mono text-white">{eta.toExponential(2)}</span>
        </div>
      </div>
      <p className="text-white/50 text-[10px] mb-1.5">Key Rates (bits/channel use)</p>
      {payload.filter(p => p.value !== null && p.value > 0).sort((a, b) => (b.value || 0) - (a.value || 0)).map((e, i) => (
        <div key={i} className="flex justify-between gap-3 mb-0.5 items-center">
          <div className="flex items-center gap-1.5">
            <div 
              className="w-2.5 h-0.5 rounded-full" 
              style={{ 
                background: e.color,
                opacity: e.dataKey.includes('PLOB') ? 0.7 : 1
              }} 
            />
            <span style={{ color: e.color }} className="text-[10px]">{e.name}</span>
          </div>
          <span className="font-mono text-white text-[10px]">{Number(e.value).toExponential(3)}</span>
        </div>
      ))}
    </div>
  );
};

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
  data: DataPoint[];
  currentLoss: number;
  labelColor: string;
  maxLoss: number;
  NTh: number;
}) {
  const yDomain: [number, number] = [1e-6, 1];

  const chartData = useMemo(() =>
    data.map(d => ({
      loss: Math.round(d.loss * 10) / 10,
      PLOBUpper: nullIfTiny(d.PLOB_Upper),
      PLOBLower: nullIfTiny(d.PLOB_Lower),
      BB84: nullIfTiny(d.BB84),
      SixState: nullIfTiny(d.SixState),
      SqzHom: nullIfTiny(d.SqzHom),
      GG02Het: nullIfTiny(d.GG02Het),
    })),
    [data]
  );

  // Calculate key metrics for this panel
  const maxKeyRates = useMemo(() => {
    const validData = data.filter(d => d.BB84 > MIN_K || d.SixState > MIN_K || d.SqzHom > MIN_K);
    if (!validData.length) return null;
    const lastValid = validData[validData.length - 1];
    return {
      maxLoss: lastValid.loss,
      maxDist: Math.round(lastValid.loss / 0.2),
    };
  }, [data]);

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-[#0d1117] to-[#0a0f16] p-3 relative overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className={`text-xs font-bold ${labelColor}`}>{title}</p>
          {subtitle && <p className="text-[9px] text-white/40">{subtitle}</p>}
        </div>
        <div className="text-right">
          <p className="text-[9px] text-white/40">N_Th = {NTh < 1e-10 ? '0' : NTh.toExponential(0)}</p>
          {maxKeyRates && (
            <p className="text-[8px] text-white/30">Max range: ~{maxKeyRates.maxDist} km</p>
          )}
        </div>
      </div>
      
      {/* Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 5, bottom: 25 }}>
            <defs>
              {/* Gradient fills for PLOB bounds region */}
              <linearGradient id={`plobGrad-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.1}/>
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="2 4" 
              stroke="rgba(255,255,255,0.05)" 
              vertical={true}
              horizontal={true}
            />
            
            <XAxis
              dataKey="loss"
              stroke="#ffffff20"
              fontSize={9}
              tickLine={false}
              axisLine={{ stroke: '#ffffff15' }}
              ticks={[0, maxLoss/4, maxLoss/2, maxLoss*3/4, maxLoss]}
              tickFormatter={(v) => `${v}`}
              label={{ 
                value: "Channel Loss (dB)", 
                position: "bottom", 
                offset: 8, 
                style: { fill: "#ffffff40", fontSize: 9, fontWeight: 500 } 
              }}
            />
            
            <YAxis
              scale="log"
              domain={yDomain}
              stroke="#ffffff20"
              fontSize={8}
              tickLine={false}
              axisLine={{ stroke: '#ffffff15' }}
              tickCount={7}
              tickFormatter={logTick}
              label={{ 
                value: "K (bits/use)", 
                angle: -90, 
                position: "insideLeft", 
                offset: 5, 
                style: { fill: "#ffffff40", fontSize: 9, fontWeight: 500, textAnchor: "middle" } 
              }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* Current loss reference line */}
            {currentLoss <= maxLoss && (
              <ReferenceLine
                x={Math.round(currentLoss * 10) / 10}
                stroke="#ffffff"
                strokeDasharray="4 2"
                strokeWidth={1}
                strokeOpacity={0.4}
              />
            )}
            
            {/* PLOB Bounds - dashed lines */}
            <Line 
              type="monotone" 
              dataKey="PLOBUpper" 
              name="PLOB Upper (UB)" 
              stroke={PROTOCOL_COLORS.PLOBUpper} 
              strokeDasharray="8 4" 
              strokeWidth={1.5} 
              dot={false} 
              connectNulls 
              isAnimationActive={false} 
            />
            <Line 
              type="monotone" 
              dataKey="PLOBLower" 
              name="PLOB Lower (LB)" 
              stroke={PROTOCOL_COLORS.PLOBLower} 
              strokeDasharray="8 4" 
              strokeWidth={1.5} 
              dot={false} 
              connectNulls 
              isAnimationActive={false} 
            />
            
            {/* DV-QKD Protocols */}
            <Line 
              type="monotone" 
              dataKey="BB84" 
              name="BB84 (DV)" 
              stroke={PROTOCOL_COLORS.BB84} 
              strokeWidth={2} 
              dot={false} 
              connectNulls 
              isAnimationActive={false} 
            />
            <Line 
              type="monotone" 
              dataKey="SixState" 
              name="Six-State (DV)" 
              stroke={PROTOCOL_COLORS.SixState} 
              strokeWidth={2} 
              dot={false} 
              connectNulls 
              isAnimationActive={false} 
            />
            
            {/* CV-QKD Protocols */}
            <Line 
              type="monotone" 
              dataKey="SqzHom" 
              name="Sqz-Hom (CV)" 
              stroke={PROTOCOL_COLORS.SqzHom} 
              strokeWidth={2.5} 
              dot={false} 
              connectNulls 
              isAnimationActive={false} 
            />
            <Line 
              type="monotone" 
              dataKey="GG02Het" 
              name="GG02-Het (CV)" 
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

export function Fig1KeyRatePanels({ params }: Fig1Props) {
  const allData = useMemo(() =>
    NOISE_PANELS.map(p =>
      generateKeyRateData(p.NTh, params.sigma2Theta, params.VsqdB, p.maxLoss, 100)
    ),
    [params.sigma2Theta, params.VsqdB]
  );

  return (
    <Card className="bg-[#080c14] border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Figure 1 — Secret Key Rate vs Channel Loss
            </CardTitle>
            <p className="text-xs text-white/50 mt-1.5 max-w-2xl">
              Asymptotic secret key rate K (bits per channel use) as a function of channel loss for 4 thermal noise levels.
              All protocols use optimal parameters. Comparison shows PLOB capacity bounds vs achievable rates.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-white/40 bg-white/5 px-2 py-1 rounded">
            <Info className="w-3 h-3" />
            <span>σ²_θ = {params.sigma2Theta.toExponential(1)}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Legend bar */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5 px-1 py-2.5 bg-white/[0.02] rounded-lg border border-white/5">
          <span className="text-[10px] text-white/40 font-medium">Bounds:</span>
          {[
            { label: "PLOB Upper (UB)", color: PROTOCOL_COLORS.PLOBUpper, dashed: true },
            { label: "PLOB Lower (LB)", color: PROTOCOL_COLORS.PLOBLower, dashed: true },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <svg width="24" height="10">
                <line x1="0" y1="5" x2="24" y2="5" stroke={l.color} strokeWidth="2" strokeDasharray="6 3" />
              </svg>
              <span className="text-[10px]" style={{ color: l.color }}>{l.label}</span>
            </div>
          ))}
          
          <div className="w-px h-4 bg-white/10 mx-1" />
          
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
        </div>
        
        {/* 4-panel grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {NOISE_PANELS.map((p, i) => (
            <SinglePanel
              key={p.label}
              title={p.label}
              subtitle={p.NTh < 1e-10 ? "Pure loss channel (ideal)" : `Thermal photon number: ${p.NTh}`}
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
          <p><strong className="text-white/50">Y-axis:</strong> Secret key rate K in bits per channel use (log scale, 10⁻⁶ to 1)</p>
          <p><strong className="text-white/50">X-axis:</strong> Channel loss in dB (fiber attenuation 0.2 dB/km at 1550nm)</p>
          <p><strong className="text-white/50">Note:</strong> Loss range shrinks as N_Th increases due to earlier entanglement-breaking threshold</p>
        </div>
      </CardContent>
    </Card>
  );
}

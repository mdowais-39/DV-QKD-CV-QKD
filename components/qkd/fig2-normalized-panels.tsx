"use client";

import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
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
  return (
    <div className="bg-[#0d1117] border border-white/10 rounded-lg p-3 shadow-2xl text-[11px] min-w-[180px]">
      <p className="text-white/60 mb-2 font-mono">{Number(label).toFixed(1)} dB · {Math.round((Number(label) || 0) / 0.2)} km</p>
      {payload.filter(p => p.value !== null && (p.value as number) > 0).map((e, i) => (
        <div key={i} className="flex justify-between gap-3 mb-0.5">
          <span style={{ color: e.color }}>{e.name}</span>
          <span className="font-mono text-white">{((e.value as number) * 100).toFixed(1)}%</span>
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
  data,
  currentLoss,
  labelColor,
}: {
  title: string;
  data: NormDataPoint[];
  currentLoss: number;
  labelColor: string;
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

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1117] p-3">
      <p className={`text-xs font-semibold mb-2 ${labelColor}`}>{title}</p>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 8, left: 10, bottom: 18 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="loss"
              stroke="#ffffff30"
              fontSize={9}
              tickLine={false}
              label={{ value: "Loss (dB)", position: "bottom", offset: 4, style: { fill: "#ffffff50", fontSize: 9 } }}
            />
            <YAxis
              domain={[0, 1]}
              stroke="#ffffff30"
              fontSize={9}
              tickLine={false}
              tickCount={6}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              label={{ value: "K / K_upper", angle: -90, position: "insideLeft", offset: 12, style: { fill: "#ffffff50", fontSize: 9, textAnchor: "middle" } }}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* 100% reference line */}
            <ReferenceLine y={1} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" strokeWidth={1} />
            <ReferenceLine
              x={Math.round(currentLoss * 10) / 10}
              stroke="rgba(255,255,255,0.3)"
              strokeDasharray="6 3"
              strokeWidth={1}
            />
            <Line type="monotone" dataKey="BB84" name="BB84" stroke={PROTOCOL_COLORS.BB84} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            <Line type="monotone" dataKey="SixState" name="Six-State" stroke={PROTOCOL_COLORS.SixState} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            <Line type="monotone" dataKey="SqzHom" name="Sqz-Hom" stroke={PROTOCOL_COLORS.SqzHom} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            <Line type="monotone" dataKey="GG02Het" name="GG02-Het" stroke={PROTOCOL_COLORS.GG02Het} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function Fig2NormalizedPanels({ params }: Fig2Props) {
  const allData = useMemo(() =>
    NOISE_PANELS.map(p =>
      generateNormData(p.NTh, params.sigma2Theta, params.VsqdB, p.maxLoss, 80)
    ),
    [params.sigma2Theta, params.VsqdB]
  );

  return (
    <Card className="bg-[#080c14] border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <BarChart3 className="w-4 h-4 text-violet-400" />
          Figure 2 — Normalized Key Rate K / K_Upper
        </CardTitle>
        <p className="text-xs text-white/50">
          Benchmarks each protocol as a fraction of the PLOB upper bound · Y = 100% means the protocol achieves the theoretical maximum
        </p>
      </CardHeader>
      <CardContent>
        {/* Legend bar */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 px-1">
          {[
            { label: "BB84", color: PROTOCOL_COLORS.BB84 },
            { label: "Six-State", color: PROTOCOL_COLORS.SixState },
            { label: "Sqz-Hom (CV)", color: PROTOCOL_COLORS.SqzHom },
            { label: "GG02-Het (CV)", color: PROTOCOL_COLORS.GG02Het },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <svg width="22" height="10">
                <line x1="0" y1="5" x2="22" y2="5" stroke={l.color} strokeWidth="2" />
              </svg>
              <span className="text-[10px]" style={{ color: l.color }}>{l.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <svg width="22" height="10">
              <line x1="0" y1="5" x2="22" y2="5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="4 3" />
            </svg>
            <span className="text-[10px] text-white/40">100% of PLOB</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {NOISE_PANELS.map((p, i) => (
            <SinglePanel
              key={p.label}
              title={p.label}
              data={allData[i]}
              currentLoss={params.lossdB}
              labelColor={p.color}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

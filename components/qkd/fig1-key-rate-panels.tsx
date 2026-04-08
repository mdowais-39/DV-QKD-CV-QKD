"use client";

import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
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
  return `10^${e}`;
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
      {payload.filter(p => p.value !== null && p.value > 0).map((e, i) => (
        <div key={i} className="flex justify-between gap-3 mb-0.5">
          <span style={{ color: e.color }}>{e.name}</span>
          <span className="font-mono text-white">{Number(e.value).toExponential(2)}</span>
        </div>
      ))}
    </div>
  );
};

function SinglePanel({
  title,
  data,
  currentLoss,
  labelColor,
  showLegend = false,
}: {
  title: string;
  data: DataPoint[];
  currentLoss: number;
  labelColor: string;
  showLegend?: boolean;
}) {
  const yDomain = useMemo(() => {
    const all = data.flatMap(d => [d.BB84, d.SixState, d.SqzHom, d.GG02Het, d.PLOB_Upper])
      .filter(v => v > MIN_K);
    if (!all.length) return [1e-7, 1];
    return [1e-7, 1];
  }, [data]);

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
              scale="log"
              domain={yDomain}
              stroke="#ffffff30"
              fontSize={9}
              tickLine={false}
              tickCount={7}
              tickFormatter={logTick}
              label={{ value: "K (bits/use)", angle: -90, position: "insideLeft", offset: 12, style: { fill: "#ffffff50", fontSize: 9, textAnchor: "middle" } }}
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && (
              <Legend
                wrapperStyle={{ fontSize: 9, paddingTop: 4 }}
                formatter={(v) => <span style={{ color: "#ffffffaa" }}>{v}</span>}
              />
            )}
            <ReferenceLine
              x={Math.round(currentLoss * 10) / 10}
              stroke="rgba(255,255,255,0.3)"
              strokeDasharray="6 3"
              strokeWidth={1}
            />
            <Line type="monotone" dataKey="PLOBUpper" name="PLOB Upper" stroke={PROTOCOL_COLORS.PLOBUpper} strokeDasharray="6 3" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
            <Line type="monotone" dataKey="PLOBLower" name="PLOB Lower" stroke={PROTOCOL_COLORS.PLOBLower} strokeDasharray="6 3" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
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

export function Fig1KeyRatePanels({ params }: Fig1Props) {
  const allData = useMemo(() =>
    NOISE_PANELS.map(p =>
      generateKeyRateData(p.NTh, params.sigma2Theta, params.VsqdB, p.maxLoss, 80)
    ),
    [params.sigma2Theta, params.VsqdB]
  );

  return (
    <Card className="bg-[#080c14] border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          Figure 1 — Secret Key Rate vs Channel Loss
        </CardTitle>
        <p className="text-xs text-white/50">
          4 noise levels · Y-axis: K (bits/use) log scale · Lines: PLOB bounds, BB84, Six-State, Sqz-Hom, GG02-Het
          · Phase noise: σ²_θ = {params.sigma2Theta.toExponential(1)}
        </p>
      </CardHeader>
      <CardContent>
        {/* Legend bar */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 px-1">
          {[
            { label: "PLOB Upper", color: PROTOCOL_COLORS.PLOBUpper, dashed: true },
            { label: "PLOB Lower", color: PROTOCOL_COLORS.PLOBLower, dashed: true },
            { label: "BB84", color: PROTOCOL_COLORS.BB84 },
            { label: "Six-State", color: PROTOCOL_COLORS.SixState },
            { label: "Sqz-Hom (CV)", color: PROTOCOL_COLORS.SqzHom },
            { label: "GG02-Het (CV)", color: PROTOCOL_COLORS.GG02Het },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <svg width="22" height="10">
                <line
                  x1="0" y1="5" x2="22" y2="5"
                  stroke={l.color}
                  strokeWidth="2"
                  strokeDasharray={l.dashed ? "5 3" : undefined}
                />
              </svg>
              <span className="text-[10px]" style={{ color: l.color }}>{l.label}</span>
            </div>
          ))}
        </div>
        {/* 4-panel grid */}
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

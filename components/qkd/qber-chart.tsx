"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import type { SimulationParams } from "./parameter-controls";

// Physics functions
function dBToEta(lossdB: number): number {
  return Math.pow(10, -lossdB / 10);
}

function gamma(eta: number, NTh: number): number {
  return 1 + NTh - NTh * eta;
}

function depolarizingLambda(eta: number, NTh: number): number {
  const num = 2 * NTh * (1 + NTh) * Math.pow(1 - eta, 2);
  const den = Math.max(1e-15, eta + num);
  return Math.min(1, Math.max(0, num / den));
}

function qberThermal(eta: number, NTh: number): number {
  return depolarizingLambda(eta, NTh) / 2;
}

function psThermal(eta: number, NTh: number): number {
  const g = Math.pow(gamma(eta, NTh), 4);
  const num = eta + 2 * NTh * (1 + NTh) * Math.pow(1 - eta, 2);
  return Math.min(1, Math.max(0, num / Math.max(1e-15, g)));
}

interface QBERChartProps {
  params: SimulationParams;
}

interface QBERDataPoint {
  loss: number;
  distance: number;
  QBER: number;
  successProb: number;
}

export function QBERChart({ params }: QBERChartProps) {
  const data = useMemo(() => {
    const points: QBERDataPoint[] = [];
    const maxLoss = params.NTh > 0.01 ? 20 : params.NTh > 0.001 ? 35 : 50;
    const numPoints = 60;
    
    for (let i = 0; i <= numPoints; i++) {
      const loss = (i / numPoints) * maxLoss;
      const eta = dBToEta(loss);
      const distance = loss / 0.2;
      
      const qber = qberThermal(eta, params.NTh) * 100;
      const ps = psThermal(eta, params.NTh) * 100;
      
      points.push({
        loss: Math.round(loss * 10) / 10,
        distance: Math.round(distance),
        QBER: Math.min(50, qber),
        successProb: ps,
      });
    }
    
    return points;
  }, [params.NTh]);

  const currentLoss = params.lossdB;
  
  // Get current QBER value
  const currentEta = dBToEta(currentLoss);
  const currentQBER = qberThermal(currentEta, params.NTh) * 100;

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string }[]; label?: number }) => {
    if (!active || !payload || payload.length === 0) return null;

    const qber = payload.find(p => p.dataKey === "QBER")?.value || 0;
    const ps = payload.find(p => p.dataKey === "successProb")?.value || 0;

    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-xl backdrop-blur-sm">
        <p className="text-xs text-muted-foreground mb-2 font-medium">
          Loss: {label} dB ({Math.round((label || 0) / 0.2)} km)
        </p>
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#fb923c]" />
              QBER
            </span>
            <span className="font-mono font-medium">{qber.toFixed(2)}%</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#22d3ee]" />
              Success Prob
            </span>
            <span className="font-mono font-medium">{ps.toFixed(2)}%</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-border text-xs">
          {qber < 11 ? (
            <span className="text-green-400">BB84 Secure</span>
          ) : qber < 12.6 ? (
            <span className="text-yellow-400">Six-State Only</span>
          ) : (
            <span className="text-red-400">Insecure</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="w-4 h-4 text-accent" />
          Quantum Bit Error Rate (QBER)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Current QBER: <span className={currentQBER < 11 ? "text-green-400" : currentQBER < 12.6 ? "text-yellow-400" : "text-red-400"}>
            {currentQBER.toFixed(2)}%
          </span>
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
            >
              <defs>
                <linearGradient id="qberGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fb923c" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#fb923c" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="psGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis
                dataKey="loss"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                label={{
                  value: "Loss (dB)",
                  position: "bottom",
                  offset: 5,
                  style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 },
                }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                domain={[0, 50]}
                tickCount={6}
                tickFormatter={(v) => `${v}%`}
                tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Security threshold lines */}
              <ReferenceLine
                y={11}
                stroke="#ff6b6b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "BB84 Limit (11%)",
                  position: "right",
                  style: { fill: "#ff6b6b", fontSize: 9 },
                }}
              />
              <ReferenceLine
                y={12.6}
                stroke="#ffd43b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "6-State (12.6%)",
                  position: "right",
                  style: { fill: "#ffd43b", fontSize: 9 },
                }}
              />

              {/* Current loss marker */}
              <ReferenceLine
                x={Math.round(currentLoss * 10) / 10}
                stroke="hsl(var(--primary))"
                strokeDasharray="8 4"
                strokeWidth={2}
              />

              <Area
                type="monotone"
                dataKey="QBER"
                stroke="#fb923c"
                fill="url(#qberGradient)"
                strokeWidth={2.5}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-[#ff6b6b]" style={{ borderStyle: "dashed" }} />
            <span className="text-muted-foreground">BB84 secure: QBER &lt; 11%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-[#ffd43b]" style={{ borderStyle: "dashed" }} />
            <span className="text-muted-foreground">Six-State: QBER &lt; 12.6%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

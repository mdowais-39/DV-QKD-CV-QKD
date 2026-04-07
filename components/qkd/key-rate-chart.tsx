"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import type { SimulationParams } from "./parameter-controls";

// Physics functions inline for accurate calculations
function binaryEntropy(x: number): number {
  x = Math.max(1e-15, Math.min(1 - 1e-15, x));
  return -x * Math.log2(x) - (1 - x) * Math.log2(1 - x);
}

function vonNeumannH(x: number): number {
  x = Math.max(1e-15, x);
  return -x * Math.log2(x);
}

function bosonicEntropy(x: number): number {
  x = Math.max(1e-15, x);
  return (x + 1) * Math.log2(x + 1) - x * Math.log2(x);
}

function dBToEta(lossdB: number): number {
  return Math.pow(10, -lossdB / 10);
}

function depolarizingLambda(eta: number, NTh: number): number {
  const num = 2 * NTh * (1 + NTh) * Math.pow(1 - eta, 2);
  const den = Math.max(1e-15, eta + num);
  return Math.min(1, Math.max(0, num / den));
}

function qberThermal(eta: number, NTh: number): number {
  return depolarizingLambda(eta, NTh) / 2;
}

function gamma(eta: number, NTh: number): number {
  return 1 + NTh - NTh * eta;
}

function psThermal(eta: number, NTh: number): number {
  const g = Math.pow(gamma(eta, NTh), 4);
  const num = eta + 2 * NTh * (1 + NTh) * Math.pow(1 - eta, 2);
  return Math.min(1, Math.max(0, num / Math.max(1e-15, g)));
}

function keyRateBB84(eta: number, NTh: number): number {
  const PS = psThermal(eta, NTh);
  const Q = qberThermal(eta, NTh);
  const rate = (PS / 2) * (1 - 2 * binaryEntropy(Q));
  return Math.max(0, rate);
}

function keyRate6S(eta: number, NTh: number): number {
  const PS = psThermal(eta, NTh);
  const Q = qberThermal(eta, NTh);
  
  const L00 = Math.max(1e-15, 1 - 1.5 * Q);
  const L01 = Math.max(1e-15, Q / 2);
  
  const entropySum = vonNeumannH(L00) + 3 * vonNeumannH(L01);
  return Math.max(0, (PS / 2) * (1 - entropySum));
}

function keyRateSqzHom(eta: number, NTh: number, VsqdB: number = 15): number {
  const Vsq = Math.pow(10, -VsqdB / 10);
  const mu = 1 / Vsq;
  const VA = mu - 1;
  
  const chi = ((1 - eta) * (2 * NTh + 1)) / Math.max(1e-15, eta);
  const VB = eta * (VA + 1 + chi);
  const c = Math.sqrt(eta * (VA * VA + 2 * VA));
  
  const a = VA + 1;
  const b = VB;
  const VBGivenA = Math.max(1e-15, b - (c * c) / Math.max(1e-15, a));
  
  const IAB = 0.5 * Math.log2(VB / VBGivenA);
  
  const detA = a * a;
  const detB = b * b;
  const detC = c * c;
  const Delta = detA + detB - 2 * detC;
  const Dsq = Math.pow(a * b - detC, 2);
  const disc = Math.max(0, Delta * Delta - 4 * Dsq);
  
  const lambda1 = Math.sqrt(Math.max(1e-15, 0.5 * (Delta + Math.sqrt(disc))));
  const lambda2 = Math.sqrt(Math.max(1e-15, 0.5 * (Delta - Math.sqrt(disc))));
  
  const SAB = bosonicEntropy((lambda1 - 1) / 2) + bosonicEntropy((lambda2 - 1) / 2);
  
  const denom = eta * mu + (1 - eta) * (2 * NTh + 1);
  const lambda3x = mu - (eta * (mu * mu - 1)) / Math.max(1e-15, denom);
  const lambda3 = Math.sqrt(Math.max(1e-15, lambda3x * mu));
  const SEGivenB = bosonicEntropy((lambda3 - 1) / 2);
  
  const chiEB = SAB - SEGivenB;
  return Math.max(0, IAB - chiEB);
}

function isEntanglementBreaking(eta: number, NTh: number): boolean {
  const threshold = eta / Math.max(1e-15, 1 - eta);
  return NTh >= threshold;
}

function plobLower(eta: number, NTh: number): number {
  if (isEntanglementBreaking(eta, NTh)) return 0;
  return Math.max(0, -Math.log2(1 - eta) - bosonicEntropy(NTh));
}

function plobUpper(eta: number, NTh: number): number {
  if (isEntanglementBreaking(eta, NTh)) return 0;
  const etaSafe = Math.max(1e-15, Math.min(1 - 1e-15, eta));
  return Math.max(0, -Math.log2((1 - etaSafe) * Math.pow(etaSafe, NTh)) - bosonicEntropy(NTh));
}

interface KeyRateChartProps {
  params: SimulationParams;
}

interface DataPoint {
  loss: number;
  distance: number;
  BB84: number | null;
  SixState: number | null;
  SqzHom: number | null;
  PLOB_Upper: number | null;
  PLOB_Lower: number | null;
}

export function KeyRateChart({ params }: KeyRateChartProps) {
  const data = useMemo(() => {
    const points: DataPoint[] = [];
    const maxLoss = params.NTh > 0.01 ? 20 : params.NTh > 0.001 ? 35 : 50;
    const numPoints = 80;
    
    for (let i = 0; i <= numPoints; i++) {
      const loss = (i / numPoints) * maxLoss;
      const eta = dBToEta(loss);
      const distance = loss / 0.2;
      
      const bb84 = keyRateBB84(eta, params.NTh);
      const sixState = keyRate6S(eta, params.NTh);
      const sqzHom = keyRateSqzHom(eta, params.NTh, params.VsqdB);
      const plob_lower = plobLower(eta, params.NTh);
      const plob_upper = plobUpper(eta, params.NTh);
      
      // Only include points where at least one protocol has positive key rate
      const hasPositiveRate = bb84 > 1e-8 || sixState > 1e-8 || sqzHom > 1e-8 || plob_upper > 1e-8;
      
      points.push({
        loss: Math.round(loss * 10) / 10,
        distance: Math.round(distance),
        BB84: bb84 > 1e-8 ? bb84 : null,
        SixState: sixState > 1e-8 ? sixState : null,
        SqzHom: sqzHom > 1e-8 ? sqzHom : null,
        PLOB_Upper: hasPositiveRate && plob_upper > 1e-8 ? plob_upper : null,
        PLOB_Lower: hasPositiveRate && plob_lower > 1e-8 ? plob_lower : null,
      });
    }
    
    return points;
  }, [params.NTh, params.VsqdB]);

  const currentLoss = params.lossdB;

  const formatKeyRate = (value: number | null) => {
    if (value === null || value === 0) return "0";
    if (value < 1e-6) return value.toExponential(1);
    if (value < 0.001) return value.toExponential(2);
    return value.toFixed(4);
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number | null; name: string; color: string }[]; label?: number }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-xl backdrop-blur-sm">
        <p className="text-xs text-muted-foreground mb-2 font-medium">
          Loss: {label} dB ({Math.round((label || 0) / 0.2)} km)
        </p>
        <div className="space-y-1">
          {payload.filter(p => p.value !== null).map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}
              </span>
              <span className="font-mono font-medium">
                {formatKeyRate(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Calculate Y-axis domain based on data
  const yDomain = useMemo(() => {
    const allValues = data.flatMap(d => [d.BB84, d.SixState, d.SqzHom, d.PLOB_Upper]).filter(v => v !== null && v > 0) as number[];
    if (allValues.length === 0) return [1e-6, 1];
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    return [Math.pow(10, Math.floor(Math.log10(min))), Math.pow(10, Math.ceil(Math.log10(max)))];
  }, [data]);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="w-4 h-4 text-primary" />
          Secret Key Rate vs Channel Loss
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          N_Th = {params.NTh.toExponential(1)} | Squeezing = {params.VsqdB} dB
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis
                dataKey="loss"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                label={{
                  value: "Channel Loss (dB)",
                  position: "bottom",
                  offset: 5,
                  style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 },
                }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                scale="log"
                domain={yDomain}
                tickCount={6}
                tickFormatter={(v) => {
                  if (v >= 0.1) return v.toFixed(1);
                  if (v >= 0.01) return v.toFixed(2);
                  return v.toExponential(0);
                }}
                tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                label={{
                  value: "Key Rate K (bits/use)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: { fill: "hsl(var(--muted-foreground))", fontSize: 11, textAnchor: "middle" },
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                formatter={(value) => (
                  <span className="text-foreground">{value}</span>
                )}
              />

              {/* Reference line for current loss */}
              <ReferenceLine
                x={Math.round(currentLoss * 10) / 10}
                stroke="hsl(var(--primary))"
                strokeDasharray="8 4"
                strokeWidth={2}
                label={{
                  value: `${currentLoss} dB`,
                  position: "top",
                  style: { fill: "hsl(var(--primary))", fontSize: 10 },
                }}
              />

              {/* PLOB bounds */}
              <Line
                type="monotone"
                dataKey="PLOB_Upper"
                name="PLOB Upper Bound"
                stroke="#ff6b6b"
                strokeDasharray="6 3"
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="PLOB_Lower"
                name="PLOB Lower Bound"
                stroke="#51cf66"
                strokeDasharray="6 3"
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />

              {/* Protocol key rates */}
              {(params.protocol === "BB84" || params.protocol === "compare") && (
                <Line
                  type="monotone"
                  dataKey="BB84"
                  name="BB84"
                  stroke="#845ef7"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              )}
              {(params.protocol === "6S" || params.protocol === "compare") && (
                <Line
                  type="monotone"
                  dataKey="SixState"
                  name="Six-State"
                  stroke="#22d3ee"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              )}
              {(params.protocol === "SqzHom" || params.protocol === "compare") && (
                <Line
                  type="monotone"
                  dataKey="SqzHom"
                  name="Squeezed-Homodyne"
                  stroke="#fb923c"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          Vertical dashed line shows current operating point at {params.lossdB.toFixed(1)} dB ({Math.round(params.lossdB / 0.2)} km fiber)
        </p>
      </CardContent>
    </Card>
  );
}

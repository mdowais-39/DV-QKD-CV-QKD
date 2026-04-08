"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Key, AlertTriangle, Gauge, Zap, TrendingUp, TrendingDown } from "lucide-react";
import { PROTOCOL_COLORS } from "@/lib/qkd-physics";

interface MetricCardProps {
  title: string;
  value: string;
  sub: string;
  color: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

function MetricCard({ title, value, sub, color, icon, badge, badgeColor }: MetricCardProps) {
  return (
    <Card className="bg-[#0d1117] border-white/10 relative overflow-hidden">
      {/* Gradient glow accent */}
      <div
        className="absolute inset-0 opacity-5 rounded-xl"
        style={{ background: `radial-gradient(ellipse at top left, ${color}, transparent 70%)` }}
      />
      <CardContent className="p-4 relative">
        <div className="flex items-start justify-between mb-1">
          <p className="text-[10px] uppercase tracking-widest text-white/40">{title}</p>
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}16`, color }}>
            {icon}
          </div>
        </div>
        <p className="text-2xl font-mono font-bold" style={{ color }}>{value}</p>
        <p className="text-[10px] text-white/35 mt-0.5">{sub}</p>
        {badge && (
          <span
            className="mt-2 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold"
            style={{ backgroundColor: `${badgeColor || color}20`, color: badgeColor || color }}
          >
            {badge}
          </span>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricsPanelProps {
  keyRate: number;
  qber: number;
  keyRateBB84: number;
  keyRate6S: number;
  keyRateSqzHom: number;
  keyRateGG02: number;
  plobUpper: number;
  protocol: string;
}

export function MetricsPanel({
  keyRate,
  qber,
  keyRateBB84,
  keyRate6S,
  keyRateSqzHom,
  keyRateGG02,
  plobUpper,
  protocol,
}: MetricsPanelProps) {
  // Efficiency: clamp to 100% (values > 100 indicate near-lossless regime where PLOB is extremely tight)
  const efficiency = plobUpper > 0 ? Math.min(100, (keyRate / plobUpper) * 100) : 0;

  const qberColor = qber < 5 ? "#4ade80" : qber < 11 ? "#fbbf24" : "#f87171";
  const keyRateColor = keyRate > 0.01 ? "#4ade80" : keyRate > 1e-4 ? "#fbbf24" : "#f87171";
  const effColor = efficiency > 50 ? "#4ade80" : efficiency > 20 ? "#fbbf24" : "#f87171";

  const qberBadge = qber < 11 ? "BB84 Secure" : qber < 12.6 ? "6-State Only" : "Insecure";
  const qberBadgeColor = qber < 11 ? "#4ade80" : qber < 12.6 ? "#fbbf24" : "#f87171";

  // Best CV vs DV
  const bestDV = Math.max(keyRateBB84, keyRate6S);
  const bestCV = Math.max(keyRateSqzHom, keyRateGG02);
  const cvLeads = bestCV > bestDV;
  const advantage = bestDV > 0 || bestCV > 0
    ? (Math.abs(bestCV - bestDV) / Math.max(bestCV, bestDV, 1e-15)) * 100
    : 0;

  return (
    <div className="space-y-3">
      {/* Top metrics strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Secret Key Rate"
          value={keyRate > 0 ? keyRate.toExponential(2) : "0"}
          sub="bits / channel use"
          color={keyRateColor}
          icon={<Key className="w-3.5 h-3.5" />}
          badge={keyRate <= 0 ? "No key possible" : undefined}
          badgeColor="#f87171"
        />
        <MetricCard
          title="QBER"
          value={`${qber.toFixed(2)}%`}
          sub="Quantum Bit Error Rate"
          color={qberColor}
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          badge={qberBadge}
          badgeColor={qberBadgeColor}
        />
        <MetricCard
          title="PLOB Efficiency"
          value={`${efficiency.toFixed(1)}%`}
          sub="fraction of upper bound"
          color={effColor}
          icon={<Gauge className="w-3.5 h-3.5" />}
          badge={efficiency > 80 ? "Near-optimal" : undefined}
          badgeColor="#4ade80"
        />
        <MetricCard
          title={cvLeads ? "CV-QKD leads" : "DV-QKD leads"}
          value={`${advantage.toFixed(0)}%`}
          sub={cvLeads ? "Sqz-Hom vs Six-State" : "Six-State vs Sqz-Hom"}
          color={cvLeads ? PROTOCOL_COLORS.SqzHom : PROTOCOL_COLORS.SixState}
          icon={cvLeads ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        />
      </div>

      {/* Protocol rate bar */}
      <div className="rounded-xl border border-white/10 bg-[#0d1117] p-3">
        <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Protocol Key Rates (bits/use)</p>
        <div className="space-y-2">
          {[
            { label: "BB84", rate: keyRateBB84, color: PROTOCOL_COLORS.BB84 },
            { label: "Six-State", rate: keyRate6S, color: PROTOCOL_COLORS.SixState },
            { label: "Sqz-Hom (CV)", rate: keyRateSqzHom, color: PROTOCOL_COLORS.SqzHom },
            { label: "GG02-Het (CV)", rate: keyRateGG02, color: PROTOCOL_COLORS.GG02Het },
          ].map(({ label, rate, color }) => {
            const max = Math.max(keyRateBB84, keyRate6S, keyRateSqzHom, keyRateGG02, 1e-15);
            const pct = Math.min(100, (rate / max) * 100);
            return (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[10px] w-20 shrink-0" style={{ color }}>{label}</span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
                <span className="text-[10px] font-mono text-white/50 w-16 text-right">
                  {rate > 0 ? rate.toExponential(2) : "0"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Key, AlertTriangle, Gauge, TrendingUp } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  unit: string;
  status: "good" | "warning" | "bad";
  icon: React.ReactNode;
}

function MetricCard({ title, value, unit, status, icon }: MetricCardProps) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p
              className={cn(
                "text-2xl font-mono font-bold",
                status === "good" && "text-chart-3",
                status === "warning" && "text-chart-2",
                status === "bad" && "text-destructive"
              )}
            >
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{unit}</p>
          </div>
          <div
            className={cn(
              "p-2 rounded-lg",
              status === "good" && "bg-chart-3/10 text-chart-3",
              status === "warning" && "bg-chart-2/10 text-chart-2",
              status === "bad" && "bg-destructive/10 text-destructive"
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricsPanelProps {
  keyRate: number;
  qber: number;
  keyRate6S: number;
  keyRateSqzHom: number;
  plobUpper: number;
}

export function MetricsPanel({
  keyRate,
  qber,
  keyRate6S,
  keyRateSqzHom,
  plobUpper,
}: MetricsPanelProps) {
  const keyRateStatus = keyRate > 0.01 ? "good" : keyRate > 0.001 ? "warning" : "bad";
  const qberStatus = qber < 5 ? "good" : qber < 11 ? "warning" : "bad";
  const efficiency = plobUpper > 0 ? (keyRate / plobUpper) * 100 : 0;
  const efficiencyStatus = efficiency > 50 ? "good" : efficiency > 20 ? "warning" : "bad";

  // Determine which protocol is better
  const maxK = Math.max(keyRate6S, keyRateSqzHom);
  const cvAdvantage = maxK > 0 ? ((keyRateSqzHom - keyRate6S) / maxK) * 100 : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Secret Key Rate"
        value={keyRate > 0 ? keyRate.toExponential(2) : "0"}
        unit="bits/channel use"
        status={keyRateStatus}
        icon={<Key className="w-4 h-4" />}
      />
      <MetricCard
        title="QBER"
        value={qber.toFixed(2)}
        unit="percent"
        status={qberStatus}
        icon={<AlertTriangle className="w-4 h-4" />}
      />
      <MetricCard
        title="Efficiency"
        value={efficiency.toFixed(1)}
        unit="% of PLOB bound"
        status={efficiencyStatus}
        icon={<Gauge className="w-4 h-4" />}
      />
      
      {/* Protocol Comparison */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Protocol Comparison
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-chart-1">Six-State</span>
              <span className="font-mono">{keyRate6S.toExponential(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-chart-2">Sqz-Hom</span>
              <span className="font-mono">{keyRateSqzHom.toExponential(2)}</span>
            </div>
            {/* Comparison bar */}
            <div className="relative h-3 bg-muted rounded-full overflow-hidden mt-2">
              <div className="absolute inset-0 flex">
                <div
                  className="h-full bg-chart-1 transition-all duration-300"
                  style={{
                    width: `${maxK > 0 ? (keyRate6S / maxK) * 50 : 0}%`,
                  }}
                />
                <div className="w-px bg-border" />
                <div
                  className="h-full bg-chart-2 transition-all duration-300"
                  style={{
                    width: `${maxK > 0 ? (keyRateSqzHom / maxK) * 50 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-center">
              <TrendingUp className={cn(
                "w-3 h-3 mr-1",
                cvAdvantage > 0 ? "text-chart-2" : "text-chart-1"
              )} />
              <span className="text-xs text-muted-foreground">
                {cvAdvantage > 0 ? "CV-QKD" : "DV-QKD"} {Math.abs(cvAdvantage).toFixed(0)}% better
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

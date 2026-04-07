"use client";

import { useState, useMemo } from "react";
import { QKDHeader } from "@/components/qkd/header";
import { ParameterControls, type SimulationParams } from "@/components/qkd/parameter-controls";
import { MetricsPanel } from "@/components/qkd/metrics-panel";
import { KeyRateChart } from "@/components/qkd/key-rate-chart";
import { QBERChart } from "@/components/qkd/qber-chart";
import { ComparisonHeatmap } from "@/components/qkd/comparison-heatmap";
import { ProtocolInfo } from "@/components/qkd/protocol-info";
import { Button } from "@/components/ui/button";
import { ExternalLink, Play } from "lucide-react";
import {
  dBToEta,
  keyRateBB84,
  keyRate6SPhase,
  keyRateSqzHomPhase,
  qberThermal,
  plobUpper,
} from "@/lib/qkd-physics";

export default function QKDSimulator() {
  const [params, setParams] = useState<SimulationParams>({
    lossdB: 10,
    NTh: 1e-3,
    sigma2Theta: 1e-4,
    VsqdB: 15,
    protocol: "compare",
  });

  // Calculate current metrics based on parameters
  const metrics = useMemo(() => {
    const eta = dBToEta(params.lossdB);
    
    const kBB84 = keyRateBB84(eta, params.NTh);
    const k6S = keyRate6SPhase(eta, params.NTh, params.sigma2Theta);
    const kSqzHom = keyRateSqzHomPhase(eta, params.NTh, params.sigma2Theta, params.VsqdB);
    const plobUp = plobUpper(eta, params.NTh);
    const qber = qberThermal(eta, params.NTh) * 100;

    let currentKeyRate: number;
    switch (params.protocol) {
      case "BB84":
        currentKeyRate = kBB84;
        break;
      case "6S":
        currentKeyRate = k6S;
        break;
      case "SqzHom":
        currentKeyRate = kSqzHom;
        break;
      case "compare":
      default:
        currentKeyRate = Math.max(k6S, kSqzHom);
        break;
    }

    return {
      keyRate: currentKeyRate,
      keyRate6S: k6S,
      keyRateSqzHom: kSqzHom,
      qber,
      plobUpper: plobUp,
    };
  }, [params]);

  return (
    <div className="min-h-screen bg-background">
      <QKDHeader />
      
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Controls */}
          <div className="lg:col-span-1 space-y-6">
            <ParameterControls params={params} onParamsChange={setParams} />
            
            {/* Interactive Demo Link */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2">Interactive Visual Demo</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Experience a step-by-step animated walkthrough of the QKD protocol.
              </p>
              <Button asChild className="w-full" size="sm">
                <a href="/qkd_demo.html" target="_blank" rel="noopener noreferrer">
                  <Play className="w-4 h-4 mr-2" />
                  Launch Demo
                  <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              </Button>
            </div>

            <ProtocolInfo />
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Metrics Overview */}
            <MetricsPanel
              keyRate={metrics.keyRate}
              qber={metrics.qber}
              keyRate6S={metrics.keyRate6S}
              keyRateSqzHom={metrics.keyRateSqzHom}
              plobUpper={metrics.plobUpper}
            />

            {/* Key Rate Chart */}
            <KeyRateChart params={params} />

            {/* Bottom row: QBER and Comparison Heatmap */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <QBERChart params={params} />
              <ComparisonHeatmap params={params} />
            </div>

            {/* Footer info */}
            <div className="text-center text-xs text-muted-foreground py-4 border-t border-border">
              <p>
                All calculations follow Kish et al. (2024) exactly, assuming ideal sources, 
                detectors, and perfect reconciliation (beta = 1) in the asymptotic limit.
              </p>
              <p className="mt-1">
                Channel model: Thermal-loss with transmissivity eta and mean thermal photon number N_Th. 
                Phase noise modeled as bosonic dephasing with variance sigma_theta^2.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

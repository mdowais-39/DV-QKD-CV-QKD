"use client";

import { useState, useMemo } from "react";
import { QKDHeader } from "@/components/qkd/header";
import { ParameterControls, type SimulationParams } from "@/components/qkd/parameter-controls";
import { MetricsPanel } from "@/components/qkd/metrics-panel";
import { Fig1KeyRatePanels } from "@/components/qkd/fig1-key-rate-panels";
import { Fig2NormalizedPanels } from "@/components/qkd/fig2-normalized-panels";
import { Fig3CVDVMap } from "@/components/qkd/fig3-cv-dv-map";
import { Fig4PhaseNoiseMap } from "@/components/qkd/fig4-phase-noise-map";
import { Fig5LossToleranceMap } from "@/components/qkd/fig5-loss-tolerance-map";
import { ProtocolInfo } from "@/components/qkd/protocol-info";
import { Button } from "@/components/ui/button";
import { ExternalLink, Play } from "lucide-react";
import {
  dBToEta,
  keyRateBB84,
  keyRate6SPhase,
  keyRateSqzHomPhase,
  keyRateGG02HetPhase,
  qberThermal,
  plobUpper,
} from "@/lib/qkd-physics";

type FigureTab = "fig1" | "fig2" | "fig3" | "fig4" | "fig5";

const FIGURE_TABS: { id: FigureTab; label: string; short: string; color: string }[] = [
  { id: "fig1", label: "Key Rate vs Loss", short: "Fig 1", color: "text-cyan-400" },
  { id: "fig2", label: "Normalized K/K_upper", short: "Fig 2", color: "text-violet-400" },
  { id: "fig3", label: "CV:DV Map", short: "Fig 3", color: "text-green-400" },
  { id: "fig4", label: "Phase Noise Tolerance", short: "Fig 4", color: "text-amber-400" },
  { id: "fig5", label: "Loss Tolerance Map", short: "Fig 5", color: "text-orange-400" },
];

export default function QKDSimulator() {
  const [params, setParams] = useState<SimulationParams>({
    lossdB: 10,
    NTh: 1e-3,
    sigma2Theta: 1e-4,
    VsqdB: 15,
    protocol: "compare",
  });
  const [activeTab, setActiveTab] = useState<FigureTab>("fig1");

  const metrics = useMemo(() => {
    const eta = dBToEta(params.lossdB);
    const kBB84 = keyRateBB84(eta, params.NTh);
    const k6S = keyRate6SPhase(eta, params.NTh, params.sigma2Theta);
    const kSqzHom = keyRateSqzHomPhase(eta, params.NTh, params.sigma2Theta, params.VsqdB);
    const kGG02 = keyRateGG02HetPhase(eta, params.NTh, params.sigma2Theta);
    const plobUp = plobUpper(eta, params.NTh);
    const qber = qberThermal(eta, params.NTh) * 100;

    let currentKeyRate: number;
    switch (params.protocol) {
      case "BB84": currentKeyRate = kBB84; break;
      case "6S": currentKeyRate = k6S; break;
      case "SqzHom": currentKeyRate = kSqzHom; break;
      case "GG02": currentKeyRate = kGG02; break;
      default: currentKeyRate = Math.max(kBB84, k6S, kSqzHom, kGG02);
    }

    return { keyRate: currentKeyRate, keyRateBB84: kBB84, keyRate6S: k6S, keyRateSqzHom: kSqzHom, keyRateGG02: kGG02, qber, plobUpper: plobUp };
  }, [params]);

  return (
    <div className="min-h-screen bg-[#060a10]">
      <QKDHeader />

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* ── Sidebar ── */}
          <div className="lg:col-span-1 space-y-4">
            <ParameterControls params={params} onParamsChange={setParams} />

            {/* Interactive Demo */}
            <div className="rounded-xl border border-white/10 bg-[#0d1117] p-4">
              <h3 className="text-xs font-semibold text-white mb-1.5">Interactive Visual Demo</h3>
              <p className="text-[10px] text-white/40 mb-3">
                Step-by-step animated walkthrough of the QKD protocol exchange with polarizer visuals.
              </p>
              <Button asChild className="w-full h-8 text-xs" variant="outline">
                <a href="/simulation">
                  <Play className="w-3 h-3 mr-1.5" />
                  Launch Simulation
                  <ExternalLink className="w-2.5 h-2.5 ml-1.5" />
                </a>
              </Button>
            </div>

            <ProtocolInfo />
          </div>

          {/* ── Main Content ── */}
          <div className="lg:col-span-3 space-y-5">
            {/* Metrics */}
            <MetricsPanel
              keyRate={metrics.keyRate}
              qber={metrics.qber}
              keyRateBB84={metrics.keyRateBB84}
              keyRate6S={metrics.keyRate6S}
              keyRateSqzHom={metrics.keyRateSqzHom}
              keyRateGG02={metrics.keyRateGG02}
              plobUpper={metrics.plobUpper}
              protocol={params.protocol}
            />

            {/* Figure Tabs */}
            <div>
              {/* Tab bar */}
              <div className="flex gap-1 overflow-x-auto pb-1 mb-4">
                {FIGURE_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 rounded-lg px-3 py-2 text-[11px] font-medium transition-all duration-150 border ${
                      activeTab === tab.id
                        ? "border-white/20 bg-white/10 text-white"
                        : "border-transparent text-white/40 hover:text-white/70 hover:bg-white/5"
                    }`}
                  >
                    <span className={activeTab === tab.id ? tab.color : ""}>{tab.short}</span>
                    <span className="ml-1.5 hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Active figure */}
              <div className="transition-all">
                {activeTab === "fig1" && <Fig1KeyRatePanels params={params} />}
                {activeTab === "fig2" && <Fig2NormalizedPanels params={params} />}
                {activeTab === "fig3" && <Fig3CVDVMap params={params} />}
                {activeTab === "fig4" && <Fig4PhaseNoiseMap params={params} />}
                {activeTab === "fig5" && <Fig5LossToleranceMap params={params} />}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-white/25 py-3 border-t border-white/5">
              <p>All calculations follow Kish et al. (2024), arXiv:2206.13724v3 — asymptotic limit, β = 1 reconciliation, thermal-loss channel.</p>
              <p className="mt-0.5">Channel model: transmissivity η, mean thermal photon N_Th, bosonic dephasing variance σ²_θ.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

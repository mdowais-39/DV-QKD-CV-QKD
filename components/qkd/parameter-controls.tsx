"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Settings2 } from "lucide-react";

export interface SimulationParams {
  lossdB: number;
  NTh: number;
  sigma2Theta: number;
  VsqdB: number;
  protocol: "BB84" | "6S" | "SqzHom" | "GG02" | "compare";
}

interface ParameterControlsProps {
  params: SimulationParams;
  onParamsChange: (params: SimulationParams) => void;
}

const PROTOCOLS: { value: SimulationParams["protocol"]; label: string; color: string }[] = [
  { value: "BB84", label: "BB84", color: "#7dd3fc" },
  { value: "6S", label: "6-State", color: "#60a5fa" },
  { value: "SqzHom", label: "Sqz-Hom", color: "#fb923c" },
  { value: "GG02", label: "GG02-Het", color: "#fbbf24" },
  { value: "compare", label: "All", color: "#a78bfa" },
];

function formatLog(v: number): string {
  if (v <= 0) return "0";
  const e = Math.round(Math.log10(v));
  return `10^${e}`;
}

export function ParameterControls({ params, onParamsChange }: ParameterControlsProps) {
  const update = <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) =>
    onParamsChange({ ...params, [key]: value });

  return (
    <Card className="bg-[#080c14] border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-white">
          <Settings2 className="w-4 h-4 text-cyan-400" />
          Channel Parameters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Protocol selection */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest text-white/40">Protocol</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {PROTOCOLS.map(p => (
              <button
                key={p.value}
                onClick={() => update("protocol", p.value)}
                className={`rounded-md px-2 py-1.5 text-[11px] font-medium border transition-all duration-150 ${
                  params.protocol === p.value
                    ? "border-transparent text-black"
                    : "border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 bg-transparent"
                }`}
                style={
                  params.protocol === p.value
                    ? { backgroundColor: p.color }
                    : {}
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Channel Loss */}
        <SliderRow
          label="Channel Loss"
          value={params.lossdB}
          display={`${params.lossdB.toFixed(1)} dB (${(params.lossdB / 0.2).toFixed(0)} km)`}
          min={0} max={50} step={0.5}
          onChange={(v) => update("lossdB", v)}
        />

        {/* Thermal Noise */}
        <SliderRow
          label={<>Thermal Noise N<sub>Th</sub></>}
          value={Math.log10(params.NTh)}
          display={formatLog(params.NTh)}
          min={-8} max={-1} step={0.5}
          onChange={(v) => update("NTh", Math.pow(10, v))}
          mono
        />

        {/* Phase Noise */}
        <SliderRow
          label={<>Phase Noise σ²<sub>θ</sub></>}
          value={Math.log10(params.sigma2Theta)}
          display={formatLog(params.sigma2Theta)}
          min={-8} max={0} step={0.5}
          onChange={(v) => update("sigma2Theta", Math.pow(10, v))}
          mono
        />

        {/* Squeezing — shown when CV protocol selected */}
        {(params.protocol === "SqzHom" || params.protocol === "compare") && (
          <SliderRow
            label="Squeezing Level"
            value={params.VsqdB}
            display={`${params.VsqdB} dB`}
            min={0} max={20} step={1}
            onChange={(v) => update("VsqdB", v)}
          />
        )}

        {/* Quick protocol guide */}
        <div className="rounded-lg bg-white/5 p-3 space-y-1.5 text-[10px] text-white/40">
          <p><span className="text-[#7dd3fc]">BB84</span> — 2-basis DV, QBER &lt; 11%</p>
          <p><span className="text-[#60a5fa]">Six-State</span> — 3-basis DV, QBER &lt; 12.6%</p>
          <p><span className="text-[#fb923c]">Sqz-Hom</span> — Squeezed CV, homodyne</p>
          <p><span className="text-[#fbbf24]">GG02-Het</span> — Coherent CV, heterodyne</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
  mono = false,
}: {
  label: React.ReactNode;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  mono?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] text-white/50">{label}</Label>
        <span className={`text-[10px] text-cyan-400 ${mono ? "font-mono" : ""}`}>{display}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2 } from "lucide-react";

export interface SimulationParams {
  lossdB: number;
  NTh: number;
  sigma2Theta: number;
  VsqdB: number;
  protocol: "BB84" | "6S" | "SqzHom" | "compare";
}

interface ParameterControlsProps {
  params: SimulationParams;
  onParamsChange: (params: SimulationParams) => void;
}

export function ParameterControls({ params, onParamsChange }: ParameterControlsProps) {
  const updateParam = <K extends keyof SimulationParams>(
    key: K,
    value: SimulationParams[K]
  ) => {
    onParamsChange({ ...params, [key]: value });
  };

  const formatScientific = (value: number): string => {
    if (value === 0) return "0";
    const exp = Math.floor(Math.log10(value));
    return `10^${exp}`;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="w-4 h-4 text-primary" />
          Channel Parameters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Protocol Selection */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Protocol</Label>
          <Tabs
            value={params.protocol}
            onValueChange={(v) => updateParam("protocol", v as SimulationParams["protocol"])}
          >
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="BB84" className="text-xs">BB84</TabsTrigger>
              <TabsTrigger value="6S" className="text-xs">Six-State</TabsTrigger>
              <TabsTrigger value="SqzHom" className="text-xs">Sqz-Hom</TabsTrigger>
              <TabsTrigger value="compare" className="text-xs">Compare</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Channel Loss */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Channel Loss</Label>
            <span className="text-xs font-mono text-primary">
              {params.lossdB.toFixed(1)} dB ({(params.lossdB / 0.2).toFixed(0)} km)
            </span>
          </div>
          <Slider
            value={[params.lossdB]}
            onValueChange={([v]) => updateParam("lossdB", v)}
            min={0}
            max={50}
            step={0.5}
            className="w-full"
          />
        </div>

        {/* Thermal Noise */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              Thermal Noise N<sub>Th</sub>
            </Label>
            <span className="text-xs font-mono text-primary">
              {formatScientific(params.NTh)}
            </span>
          </div>
          <Slider
            value={[Math.log10(params.NTh)]}
            onValueChange={([v]) => updateParam("NTh", Math.pow(10, v))}
            min={-8}
            max={-1}
            step={0.5}
            className="w-full"
          />
        </div>

        {/* Phase Noise */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              Phase Noise sigma_theta^2
            </Label>
            <span className="text-xs font-mono text-primary">
              {formatScientific(params.sigma2Theta)}
            </span>
          </div>
          <Slider
            value={[Math.log10(params.sigma2Theta)]}
            onValueChange={([v]) => updateParam("sigma2Theta", Math.pow(10, v))}
            min={-8}
            max={0}
            step={0.5}
            className="w-full"
          />
        </div>

        {/* Squeezing Level (only for CV-QKD) */}
        {(params.protocol === "SqzHom" || params.protocol === "compare") && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Squeezing Level</Label>
              <span className="text-xs font-mono text-primary">
                {params.VsqdB} dB
              </span>
            </div>
            <Slider
              value={[params.VsqdB]}
              onValueChange={([v]) => updateParam("VsqdB", v)}
              min={0}
              max={20}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Info Box */}
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
          <p><strong>BB84:</strong> Two-basis protocol (Z, X)</p>
          <p><strong>Six-State:</strong> Three-basis DV-QKD (Z, X, Y)</p>
          <p><strong>Sqz-Hom:</strong> Squeezed-state CV-QKD with homodyne</p>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid3x3 } from "lucide-react";
import type { SimulationParams } from "./parameter-controls";

// Physics functions
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

function distanceToEta(distKm: number): number {
  const lossdB = distKm * 0.2;
  return dBToEta(lossdB);
}

function gamma(eta: number, NTh: number): number {
  return 1 + NTh - NTh * eta;
}

function depolarizingLambda(eta: number, NTh: number): number {
  const num = 2 * NTh * (1 + NTh) * Math.pow(1 - eta, 2);
  const den = Math.max(1e-15, eta + num);
  return Math.min(1, Math.max(0, num / den));
}

function psThermal(eta: number, NTh: number): number {
  const g = Math.pow(gamma(eta, NTh), 4);
  const num = eta + 2 * NTh * (1 + NTh) * Math.pow(1 - eta, 2);
  return Math.min(1, Math.max(0, num / Math.max(1e-15, g)));
}

function keyRate6S(eta: number, NTh: number): number {
  const PS = psThermal(eta, NTh);
  const lam = depolarizingLambda(eta, NTh);
  const Q = lam / 2;
  
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

interface ComparisonHeatmapProps {
  params: SimulationParams;
}

interface HeatmapCell {
  dist: number;
  nth: number;
  kTilde: number | null;
  k6S: number;
  kSqz: number;
  winner: "6S" | "SqzHom" | "none";
}

export function ComparisonHeatmap({ params }: ComparisonHeatmapProps) {
  const { heatmapData, gridCols, gridRows, distanceLabels, nthLabels } = useMemo(() => {
    const distances = Array.from({ length: 20 }, (_, i) => i * 20); // 0 to 380 km
    const nthValues = Array.from({ length: 15 }, (_, i) => Math.pow(10, -6 + i * 0.4)); // 10^-6 to ~10^0
    
    const data: HeatmapCell[] = [];
    const K0 = 1e-9;

    // Iterate from top to bottom (high NTh to low NTh) for correct visual order
    for (let j = nthValues.length - 1; j >= 0; j--) {
      const nth = nthValues[j];
      for (let i = 0; i < distances.length; i++) {
        const dist = distances[i];
        const eta = distanceToEta(dist);
        
        const k6S = keyRate6S(eta, nth);
        const kSqz = keyRateSqzHom(eta, nth, params.VsqdB);
        
        let kTilde: number | null = null;
        let winner: "6S" | "SqzHom" | "none" = "none";
        
        if (k6S > K0 || kSqz > K0) {
          const maxK = Math.max(k6S, kSqz, K0);
          kTilde = (kSqz - k6S) / maxK;
          winner = kSqz > k6S ? "SqzHom" : "6S";
        }
        
        data.push({ dist, nth, kTilde, k6S, kSqz, winner });
      }
    }

    return { 
      heatmapData: data, 
      gridCols: distances.length,
      gridRows: nthValues.length,
      distanceLabels: [0, 100, 200, 300, 380],
      nthLabels: ["10^-6", "10^-4", "10^-2", "10^0"],
    };
  }, [params.VsqdB]);

  // Color interpolation function - cyan for DV better, orange for CV better
  const getColor = (value: number | null): string => {
    if (value === null) return "rgb(30, 30, 40)";
    
    // Clamp value between -1 and 1
    const v = Math.max(-1, Math.min(1, value));
    
    if (v < 0) {
      // DV-QKD (Six-State) better: cyan shades
      const intensity = Math.abs(v);
      const r = Math.round(34 - intensity * 20);
      const g = Math.round(211 - intensity * 80);
      const b = Math.round(238 - intensity * 50);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // CV-QKD (Sqz-Hom) better: orange shades
      const intensity = v;
      const r = Math.round(251 - intensity * 30);
      const g = Math.round(146 - intensity * 100);
      const b = Math.round(60 - intensity * 40);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Grid3x3 className="w-4 h-4 text-primary" />
          CV vs DV Protocol Advantage Map
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          K&#x0303; = (K_CV - K_DV) / max(K_CV, K_DV) | Squeezing: {params.VsqdB} dB
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Heatmap grid with axes */}
          <div className="relative pl-12 pb-8">
            {/* Y-axis label */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-muted-foreground whitespace-nowrap">
              Thermal Noise N_Th
            </div>
            
            {/* Y-axis ticks */}
            <div className="absolute left-6 top-0 bottom-8 flex flex-col justify-between text-[10px] text-muted-foreground">
              <span>10^0</span>
              <span>10^-2</span>
              <span>10^-4</span>
              <span>10^-6</span>
            </div>
            
            {/* Main grid */}
            <div
              className="grid gap-px rounded-lg overflow-hidden border border-border"
              style={{
                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                gridTemplateRows: `repeat(${gridRows}, 1fr)`,
              }}
            >
              {heatmapData.map((cell, idx) => (
                <div
                  key={idx}
                  className="aspect-[1.3] transition-all duration-150 hover:scale-110 hover:z-10 hover:shadow-lg cursor-pointer"
                  style={{ backgroundColor: getColor(cell.kTilde) }}
                  title={`Distance: ${cell.dist}km\nN_Th: ${cell.nth.toExponential(1)}\nK̃: ${cell.kTilde?.toFixed(3) ?? 'N/A'}\n6-State: ${cell.k6S.toExponential(2)}\nSqz-Hom: ${cell.kSqz.toExponential(2)}`}
                />
              ))}
            </div>
            
            {/* X-axis ticks */}
            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground px-1">
              <span>0</span>
              <span>100</span>
              <span>200</span>
              <span>300</span>
              <span>380 km</span>
            </div>
            
            {/* X-axis label */}
            <div className="text-center text-xs text-muted-foreground mt-1">
              Fiber Distance (km)
            </div>
          </div>

          {/* Color legend */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#22d3ee]" />
              <span className="text-xs text-muted-foreground">Six-State better</span>
            </div>
            <div className="flex h-4 w-40 rounded overflow-hidden border border-border">
              <div className="flex-1" style={{ background: "linear-gradient(to right, #22d3ee, rgb(30, 30, 40), #fb923c)" }} />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#fb923c]" />
              <span className="text-xs text-muted-foreground">Sqz-Hom better</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Dark regions indicate both protocols have negligible key rate (K &lt; 10^-9 bits/use)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

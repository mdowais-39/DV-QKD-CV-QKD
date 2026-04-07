"use client";

import { Activity } from "lucide-react";

export function QKDHeader() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                QKD Protocol Simulator
              </h1>
              <p className="text-xs text-muted-foreground">
                DV-QKD vs CV-QKD Performance Analysis
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
            <span>Based on Kish et al. (2024)</span>
            <span className="w-px h-4 bg-border" />
            <span>Thermal-Loss Channel</span>
            <span className="w-px h-4 bg-border" />
            <span>Phase Noise Analysis</span>
          </div>
        </div>
      </div>
    </header>
  );
}

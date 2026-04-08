"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Zap, Shield } from "lucide-react";

export function ProtocolInfo() {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="w-4 h-4 text-primary" />
          Protocol Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* BB84 */}
        <div className="space-y-2 p-3 rounded-lg bg-muted/30">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-chart-4">BB84 Protocol</h4>
            <Badge variant="outline" className="text-xs">DV-QKD</Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The original QKD protocol using single photons encoded in two 
            mutually unbiased bases (Z and X). Secure against individual 
            attacks with QBER threshold of 11%.
          </p>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-chart-3" />
              QBER &lt; 11%
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-chart-5" />
              2 bases
            </span>
          </div>
        </div>

        {/* Six-State */}
        <div className="space-y-2 p-3 rounded-lg bg-muted/30">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-chart-1">Six-State Protocol</h4>
            <Badge variant="outline" className="text-xs">DV-QKD</Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Enhanced BB84 using three mutually unbiased bases (Z, X, Y). 
            Provides better noise tolerance and higher secure key rates 
            in noisy channels. Uses dual-rail qubit encoding.
          </p>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-chart-3" />
              QBER &lt; 12.6%
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-chart-5" />
              3 bases
            </span>
          </div>
        </div>

        {/* Squeezed-State */}
        <div className="space-y-2 p-3 rounded-lg bg-muted/30">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-chart-2">Squeezed-State Homodyne</h4>
            <Badge variant="outline" className="text-xs">CV-QKD</Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Continuous-variable protocol using squeezed states of light 
            with homodyne detection. Advantages include compatibility 
            with standard telecom components and high key rates at 
            short distances.
          </p>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-chart-3" />
              Gaussian states
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-chart-5" />
              Reverse reconciliation
            </span>
          </div>
        </div>

        {/* Reference */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <strong>Reference:</strong> Kish et al. (2024), &quot;Quantum Key Distribution 
            protocols are not more secure than their classical counterparts&quot;, 
            Quantum 8, arXiv:2206.13724v3
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { QKDHeader } from "@/components/qkd/header";
import { QKDVisualSimulation } from "@/components/qkd/qkd-visual-simulation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Settings2, 
  BookOpen, 
  Lightbulb,
  Atom,
  Shield,
  Waves,
  Binary,
  KeyRound
} from "lucide-react";
import Link from "next/link";

export default function SimulationPage() {
  const [showLegend, setShowLegend] = useState(true);
  
  return (
    <div className="min-h-screen bg-background">
      <QKDHeader />
      
      <main className="container mx-auto px-4 py-6">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowLegend(!showLegend)}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            {showLegend ? "Hide" : "Show"} Guide
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Simulation */}
          <div className="lg:col-span-3">
            <QKDVisualSimulation />
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Legend Card */}
            {showLegend && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                    Visual Legend
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Basis Legend */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Polarization Bases</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-cyan-500/20 border border-cyan-500 flex items-center justify-center">
                          <span className="text-[10px] text-cyan-400 font-bold">Z</span>
                        </div>
                        <span className="text-xs">Rectilinear (0° / 90°)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-orange-500/20 border border-orange-500 flex items-center justify-center">
                          <span className="text-[10px] text-orange-400 font-bold">X</span>
                        </div>
                        <span className="text-xs">Diagonal (45° / -45°)</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Photon States */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Photon States</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                        <span className="text-xs">Z-basis encoded photon</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                        <span className="text-xs">X-basis encoded photon</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Components */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Components</h4>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <p><strong className="text-violet-400">TX/RX:</strong> Polarization beam splitters</p>
                      <p><strong className="text-green-400">Detector:</strong> Single photon detector</p>
                      <p><strong className="text-red-400">Eve:</strong> Eavesdropper (detected via QBER)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Process Steps */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" />
                  BB84 Protocol Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-xs">
                  <li className="flex gap-2">
                    <Badge variant="outline" className="h-5 w-5 rounded-full p-0 justify-center shrink-0">1</Badge>
                    <div>
                      <span className="font-medium">State Preparation</span>
                      <p className="text-muted-foreground mt-0.5">Alice randomly chooses basis and bit value for each qubit</p>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <Badge variant="outline" className="h-5 w-5 rounded-full p-0 justify-center shrink-0">2</Badge>
                    <div>
                      <span className="font-medium">Quantum Transmission</span>
                      <p className="text-muted-foreground mt-0.5">Polarized photons sent through quantum channel</p>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <Badge variant="outline" className="h-5 w-5 rounded-full p-0 justify-center shrink-0">3</Badge>
                    <div>
                      <span className="font-medium">Measurement</span>
                      <p className="text-muted-foreground mt-0.5">Bob randomly selects measurement basis</p>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <Badge variant="outline" className="h-5 w-5 rounded-full p-0 justify-center shrink-0">4</Badge>
                    <div>
                      <span className="font-medium">Basis Reconciliation</span>
                      <p className="text-muted-foreground mt-0.5">Public comparison of chosen bases</p>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <Badge variant="outline" className="h-5 w-5 rounded-full p-0 justify-center shrink-0">5</Badge>
                    <div>
                      <span className="font-medium">Key Sifting</span>
                      <p className="text-muted-foreground mt-0.5">Keep only matching basis measurements</p>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <Badge variant="outline" className="h-5 w-5 rounded-full p-0 justify-center shrink-0">6</Badge>
                    <div>
                      <span className="font-medium">Error Estimation</span>
                      <p className="text-muted-foreground mt-0.5">Check QBER to detect eavesdropping</p>
                    </div>
                  </li>
                </ol>
              </CardContent>
            </Card>
            
            {/* Key Concepts */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Atom className="w-4 h-4 text-violet-400" />
                  Key Concepts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <Waves className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <span className="font-medium">No-Cloning Theorem</span>
                    <p className="text-muted-foreground">Unknown quantum states cannot be copied perfectly</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Binary className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <span className="font-medium">Measurement Disturbance</span>
                    <p className="text-muted-foreground">Measuring in wrong basis randomizes results</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <span className="font-medium">Information-Theoretic Security</span>
                    <p className="text-muted-foreground">Security guaranteed by physics laws, not computational assumptions</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <KeyRound className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <span className="font-medium">One-Time Pad</span>
                    <p className="text-muted-foreground">Perfect encryption when key is as long as message</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* QBER Threshold Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-400" />
                  Security Thresholds
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span>BB84 QBER limit:</span>
                    <Badge variant="outline" className="text-red-400">11%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Six-State QBER limit:</span>
                    <Badge variant="outline" className="text-orange-400">12.6%</Badge>
                  </div>
                  <p className="text-muted-foreground mt-2">
                    QBER above these thresholds indicates potential eavesdropping 
                    and compromises the security of the key.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground border-t border-border pt-4">
          <p>This simulation demonstrates the BB84 quantum key distribution protocol.</p>
          <p className="mt-1">Based on the seminal work by Bennett and Brassard (1984).</p>
        </div>
      </main>
    </div>
  );
}

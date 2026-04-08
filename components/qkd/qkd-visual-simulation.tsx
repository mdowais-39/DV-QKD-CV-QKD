"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Play, Pause, RotateCcw, ChevronRight, Eye, Shield, Zap, Lock, Unlock, Radio } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

type Basis = "rectilinear" | "diagonal"; // Z basis or X basis
type BitValue = 0 | 1;
type Protocol = "BB84" | "6S";

interface Qubit {
  id: number;
  bit: BitValue;
  aliceBasis: Basis;
  bobBasis: Basis;
  measured: boolean;
  match: boolean;
  state: "prepared" | "transmitting" | "received" | "measured" | "sifted";
  position: number; // 0-100 for animation
}

interface SimulationState {
  step: number;
  qubits: Qubit[];
  aliceKey: string;
  bobKey: string;
  siftedKey: string;
  message: string;
  ciphertext: string;
  decryptedMessage: string;
  eveDetected: boolean;
  qber: number;
  isPlaying: boolean;
  speed: number;
}

// ============================================================================
// Constants
// ============================================================================

const STEPS = [
  { id: 0, name: "Initial", description: "Alice prepares her secret message for quantum-secure transmission" },
  { id: 1, name: "State Preparation", description: "Alice encodes qubits using random polarization bases" },
  { id: 2, name: "Quantum Transmission", description: "Single photons traverse the quantum channel" },
  { id: 3, name: "Measurement", description: "Bob measures photons using random basis choices" },
  { id: 4, name: "Basis Reconciliation", description: "Alice and Bob compare bases via classical channel" },
  { id: 5, name: "Key Sifting", description: "Matching measurements form the raw key" },
  { id: 6, name: "Error Estimation", description: "Sample bits reveal eavesdropping attempts" },
  { id: 7, name: "Key Encryption", description: "One-time pad encryption using shared key" },
  { id: 8, name: "Secure Decryption", description: "Bob decrypts with information-theoretic security" },
];

const BASIS_SYMBOLS = {
  rectilinear: { angle: 0, symbols: ["|", "—"], label: "Z (Rectilinear)" },
  diagonal: { angle: 45, symbols: ["⤢", "⤡"], label: "X (Diagonal)" },
};

// ============================================================================
// Helper Functions
// ============================================================================

function textToBinary(text: string): string {
  return text.split("").map(char => char.charCodeAt(0).toString(2).padStart(8, "0")).join("");
}

function binaryToText(binary: string): string {
  let text = "";
  for (let i = 0; i < binary.length; i += 8) {
    const byte = binary.substr(i, 8);
    if (byte.length === 8) {
      text += String.fromCharCode(parseInt(byte, 2));
    }
  }
  return text;
}

function xorStrings(a: string, b: string): string {
  let result = "";
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    result += a[i] === b[i] ? "0" : "1";
  }
  return result;
}

function generateRandomBasis(): Basis {
  return Math.random() > 0.5 ? "rectilinear" : "diagonal";
}

function generateRandomBit(): BitValue {
  return Math.random() > 0.5 ? 1 : 0;
}

// ============================================================================
// Polarizer SVG Component
// ============================================================================

function Polarizer({ basis, active, size = 60 }: { basis: Basis; active?: boolean; size?: number }) {
  const angle = basis === "diagonal" ? 45 : 0;
  
  return (
    <div className={cn(
      "relative transition-all duration-300",
      active && "scale-110"
    )} style={{ width: size, height: size }}>
      <svg viewBox="0 0 60 60" className="w-full h-full">
        {/* Outer ring */}
        <circle
          cx="30" cy="30" r="27"
          fill="none"
          stroke={active ? (basis === "rectilinear" ? "#22d3ee" : "#fb923c") : "#374151"}
          strokeWidth="2"
          className="transition-colors duration-300"
        />
        
        {/* Inner glow effect */}
        {active && (
          <circle
            cx="30" cy="30" r="24"
            fill={basis === "rectilinear" ? "rgba(34, 211, 238, 0.1)" : "rgba(251, 146, 60, 0.1)"}
          />
        )}
        
        {/* Grid lines representing polarizer slits */}
        <g transform={`rotate(${angle} 30 30)`}>
          {[-12, -6, 0, 6, 12].map((offset) => (
            <line
              key={offset}
              x1="30" y1="8" x2="30" y2="52"
              transform={`translate(${offset} 0)`}
              stroke={active ? (basis === "rectilinear" ? "#22d3ee" : "#fb923c") : "#6b7280"}
              strokeWidth="1.5"
              className="transition-colors duration-300"
            />
          ))}
        </g>
        
        {/* Arrow indicating polarization axis */}
        <g transform={`rotate(${angle} 30 30)`}>
          <line
            x1="30" y1="6" x2="30" y2="54"
            stroke={active ? "#fff" : "#9ca3af"}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <polygon
            points="30,4 26,12 34,12"
            fill={active ? "#fff" : "#9ca3af"}
          />
        </g>
      </svg>
      
      {/* Label */}
      <div className={cn(
        "absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-medium whitespace-nowrap transition-colors",
        active ? (basis === "rectilinear" ? "text-cyan-400" : "text-orange-400") : "text-muted-foreground"
      )}>
        {basis === "rectilinear" ? "Z" : "X"}
      </div>
    </div>
  );
}

// ============================================================================
// Photon Component with Polarization State
// ============================================================================

function Photon({ 
  bit, 
  basis, 
  state, 
  position,
  showWave = false 
}: { 
  bit: BitValue; 
  basis: Basis; 
  state: string;
  position: number;
  showWave?: boolean;
}) {
  const angle = basis === "rectilinear" ? (bit === 0 ? 0 : 90) : (bit === 0 ? 45 : -45);
  const isActive = state === "transmitting" || state === "prepared";
  const color = basis === "rectilinear" ? "#22d3ee" : "#fb923c";
  
  return (
    <div 
      className="absolute top-1/2 -translate-y-1/2 transition-all duration-75"
      style={{ left: `${position}%`, transform: `translateX(-50%) translateY(-50%)` }}
    >
      {/* Wave function visualization */}
      {showWave && (
        <svg 
          className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-60"
          width="60" height="24" viewBox="0 0 60 24"
        >
          <path
            d="M0,12 Q7.5,0 15,12 T30,12 T45,12 T60,12"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />
        </svg>
      )}
      
      {/* Photon core */}
      <div 
        className={cn(
          "relative w-5 h-5 rounded-full transition-all duration-200",
          isActive && "animate-pulse"
        )}
        style={{
          background: `radial-gradient(circle at 30% 30%, ${color}, ${color}88)`,
          boxShadow: isActive ? `0 0 12px ${color}, 0 0 24px ${color}44` : "none"
        }}
      >
        {/* Polarization arrow */}
        <svg viewBox="0 0 20 20" className="absolute inset-0 w-full h-full">
          <g transform={`rotate(${angle} 10 10)`}>
            <line
              x1="10" y1="3" x2="10" y2="17"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <polygon
              points="10,2 7,7 13,7"
              fill="white"
            />
          </g>
        </svg>
      </div>
      
      {/* Bit value label */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-mono text-white/80">
        {bit}
      </div>
    </div>
  );
}

// ============================================================================
// Beam Splitter Component
// ============================================================================

function BeamSplitter({ active, label }: { active?: boolean; label: string }) {
  return (
    <div className="relative flex flex-col items-center gap-1">
      <svg viewBox="0 0 50 50" className="w-12 h-12">
        {/* Outer frame */}
        <rect
          x="5" y="5" width="40" height="40"
          fill="none"
          stroke={active ? "#a78bfa" : "#4b5563"}
          strokeWidth="2"
          rx="4"
          className="transition-colors duration-300"
        />
        
        {/* Diagonal splitter line */}
        <line
          x1="5" y1="45" x2="45" y2="5"
          stroke={active ? "#a78bfa" : "#6b7280"}
          strokeWidth="2"
          strokeDasharray={active ? "none" : "4 2"}
        />
        
        {/* Internal glow */}
        {active && (
          <rect
            x="8" y="8" width="34" height="34"
            fill="rgba(167, 139, 250, 0.15)"
            rx="2"
          />
        )}
        
        {/* Arrow indicators */}
        <polygon points="25,8 22,14 28,14" fill={active ? "#a78bfa" : "#6b7280"} />
        <polygon points="42,25 36,22 36,28" fill={active ? "#a78bfa" : "#6b7280"} />
      </svg>
      <span className={cn(
        "text-[9px] font-medium",
        active ? "text-violet-400" : "text-muted-foreground"
      )}>
        {label}
      </span>
    </div>
  );
}

// ============================================================================
// Detector Component
// ============================================================================

function Detector({ active, label, value }: { active?: boolean; label: string; value?: string }) {
  return (
    <div className="relative flex flex-col items-center gap-1">
      <svg viewBox="0 0 40 50" className="w-10 h-12">
        {/* Detector body */}
        <rect
          x="5" y="15" width="30" height="30"
          fill={active ? "#22c55e22" : "#1f2937"}
          stroke={active ? "#22c55e" : "#4b5563"}
          strokeWidth="2"
          rx="4"
        />
        
        {/* Input funnel */}
        <path
          d="M10,15 L20,5 L30,15"
          fill="none"
          stroke={active ? "#22c55e" : "#4b5563"}
          strokeWidth="2"
        />
        
        {/* Detection indicator */}
        <circle
          cx="20" cy="30"
          r={active ? "8" : "6"}
          fill={active ? "#22c55e" : "#374151"}
          className="transition-all duration-300"
        />
        
        {/* Pulse animation */}
        {active && (
          <circle
            cx="20" cy="30" r="8"
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
            className="animate-ping"
          />
        )}
      </svg>
      <span className={cn(
        "text-[9px] font-medium",
        active ? "text-green-400" : "text-muted-foreground"
      )}>
        {label}
      </span>
      {value && (
        <span className="text-xs font-mono text-green-400">{value}</span>
      )}
    </div>
  );
}

// ============================================================================
// Mini Bloch Sphere Component
// ============================================================================

function BlochSphere({ 
  basis, 
  bit, 
  size = 80,
  active = false 
}: { 
  basis: Basis; 
  bit: BitValue;
  size?: number;
  active?: boolean;
}) {
  // Calculate state vector position on Bloch sphere
  const getStatePosition = () => {
    if (basis === "rectilinear") {
      // Z-basis: |0⟩ at top, |1⟩ at bottom
      return bit === 0 ? { x: 0, y: -1, z: 0 } : { x: 0, y: 1, z: 0 };
    } else {
      // X-basis: |+⟩ and |-⟩ on equator
      return bit === 0 ? { x: 1, y: 0, z: 0 } : { x: -1, y: 0, z: 0 };
    }
  };
  
  const pos = getStatePosition();
  const cx = 40 + pos.x * 25;
  const cy = 40 + pos.y * 25;
  const color = basis === "rectilinear" ? "#22d3ee" : "#fb923c";
  
  return (
    <div 
      className={cn(
        "relative transition-all duration-300",
        active && "scale-105"
      )} 
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 80 80" className="w-full h-full">
        {/* Sphere outline - equator */}
        <ellipse
          cx="40" cy="40" rx="30" ry="10"
          fill="none"
          stroke="#374151"
          strokeWidth="1"
          strokeDasharray="3 2"
        />
        
        {/* Sphere outline - front half */}
        <circle
          cx="40" cy="40" r="30"
          fill="none"
          stroke="#4b5563"
          strokeWidth="1"
        />
        
        {/* Z-axis (vertical) */}
        <line x1="40" y1="8" x2="40" y2="72" stroke="#6b7280" strokeWidth="1" />
        <text x="42" y="10" fontSize="8" fill="#9ca3af">|0⟩</text>
        <text x="42" y="78" fontSize="8" fill="#9ca3af">|1⟩</text>
        
        {/* X-axis (horizontal) */}
        <line x1="8" y1="40" x2="72" y2="40" stroke="#6b7280" strokeWidth="1" />
        <text x="72" y="38" fontSize="7" fill="#9ca3af">|+⟩</text>
        <text x="2" y="38" fontSize="7" fill="#9ca3af">|-⟩</text>
        
        {/* State vector line */}
        <line
          x1="40" y1="40"
          x2={cx}
          y2={cy}
          stroke={color}
          strokeWidth="2"
          className={cn(active && "animate-pulse")}
        />
        
        {/* State point */}
        <circle
          cx={cx}
          cy={cy}
          r="5"
          fill={color}
          className={cn(active && "animate-pulse")}
        />
        
        {/* Glow effect */}
        {active && (
          <circle
            cx={cx}
            cy={cy}
            r="8"
            fill="none"
            stroke={color}
            strokeWidth="2"
            opacity="0.5"
            className="animate-ping"
          />
        )}
        
        {/* State label */}
        <text
          x={cx + (pos.x >= 0 ? 8 : -16)}
          y={cy + (pos.y >= 0 ? 12 : -6)}
          fontSize="9"
          fill={color}
          fontWeight="bold"
        >
          {basis === "rectilinear" 
            ? (bit === 0 ? "|0⟩" : "|1⟩")
            : (bit === 0 ? "|+⟩" : "|-⟩")
          }
        </text>
      </svg>
    </div>
  );
}

// ============================================================================
// Quantum Channel Visualization
// ============================================================================

function QuantumChannel({ 
  photons, 
  evePresent 
}: { 
  photons: Qubit[];
  evePresent?: boolean;
}) {
  const transmittingPhotons = photons.filter(q => q.state === "transmitting");
  
  return (
    <div className="relative h-24 flex-1 mx-4">
      {/* Channel background */}
      <div className="absolute inset-0 rounded-xl overflow-hidden">
        {/* Dark fiber optic background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-800/60 to-slate-900/80" />
        
        {/* Animated wave pattern - multiple layers */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <pattern id="wave1" x="0" y="0" width="80" height="30" patternUnits="userSpaceOnUse">
              <path
                d="M0,15 Q20,5 40,15 T80,15"
                fill="none"
                stroke="url(#waveGradient)"
                strokeWidth="1.5"
                opacity="0.4"
              />
            </pattern>
            <pattern id="wave2" x="0" y="0" width="60" height="30" patternUnits="userSpaceOnUse">
              <path
                d="M0,15 Q15,25 30,15 T60,15"
                fill="none"
                stroke="url(#waveGradient2)"
                strokeWidth="1"
                opacity="0.3"
              />
            </pattern>
            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
            <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            {/* Glow effect for photon trail */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Wave layer 1 */}
          <rect x="0" y="0" width="200%" height="100%" fill="url(#wave1)">
            <animate
              attributeName="x"
              from="0"
              to="-80"
              dur="2s"
              repeatCount="indefinite"
            />
          </rect>
          
          {/* Wave layer 2 - opposite direction */}
          <rect x="0" y="0" width="200%" height="100%" fill="url(#wave2)">
            <animate
              attributeName="x"
              from="-60"
              to="0"
              dur="3s"
              repeatCount="indefinite"
            />
          </rect>
        </svg>
        
        {/* Glowing center channel core */}
        <div className="absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 via-violet-500/40 to-green-500/30 blur-sm" />
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/60 via-violet-400/80 to-green-400/60 h-0.5 top-1/2 -translate-y-1/2" />
        </div>
        
        {/* Particle effect dots - using deterministic positions to avoid hydration mismatch */}
        <div className="absolute inset-0">
          {[35, 52, 41, 58, 47, 63, 38, 55].map((topPos, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-cyan-400/40 animate-pulse-slow"
              style={{
                top: `${topPos}%`,
                left: `${i * 12 + 5}%`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
        
        {/* Channel labels */}
        <div className="absolute top-1 left-3 text-[8px] text-cyan-400/50 font-mono">QUANTUM CHANNEL</div>
        <div className="absolute bottom-1 right-3 text-[8px] text-green-400/50 font-mono">SECURE FIBER</div>
      </div>
      
      {/* Eve indicator - enhanced */}
      {evePresent && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="relative">
            {/* Warning pulse */}
            <div className="absolute inset-0 w-14 h-14 rounded-full bg-red-500/20 animate-ping" />
            {/* Eve icon */}
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-red-600 to-red-800 border-2 border-red-500 border-dashed flex flex-col items-center justify-center shadow-lg shadow-red-500/30">
              <Eye className="w-6 h-6 text-white" />
            </div>
            {/* Label */}
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-[10px] font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded">EAVESDROPPER</span>
            </div>
            {/* Intercept lines */}
            <svg className="absolute inset-0 w-14 h-14" viewBox="0 0 56 56">
              <line x1="0" y1="28" x2="-20" y2="40" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 2" />
              <line x1="56" y1="28" x2="76" y2="40" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 2" />
            </svg>
          </div>
        </div>
      )}
      
      {/* Transmitting photons */}
      {transmittingPhotons.map((qubit) => (
        <Photon
          key={qubit.id}
          bit={qubit.bit}
          basis={qubit.aliceBasis}
          state={qubit.state}
          position={qubit.position}
          showWave
        />
      ))}
      
      {/* Fiber optic outer casing */}
      <div className="absolute inset-y-0 left-0 right-0 border-2 border-white/5 rounded-xl pointer-events-none">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/5 to-transparent h-1/3" />
      </div>
    </div>
  );
}

// ============================================================================
// Entity (Alice/Bob) Component
// ============================================================================

function Entity({
  name,
  role,
  icon,
  color,
  active,
  basis,
  children
}: {
  name: string;
  role: string;
  icon: React.ReactNode;
  color: string;
  active?: boolean;
  basis?: Basis;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 z-10">
      {/* Main entity box */}
      <div
        className={cn(
          "relative w-20 h-20 rounded-2xl flex flex-col items-center justify-center transition-all duration-300",
          active && "scale-110"
        )}
        style={{
          background: `linear-gradient(135deg, ${color}dd, ${color}88)`,
          boxShadow: active ? `0 0 30px ${color}66, 0 4px 20px rgba(0,0,0,0.3)` : "0 4px 20px rgba(0,0,0,0.2)",
          border: `2px solid ${color}`
        }}
      >
        {icon}
        
        {/* Active pulse ring */}
        {active && (
          <div
            className="absolute inset-0 rounded-2xl animate-ping opacity-30"
            style={{ border: `2px solid ${color}` }}
          />
        )}
      </div>
      
      {/* Labels */}
      <div className="text-center">
        <div className="text-sm font-semibold text-foreground">{name}</div>
        <div className="text-[10px] text-muted-foreground">{role}</div>
      </div>
      
      {/* Polarizer/Equipment below */}
      {basis && (
        <div className="mt-2">
          <Polarizer basis={basis} active={active} size={50} />
        </div>
      )}
      
      {children}
    </div>
  );
}

// ============================================================================
// Qubit Table Component
// ============================================================================

function QubitTable({ qubits, step }: { qubits: Qubit[]; step: number }) {
  const displayQubits = qubits.slice(0, 12);
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="px-2 py-1 text-left text-muted-foreground font-medium">Qubit</th>
            <th className="px-2 py-1 text-center text-muted-foreground font-medium">Bit</th>
            <th className="px-2 py-1 text-center text-cyan-400/70 font-medium">Alice Basis</th>
            <th className="px-2 py-1 text-center text-green-400/70 font-medium">Bob Basis</th>
            <th className="px-2 py-1 text-center text-muted-foreground font-medium">Match</th>
            <th className="px-2 py-1 text-center text-muted-foreground font-medium">Key Bit</th>
          </tr>
        </thead>
        <tbody>
          {displayQubits.map((qubit, idx) => (
            <tr 
              key={qubit.id} 
              className={cn(
                "border-b border-border/50 transition-colors",
                qubit.state === "sifted" && qubit.match && "bg-green-500/10",
                qubit.state === "sifted" && !qubit.match && "bg-red-500/5"
              )}
            >
              <td className="px-2 py-1 font-mono text-muted-foreground">#{idx + 1}</td>
              <td className="px-2 py-1 text-center font-mono">{step >= 1 ? qubit.bit : "?"}</td>
              <td className="px-2 py-1 text-center">
                {step >= 1 ? (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium",
                    qubit.aliceBasis === "rectilinear" ? "bg-cyan-500/20 text-cyan-400" : "bg-orange-500/20 text-orange-400"
                  )}>
                    {qubit.aliceBasis === "rectilinear" ? "Z" : "X"}
                  </span>
                ) : "—"}
              </td>
              <td className="px-2 py-1 text-center">
                {step >= 3 ? (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium",
                    qubit.bobBasis === "rectilinear" ? "bg-cyan-500/20 text-cyan-400" : "bg-orange-500/20 text-orange-400"
                  )}>
                    {qubit.bobBasis === "rectilinear" ? "Z" : "X"}
                  </span>
                ) : "—"}
              </td>
              <td className="px-2 py-1 text-center">
                {step >= 4 ? (
                  qubit.match ? (
                    <span className="text-green-400">&#10003;</span>
                  ) : (
                    <span className="text-red-400 opacity-50">&#10007;</span>
                  )
                ) : "—"}
              </td>
              <td className="px-2 py-1 text-center font-mono">
                {step >= 5 && qubit.match ? qubit.bit : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {qubits.length > 12 && (
        <div className="text-center text-[10px] text-muted-foreground mt-1">
          ... and {qubits.length - 12} more qubits
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Step Indicator Component
// ============================================================================

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: totalSteps }).map((_, idx) => (
        <div
          key={idx}
          className={cn(
            "w-2 h-2 rounded-full transition-all duration-300",
            idx < currentStep && "bg-green-500",
            idx === currentStep && "bg-cyan-400 scale-125 animate-pulse",
            idx > currentStep && "bg-white/20"
          )}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Main QKD Visual Simulation Component
// ============================================================================

export function QKDVisualSimulation() {
  const [state, setState] = useState<SimulationState>({
    step: 0,
    qubits: [],
    aliceKey: "",
    bobKey: "",
    siftedKey: "",
    message: "QUANTUM",
    ciphertext: "",
    decryptedMessage: "",
    eveDetected: false,
    qber: 0,
    isPlaying: false,
    speed: 1,
  });

  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const [activeAliceBasis, setActiveAliceBasis] = useState<Basis>("rectilinear");
  const [activeBobBasis, setActiveBobBasis] = useState<Basis>("rectilinear");

  // Initialize qubits based on message
  const initializeQubits = useCallback(() => {
    const binary = textToBinary(state.message);
    const qubits: Qubit[] = [];
    
    // Create more qubits than needed (some will be discarded during sifting)
    const numQubits = Math.max(binary.length * 2, 24);
    
    for (let i = 0; i < numQubits; i++) {
      const aliceBasis = generateRandomBasis();
      const bobBasis = generateRandomBasis();
      qubits.push({
        id: i,
        bit: i < binary.length ? (parseInt(binary[i]) as BitValue) : generateRandomBit(),
        aliceBasis,
        bobBasis,
        measured: false,
        match: aliceBasis === bobBasis,
        state: "prepared",
        position: 0,
      });
    }
    
    return qubits;
  }, [state.message]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }
    setState(prev => ({
      ...prev,
      step: 0,
      qubits: initializeQubits(),
      aliceKey: "",
      bobKey: "",
      siftedKey: "",
      ciphertext: "",
      decryptedMessage: "",
      eveDetected: false,
      qber: 0,
      isPlaying: false,
    }));
  }, [initializeQubits]);

  // Initialize on mount
  useEffect(() => {
    resetSimulation();
  }, []);

  // Animate step progression
  const runStep = useCallback(async (step: number) => {
    setState(prev => ({ ...prev, step }));

    switch (step) {
      case 1: // State Preparation
        // Animate basis selection for Alice
        let basisIdx = 0;
        const basisInterval = setInterval(() => {
          const basis = state.qubits[basisIdx]?.aliceBasis || "rectilinear";
          setActiveAliceBasis(basis);
          basisIdx++;
          if (basisIdx >= Math.min(state.qubits.length, 8)) {
            clearInterval(basisInterval);
          }
        }, 200);
        break;

      case 2: // Quantum Transmission
        // Animate photons moving through channel
        setState(prev => ({
          ...prev,
          qubits: prev.qubits.map((q, idx) => ({
            ...q,
            state: idx < 8 ? "transmitting" : "prepared",
            position: 0,
          })),
        }));
        
        // Animate position
        const movePhotons = () => {
          setState(prev => ({
            ...prev,
            qubits: prev.qubits.map(q => ({
              ...q,
              position: q.state === "transmitting" ? Math.min(q.position + 2, 100) : q.position,
              state: q.position >= 100 ? "received" : q.state,
            })),
          }));
        };
        
        const moveInterval = setInterval(movePhotons, 50);
        setTimeout(() => clearInterval(moveInterval), 3000);
        break;

      case 3: // Measurement
        // Animate Bob's basis choices
        let bobIdx = 0;
        const bobInterval = setInterval(() => {
          const basis = state.qubits[bobIdx]?.bobBasis || "rectilinear";
          setActiveBobBasis(basis);
          bobIdx++;
          if (bobIdx >= Math.min(state.qubits.length, 8)) {
            clearInterval(bobInterval);
          }
        }, 200);
        
        setState(prev => ({
          ...prev,
          qubits: prev.qubits.map(q => ({ ...q, state: "measured", measured: true })),
        }));
        break;

      case 4: // Basis Reconciliation
        // No state change, just visual comparison
        break;

      case 5: // Key Sifting
        setState(prev => {
          const matchingQubits = prev.qubits.filter(q => q.match);
          const siftedKey = matchingQubits.map(q => q.bit).join("").slice(0, 16);
          return {
            ...prev,
            qubits: prev.qubits.map(q => ({ ...q, state: "sifted" })),
            siftedKey,
            aliceKey: siftedKey,
            bobKey: siftedKey,
          };
        });
        break;

      case 6: // Error Estimation
        // Calculate simulated QBER
        const qber = Math.random() * 0.03; // Low QBER means no Eve
        setState(prev => ({
          ...prev,
          qber,
          eveDetected: qber > 0.11,
        }));
        break;

      case 7: // Encryption
        setState(prev => {
          const binary = textToBinary(prev.message);
          const keyExtended = prev.siftedKey.repeat(Math.ceil(binary.length / prev.siftedKey.length)).slice(0, binary.length);
          const ciphertext = xorStrings(binary, keyExtended);
          return { ...prev, ciphertext };
        });
        break;

      case 8: // Decryption
        setState(prev => {
          const keyExtended = prev.siftedKey.repeat(Math.ceil(prev.ciphertext.length / prev.siftedKey.length)).slice(0, prev.ciphertext.length);
          const decrypted = xorStrings(prev.ciphertext, keyExtended);
          const decryptedMessage = binaryToText(decrypted);
          return { ...prev, decryptedMessage };
        });
        break;
    }
  }, [state.qubits]);

  // Auto-advance steps
  useEffect(() => {
    if (!state.isPlaying) return;

    const timer = setTimeout(() => {
      if (state.step < STEPS.length - 1) {
        runStep(state.step + 1);
      } else {
        setState(prev => ({ ...prev, isPlaying: false }));
      }
    }, 3000 / state.speed);

    return () => clearTimeout(timer);
  }, [state.isPlaying, state.step, state.speed, runStep]);

  const currentStepInfo = STEPS[state.step];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-card/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Radio className="w-5 h-5 text-primary" />
              QKD Protocol Visual Simulation
            </h3>
            <p className="text-sm text-muted-foreground">
              Interactive BB84 Quantum Key Distribution demonstration
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))}
              disabled={state.step >= STEPS.length - 1 && !state.isPlaying}
            >
              {state.isPlaying ? (
                <><Pause className="w-4 h-4 mr-1" /> Pause</>
              ) : (
                <><Play className="w-4 h-4 mr-1" /> {state.step === 0 ? "Start" : "Resume"}</>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (state.step < STEPS.length - 1) {
                  runStep(state.step + 1);
                }
              }}
              disabled={state.isPlaying || state.step >= STEPS.length - 1}
            >
              <ChevronRight className="w-4 h-4 mr-1" /> Next Step
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={resetSimulation}
            >
              <RotateCcw className="w-4 h-4 mr-1" /> Reset
            </Button>
          </div>
        </div>
        
        {/* Step indicator */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              Step {state.step + 1} of {STEPS.length}
            </span>
            <StepIndicator currentStep={state.step} totalSteps={STEPS.length} />
          </div>
          <div className="text-sm font-medium text-primary">
            {currentStepInfo.name}
          </div>
        </div>
      </div>

      {/* Main visualization area */}
      <div className="p-6">
        {/* Message Input - only show at step 0 */}
        {state.step === 0 && (
          <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/30">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Secure Message Transmission</span>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  value={state.message}
                  onChange={(e) => setState(prev => ({ ...prev, message: e.target.value.toUpperCase().slice(0, 16) }))}
                  placeholder="Enter your secret message..."
                  className="font-mono text-lg tracking-wider uppercase bg-background/50"
                  maxLength={16}
                />
                <p className="text-[10px] text-muted-foreground mt-1">Max 16 characters - will be encrypted using quantum-secure keys</p>
              </div>
            </div>
            {/* Binary preview */}
            <div className="mt-3 p-2 rounded bg-background/30 border border-border">
              <span className="text-[10px] text-muted-foreground">Binary encoding: </span>
              <span className="font-mono text-[10px] text-cyan-400 break-all">
                {textToBinary(state.message).split('').map((bit, i) => (
                  <span key={i} className={i % 8 === 0 && i > 0 ? "ml-1" : ""}>{bit}</span>
                ))}
              </span>
              <span className="text-[10px] text-muted-foreground ml-2">({textToBinary(state.message).length} bits)</span>
            </div>
          </div>
        )}

        {/* Step description */}
        <div className="mb-6 p-4 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground">{currentStepInfo.description}</p>
            {state.step > 0 && (
              <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                Message: {state.message}
              </span>
            )}
          </div>
        </div>

        {/* Main animation area */}
        <div className="relative bg-gradient-to-b from-background to-muted/20 rounded-xl p-6 min-h-[280px] flex items-center justify-between">
          {/* Alice */}
          <Entity
            name="Alice"
            role="Sender"
            icon={<Lock className="w-8 h-8 text-white" />}
            color="#2563eb"
            active={state.step <= 2 || state.step === 7}
            basis={state.step >= 1 ? activeAliceBasis : undefined}
          >
            {state.step >= 7 && state.ciphertext && (
              <div className="mt-2 text-[10px] text-center max-w-20">
                <span className="text-muted-foreground">Encrypting:</span>
                <div className="font-mono text-orange-400 truncate">{state.message}</div>
              </div>
            )}
          </Entity>

          {/* Transmitter */}
          <div className="flex flex-col items-center gap-2">
            <BeamSplitter active={state.step >= 1 && state.step <= 2} label="TX" />
            {state.step >= 1 && (
              <div className="text-[10px] text-center text-muted-foreground">
                Polarization<br/>Encoding
              </div>
            )}
          </div>

          {/* Quantum Channel */}
          <QuantumChannel 
            photons={state.qubits} 
            evePresent={state.step === 6 && state.eveDetected}
          />

          {/* Receiver */}
          <div className="flex flex-col items-center gap-2">
            <BeamSplitter active={state.step >= 3 && state.step <= 4} label="RX" />
            {state.step >= 3 && (
              <div className="text-[10px] text-center text-muted-foreground">
                Basis<br/>Selection
              </div>
            )}
          </div>

          {/* Bob */}
          <Entity
            name="Bob"
            role="Receiver"
            icon={<Unlock className="w-8 h-8 text-white" />}
            color="#16a34a"
            active={state.step >= 3 && state.step <= 4 || state.step === 8}
            basis={state.step >= 3 ? activeBobBasis : undefined}
          >
            {state.step >= 8 && state.decryptedMessage && (
              <div className="mt-2 text-[10px] text-center max-w-20">
                <span className="text-muted-foreground">Decrypted:</span>
                <div className="font-mono text-green-400 truncate">{state.decryptedMessage}</div>
              </div>
            )}
          </Entity>
        </div>

        {/* Quantum State Visualization - Bloch Spheres */}
        {state.step >= 1 && state.step <= 3 && state.qubits.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-400" />
              Quantum State Visualization (Bloch Sphere)
            </h4>
            <div className="rounded-lg border border-border bg-card/50 p-4">
              <div className="flex flex-wrap justify-center gap-4">
                {state.qubits.slice(0, 6).map((qubit, idx) => (
                  <div 
                    key={qubit.id} 
                    className={cn(
                      "flex flex-col items-center p-2 rounded-lg transition-all",
                      (state.step === 2 && qubit.state === "transmitting") && "bg-violet-500/10 ring-1 ring-violet-500/30"
                    )}
                  >
                    <span className="text-[10px] text-muted-foreground mb-1">Qubit #{idx + 1}</span>
                    <BlochSphere 
                      basis={qubit.aliceBasis} 
                      bit={qubit.bit}
                      size={70}
                      active={state.step === 2 && qubit.state === "transmitting"}
                    />
                    <div className="mt-1 flex items-center gap-1">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-medium",
                        qubit.aliceBasis === "rectilinear" ? "bg-cyan-500/20 text-cyan-400" : "bg-orange-500/20 text-orange-400"
                      )}>
                        {qubit.aliceBasis === "rectilinear" ? "Z" : "X"}
                      </span>
                      <span className="font-mono text-[10px] text-foreground">{qubit.bit}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-3">
                Each qubit is in a superposition state determined by the chosen basis and bit value
              </p>
            </div>
          </div>
        )}

        {/* Qubit table - show during relevant steps */}
        {state.step >= 1 && state.step <= 5 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Qubit States & Basis Comparison
            </h4>
            <div className="rounded-lg border border-border bg-card/50 p-3">
              <QubitTable qubits={state.qubits} step={state.step} />
            </div>
          </div>
        )}

        {/* Key display - show after sifting */}
        {state.step >= 5 && (
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-medium text-cyan-400">Alice&apos;s Key</span>
              </div>
              <div className="font-mono text-sm text-foreground break-all">
                {state.aliceKey || "—"}
              </div>
            </div>
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-xs font-medium text-green-400">Bob&apos;s Key</span>
              </div>
              <div className="font-mono text-sm text-foreground break-all">
                {state.bobKey || "—"}
              </div>
            </div>
          </div>
        )}

        {/* QBER display */}
        {state.step >= 6 && (
          <div className="mt-4 rounded-lg border border-border bg-card/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-muted-foreground">Quantum Bit Error Rate (QBER)</span>
                <div className={cn(
                  "text-2xl font-mono font-bold",
                  state.qber < 0.05 ? "text-green-400" : state.qber < 0.11 ? "text-yellow-400" : "text-red-400"
                )}>
                  {(state.qber * 100).toFixed(2)}%
                </div>
              </div>
              <div className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium",
                state.eveDetected ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"
              )}>
                {state.eveDetected ? "Eve Detected!" : "Channel Secure"}
              </div>
            </div>
          </div>
        )}

        {/* Encryption/Decryption display */}
        {state.step >= 7 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border bg-card/50 p-4">
              <div className="text-xs font-medium text-muted-foreground mb-2">Original Message</div>
              <div className="font-mono text-lg text-foreground">{state.message}</div>
            </div>
            <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4">
              <div className="text-xs font-medium text-orange-400 mb-2">Ciphertext (XOR with key)</div>
              <div className="font-mono text-xs text-orange-300 break-all">
                {state.ciphertext.slice(0, 32)}{state.ciphertext.length > 32 && "..."}
              </div>
            </div>
            {state.step >= 8 && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                <div className="text-xs font-medium text-green-400 mb-2">Decrypted Message</div>
                <div className="font-mono text-lg text-green-300">{state.decryptedMessage}</div>
              </div>
            )}
          </div>
        )}

        {/* Success message */}
        {state.step >= 8 && (
          <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-center gap-2 text-green-400">
              <Shield className="w-5 h-5" />
              <span className="font-medium">Quantum-Secure Transmission Complete!</span>
            </div>
            <p className="text-sm text-green-300/80 mt-1">
              The message &quot;{state.message}&quot; was securely transmitted using quantum key distribution with information-theoretic security.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default QKDVisualSimulation;

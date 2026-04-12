# Quantum Key Distribution (QKD) Protocol Performance Simulator

<div align=\"center\">

**A comprehensive simulation platform comparing Discrete Variable and Continuous Variable Quantum Key Distribution protocols**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.x-blue?logo=python)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Live Demo](#) | [Documentation](#table-of-contents) | [Paper Reference](https://arxiv.org/abs/2206.13724v3)

</div>

---

## 📑 Table of Contents

- [Overview](#overview)
- [What is Quantum Key Distribution?](#what-is-quantum-key-distribution)
- [Simulation Features](#simulation-features)
- [Protocols Implemented](#protocols-implemented)
- [Physics Engine Details](#physics-engine-details)
- [Channel Model](#channel-model)
- [Key Metrics & Formulas](#key-metrics--formulas)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Technical Implementation](#technical-implementation)
- [Figures & Visualizations](#figures--visualizations)
- [Experimental Validation](#experimental-validation)
- [References](#references)
- [Contributing](#contributing)
- [License](#license)

---

## 🌟 Overview

This project provides a **rigorous, physics-based simulation** of quantum cryptographic protocols, comparing **Discrete Variable (DV-QKD)** and **Continuous Variable (CV-QKD)** implementations under realistic channel conditions. The simulator implements exact formulas from recent quantum information theory research to analyze protocol performance across varying loss, thermal noise, and phase noise parameters.

**Key Question Answered:** *When should you choose DV-QKD vs CV-QKD for secure quantum communication?*

The simulation reveals that the optimal choice depends on:
- **Distance/Loss**: DV-QKD excels at long distances (>200 km)
- **Thermal Noise**: CV-QKD shows better tolerance in low-noise environments
- **Phase Noise**: Six-State DV-QKD is more resilient to phase reference instability
- **Implementation Constraints**: Hardware availability, detector technology, laser stability

### Research Foundation

All calculations follow the methodology from:

> **Kish, S. P. et al.** (2024). *\"Comparing discrete- and continuous-variable quantum key distribution in the thermal-loss channel.\"*  
> **Published in:** Quantum  
> **arXiv:** [2206.13724v3](https://arxiv.org/abs/2206.13724v3)

---

## 🔐 What is Quantum Key Distribution?

**Quantum Key Distribution (QKD)** is a cryptographic protocol that uses principles of quantum mechanics to enable two parties (Alice and Bob) to generate a shared secret key that is **provably secure** against eavesdropping, even by adversaries with unlimited computational power.

### Why QKD Matters

- **Post-Quantum Security**: Resistant to attacks from quantum computers
- **Information-Theoretic Security**: Security based on physics, not computational complexity
- **Eavesdropping Detection**: Any interception attempt fundamentally disturbs the quantum state

### Two Paradigms

| Feature | DV-QKD | CV-QKD |
|---------|---------|---------|
| **Quantum State** | Single photons, discrete polarization | Coherent states, continuous quadratures |
| **Measurement** | Single-photon detectors | Homodyne/heterodyne detection |
| **Technology** | Requires photon-number-resolving detectors | Uses telecom-grade coherent detection |
| **Noise Sensitivity** | More robust to phase noise | Requires stable phase reference |
| **Distance Record** | 421 km (fiber) | 202.81 km (fiber) |
| **Bandwidth** | Limited by detector dead time | High-speed coherent detection possible |

---

## ✨ Simulation Features

### Interactive Real-Time Simulation
- **Parameter Exploration**: Adjust channel loss, thermal noise, phase noise, and squeezing levels
- **Live Metrics**: Instant calculation of key rates, QBER, and protocol comparison
- **Multi-Protocol Comparison**: BB84, Six-State, Squeezed-Homodyne, and GG02-Heterodyne

### Comprehensive Visualization Suite

1. **Figure 1: Key Rate vs Channel Loss**  
   4-panel comparison across noise levels (0, 10⁻⁴, 10⁻², 10⁻¹)

2. **Figure 2: Normalized Performance**  
   Benchmarking against PLOB theoretical capacity bounds

3. **Figure 3: CV:DV Comparison Heatmap**  
   2D map showing which protocol performs better (distance × thermal noise)

4. **Figure 4: Phase Noise Tolerance**  
   Thermal noise tolerance vs phase noise and distance

5. **Figure 5: Loss Tolerance Map**  
   Maximum transmission distance vs thermal and phase noise

### Publication-Quality Output
- Dark quantum-themed aesthetics
- 200 DPI PNG exports (Python matplotlib)
- Interactive web-based charts (Recharts)
- LaTeX-ready figure formatting

---

## 🔬 Protocols Implemented

### 1. BB84 (Bennett-Brassard 1984)
**Category:** DV-QKD  
**Encoding:** Photon polarization in two conjugate bases (Z and X)

**How it works:**
1. Alice sends random single photons in 4 polarization states (|0⟩, |1⟩, |+⟩, |−⟩)
2. Bob randomly measures in Z or X basis
3. They publicly compare bases (discard mismatches)
4. Remaining bits form raw key
5. Error correction and privacy amplification produce secure key

**Security:** Based on no-cloning theorem and uncertainty principle

**Formula:**
```
K_BB84 = (P_S / 2) × [1 - 2h(Q)]
```
where:
- `P_S` = success probability (Bob detects exactly one photon)
- `h(Q)` = binary entropy of QBER (Quantum Bit Error Rate)
- Factor 1/2 accounts for basis sifting

### 2. Six-State Protocol
**Category:** DV-QKD  
**Encoding:** Three mutually unbiased bases (X, Y, Z)

**Advantages over BB84:**
- Better tolerance to certain attacks
- Tighter security bounds
- Higher resilience to phase noise

**Formula:**
```
K_6S = (P_S / 2) × [1 - Σ H(Λᵢⱼ)]
```
where:
- `Λᵢⱼ` = eigenvalues of density matrix (depends on QBER in each basis)
- `H(x) = -x log₂(x)` = von Neumann entropy term

**Eigenvalues (symmetric channel):**
```
Λ₀₀ = 1 - 3Q/2
Λ₀₁ = Λ₁₀ = Λ₁₁ = Q/2
```

### 3. Squeezed-State Homodyne CV-QKD
**Category:** CV-QKD  
**Encoding:** Amplitude-squeezed coherent states

**How it works:**
1. Alice prepares squeezed vacuum states (reduced noise in one quadrature)
2. Modulates Gaussian-distributed data onto squeezed states
3. Transmits through quantum channel
4. Bob performs homodyne detection (measures one quadrature)
5. Reverse reconciliation: Bob's data determines final key

**Key Advantage:** Can use telecom infrastructure with coherent detection

**Formula:**
```
K_SqzHom = I_AB - χ_EB
```
where:
- `I_AB = (1/2) log₂(V_B / V_B|A)` = mutual information between Alice and Bob
- `χ_EB = S(AB) - S(E|B)` = Holevo information (Eve's maximum knowledge)
- `S()` = bosonic entropy: `G(x) = (x+1)log₂(x+1) - x log₂(x)`

**Squeezing Parameter:**
```
μ = 1 / V_sq  where V_sq = 10^(-V_sq_dB / 10)
```
Default: 15 dB squeezing (μ ≈ 31.6)

### 4. GG02 Heterodyne Protocol
**Category:** CV-QKD  
**Encoding:** Gaussian-modulated coherent states

**How it works:**
1. Alice prepares coherent states with Gaussian-distributed displacements
2. Bob performs heterodyne detection (simultaneous measurement of both quadratures)
3. Reverse reconciliation for key extraction

**Advantages:**
- No squeezing required (easier implementation)
- Simultaneous dual-quadrature measurement
- Compatible with standard telecom hardware

**Trade-off:** Heterodyne adds 1 shot noise unit compared to homodyne (lower key rate)

---

## ⚛️ Physics Engine Details

### Core Components

#### 1. Helper Functions

**Binary Entropy:**
```python
h(x) = -x log₂(x) - (1-x) log₂(1-x)
```
- Used in DV-QKD key rate calculations
- Quantifies uncertainty in bit error correction

**Von Neumann Entropy Term:**
```python
H(x) = -x log₂(x)
```
- Used in Six-State eigenvalue sum
- Quantum generalization of Shannon entropy

**Bosonic Entropy (Gaussian channels):**
```python
G(x) = (x+1) log₂(x+1) - x log₂(x)
```
- Used in CV-QKD Holevo information
- Entropy of thermal bosonic mode

#### 2. Channel Conversions

**Loss (dB) → Transmissivity (η):**
```python
η = 10^(-Loss_dB / 10)
```

**Transmissivity → Distance (km):**
```python
Distance = Loss_dB / 0.2  (assuming standard fiber: 0.2 dB/km)
```

**Example:** 10 dB loss = η = 0.1 = 50 km fiber distance

---

## 🌐 Channel Model

### Thermal-Loss Channel

The simulation models a realistic quantum communication channel with three impairment sources:

#### 1. Transmissivity (η)
**Physical meaning:** Fraction of photons surviving fiber propagation

**Causes:**
- Fiber absorption and scattering
- Connector/splice losses
- Bending losses

**Typical values:**
- η = 1: Perfect channel (0 dB loss)
- η = 0.5: 3 dB loss (~15 km fiber)
- η = 0.1: 10 dB loss (~50 km fiber)
- η = 0.01: 20 dB loss (~100 km fiber)

#### 2. Thermal Noise (N_Th)
**Physical meaning:** Mean photon number of thermal background radiation

**Sources:**
- Ambient blackbody radiation
- Detector dark counts
- Amplified spontaneous emission (ASE) in optical amplifiers
- Raman scattering

**Formula (Planck distribution):**
```python
N_Th = 1 / (exp(ℏω / k_B T) - 1)
```

**Typical values:**
- N_Th = 0: Pure-loss (ideal cryogenic)
- N_Th = 10⁻⁴: Excellent lab conditions
- N_Th = 10⁻²: Typical telecom environment
- N_Th = 10⁻¹: High noise (uncooled detectors)

#### 3. Phase Noise (σ²_θ)
**Physical meaning:** Variance of phase reference drift between Alice and Bob

**Sources:**
- Laser linewidth
- Fiber birefringence fluctuations
- Temperature variations
- Vibrations and acoustic noise

**Impact:**
- **DV-QKD**: Degrades X and Y basis measurements (Z basis unaffected)
- **CV-QKD**: Reduces effective channel transmissivity and increases inferred noise

**Wrapped normal distribution:**
```python
r̄ = exp(-σ²_θ / 2)  ∈ [0, 1]
```
where r̄ = 1 means perfect phase lock, r̄ = 0 means complete dephasing.

**Typical values:**
- σ²_θ = 10⁻⁶: Excellent phase tracking (high-stability lasers)
- σ²_θ = 10⁻⁴: Good (pilot-tone compensation)
- σ²_θ = 10⁻²: Moderate (real LO transmission)
- σ²_θ = 0.1: Poor (free-running lasers)

### Combined Channel Action

**DV-QKD depolarizing parameter:**
```python
λ = 2 N_Th (1 + N_Th) (1 - η)² / [η + 2 N_Th (1 + N_Th) (1 - η)²]
```

**DV-QKD QBER (without phase noise):**
```python
Q = λ / 2
```

**DV-QKD QBER (with phase noise):**
```python
Q_Z = λ / 2  (Z basis unaffected)
Q_XY = (1/2) [(1 - λ)(1 - r̄²) + λ]  (X,Y bases degraded)
```

**CV-QKD channel noise:**
```python
χ = (1 - η)(2 N_Th + 1) / η
```

**CV-QKD effective transmissivity (with phase noise):**
```python
η_I = η × r̄²
```

---

## 📊 Key Metrics & Formulas

### 1. Success Probability (P_S) — DV-QKD

**Definition:** Probability Bob detects exactly one photon (valid logical bit)

**Formula (Eq. 4):**
```python
γ = 1 + N_Th - N_Th × η

P_S = [η + 2 N_Th (1 + N_Th) (1 - η)²] / γ⁴
```

**Physical interpretation:**
- Numerator: Events where signal photon or thermal photon reaches detector
- Denominator: Normalization over all photon-number states

### 2. Quantum Bit Error Rate (QBER) — DV-QKD

**Definition:** Fraction of sifted bits that are incorrect

**Formula (Eq. 9):**
```python
QBER = λ / 2
```

**Significance:**
- QBER < 11%: Secure key can be extracted (for BB84)
- QBER ≥ 11%: Channel too noisy, abort protocol
- Six-State tolerates slightly higher QBER (~12.6%)

### 3. Secret Key Rate

**Units:** bits per channel use (bits/symbol)

**Interpretation:**
- K = 1: Every transmitted pulse yields 1 secret bit (perfect efficiency)
- K = 0.1: Need 10 pulses per secret bit
- K < K₀ (threshold, typically 10⁻⁹): Protocol fails

**DV-QKD components:**
```
K = (Sifting efficiency) × (Mutual info - Eve's info)
```

**CV-QKD Reverse Reconciliation:**
```
K = I_AB - χ_EB
```
where β = 1 (ideal error correction efficiency assumed)

### 4. PLOB Bounds (Pirandola-Laurenza-Ottaviani-Banchi)

**Theoretical capacity limits** for point-to-point QKD over thermal-loss channel

**Lower Bound (Eq. 29a):**
```python
C_lower = -log₂(1 - η) - G(N_Th)
```
Achievable with specific protocols

**Upper Bound (Eq. 29b):**
```python
C_upper = -log₂[(1 - η) × η^(N_Th)] - G(N_Th)
```
Fundamental limit (no protocol can exceed this)

**Entanglement-Breaking Condition:**
```python
Channel is EB if: N_Th ≥ η / (1 - η)
```
When EB: no secure key possible (PLOB bounds = 0)

### 5. Comparison Metrics

**Normalized Key Rate Ratio (K̃):**
```python
K̃_{CV:DV} = (K_CV - K_DV) / max(K_CV, K_DV)
```
Range: [-1, +1]
- K̃ = +1: CV-QKD infinitely better
- K̃ = 0: Equal performance
- K̃ = -1: DV-QKD infinitely better

**Thermal Noise Tolerance (Ñ):**
```python
Ñ_{CV:DV} = (N_Th,max^CV - N_Th,max^DV) / max(N_Th,max^CV, N_Th,max^DV)
```
Maximum tolerable thermal noise for given (η, σ²_θ, K₀)

**Loss Tolerance (L̃):**
```python
L̃_{CV:DV} = (D_max^CV - D_max^DV) / max(D_max^CV, D_max^DV)
```
Maximum transmission distance for given (N_Th, σ²_θ, K₀)

---

## 🛠️ Installation & Setup

### Prerequisites

- **Node.js** ≥ 18.x (for Next.js frontend)
- **Python** ≥ 3.8 (for physics simulation scripts)
- **pnpm** (recommended) or npm

### Frontend Setup

```bash
# Clone the repository
git clone https://github.com/mdowais-39/DV-QKD-CV-QKD.git
cd DV-QKD-CV-QKD

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Visit `http://localhost:3000` to see the interactive simulator.

### Python Physics Engine Setup

```bash
# Install Python dependencies
pip install numpy matplotlib

# Navigate to scripts directory
cd scripts

# Run physics engine tests
python qkd_core.py

# Generate all publication figures
python qkd_plots.py
```

Figures will be saved as `fig1_key_rate.png`, `fig2_normalized.png`, etc. at 200 DPI.

### Production Build

```bash
# Build optimized production bundle
pnpm build

# Start production server
pnpm start
```

---

## 🎮 Usage

### Interactive Web Simulator

1. **Adjust Parameters** (left sidebar):
   - **Loss (dB):** 0–50 dB (0–250 km fiber)
   - **Thermal Noise (N_Th):** 10⁻⁶ to 1 (log scale)
   - **Phase Noise (σ²_θ):** 10⁻⁶ to 1 (log scale)
   - **Squeezing (V_sq):** 10–20 dB
   - **Protocol Selection:** BB84, Six-State, Sqz-Hom, GG02, or Compare All

2. **View Real-Time Metrics** (top panel):
   - Current key rate (bits/channel use)
   - QBER percentage
   - Individual protocol rates
   - PLOB upper bound comparison

3. **Explore Figures** (tabs):
   - **Fig 1:** See how protocols degrade with distance
   - **Fig 2:** Compare efficiency vs theoretical limits
   - **Fig 3:** Find optimal protocol for your channel parameters
   - **Fig 4:** Assess phase noise sensitivity
   - **Fig 5:** Determine maximum operating range

4. **Interactive Demo:**
   - Click \"Launch Demo\" to see animated QKD exchange visualization

### Python Command-Line Usage

```python
from scripts.qkd_core import *

# Example: Calculate BB84 key rate at 50 km
distance_km = 50
eta = distance_to_eta(distance_km)  # 0.1 (10 dB loss)
N_Th = 1e-3  # Low thermal noise
sigma2_theta = 1e-4  # Low phase noise

# Compute key rates
k_bb84 = key_rate_BB84(eta, N_Th)
k_6s = key_rate_6S_phase(eta, N_Th, sigma2_theta)
k_sqz = key_rate_SqzHom_phase(eta, N_Th, sigma2_theta, Vsq_dB=15)

print(f\"BB84 Key Rate: {k_bb84:.6f} bits/use\")
print(f\"Six-State Key Rate: {k_6s:.6f} bits/use\")
print(f\"Squeezed-Hom Key Rate: {k_sqz:.6f} bits/use\")
```

**Generate All Figures:**
```python
from scripts.qkd_plots import generate_all_figures

generate_all_figures(output_dir='./results')
```

---

## 📁 Project Structure

```
DV-QKD-CV-QKD/
├── app/                          # Next.js app directory
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Main simulator page
│
├── components/
│   ├── qkd/                     # QKD-specific components
│   │   ├── header.tsx           # Page header
│   │   ├── parameter-controls.tsx  # Parameter sliders
│   │   ├── metrics-panel.tsx    # Key metrics display
│   │   ├── protocol-info.tsx    # Protocol descriptions
│   │   ├── key-rate-chart.tsx   # Base chart component
│   │   ├── qber-chart.tsx       # QBER visualization
│   │   ├── fig1-key-rate-panels.tsx     # Figure 1
│   │   ├── fig2-normalized-panels.tsx   # Figure 2
│   │   ├── fig3-cv-dv-map.tsx           # Figure 3 heatmap
│   │   ├── fig4-phase-noise-map.tsx     # Figure 4
│   │   ├── fig5-loss-tolerance-map.tsx  # Figure 5
│   │   ├── canvas-heatmap.tsx           # Canvas-based heatmap renderer
│   │   └── comparison-heatmap.tsx       # Comparison metric heatmap
│   │
│   ├── ui/                      # Reusable UI components (Radix UI)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── slider.tsx
│   │   ├── select.tsx
│   │   ├── chart.tsx            # Recharts wrapper
│   │   └── ...                  # 40+ Radix UI components
│   │
│   └── theme-provider.tsx       # Dark mode provider
│
├── lib/
│   ├── qkd-physics.ts           # TypeScript physics engine (client-side)
│   └── utils.ts                 # Utility functions (cn, etc.)
│
├── scripts/                      # Python physics backend
│   ├── qkd_core.py              # Core physics formulas (771 lines)
│   └── qkd_plots.py             # Figure generation (512 lines)
│
├── public/
│   ├── qkd_demo.html            # Animated protocol demonstration
│   ├── icon.svg                 # Favicon
│   └── placeholder-*.png        # UI assets
│
├── styles/
│   └── globals.css              # Tailwind imports
│
├── hooks/                        # React hooks
│   ├── use-mobile.ts
│   └── use-toast.ts
│
├── package.json                  # Node.js dependencies
├── tsconfig.json                 # TypeScript config
├── tailwind.config.js            # Tailwind CSS config
├── next.config.mjs               # Next.js config
└── README.md                     # This file
```

---

## 💻 Technical Implementation

### Dual Physics Engine Architecture

The project implements the **same physics calculations in both Python and TypeScript** for different use cases:

#### Python Engine (`scripts/qkd_core.py`)
- **Purpose:** Research, batch processing, publication-quality figures
- **Strengths:** NumPy vectorization for large parameter sweeps
- **Use cases:**
  - Generate 2D comparison maps (150×100 grids)
  - Export publication figures (matplotlib, 200 DPI)
  - Validate TypeScript implementation
  - Offline analysis and research

**Example vectorization:**
```python
eta = np.linspace(0.01, 1, 500)  # 500 transmissivity values
N_Th = np.array([0, 1e-4, 1e-2, 1e-1])[:, None]  # 4 noise levels

# Single call computes 500×4 = 2000 key rate values
K_BB84 = key_rate_BB84(eta, N_Th)
```

#### TypeScript Engine (`lib/qkd-physics.ts`)
- **Purpose:** Real-time interactive simulation in browser
- **Strengths:** Zero backend dependency, instant responsiveness
- **Use cases:**
  - Parameter slider changes (live metrics update)
  - Interactive figure exploration
  - Client-side data generation for Recharts
  - Standalone web deployment

**Numerical Stability:**
Both implementations include:
- Clipping to prevent log(0) errors
- Epsilon thresholds (1e-15) for divisions
- Careful handling of edge cases (η → 0, η → 1)

### Frontend Stack

**Framework:** Next.js 16 (App Router)
- Server and client components for optimal performance
- Static generation where possible (figures)
- Dynamic for parameter-driven content

**Styling:** Tailwind CSS 4
- Custom color palette (quantum dark theme)
- Responsive grid layouts
- Utility-first approach

**Charts:** Recharts 2.15
- Declarative React charting
- Animated transitions
- Responsive design
- Logarithmic scales for key rate plots

**UI Components:** Radix UI
- Accessible primitives (ARIA compliant)
- Headless components (full style control)
- Keyboard navigation support

### Data Flow

```
User Input (Sliders)
    ↓
React State Update
    ↓
useMemo Hook (qkd-physics.ts)
    ↓
Compute Metrics & Chart Data
    ↓
Recharts / Canvas Rendering
    ↓
Display Updated Visualization
```

**Performance optimization:**
- `useMemo` prevents redundant calculations
- Heatmaps use Canvas API (not SVG) for 1000+ points
- Debouncing on rapid slider changes (optional)

### Heatmap Rendering Strategy

For dense 2D comparison maps (Fig 3, 4, 5), we use **Canvas-based rendering** instead of SVG:

**Why Canvas?**
- **Performance:** 10,000+ pixels render instantly
- **Memory:** Lower DOM overhead vs 10,000 SVG rects
- **Smooth:** Native pixel manipulation

**Implementation:**
```typescript
// Generate data grid
const heatData = generateCVDVMap(K0, VsqdB, 60, 40);

// Render to canvas
heatData.forEach(cell => {
  const color = kTildeToRGB(cell.kTilde);  // -1→blue, 0→white, +1→red
  ctx.fillStyle = color;
  ctx.fillRect(xPos, yPos, cellWidth, cellHeight);
});
```

**Color mapping (K̃):**
- K̃ = -1 (DV better): Deep Blue (#1565C0)
- K̃ = 0 (Equal): White (#FFFFFF)
- K̃ = +1 (CV better): Red (#EF5350)
- Null (both below K₀): Gray (#1E2840)

---

## 📈 Figures & Visualizations

### Figure 1: Key Rate vs Channel Loss

**4-panel comparison** showing how each protocol degrades with increasing loss.

**Panels:**
1. Pure-Loss (N_Th = 0, ideal)
2. Low Noise (N_Th = 10⁻⁴)
3. Moderate Noise (N_Th = 10⁻²)
4. High Noise (N_Th = 10⁻¹)

**What you learn:**
- BB84 and Six-State track closely (Six-State slightly better)
- CV-QKD excels at low loss but drops faster than DV-QKD
- Thermal noise severely impacts all protocols
- PLOB bounds provide ultimate limits

**Key insight:** Crossover point shifts left (lower distance) as noise increases.

---

### Figure 2: Normalized Key Rate (K / K_upper)

**4-panel efficiency benchmark** against theoretical capacity.

**Vertical axis:** Fraction of PLOB upper bound achieved (0–1)

**What you learn:**
- Six-State approaches 80%+ of theoretical limit in pure-loss
- CV-QKD efficiency drops faster with noise than DV-QKD
- No protocol exceeds PLOB upper bound (validated)

**Practical implication:** Protocol choice affects not just absolute key rate, but efficiency relative to physical limits.

---

### Figure 3: CV:DV Comparison Heatmap

**3-panel 2D map:** Distance (x) vs Thermal Noise (y)

**Panels:** Different K₀ thresholds (10⁻⁹, 10⁻⁶, 10⁻³ bits/use)

**Color coding:**
- **Blue region:** Six-State DV-QKD performs better (K̃ < 0)
- **Red region:** Squeezed-Homodyne CV-QKD performs better (K̃ > 0)
- **White line:** Equal performance (K̃ = 0)
- **Gray:** Both protocols fail (below K₀)

**What you learn:**
- **Short distance + low noise:** CV-QKD advantage
- **Long distance:** DV-QKD takes over (>150 km typically)
- **High noise:** DV-QKD dominates
- **Strict K₀:** Reduces operating regime for both

**Decision tool:** Find your channel parameters (distance, noise) and see optimal choice.

---

### Figure 4: Phase Noise Tolerance Map

**3-panel 2D map:** Distance (x) vs Phase Noise σ²_θ (y)

**Color:** Thermal noise tolerance difference (Ñ_{CV:DV})

**What you learn:**
- **CV-QKD is highly sensitive to phase noise** (red shrinks with σ²_θ)
- **DV-QKD Six-State is robust** against phase drift
- **Experimental points overlay:** Shows real-world achieved phase noise levels

**Practical implication:**  
If you have unstable lasers or fiber vibrations → choose DV-QKD.  
If you have ultra-stable phase lock → CV-QKD can offer advantage.

---

### Figure 5: Loss Tolerance Map

**3-panel 2D map:** Thermal Noise (x) vs Phase Noise (y)

**Color:** Maximum distance difference (L̃_{CV:DV})

**What you learn:**
- **Clean channels (low N_Th, low σ²_θ):** CV-QKD can reach farther
- **Noisy channels:** DV-QKD extends range
- **Phase noise + thermal noise:** Compound degradation favors DV

**Design guideline:** Choose based on your channel budget (loss + noise + phase).

---

## 🧪 Experimental Validation

The simulation includes **reference data from published experiments** (Table 1 in paper):

### CV-QKD Demonstrations

| Reference | Distance | Phase Noise σ²_θ | Notes |
|-----------|----------|------------------|-------|
| **Y. Zhang et al.** | 202.81 km | 7.4 × 10⁻⁵ | World record CV-QKD distance (2020) |
| **H.-M. Chin et al.** | 20 km | 1.0 × 10⁻³ | ML-based carrier recovery |
| **T. Wang et al.** | 50 km | 1.2 × 10⁻³ | High key rate (real LO) |
| **H. Wang et al.** | 30 km | 7.0 × 10⁻³ | Pilot-tone phase compensation |
| **B. Qi et al.** | 25 km | 4.0 × 10⁻² | Locally generated LO |

### DV-QKD Demonstrations

| Reference | Distance | Phase Noise σ²_θ | Notes |
|-----------|----------|------------------|-------|
| **A. Boaron et al.** | 421 km | 7.2 × 10⁻² | World record DV-QKD distance (2018) |
| **W. Li et al.** | 10 km | 2.2 × 10⁻² | Ultra-high bit rate (110 Mbit/s) |

**Observations:**
- DV-QKD achieved 2× longer distance (421 vs 202 km)
- DV-QKD tolerates 100× worse phase noise
- CV-QKD requires σ²_θ < 10⁻³ for good performance

**Simulator validation:** Experimental points plotted on Figure 4 align with theoretical predictions.

---

## 🔗 References

### Primary Reference

**Kish, S. P., Haw, J. Y., Ralph, T. C., & Lam, P. K.** (2024).  
*Comparing discrete- and continuous-variable quantum key distribution in the thermal-loss channel.*  
**Quantum**, Vol. 8, Article 1330.  
**DOI:** [10.22331/q-2024-04-30-1330](https://doi.org/10.22331/q-2024-04-30-1330)  
**arXiv:** [2206.13724v3](https://arxiv.org/abs/2206.13724v3)

### Foundational QKD Papers

1. **Bennett, C. H., & Brassard, G.** (1984).  
   *Quantum cryptography: Public key distribution and coin tossing.*  
   Proc. IEEE Int. Conf. Computers, Systems, and Signal Processing, Bangalore, pp. 175–179.

2. **Grosshans, F., & Grangier, P.** (2002).  
   *Continuous variable quantum cryptography using coherent states.*  
   **Physical Review Letters**, 88(5), 057902.  
   [DOI: 10.1103/PhysRevLett.88.057902](https://doi.org/10.1103/PhysRevLett.88.057902)

### Capacity Bounds

3. **Pirandola, S., Laurenza, R., Ottaviani, C., & Banchi, L.** (2017).  
   *Fundamental limits of repeaterless quantum communications.*  
   **Nature Communications**, 8, 15043.  
   [DOI: 10.1038/ncomms15043](https://doi.org/10.1038/ncomms15043)

### Experimental Milestones

4. **Boaron, A., et al.** (2018).  
   *Secure quantum key distribution over 421 km of optical fiber.*  
   **Physical Review Letters**, 121(19), 190502.

5. **Zhang, Y., et al.** (2020).  
   *Long-distance continuous-variable quantum key distribution over 202.81 km of fiber.*  
   **Physical Review Letters**, 125(1), 010502.

### Security Proofs

6. **Renner, R.** (2008).  
   *Security of quantum key distribution.*  
   **International Journal of Quantum Information**, 6(1), 1–127.

7. **Leverrier, A., et al.** (2010).  
   *Multidimensional reconciliation for a continuous-variable quantum key distribution.*  
   **Physical Review A**, 81(6), 062343.

---

## 🤝 Contributing

Contributions are welcome! This project is designed for researchers, students, and quantum communication engineers.

### Areas for Contribution

- **New protocols:** MDI-QKD, Twin-Field QKD, Satellite channels
- **Finite-size effects:** Current implementation assumes asymptotic limit
- **Hardware models:** Detector efficiencies, dark counts, afterpulsing
- **Optimization:** GPU acceleration for parameter sweeps
- **UI/UX:** Additional interactive visualizations
- **Documentation:** Tutorials, explainer videos

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-protocol`)
3. Implement changes
4. Add tests (verify against published results)
5. Update documentation
6. Submit pull request

### Code Style

- **Python:** Follow PEP 8, include docstrings with equation references
- **TypeScript:** Use ESLint config, document physics functions
- **Formulas:** Reference equation numbers from Kish et al. (2024)

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 Muhammad Owais

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the \"Software\"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Citation

If you use this simulator in your research, please cite:

```bibtex
@software{qkd_simulator_2026,
  author = {Owais, Muhammad},
  title = {Quantum Key Distribution Protocol Performance Simulator},
  year = {2026},
  url = {https://github.com/mdowais-39/DV-QKD-CV-QKD},
  note = {Based on Kish et al. (2024), arXiv:2206.13724v3}
}
```

---

## 🌟 Acknowledgments

- **Research Foundation:** Dr. Spyros Kish, Dr. Jing Yan Haw, Prof. Timothy Ralph, Prof. Ping Koy Lam
- **Framework:** Next.js team, Vercel
- **UI Library:** Radix UI, shadcn/ui
- **Charting:** Recharts contributors
- **Scientific Computing:** NumPy, Matplotlib communities

---

## 📬 Contact & Support

**Author:** Muhammad Owais  
**GitHub:** [@mdowais-39](https://github.com/mdowais-39)  
**Repository:** [DV-QKD-CV-QKD](https://github.com/mdowais-39/DV-QKD-CV-QKD)

### Questions?

- **Technical Issues:** Open a GitHub issue
- **Research Collaboration:** Contact via GitHub profile
- **General QKD Questions:** See [References](#references) for foundational papers

---

<div align=\"center\">

**Built with ❤️ for the quantum cryptography community**

[⬆ Back to Top](#quantum-key-distribution-qkd-protocol-performance-simulator)

</div>
"

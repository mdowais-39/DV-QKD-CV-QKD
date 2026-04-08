/**
 * QKD Protocol Physics Engine
 * ===========================
 *
 * TypeScript implementation of key physics functions for
 * DV-QKD (BB84, Six-State) and CV-QKD (Squeezed-State, GG02-Het) protocols.
 *
 * Reference: Kish et al. (2024), Quantum, arXiv:2206.13724v3
 */

// =============================================================================
// Helper Functions
// =============================================================================

/** Binary entropy: h(x) = -x log₂(x) - (1-x) log₂(1-x) */
export function binaryEntropy(x: number): number {
  x = Math.max(1e-15, Math.min(1 - 1e-15, x));
  return -x * Math.log2(x) - (1 - x) * Math.log2(1 - x);
}

/** Von Neumann entropy term: H(x) = -x log₂(x) */
export function vonNeumannH(x: number): number {
  x = Math.max(1e-15, x);
  return -x * Math.log2(x);
}

/** Bosonic entropy: G(x) = (x+1)log₂(x+1) - x log₂(x) */
export function bosonicEntropy(x: number): number {
  x = Math.max(1e-15, x);
  return (x + 1) * Math.log2(x + 1) - x * Math.log2(x);
}

/** Channel loss dB → transmissivity η */
export function dBToEta(lossdB: number): number {
  return Math.pow(10, -lossdB / 10);
}

/** Transmissivity η → fiber distance km (0.2 dB/km) */
export function etaToDistanceKm(eta: number): number {
  eta = Math.max(1e-15, Math.min(1 - 1e-15, eta));
  return (-10 * Math.log10(eta)) / 0.2;
}

/** Fiber distance km → transmissivity (0.2 dB/km) */
export function distanceToEta(distKm: number): number {
  return dBToEta(distKm * 0.2);
}

/** Fiber distance km → loss dB */
export function distanceTodB(distKm: number): number {
  return distKm * 0.2;
}

// =============================================================================
// DV-QKD Core Functions
// =============================================================================

/** Auxiliary factor γ = 1 + N_Th - N_Th·η */
export function gamma(eta: number, NTh: number): number {
  return 1 + NTh - NTh * eta;
}

/** Depolarizing channel parameter λ (Eq. 8) */
export function depolarizingLambda(eta: number, NTh: number): number {
  const num = 2 * NTh * (1 + NTh) * Math.pow(1 - eta, 2);
  const den = Math.max(1e-15, eta + num);
  return Math.min(1, Math.max(0, num / den));
}

/** QBER in thermal-loss channel (Eq. 9) */
export function qberThermal(eta: number, NTh: number): number {
  return depolarizingLambda(eta, NTh) / 2;
}

/** Success probability P_S (Eq. 4) */
export function psThermal(eta: number, NTh: number): number {
  const g = Math.pow(gamma(eta, NTh), 4);
  const num = eta + 2 * NTh * (1 + NTh) * Math.pow(1 - eta, 2);
  return Math.min(1, Math.max(0, num / Math.max(1e-15, g)));
}

/** BB84 key rate (Eq. 1) */
export function keyRateBB84(eta: number, NTh: number): number {
  const PS = psThermal(eta, NTh);
  const Q = qberThermal(eta, NTh);
  return Math.max(0, (PS / 2) * (1 - 2 * binaryEntropy(Q)));
}

/** Six-State key rate without phase noise (Eq. 10) */
export function keyRate6S(eta: number, NTh: number): number {
  const PS = psThermal(eta, NTh);
  const Q = qberThermal(eta, NTh);
  const L00 = Math.max(1e-15, 1 - 1.5 * Q);
  const L01 = Math.max(1e-15, Q / 2);
  const L10 = Math.max(1e-15, Q / 2);
  const L11 = Math.max(1e-15, Q / 2);
  const entropySum = vonNeumannH(L00) + vonNeumannH(L01) + vonNeumannH(L10) + vonNeumannH(L11);
  return Math.max(0, (PS / 2) * (1 - entropySum));
}

// =============================================================================
// CV-QKD Core Functions
// =============================================================================

/** CV channel noise χ */
export function cvChannelNoise(eta: number, NTh: number): number {
  return ((1 - eta) * (2 * NTh + 1)) / Math.max(1e-15, eta);
}

/** Squeezed-state homodyne CV-QKD key rate (Eqs. 12-18) */
export function keyRateSqzHom(eta: number, NTh: number, VsqdB: number = 15): number {
  const Vsq = Math.pow(10, -VsqdB / 10);
  const mu = 1 / Vsq;
  const VA = mu - 1;
  const chi = cvChannelNoise(eta, NTh);
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
  return Math.max(0, IAB - (SAB - SEGivenB));
}

/**
 * GG02 Gaussian Modulation CV-QKD with Heterodyne Detection
 * - Uses coherent states with Gaussian modulation (VA signal variance in SNU)
 * - Heterodyne detection adds 1 unit of vacuum noise
 * - Reverse reconciliation (Bob's measurement used for key)
 */
export function keyRateGG02Het(eta: number, NTh: number, VA: number = 10): number {
  // Heterodyne channel noise (extra 1/eta for vacuum)
  const chiHet = ((1 - eta) * (2 * NTh + 1) + 1) / Math.max(1e-15, eta);
  
  // Bob's variance with heterodyne
  const VB = eta * VA + (1 - eta) * (2 * NTh + 1) + 1;
  
  // Conditional variance in heterodyne
  const VBGivenA = Math.max(1e-15, VB - (eta * VA * VA) / Math.max(1e-15, VA + 1));
  
  // Mutual information (heterodyne → divide by 2 per quadrature pair)
  const IAB = Math.log2(VB / VBGivenA);
  
  // Symplectic eigenvalues for Alice-Bob system (covariance matrix)
  const a = VA + 1;
  const b = eta * VA + (1 - eta) * (2 * NTh + 1) + 1;
  const c2 = eta * VA * VA;
  const Delta = a * a + b * b - 2 * c2;
  const disc = Math.max(0, Delta * Delta - 4 * Math.pow(a * b - c2, 2));
  const lambda1 = Math.sqrt(Math.max(1e-15, 0.5 * (Delta + Math.sqrt(disc))));
  const lambda2 = Math.sqrt(Math.max(1e-15, 0.5 * (Delta - Math.sqrt(disc))));
  const SAB = bosonicEntropy((lambda1 - 1) / 2) + bosonicEntropy((lambda2 - 1) / 2);
  
  // Eve's conditional entropy given Bob's heterodyne measurement
  const denomE = eta * (VA + 1) + (1 - eta) * (2 * NTh + 1) + 1;
  const lambda3x = (VA + 1) - (eta * VA * (VA + 2)) / Math.max(1e-15, denomE);
  const lambda3 = Math.sqrt(Math.max(1e-15, lambda3x * (VA + 1)));
  const SEGivenB = bosonicEntropy((lambda3 - 1) / 2);
  
  const chiEB = SAB - SEGivenB;
  return Math.max(0, IAB - chiEB);
}

// =============================================================================
// PLOB Bounds
// =============================================================================

/** Check if channel is entanglement-breaking */
export function isEntanglementBreaking(eta: number, NTh: number): boolean {
  return NTh >= eta / Math.max(1e-15, 1 - eta);
}

/** PLOB lower bound (Eq. 29a) */
export function plobLower(eta: number, NTh: number): number {
  if (isEntanglementBreaking(eta, NTh)) return 0;
  const etaSafe = Math.max(1e-15, Math.min(1 - 1e-15, eta));
  return Math.max(0, -Math.log2(1 - etaSafe) - bosonicEntropy(NTh));
}

/** PLOB upper bound (Eq. 29b) */
export function plobUpper(eta: number, NTh: number): number {
  if (isEntanglementBreaking(eta, NTh)) return 0;
  const etaSafe = Math.max(1e-15, Math.min(1 - 1e-15, eta));
  return Math.max(0, -Math.log2((1 - etaSafe) * Math.pow(etaSafe, NTh)) - bosonicEntropy(NTh));
}

// =============================================================================
// Phase Noise Functions
// =============================================================================

/** Circular mean of wrapped normal (Eq. 25) */
export function rBar(sigma2Theta: number): number {
  return Math.exp(-sigma2Theta / 2);
}

/** DV-QKD QBER with phase noise (Eq. 27) */
export function qberDVPhase(eta: number, NTh: number, sigma2Theta: number): { QZ: number; QXY: number } {
  const lam = depolarizingLambda(eta, NTh);
  const r2 = Math.pow(rBar(sigma2Theta), 2);
  return {
    QZ: lam / 2,
    QXY: 0.5 * ((1 - lam) * (1 - r2) + lam),
  };
}

/** Six-State key rate with phase noise (Eq. 10 + Eq. 27) */
export function keyRate6SPhase(eta: number, NTh: number, sigma2Theta: number): number {
  const lam = depolarizingLambda(eta, NTh);
  const r2 = Math.pow(rBar(sigma2Theta), 2);
  const PS = psThermal(eta, NTh);
  const QZ = lam / 2;
  const QXY = 0.5 * ((1 - lam) * (1 - r2) + lam);
  const L00 = Math.max(1e-15, 1 - (QXY + QXY + QZ) / 2);
  const L01 = Math.max(1e-15, (QXY + QXY - QZ) / 2);
  const L10 = Math.max(1e-15, QZ / 2);
  const L11 = Math.max(1e-15, QZ / 2);
  const entropySum = vonNeumannH(L00) + vonNeumannH(L01) + vonNeumannH(L10) + vonNeumannH(L11);
  return Math.max(0, (PS / 2) * (1 - entropySum));
}

/** Squeezed-state CV-QKD with phase noise (Eq. 28) */
export function keyRateSqzHomPhase(eta: number, NTh: number, sigma2Theta: number, VsqdB: number = 15): number {
  const Vsq = Math.pow(10, -VsqdB / 10);
  const mu = 1 / Vsq;
  const r2 = Math.exp(-sigma2Theta);
  const etaI = Math.max(1e-15, eta * r2);
  const rFactor = Math.sqrt(r2);
  const VB = eta * mu + (1 - eta) * (2 * NTh + 1);
  const c = rFactor * Math.sqrt(eta * (mu * mu - 1));
  const a = mu;
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
  const chiI = ((1 - r2) * eta * mu + (1 - eta) * (2 * NTh + 1)) / etaI;
  const denom = etaI * mu + (1 - etaI) * (2 * NTh + 1) + chiI * etaI;
  const lambda3x = mu - (etaI * (mu * mu - 1)) / Math.max(1e-15, denom);
  const lambda3 = Math.sqrt(Math.max(1e-15, lambda3x * mu));
  const SEGivenB = bosonicEntropy((lambda3 - 1) / 2);
  return Math.max(0, IAB - (SAB - SEGivenB));
}

/** GG02-Het with phase noise */
export function keyRateGG02HetPhase(eta: number, NTh: number, sigma2Theta: number, VA: number = 10): number {
  const r2 = Math.exp(-sigma2Theta);
  const etaEff = Math.max(1e-15, eta * r2);
  return keyRateGG02Het(etaEff, NTh, VA);
}

// =============================================================================
// Normalized Key Rate
// =============================================================================

/** K / K_Upper — how close to PLOB upper bound (clamped 0-1) */
export function normalizedKeyRate(k: number, eta: number, NTh: number): number {
  const kUpper = plobUpper(eta, NTh);
  if (kUpper <= 0) return 0;
  return Math.min(1, Math.max(0, k / kUpper));
}

// =============================================================================
// Comparison Map Metric
// =============================================================================

/**
 * K̃ = (K_CV - K_DV) / max(K_CV, K_DV, K0)
 * Returns null if both protocols are below K0 (dead zone)
 */
export function kTildeMetric(kCV: number, kDV: number, K0: number = 1e-9): number | null {
  if (kCV <= K0 && kDV <= K0) return null;
  const maxK = Math.max(kCV, kDV, K0);
  return Math.max(-1, Math.min(1, (kCV - kDV) / maxK));
}

// =============================================================================
// Data Generation
// =============================================================================

export interface DataPoint {
  loss: number;
  distance: number;
  eta: number;
  BB84: number;
  SixState: number;
  SqzHom: number;
  GG02Het: number;
  PLOB_Lower: number;
  PLOB_Upper: number;
  QBER: number;
}

export interface NormDataPoint {
  loss: number;
  distance: number;
  BB84_norm: number;
  SixState_norm: number;
  SqzHom_norm: number;
  GG02Het_norm: number;
}

/** Generate key rate vs loss data for one noise level panel */
export function generateKeyRateData(
  NTh: number,
  sigma2Theta: number = 0,
  VsqdB: number = 15,
  maxLoss: number = 50,
  points: number = 100
): DataPoint[] {
  const data: DataPoint[] = [];
  for (let i = 0; i <= points; i++) {
    const loss = (i / points) * maxLoss;
    const eta = dBToEta(loss);
    const distance = loss / 0.2;
    const bb84 = keyRateBB84(eta, NTh);
    const sixState = sigma2Theta > 0
      ? keyRate6SPhase(eta, NTh, sigma2Theta)
      : keyRate6S(eta, NTh);
    const sqzHom = sigma2Theta > 0
      ? keyRateSqzHomPhase(eta, NTh, sigma2Theta, VsqdB)
      : keyRateSqzHom(eta, NTh, VsqdB);
    const gg02Het = sigma2Theta > 0
      ? keyRateGG02HetPhase(eta, NTh, sigma2Theta)
      : keyRateGG02Het(eta, NTh);
    data.push({
      loss,
      distance,
      eta,
      BB84: bb84,
      SixState: sixState,
      SqzHom: sqzHom,
      GG02Het: gg02Het,
      PLOB_Lower: plobLower(eta, NTh),
      PLOB_Upper: plobUpper(eta, NTh),
      QBER: qberThermal(eta, NTh) * 100,
    });
  }
  return data;
}

/** Generate normalized (K/K_upper) data */
export function generateNormData(
  NTh: number,
  sigma2Theta: number = 0,
  VsqdB: number = 15,
  maxLoss: number = 50,
  points: number = 100
): NormDataPoint[] {
  return generateKeyRateData(NTh, sigma2Theta, VsqdB, maxLoss, points).map((d) => ({
    loss: d.loss,
    distance: d.distance,
    BB84_norm: normalizedKeyRate(d.BB84, d.eta, NTh),
    SixState_norm: normalizedKeyRate(d.SixState, d.eta, NTh),
    SqzHom_norm: normalizedKeyRate(d.SqzHom, d.eta, NTh),
    GG02Het_norm: normalizedKeyRate(d.GG02Het, d.eta, NTh),
  }));
}

/** 
 * Figure 3: Generate CV:DV comparison map
 * Returns 2D array: rows = NTh levels (high→low), cols = distance bins
 * Each cell: { kTilde, k6S, kSqz }
 */
export interface HeatCell {
  dist: number;
  nth: number;
  kTilde: number | null;
  k6S: number;
  kSqz: number;
}

export function generateCVDVMap(
  K0: number = 1e-9,
  VsqdB: number = 15,
  distPoints: number = 60,
  nthPoints: number = 40,
  maxDist: number = 400,
  nthMin: number = 1e-10,
  nthMax: number = 10
): HeatCell[] {
  const distances = Array.from({ length: distPoints }, (_, i) => (i / (distPoints - 1)) * maxDist);
  const nthValues = Array.from({ length: nthPoints }, (_, i) =>
    Math.pow(10, Math.log10(nthMin) + (i / (nthPoints - 1)) * (Math.log10(nthMax) - Math.log10(nthMin)))
  );

  const data: HeatCell[] = [];
  for (let j = nthValues.length - 1; j >= 0; j--) {
    const nth = nthValues[j];
    for (let i = 0; i < distances.length; i++) {
      const dist = distances[i];
      const eta = distanceToEta(dist);
      const k6S = keyRate6S(eta, nth);
      const kSqz = keyRateSqzHom(eta, nth, VsqdB);
      data.push({ dist, nth, kTilde: kTildeMetric(kSqz, k6S, K0), k6S, kSqz });
    }
  }
  return data;
}

/** 
 * Figure 4: Phase Noise vs Distance map
 * x-axis: distance (km), y-axis: sigma2Theta
 * Color: kTildeMetric(SqzHomPhase, 6SPhase, K0)
 */
export interface PhaseNoiseCell {
  dist: number;
  sigma2Theta: number;
  kTilde: number | null;
  kCV: number;
  kDV: number;
}

export function generatePhaseNoiseSweep(
  NTh: number,
  K0: number = 1e-9,
  VsqdB: number = 15,
  distPoints: number = 50,
  phasePoints: number = 40,
  maxDist: number = 400
): PhaseNoiseCell[] {
  const distances = Array.from({ length: distPoints }, (_, i) => (i / (distPoints - 1)) * maxDist);
  const phaseValues = Array.from({ length: phasePoints }, (_, i) =>
    Math.pow(10, -10 + (i / (phasePoints - 1)) * 11) // 10⁻¹⁰ to 10¹
  );

  const data: PhaseNoiseCell[] = [];
  for (let j = phaseValues.length - 1; j >= 0; j--) {
    const sigma2Theta = phaseValues[j];
    for (let i = 0; i < distances.length; i++) {
      const dist = distances[i];
      const eta = distanceToEta(dist);
      const kCV = keyRateSqzHomPhase(eta, NTh, sigma2Theta, VsqdB);
      const kDV = keyRate6SPhase(eta, NTh, sigma2Theta);
      data.push({ dist, sigma2Theta, kTilde: kTildeMetric(kCV, kDV, K0), kCV, kDV });
    }
  }
  return data;
}

/** 
 * Figure 5: Loss Tolerance vs Phase Noise map
 * x-axis: NTh (log), y-axis: sigma2Theta
 */
export interface LossToleranceCell {
  nth: number;
  sigma2Theta: number;
  kTilde: number | null;
  kCV: number;
  kDV: number;
}

export function generateLossToleranceSweep(
  distKm: number = 50,
  K0: number = 1e-9,
  VsqdB: number = 15,
  nthPoints: number = 40,
  phasePoints: number = 40
): LossToleranceCell[] {
  const eta = distanceToEta(distKm);
  const nthValues = Array.from({ length: nthPoints }, (_, i) =>
    Math.pow(10, -10 + (i / (nthPoints - 1)) * 11)
  );
  const phaseValues = Array.from({ length: phasePoints }, (_, i) =>
    Math.pow(10, -10 + (i / (phasePoints - 1)) * 11)
  );

  const data: LossToleranceCell[] = [];
  for (let j = phaseValues.length - 1; j >= 0; j--) {
    const sigma2Theta = phaseValues[j];
    for (let i = 0; i < nthValues.length; i++) {
      const nth = nthValues[i];
      const kCV = keyRateSqzHomPhase(eta, nth, sigma2Theta, VsqdB);
      const kDV = keyRate6SPhase(eta, nth, sigma2Theta);
      data.push({ nth, sigma2Theta, kTilde: kTildeMetric(kCV, kDV, K0), kCV, kDV });
    }
  }
  return data;
}

// =============================================================================
// Experimental Reference Data (Table 1)
// =============================================================================

export const EXPERIMENTAL_DATA = {
  CVQKD: [
    { name: 'B. Qi et al.', sigma2Theta: 4.0e-2, distKm: 25, notes: 'Locally generated LO' },
    { name: 'T. Wang et al.', sigma2Theta: 1.2e-3, distKm: 50, notes: 'Real LO, high key rate' },
    { name: 'H. Wang et al.', sigma2Theta: 7.0e-3, distKm: 30, notes: 'Pilot-tone phase compensation' },
    { name: 'H.-M. Chin et al.', sigma2Theta: 1.0e-3, distKm: 20, notes: 'ML carrier recovery' },
    { name: 'Y. Zhang et al.', sigma2Theta: 7.4e-5, distKm: 202.81, notes: '202.81 km world record' },
  ],
  DVQKD: [
    { name: 'A. Boaron et al.', sigma2Theta: 7.2e-2, distKm: 421, notes: '421 km, 2.5 GHz rep rate' },
    { name: 'W. Li et al.', sigma2Theta: 2.2e-2, distKm: 10, notes: '110 Mbit/s, 10 km' },
  ],
};

// Panel configuration for Figure 1 & 2
export const NOISE_PANELS = [
  { label: 'Pure-Loss', NTh: 1e-15, maxLoss: 50, color: 'text-cyan-400' },
  { label: 'N_Th = 10⁻⁴', NTh: 1e-4, maxLoss: 40, color: 'text-blue-400' },
  { label: 'N_Th = 10⁻²', NTh: 1e-2, maxLoss: 30, color: 'text-violet-400' },
  { label: 'N_Th = 10⁻¹', NTh: 1e-1, maxLoss: 20, color: 'text-purple-400' },
] as const;

// K0 threshold panels for Figures 3, 4, 5
export const K0_PANELS = [
  { label: 'K₀ = 10⁻⁹', K0: 1e-9 },
  { label: 'K₀ = 10⁻⁶', K0: 1e-6 },
  { label: 'K₀ = 10⁻³', K0: 1e-3 },
] as const;

// Protocol colors (consistent across all figures)
// Using high-contrast, colorblind-friendly palette
export const PROTOCOL_COLORS = {
  BB84: '#7dd3fc',       // sky blue - DV
  SixState: '#60a5fa',   // light blue - DV (primary DV comparison)
  SqzHom: '#fb923c',     // orange - CV (primary CV comparison)
  GG02Het: '#fbbf24',    // amber - CV
  PLOBUpper: '#ef4444',  // red - upper bound
  PLOBLower: '#22c55e',  // green - lower bound
} as const;

// Type exports for external use
export type { DataPoint, NormDataPoint, HeatCell, PhaseNoiseCell, LossToleranceCell };

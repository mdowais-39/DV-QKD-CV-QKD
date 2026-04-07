/**
 * QKD Protocol Physics Engine
 * ===========================
 * 
 * TypeScript implementation of key physics functions for
 * DV-QKD (BB84, Six-State) and CV-QKD (Squeezed-State) protocols.
 * 
 * Reference: Kish et al. (2024), Quantum, arXiv:2206.13724v3
 */

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Binary entropy function: h(x) = -x log₂(x) - (1-x) log₂(1-x)
 */
export function binaryEntropy(x: number): number {
  x = Math.max(1e-15, Math.min(1 - 1e-15, x));
  return -x * Math.log2(x) - (1 - x) * Math.log2(1 - x);
}

/**
 * Von Neumann entropy term: H(x) = -x log₂(x)
 */
export function vonNeumannH(x: number): number {
  x = Math.max(1e-15, x);
  return -x * Math.log2(x);
}

/**
 * Bosonic entropy function: G(x) = (x+1)log₂(x+1) - x log₂(x)
 */
export function bosonicEntropy(x: number): number {
  x = Math.max(1e-15, x);
  return (x + 1) * Math.log2(x + 1) - x * Math.log2(x);
}

/**
 * Convert channel loss in dB to transmissivity η
 */
export function dBToEta(lossdB: number): number {
  return Math.pow(10, -lossdB / 10);
}

/**
 * Convert transmissivity to fiber distance in km (0.2 dB/km)
 */
export function etaToDistanceKm(eta: number): number {
  eta = Math.max(1e-15, Math.min(1 - 1e-15, eta));
  const lossdB = -10 * Math.log10(eta);
  return lossdB / 0.2;
}

/**
 * Convert fiber distance in km to transmissivity (0.2 dB/km)
 */
export function distanceToEta(distKm: number): number {
  const lossdB = distKm * 0.2;
  return dBToEta(lossdB);
}

// =============================================================================
// DV-QKD Functions
// =============================================================================

/**
 * Auxiliary factor γ = 1 + N_Th - N_Th·η
 */
export function gamma(eta: number, NTh: number): number {
  return 1 + NTh - NTh * eta;
}

/**
 * Depolarizing channel parameter λ (Eq. 8)
 */
export function depolarizingLambda(eta: number, NTh: number): number {
  const num = 2 * NTh * (1 + NTh) * Math.pow(1 - eta, 2);
  const den = Math.max(1e-15, eta + num);
  return Math.min(1, Math.max(0, num / den));
}

/**
 * Quantum Bit Error Rate in thermal-loss channel (Eq. 9)
 */
export function qberThermal(eta: number, NTh: number): number {
  return depolarizingLambda(eta, NTh) / 2;
}

/**
 * Success probability P_S (Eq. 4)
 */
export function psThermal(eta: number, NTh: number): number {
  const g = Math.pow(gamma(eta, NTh), 4);
  const num = eta + 2 * NTh * (1 + NTh) * Math.pow(1 - eta, 2);
  return Math.min(1, Math.max(0, num / Math.max(1e-15, g)));
}

/**
 * BB84 protocol key rate (Eq. 1)
 */
export function keyRateBB84(eta: number, NTh: number): number {
  const PS = psThermal(eta, NTh);
  const Q = qberThermal(eta, NTh);
  return Math.max(0, (PS / 2) * (1 - 2 * binaryEntropy(Q)));
}

/**
 * Six-State protocol key rate (Eq. 10)
 */
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
// CV-QKD Functions
// =============================================================================

/**
 * CV-QKD channel noise parameter χ
 */
export function cvChannelNoise(eta: number, NTh: number): number {
  const etaSafe = Math.max(1e-15, eta);
  return ((1 - eta) * (2 * NTh + 1)) / etaSafe;
}

/**
 * Squeezed-state CV-QKD with homodyne detection (Eqs. 12-18)
 */
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
  
  // Symplectic eigenvalues
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

// =============================================================================
// PLOB Bounds
// =============================================================================

/**
 * Check if channel is entanglement-breaking
 */
export function isEntanglementBreaking(eta: number, NTh: number): boolean {
  const threshold = eta / Math.max(1e-15, 1 - eta);
  return NTh >= threshold;
}

/**
 * Lower PLOB bound (Eq. 29a)
 */
export function plobLower(eta: number, NTh: number): number {
  if (isEntanglementBreaking(eta, NTh)) return 0;
  const etaSafe = Math.max(1e-15, Math.min(1 - 1e-15, eta));
  return Math.max(0, -Math.log2(1 - etaSafe) - bosonicEntropy(NTh));
}

/**
 * Upper PLOB bound (Eq. 29b)
 */
export function plobUpper(eta: number, NTh: number): number {
  if (isEntanglementBreaking(eta, NTh)) return 0;
  const etaSafe = Math.max(1e-15, Math.min(1 - 1e-15, eta));
  return Math.max(0, -Math.log2((1 - etaSafe) * Math.pow(etaSafe, NTh)) - bosonicEntropy(NTh));
}

// =============================================================================
// Phase Noise Functions
// =============================================================================

/**
 * Circular mean of wrapped normal distribution (Eq. 25)
 */
export function rBar(sigma2Theta: number): number {
  return Math.exp(-sigma2Theta / 2);
}

/**
 * DV-QKD QBER with phase noise (Eq. 27)
 */
export function qberDVPhase(eta: number, NTh: number, sigma2Theta: number): { QZ: number; QXY: number } {
  const lam = depolarizingLambda(eta, NTh);
  const r2 = Math.pow(rBar(sigma2Theta), 2);
  
  const QZ = lam / 2;
  const QXY = 0.5 * ((1 - lam) * (1 - r2) + lam);
  
  return { QZ, QXY };
}

/**
 * Six-State protocol key rate with phase noise (Eq. 10 + Eq. 27)
 */
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

/**
 * Squeezed-state CV-QKD with phase noise (Eq. 28)
 */
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
  
  const chiEB = SAB - SEGivenB;
  return Math.max(0, IAB - chiEB);
}

// =============================================================================
// Data Generation for Charts
// =============================================================================

export interface DataPoint {
  loss: number;
  distance: number;
  eta: number;
  BB84: number;
  SixState: number;
  SqzHom: number;
  PLOB_Lower: number;
  PLOB_Upper: number;
  QBER: number;
}

/**
 * Generate data points for key rate vs loss chart
 */
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
    
    let bb84: number, sixState: number, sqzHom: number;
    
    if (sigma2Theta > 0) {
      bb84 = keyRateBB84(eta, NTh);
      sixState = keyRate6SPhase(eta, NTh, sigma2Theta);
      sqzHom = keyRateSqzHomPhase(eta, NTh, sigma2Theta, VsqdB);
    } else {
      bb84 = keyRateBB84(eta, NTh);
      sixState = keyRate6S(eta, NTh);
      sqzHom = keyRateSqzHom(eta, NTh, VsqdB);
    }
    
    data.push({
      loss,
      distance,
      eta,
      BB84: bb84,
      SixState: sixState,
      SqzHom: sqzHom,
      PLOB_Lower: plobLower(eta, NTh),
      PLOB_Upper: plobUpper(eta, NTh),
      QBER: qberThermal(eta, NTh) * 100,
    });
  }
  
  return data;
}

// =============================================================================
// Experimental Reference Data (Table 1)
// =============================================================================

export const EXPERIMENTAL_DATA = {
  CVQKD: [
    { name: 'B. Qi et al.', sigma2Theta: 4.0e-2, notes: 'Locally generated LO' },
    { name: 'T. Wang et al.', sigma2Theta: 1.2e-3, notes: 'Real LO, high key rate' },
    { name: 'H. Wang et al.', sigma2Theta: 7.0e-3, notes: 'Pilot-tone phase compensation' },
    { name: 'H.-M. Chin et al.', sigma2Theta: 1.0e-3, notes: 'ML carrier recovery' },
    { name: 'Y. Zhang et al.', sigma2Theta: 7.4e-5, notes: '202.81 km world record' },
  ],
  DVQKD: [
    { name: 'A. Boaron et al.', sigma2Theta: 7.2e-2, notes: '421 km, 2.5 GHz rep rate' },
    { name: 'W. Li et al.', sigma2Theta: 2.2e-2, notes: '110 Mbit/s, 10 km' },
  ],
};

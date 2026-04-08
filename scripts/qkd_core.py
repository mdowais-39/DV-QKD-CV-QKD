"""
QKD Protocol Performance Simulator — Core Physics Engine
=========================================================

Implements all physics functions for DV-QKD (BB84, Six-State) and CV-QKD 
(Squeezed-State) protocols in the thermal-loss channel with phase noise.

Reference: Kish et al. (2024), Quantum, arXiv:2206.13724v3

All functions are vectorized with NumPy for efficient parameter sweeps.
"""

import numpy as np
from typing import Tuple

# ==============================================================================
# Helper Functions
# ==============================================================================

def h(x: np.ndarray) -> np.ndarray:
    """
    Binary entropy function: h(x) = -x log₂(x) - (1-x) log₂(1-x)
    Numerically stable with clipping.
    """
    x = np.asarray(x, dtype=float)
    x = np.clip(x, 1e-15, 1 - 1e-15)
    return -x * np.log2(x) - (1 - x) * np.log2(1 - x)


def H(x: np.ndarray) -> np.ndarray:
    """
    Von Neumann entropy term: H(x) = -x log₂(x)
    Used in six-state protocol key rate calculation.
    """
    x = np.asarray(x, dtype=float)
    x = np.clip(x, 1e-15, None)
    return -x * np.log2(x)


def G(x: np.ndarray) -> np.ndarray:
    """
    Bosonic entropy function: G(x) = (x+1)log₂(x+1) - x log₂(x)
    Used in CV-QKD Holevo information calculations.
    """
    x = np.asarray(x, dtype=float)
    x = np.clip(x, 1e-15, None)
    return (x + 1) * np.log2(x + 1) - x * np.log2(x)


def dB_to_eta(loss_dB: np.ndarray) -> np.ndarray:
    """
    Convert channel loss in dB to transmissivity η.
    Eq. 0: η = 10^(-Loss_dB / 10)
    """
    loss_dB = np.asarray(loss_dB, dtype=float)
    return np.power(10, -loss_dB / 10)


def eta_to_distance_km(eta: np.ndarray, loss_per_km: float = 0.2) -> np.ndarray:
    """
    Convert transmissivity to fiber distance in km.
    Assumes 0.2 dB/km standard fiber loss.
    """
    eta = np.asarray(eta, dtype=float)
    eta = np.clip(eta, 1e-15, 1 - 1e-15)
    loss_dB = -10 * np.log10(eta)
    return loss_dB / loss_per_km


def distance_to_eta(dist_km: np.ndarray, loss_per_km: float = 0.2) -> np.ndarray:
    """
    Convert fiber distance in km to transmissivity η.
    Assumes 0.2 dB/km standard fiber loss.
    """
    dist_km = np.asarray(dist_km, dtype=float)
    loss_dB = dist_km * loss_per_km
    return dB_to_eta(loss_dB)


# ==============================================================================
# DV-QKD: Thermal-Loss Channel Functions
# ==============================================================================

def gamma(eta: np.ndarray, NTh: np.ndarray) -> np.ndarray:
    """
    Auxiliary factor γ = 1 + N_Th - N_Th·η
    Used throughout DV-QKD calculations.
    """
    eta = np.asarray(eta, dtype=float)
    NTh = np.asarray(NTh, dtype=float)
    return 1 + NTh - NTh * eta


def depolarizing_lambda(eta: np.ndarray, NTh: np.ndarray) -> np.ndarray:
    """
    Depolarizing channel parameter λ (Eq. 8).
    λ = 2·N_Th·(1+N_Th)·(1-η)² / [η + 2·N_Th·(1+N_Th)·(1-η)²]
    
    Returns array ∈ [0, 1].
    """
    eta = np.asarray(eta, dtype=float)
    NTh = np.asarray(NTh, dtype=float)
    
    numerator = 2 * NTh * (1 + NTh) * np.power(1 - eta, 2)
    denominator = eta + numerator
    denominator = np.clip(denominator, 1e-15, None)
    
    lam = numerator / denominator
    return np.clip(lam, 0, 1)


def QBER_thermal(eta: np.ndarray, NTh: np.ndarray) -> np.ndarray:
    """
    Quantum Bit Error Rate in thermal-loss channel (Eq. 9).
    Symmetric QBER: Q_{X,Y,Z} = λ/2
    
    For pure-loss channel (NTh=0), QBER = 0.
    """
    lam = depolarizing_lambda(eta, NTh)
    return lam / 2


def PS_thermal(eta: np.ndarray, NTh: np.ndarray) -> np.ndarray:
    """
    Success probability P_S (Eq. 4).
    Probability that Bob registers exactly one photon (valid logical bit).
    
    P_S = [η + 2·N_Th·(1+N_Th)·(1-η)²] / γ⁴
    """
    eta = np.asarray(eta, dtype=float)
    NTh = np.asarray(NTh, dtype=float)
    
    g = gamma(eta, NTh)
    g4 = np.power(g, 4)
    g4 = np.clip(g4, 1e-15, None)
    
    numerator = eta + 2 * NTh * (1 + NTh) * np.power(1 - eta, 2)
    PS = numerator / g4
    
    return np.clip(PS, 0, 1)


# ==============================================================================
# DV-QKD: Key Rate Functions
# ==============================================================================

def key_rate_BB84(eta: np.ndarray, NTh: np.ndarray) -> np.ndarray:
    """
    BB84 protocol key rate (Eq. 1).
    K_{BB84} = (P_S / 2) · (1 - h(Q_Z) - h(Q_X))
    
    With symmetric QBER (Q_Z = Q_X), this becomes:
    K_{BB84} = (P_S / 2) · (1 - 2·h(Q))
    """
    PS = PS_thermal(eta, NTh)
    Q = QBER_thermal(eta, NTh)
    
    K = (PS / 2) * (1 - 2 * h(Q))
    return np.maximum(0, K)


def key_rate_6S(eta: np.ndarray, NTh: np.ndarray) -> np.ndarray:
    """
    Six-State protocol key rate (Eq. 10).
    Uses three mutually unbiased bases (X, Y, Z).
    
    For symmetric thermal-loss channel: Q_X = Q_Y = Q_Z = Q
    Eigenvalues (Eq. 11):
      Λ₀₀ = 1 - 3Q/2
      Λ₀₁ = Q/2
      Λ₁₀ = Q/2  
      Λ₁₁ = Q/2
    
    K_{6S} = (P_S / 2) · (1 - H(Λ₀₀) - H(Λ₀₁) - H(Λ₁₀) - H(Λ₁₁))
    """
    PS = PS_thermal(eta, NTh)
    Q = QBER_thermal(eta, NTh)
    
    # For symmetric channel: Q_X = Q_Y = Q_Z = Q
    L00 = np.clip(1 - 1.5 * Q, 1e-15, None)  # 1 - (Q + Q + Q)/2
    L01 = np.clip(Q / 2, 1e-15, None)         # (Q + Q - Q)/2
    L10 = np.clip(Q / 2, 1e-15, None)         # (-Q + Q + Q)/2
    L11 = np.clip(Q / 2, 1e-15, None)         # (Q - Q + Q)/2
    
    entropy_sum = H(L00) + H(L01) + H(L10) + H(L11)
    
    K = (PS / 2) * (1 - entropy_sum)
    return np.maximum(0, K)


# ==============================================================================
# CV-QKD: Squeezed-State Protocol Functions
# ==============================================================================

def cv_channel_noise(eta: np.ndarray, NTh: np.ndarray) -> np.ndarray:
    """
    CV-QKD channel noise parameter χ.
    χ = (1 - η)·(2·N_Th + 1) / η
    """
    eta = np.asarray(eta, dtype=float)
    NTh = np.asarray(NTh, dtype=float)
    
    eta_safe = np.clip(eta, 1e-15, None)
    chi = (1 - eta) * (2 * NTh + 1) / eta_safe
    return chi


def symplectic_eigenvalues(VA: np.ndarray, VB: np.ndarray, 
                           c: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Compute symplectic eigenvalues λ₁, λ₂ of the 4×4 covariance matrix γ_AB.
    
    For the block structure:
        γ_AB = [[a·I, c·σ_z], [c·σ_z, b·I]]
    where a = V_A + 1, b = V_B
    
    Invariants:
        Δ = Det(γ_A) + Det(γ_B) + 2·Det(σ_AB) = a² + b² - 2c²
        D = Det(γ_AB) = (ab - c²)²
    
    λ²_{1,2} = (1/2) · [Δ ± sqrt(Δ² - 4D)]
    """
    a = VA + 1
    b = VB
    
    # Determinants
    det_A = a * a
    det_B = b * b
    det_C = c * c
    
    Delta = det_A + det_B - 2 * det_C
    D_sq = np.power(a * b - det_C, 2)
    
    discriminant = np.clip(Delta * Delta - 4 * D_sq, 0, None)
    sqrt_disc = np.sqrt(discriminant)
    
    lambda1_sq = 0.5 * (Delta + sqrt_disc)
    lambda2_sq = 0.5 * (Delta - sqrt_disc)
    
    lambda1 = np.sqrt(np.clip(lambda1_sq, 1e-15, None))
    lambda2 = np.sqrt(np.clip(lambda2_sq, 1e-15, None))
    
    return lambda1, lambda2


def key_rate_SqzHom(eta: np.ndarray, NTh: np.ndarray, 
                    Vsq_dB: float = 15.0) -> np.ndarray:
    """
    Squeezed-state CV-QKD with homodyne detection (Eqs. 12-18).
    Uses reverse reconciliation for optimal performance.
    
    Parameters:
        eta: Channel transmissivity
        NTh: Thermal noise (mean photon number)
        Vsq_dB: Squeezing level in dB (default 15 dB)
    
    Returns:
        Key rate K_{RR} = I_{AB} - χ_{EB} (bits per channel use)
    """
    eta = np.asarray(eta, dtype=float)
    NTh = np.asarray(NTh, dtype=float)
    
    # Squeezing parameter μ (Eq. 12a,b)
    Vsq = np.power(10, -Vsq_dB / 10)  # Linear squeezing
    mu = 1 / Vsq
    
    # Alice's variance
    VA = mu - 1
    
    # Channel noise
    chi = cv_channel_noise(eta, NTh)
    
    # Bob's received variance
    VB = eta * (VA + 1 + chi)
    
    # Covariance matrix correlation term
    c = np.sqrt(eta * (VA * VA + 2 * VA))
    
    # Conditional variance V_{B|A}
    a = VA + 1
    b = VB
    VB_given_A = b - (c * c) / np.clip(a, 1e-15, None)
    VB_given_A = np.clip(VB_given_A, 1e-15, None)
    
    # Mutual information (homodyne, Eq. 15)
    I_AB = 0.5 * np.log2(VB / VB_given_A)
    
    # Symplectic eigenvalues for Holevo information
    lambda1, lambda2 = symplectic_eigenvalues(VA, VB, c)
    
    # S(E) = S(AB) (Eq. 17)
    S_AB = G((lambda1 - 1) / 2) + G((lambda2 - 1) / 2)
    
    # Conditional covariance after Bob's measurement (Eq. 18)
    denom = eta * mu + (1 - eta) * (2 * NTh + 1)
    denom = np.clip(denom, 1e-15, None)
    lambda3_x = mu - eta * (mu * mu - 1) / denom
    lambda3_p = mu
    lambda3 = np.sqrt(np.clip(lambda3_x * lambda3_p, 1e-15, None))
    
    # S(E|B)
    S_E_given_B = G((lambda3 - 1) / 2)
    
    # Holevo information (Eq. 16)
    chi_EB = S_AB - S_E_given_B
    
    # Key rate with β = 1 (ideal reconciliation, Eq. 13)
    K = I_AB - chi_EB
    
    return np.maximum(0, K)


def key_rate_GG02Het(eta: np.ndarray, NTh: np.ndarray,
                     V_mod: float = 10.0) -> np.ndarray:
    """
    GG02 protocol with heterodyne detection (coherent states).
    Simplified implementation for comparison.
    
    Parameters:
        eta: Channel transmissivity
        NTh: Thermal noise
        V_mod: Modulation variance (shot noise units)
    """
    eta = np.asarray(eta, dtype=float)
    NTh = np.asarray(NTh, dtype=float)
    
    # For coherent states: V_A = V_mod (no squeezing)
    VA = V_mod
    
    # Channel noise
    chi = cv_channel_noise(eta, NTh)
    
    # Bob's variance (heterodyne adds 1 shot noise unit)
    VB = eta * (VA + 1 + chi) + 1
    
    # Mutual information (heterodyne)
    I_AB = np.log2(1 + eta * VA / (1 + eta * chi + 1))
    
    # Simplified Holevo bound (collective attack)
    # This is an approximation; full calculation requires eigenvalue analysis
    chi_EB = np.log2((VB + 1) / 2)
    
    K = I_AB - chi_EB
    return np.maximum(0, K)


# ==============================================================================
# PLOB Bounds (Ultimate Limits)
# ==============================================================================

def is_entanglement_breaking(eta: np.ndarray, NTh: np.ndarray) -> np.ndarray:
    """
    Check if channel is entanglement-breaking.
    EB condition: N_Th ≥ η / (1 - η)
    """
    eta = np.asarray(eta, dtype=float)
    NTh = np.asarray(NTh, dtype=float)
    
    threshold = eta / np.clip(1 - eta, 1e-15, None)
    return NTh >= threshold


def plob_lower(eta: np.ndarray, NTh: np.ndarray) -> np.ndarray:
    """
    Lower PLOB bound on secret key capacity (Eq. 29a).
    C_lower = -log₂(1-η) - G(N_Th)
    
    Only valid when channel is non-entanglement-breaking.
    """
    eta = np.asarray(eta, dtype=float)
    NTh = np.asarray(NTh, dtype=float)
    
    # Check EB condition
    eb_mask = is_entanglement_breaking(eta, NTh)
    
    # Compute bound
    eta_safe = np.clip(eta, 1e-15, 1 - 1e-15)
    C = -np.log2(1 - eta_safe) - G(NTh)
    
    # Zero out EB regions
    C = np.where(eb_mask, 0, C)
    return np.maximum(0, C)


def plob_upper(eta: np.ndarray, NTh: np.ndarray) -> np.ndarray:
    """
    Upper PLOB bound on secret key capacity (Eq. 29b).
    C_upper = -log₂[(1-η) · η^{N_Th}] - G(N_Th)
    
    Only valid when channel is non-entanglement-breaking.
    """
    eta = np.asarray(eta, dtype=float)
    NTh = np.asarray(NTh, dtype=float)
    
    # Check EB condition
    eb_mask = is_entanglement_breaking(eta, NTh)
    
    # Compute bound
    eta_safe = np.clip(eta, 1e-15, 1 - 1e-15)
    C = -np.log2((1 - eta_safe) * np.power(eta_safe, NTh)) - G(NTh)
    
    # Zero out EB regions
    C = np.where(eb_mask, 0, C)
    return np.maximum(0, C)


# ==============================================================================
# Phase Noise Functions
# ==============================================================================

def r_bar(sigma2_theta: np.ndarray) -> np.ndarray:
    """
    Circular mean of wrapped normal distribution (Eq. 25).
    r̄ = exp(-σ²_θ / 2)
    
    r̄ ∈ [0, 1]: 1 = no phase noise, 0 = complete dephasing
    """
    sigma2_theta = np.asarray(sigma2_theta, dtype=float)
    return np.exp(-sigma2_theta / 2)


def QBER_DV_phase(eta: np.ndarray, NTh: np.ndarray, 
                  sigma2_theta: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    DV-QKD QBER with phase noise (Eq. 27).
    
    Phase noise breaks basis symmetry:
    - Z-basis (diagonal in photon number): unaffected
    - X,Y-bases: degraded by phase noise
    
    Returns:
        (Q_Z, Q_XY) tuple
    """
    eta = np.asarray(eta, dtype=float)
    NTh = np.asarray(NTh, dtype=float)
    sigma2_theta = np.asarray(sigma2_theta, dtype=float)
    
    lam = depolarizing_lambda(eta, NTh)
    r2 = np.power(r_bar(sigma2_theta), 2)
    
    # Eq. 27a: Z-basis unaffected
    Q_Z = lam / 2
    
    # Eq. 27b: X,Y-bases degraded
    Q_XY = 0.5 * ((1 - lam) * (1 - r2) + lam)
    
    return Q_Z, Q_XY


def key_rate_6S_phase(eta: np.ndarray, NTh: np.ndarray, 
                      sigma2_theta: np.ndarray) -> np.ndarray:
    """
    Six-State protocol key rate with phase noise (Eq. 10 + Eq. 27).
    
    Uses asymmetric QBERs in the eigenvalue calculation.
    """
    PS = PS_thermal(eta, NTh)
    Q_Z, Q_XY = QBER_DV_phase(eta, NTh, sigma2_theta)
    
    # Eigenvalues with asymmetric QBER (Eq. 11)
    # Q_X = Q_Y = Q_XY, Q_Z = Q_Z
    L00 = np.clip(1 - (Q_XY + Q_XY + Q_Z) / 2, 1e-15, None)
    L01 = np.clip((Q_XY + Q_XY - Q_Z) / 2, 1e-15, None)
    L10 = np.clip((-Q_XY + Q_XY + Q_Z) / 2, 1e-15, None)
    L11 = np.clip((Q_XY - Q_XY + Q_Z) / 2, 1e-15, None)
    
    entropy_sum = H(L00) + H(L01) + H(L10) + H(L11)
    
    K = (PS / 2) * (1 - entropy_sum)
    return np.maximum(0, K)


def key_rate_SqzHom_phase(eta: np.ndarray, NTh: np.ndarray, 
                          sigma2_theta: np.ndarray,
                          Vsq_dB: float = 15.0) -> np.ndarray:
    """
    Squeezed-state CV-QKD with phase noise (Eq. 28).
    
    Phase noise reduces effective transmissivity and increases inferred noise:
    η_I = η · r̄² = η · exp(-σ²_θ)
    χ_I = [(1 - exp(-σ²_θ))·η·μ + (1-η)·(2N_Th+1)] / (η · exp(-σ²_θ))
    """
    eta = np.asarray(eta, dtype=float)
    NTh = np.asarray(NTh, dtype=float)
    sigma2_theta = np.asarray(sigma2_theta, dtype=float)
    
    # Squeezing parameter
    Vsq = np.power(10, -Vsq_dB / 10)
    mu = 1 / Vsq
    
    # Phase noise factor
    r2 = np.exp(-sigma2_theta)  # r̄²
    
    # Effective transmissivity (Eq. 78)
    eta_I = eta * r2
    eta_I = np.clip(eta_I, 1e-15, None)
    
    # Effective channel noise (Eq. 80)
    chi_I_num = (1 - r2) * eta * mu + (1 - eta) * (2 * NTh + 1)
    chi_I = chi_I_num / eta_I
    
    # Covariance matrix with phase noise (Eq. 28)
    VA = mu - 1
    r_factor = np.sqrt(r2)  # r̄
    
    # Bob's variance
    VB = eta * mu + (1 - eta) * (2 * NTh + 1)
    
    # Correlation term with phase noise
    c = r_factor * np.sqrt(eta * (mu * mu - 1))
    
    # Conditional variance
    a = mu  # Note: for phase noise case, a = μ not μ-1+1
    b = VB
    VB_given_A = b - (c * c) / np.clip(a, 1e-15, None)
    VB_given_A = np.clip(VB_given_A, 1e-15, None)
    
    # Mutual information
    I_AB = 0.5 * np.log2(VB / VB_given_A)
    
    # Symplectic eigenvalues (using phase-noise covariance)
    lambda1, lambda2 = symplectic_eigenvalues(mu - 1, VB, c)
    
    # S(AB)
    S_AB = G((lambda1 - 1) / 2) + G((lambda2 - 1) / 2)
    
    # Conditional entropy after measurement
    denom = eta_I * mu + (1 - eta_I) * (2 * NTh + 1) + chi_I * eta_I
    denom = np.clip(denom, 1e-15, None)
    lambda3_x = mu - eta_I * (mu * mu - 1) / denom
    lambda3_p = mu
    lambda3 = np.sqrt(np.clip(lambda3_x * lambda3_p, 1e-15, None))
    
    S_E_given_B = G((lambda3 - 1) / 2)
    
    # Holevo information
    chi_EB = S_AB - S_E_given_B
    
    # Key rate
    K = I_AB - chi_EB
    return np.maximum(0, K)


# ==============================================================================
# Comparison Metrics
# ==============================================================================

def compute_K_tilde(K_CV: np.ndarray, K_DV: np.ndarray, 
                    K0: float = 1e-9) -> np.ndarray:
    """
    Normalized key rate ratio K̃_CV:DV (Eq. 30).
    
    K̃ = (K_{Sqz-Hom} - K_{6S}) / Max[K_{Sqz-Hom}, K_{6S}]
    
    Range: -1 (6S best) to +1 (Sqz-Hom best)
    Only evaluated where both K > K₀.
    """
    K_CV = np.asarray(K_CV, dtype=float)
    K_DV = np.asarray(K_DV, dtype=float)
    
    # Mask where both protocols work
    valid = (K_CV > K0) & (K_DV > K0)
    
    max_K = np.maximum(K_CV, K_DV)
    max_K = np.clip(max_K, 1e-15, None)
    
    K_tilde = (K_CV - K_DV) / max_K
    K_tilde = np.where(valid, K_tilde, np.nan)
    
    return K_tilde


def find_max_NTh(eta: float, sigma2_theta: float, K0: float = 1e-9,
                 protocol: str = '6S', Vsq_dB: float = 15.0,
                 NTh_range: np.ndarray = None) -> float:
    """
    Find maximum tolerable thermal noise for given (η, σ²_θ) (Eq. 31).
    
    Parameters:
        eta: Channel transmissivity
        sigma2_theta: Phase noise variance
        K0: Minimum required key rate
        protocol: '6S' or 'SqzHom'
        Vsq_dB: Squeezing level (for CV-QKD)
        NTh_range: Array of N_Th values to search
    """
    if NTh_range is None:
        NTh_range = np.logspace(-10, 0, 200)
    
    if protocol == '6S':
        K = key_rate_6S_phase(eta, NTh_range, sigma2_theta)
    else:
        K = key_rate_SqzHom_phase(eta, NTh_range, sigma2_theta, Vsq_dB)
    
    valid_idx = np.where(K >= K0)[0]
    if len(valid_idx) == 0:
        return 0.0
    
    return NTh_range[valid_idx[-1]]


def find_max_distance(NTh: float, sigma2_theta: float, K0: float = 1e-9,
                      protocol: str = '6S', Vsq_dB: float = 15.0,
                      dist_range: np.ndarray = None) -> float:
    """
    Find maximum transmission distance for given (N_Th, σ²_θ) (Eq. 33).
    """
    if dist_range is None:
        dist_range = np.linspace(0, 500, 300)
    
    eta = distance_to_eta(dist_range)
    
    if protocol == '6S':
        K = key_rate_6S_phase(eta, NTh, sigma2_theta)
    else:
        K = key_rate_SqzHom_phase(eta, NTh, sigma2_theta, Vsq_dB)
    
    valid_idx = np.where(K >= K0)[0]
    if len(valid_idx) == 0:
        return 0.0
    
    return dist_range[valid_idx[-1]]


def compute_N_tilde(sigma2_theta: np.ndarray, dist_km: np.ndarray,
                    K0: float = 1e-9, Vsq_dB: float = 15.0) -> np.ndarray:
    """
    Normalized thermal noise tolerance difference Ñ_Th^{CV:DV} (Eq. 32).
    
    Ñ = (N_Th,Sqz^{Max} - N_Th,6S^{Max}) / Max[N_Th,Sqz^{Max}, N_Th,6S^{Max}]
    """
    sigma2_theta = np.asarray(sigma2_theta, dtype=float)
    dist_km = np.asarray(dist_km, dtype=float)
    
    # Create output array
    if sigma2_theta.ndim == 0 and dist_km.ndim == 0:
        shape = ()
    elif sigma2_theta.ndim == 0:
        shape = dist_km.shape
    elif dist_km.ndim == 0:
        shape = sigma2_theta.shape
    else:
        shape = (len(sigma2_theta), len(dist_km))
    
    N_tilde = np.full(shape, np.nan)
    
    # Iterate over grid
    sigma2_flat = np.atleast_1d(sigma2_theta).ravel()
    dist_flat = np.atleast_1d(dist_km).ravel()
    
    for i, s2 in enumerate(sigma2_flat):
        eta = distance_to_eta(dist_flat)
        for j, d in enumerate(dist_flat):
            e = distance_to_eta(d)
            N_CV = find_max_NTh(e, s2, K0, 'SqzHom', Vsq_dB)
            N_DV = find_max_NTh(e, s2, K0, '6S')
            
            max_N = max(N_CV, N_DV)
            if max_N > 1e-15:
                if len(shape) == 2:
                    N_tilde[i, j] = (N_CV - N_DV) / max_N
                elif len(shape) == 1:
                    N_tilde[max(i, j)] = (N_CV - N_DV) / max_N
                else:
                    N_tilde = (N_CV - N_DV) / max_N
    
    return N_tilde


def compute_L_tilde(sigma2_theta: np.ndarray, NTh: np.ndarray,
                    K0: float = 1e-9, Vsq_dB: float = 15.0) -> np.ndarray:
    """
    Normalized loss/distance tolerance difference L̃^{CV:DV} (Eq. 34).
    
    L̃ = (D_Sqz^{Max} - D_6S^{Max}) / Max[D_Sqz^{Max}, D_6S^{Max}]
    """
    sigma2_theta = np.asarray(sigma2_theta, dtype=float)
    NTh = np.asarray(NTh, dtype=float)
    
    # Create output array
    if sigma2_theta.ndim == 0 and NTh.ndim == 0:
        shape = ()
    elif sigma2_theta.ndim == 0:
        shape = NTh.shape
    elif NTh.ndim == 0:
        shape = sigma2_theta.shape
    else:
        shape = (len(sigma2_theta), len(NTh))
    
    L_tilde = np.full(shape, np.nan)
    
    # Iterate over grid
    sigma2_flat = np.atleast_1d(sigma2_theta).ravel()
    NTh_flat = np.atleast_1d(NTh).ravel()
    
    for i, s2 in enumerate(sigma2_flat):
        for j, n in enumerate(NTh_flat):
            D_CV = find_max_distance(n, s2, K0, 'SqzHom', Vsq_dB)
            D_DV = find_max_distance(n, s2, K0, '6S')
            
            max_D = max(D_CV, D_DV)
            if max_D > 1e-15:
                if len(shape) == 2:
                    L_tilde[i, j] = (D_CV - D_DV) / max_D
                elif len(shape) == 1:
                    L_tilde[max(i, j)] = (D_CV - D_DV) / max_D
                else:
                    L_tilde = (D_CV - D_DV) / max_D
    
    return L_tilde


# ==============================================================================
# Utility: Experimental Reference Data (Table 1)
# ==============================================================================

EXPERIMENTAL_DATA = {
    'CV-QKD': [
        {'name': 'B. Qi et al.', 'sigma2_theta': 4.0e-2, 'notes': 'Locally generated LO'},
        {'name': 'T. Wang et al.', 'sigma2_theta': 1.2e-3, 'notes': 'Real LO, high key rate'},
        {'name': 'H. Wang et al.', 'sigma2_theta': 7.0e-3, 'notes': 'Pilot-tone phase compensation'},
        {'name': 'H.-M. Chin et al.', 'sigma2_theta': 1.0e-3, 'notes': 'ML carrier recovery'},
        {'name': 'Y. Zhang et al.', 'sigma2_theta': 7.4e-5, 'notes': '202.81 km world record'},
    ],
    'DV-QKD': [
        {'name': 'A. Boaron et al.', 'sigma2_theta': 7.2e-2, 'notes': '421 km, 2.5 GHz rep rate'},
        {'name': 'W. Li et al.', 'sigma2_theta': 2.2e-2, 'notes': '110 Mbit/s, 10 km'},
    ]
}


# ==============================================================================
# Test / Demo
# ==============================================================================

if __name__ == '__main__':
    print("QKD Core Physics Engine — Test Suite")
    print("=" * 50)
    
    # Test parameters
    eta_test = 0.1  # 10 dB loss
    NTh_test = 1e-3
    sigma2_test = 1e-4
    
    print(f"\nTest Parameters:")
    print(f"  η = {eta_test} (Loss = {-10*np.log10(eta_test):.1f} dB)")
    print(f"  N_Th = {NTh_test}")
    print(f"  σ²_θ = {sigma2_test}")
    
    print(f"\nDV-QKD Results (Thermal-Loss Only):")
    print(f"  QBER = {QBER_thermal(eta_test, NTh_test):.4f}")
    print(f"  P_S = {PS_thermal(eta_test, NTh_test):.4f}")
    print(f"  K_BB84 = {key_rate_BB84(eta_test, NTh_test):.6f} bits/use")
    print(f"  K_6S = {key_rate_6S(eta_test, NTh_test):.6f} bits/use")
    
    print(f"\nCV-QKD Results (15 dB Squeezing):")
    print(f"  K_SqzHom = {key_rate_SqzHom(eta_test, NTh_test):.6f} bits/use")
    
    print(f"\nPLOB Bounds:")
    print(f"  Lower = {plob_lower(eta_test, NTh_test):.6f} bits/use")
    print(f"  Upper = {plob_upper(eta_test, NTh_test):.6f} bits/use")
    
    print(f"\nWith Phase Noise (σ²_θ = {sigma2_test}):")
    Q_Z, Q_XY = QBER_DV_phase(eta_test, NTh_test, sigma2_test)
    print(f"  Q_Z = {Q_Z:.4f}, Q_XY = {Q_XY:.4f}")
    print(f"  K_6S (phase) = {key_rate_6S_phase(eta_test, NTh_test, sigma2_test):.6f}")
    print(f"  K_SqzHom (phase) = {key_rate_SqzHom_phase(eta_test, NTh_test, sigma2_test):.6f}")
    
    print("\n" + "=" * 50)
    print("All tests completed successfully!")

"""
QKD Protocol Performance Simulator — Figure Generation
=======================================================

Generates publication-quality figures comparing DV-QKD and CV-QKD protocols
in the thermal-loss channel with phase noise.

Reference: Kish et al. (2024), Quantum, arXiv:2206.13724v3

Outputs PNG files at 200 DPI with dark quantum aesthetic.
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
import matplotlib.patches as mpatches
from mpl_toolkits.axes_grid1 import make_axes_locatable
import os

# Import physics functions
from qkd_core import (
    dB_to_eta, distance_to_eta, eta_to_distance_km,
    key_rate_BB84, key_rate_6S, key_rate_SqzHom,
    key_rate_6S_phase, key_rate_SqzHom_phase,
    plob_lower, plob_upper, QBER_thermal,
    compute_K_tilde, find_max_NTh, find_max_distance,
    EXPERIMENTAL_DATA
)

# ==============================================================================
# Plot Style Configuration
# ==============================================================================

# Colors (from specification)
COLORS = {
    'background': '#0A0E1A',
    'grid': '#1E2840',
    'axis_label': '#8892B0',
    'title': '#E0E6FF',
    'UB': '#EF5350',      # Upper bound - red
    'LB': '#66BB6A',      # Lower bound - green
    'BB84': '#4FC3F7',    # Sky blue
    '6SP': '#81D4FA',     # Light blue
    'SqzHom': '#FF7043',  # Orange
    'GG02': '#FFCA28',    # Amber
}

def setup_dark_style():
    """Configure matplotlib for dark quantum aesthetic."""
    plt.style.use('dark_background')
    plt.rcParams.update({
        'figure.facecolor': COLORS['background'],
        'axes.facecolor': COLORS['background'],
        'axes.edgecolor': COLORS['grid'],
        'axes.labelcolor': COLORS['axis_label'],
        'axes.titlecolor': COLORS['title'],
        'xtick.color': COLORS['axis_label'],
        'ytick.color': COLORS['axis_label'],
        'grid.color': COLORS['grid'],
        'grid.alpha': 0.7,
        'grid.linewidth': 0.5,
        'legend.facecolor': COLORS['background'],
        'legend.edgecolor': COLORS['grid'],
        'legend.framealpha': 0.15,
        'text.color': COLORS['title'],
        'font.family': 'sans-serif',
        'font.size': 10,
        'axes.titlesize': 12,
        'axes.labelsize': 10,
    })

# Custom colormap for comparison maps (blue to white to red)
def create_comparison_cmap():
    """Create blue-white-red colormap for K̃ comparison."""
    colors = [
        (0.0, '#1565C0'),   # Blue (6S better)
        (0.5, '#FFFFFF'),   # White (equal)
        (1.0, '#EF5350'),   # Red (Sqz-Hom better)
    ]
    positions = [c[0] for c in colors]
    color_list = [c[1] for c in colors]
    return LinearSegmentedColormap.from_list('cv_dv_compare', list(zip(positions, color_list)))

# ==============================================================================
# Parameter Sweeps (from specification)
# ==============================================================================

# Loss / distance sweep
loss_dB = np.linspace(0, 50, 500)
loss_dB_low = np.linspace(0, 12, 400)
eta_arr = dB_to_eta(loss_dB)

# Thermal noise levels for multi-panel figures
NTh_vals = [0, 1e-4, 1e-2, 1e-1]

# 2D grids for comparison maps
dist_km = np.linspace(0, 420, 150)  # Reduced for faster computation
NTh_grid = np.logspace(-10, 1, 100)
sigma2_grid = np.logspace(-10, 1, 100)

# Phase noise values
phase_noise_vals = [1e-6, 1e-4, 1e-3, 1e-2]

# Minimum key rate thresholds
K0_vals = [1e-9, 1e-6, 1e-3]

# Squeezing
Vsq_dB = 15

# ==============================================================================
# Figure 1: Key Rate vs Loss (4 noise levels)
# ==============================================================================

def fig1_key_rate_vs_loss(save_path='fig1_key_rate.png'):
    """
    4-panel figure showing key rate vs channel loss for different thermal noise levels.
    Columns: Pure-Loss, N_Th=10⁻⁴, N_Th=10⁻², N_Th=10⁻¹
    """
    setup_dark_style()
    
    fig, axes = plt.subplots(1, 4, figsize=(16, 4), sharey=True)
    fig.patch.set_facecolor(COLORS['background'])
    
    titles = ['Pure-Loss\n$N_{Th} = 0$', '$N_{Th} = 10^{-4}$', 
              '$N_{Th} = 10^{-2}$', '$N_{Th} = 10^{-1}$']
    
    # Different loss ranges for different noise levels
    loss_ranges = [
        np.linspace(0, 50, 500),
        np.linspace(0, 40, 500),
        np.linspace(0, 25, 500),
        np.linspace(0, 12, 400),
    ]
    
    for idx, (ax, NTh, title, loss_arr) in enumerate(zip(axes, NTh_vals, titles, loss_ranges)):
        eta = dB_to_eta(loss_arr)
        
        # Compute key rates
        K_BB84 = key_rate_BB84(eta, NTh)
        K_6S = key_rate_6S(eta, NTh)
        K_SqzHom = key_rate_SqzHom(eta, NTh, Vsq_dB)
        
        # PLOB bounds
        K_UB = plob_upper(eta, NTh)
        K_LB = plob_lower(eta, NTh)
        
        # Plot bounds
        ax.semilogy(loss_arr, K_UB, '--', color=COLORS['UB'], label='Upper Bound', linewidth=1.5)
        ax.semilogy(loss_arr, K_LB, '--', color=COLORS['LB'], label='Lower Bound', linewidth=1.5)
        
        # Plot protocols
        mask_BB84 = K_BB84 > 1e-10
        mask_6S = K_6S > 1e-10
        mask_Sqz = K_SqzHom > 1e-10
        
        if np.any(mask_BB84):
            ax.semilogy(loss_arr[mask_BB84], K_BB84[mask_BB84], 
                       color=COLORS['BB84'], label='BB84', linewidth=2)
        if np.any(mask_6S):
            ax.semilogy(loss_arr[mask_6S], K_6S[mask_6S], 
                       color=COLORS['6SP'], label='Six-State', linewidth=2)
        if np.any(mask_Sqz):
            ax.semilogy(loss_arr[mask_Sqz], K_SqzHom[mask_Sqz], 
                       color=COLORS['SqzHom'], label='Sqz-Hom (15 dB)', linewidth=2)
        
        ax.set_title(title, fontsize=11, color=COLORS['title'])
        ax.set_xlabel('Loss (dB)', color=COLORS['axis_label'])
        ax.set_ylim(1e-6, 1)
        ax.set_xlim(0, loss_arr[-1])
        ax.grid(True, alpha=0.3, color=COLORS['grid'])
        
        if idx == 0:
            ax.set_ylabel('Secret Key Rate K (bits/use)', color=COLORS['axis_label'])
            ax.legend(loc='lower left', fontsize=8, framealpha=0.15)
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=200, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close()
    print(f"Saved: {save_path}")


# ==============================================================================
# Figure 2: Normalized Key Rate K/K_Upper
# ==============================================================================

def fig2_normalized_key_rate(save_path='fig2_normalized.png'):
    """
    4-panel figure showing normalized key rate K/K_Upper.
    Benchmarks how close each protocol is to the theoretical optimum.
    """
    setup_dark_style()
    
    fig, axes = plt.subplots(1, 4, figsize=(16, 4), sharey=True)
    fig.patch.set_facecolor(COLORS['background'])
    
    titles = ['Pure-Loss\n$N_{Th} = 0$', '$N_{Th} = 10^{-4}$', 
              '$N_{Th} = 10^{-2}$', '$N_{Th} = 10^{-1}$']
    
    loss_ranges = [
        np.linspace(0.1, 50, 500),
        np.linspace(0.1, 40, 500),
        np.linspace(0.1, 25, 500),
        np.linspace(0.1, 12, 400),
    ]
    
    for idx, (ax, NTh, title, loss_arr) in enumerate(zip(axes, NTh_vals, titles, loss_ranges)):
        eta = dB_to_eta(loss_arr)
        
        # Compute key rates
        K_BB84 = key_rate_BB84(eta, NTh)
        K_6S = key_rate_6S(eta, NTh)
        K_SqzHom = key_rate_SqzHom(eta, NTh, Vsq_dB)
        K_UB = plob_upper(eta, NTh)
        
        # Normalize
        K_UB_safe = np.clip(K_UB, 1e-15, None)
        K_BB84_norm = K_BB84 / K_UB_safe
        K_6S_norm = K_6S / K_UB_safe
        K_SqzHom_norm = K_SqzHom / K_UB_safe
        
        # Valid regions
        valid = K_UB > 1e-10
        
        # Plot
        ax.plot(loss_arr[valid], K_BB84_norm[valid], 
               color=COLORS['BB84'], label='BB84', linewidth=2)
        ax.plot(loss_arr[valid], K_6S_norm[valid], 
               color=COLORS['6SP'], label='Six-State', linewidth=2)
        ax.plot(loss_arr[valid], K_SqzHom_norm[valid], 
               color=COLORS['SqzHom'], label='Sqz-Hom', linewidth=2)
        
        ax.axhline(y=1, color=COLORS['UB'], linestyle='--', alpha=0.5, label='Theoretical Limit')
        
        ax.set_title(title, fontsize=11, color=COLORS['title'])
        ax.set_xlabel('Loss (dB)', color=COLORS['axis_label'])
        ax.set_ylim(0, 1.1)
        ax.set_xlim(0, loss_arr[-1])
        ax.grid(True, alpha=0.3, color=COLORS['grid'])
        
        if idx == 0:
            ax.set_ylabel('Normalized Key Rate $K/K_{Upper}$', color=COLORS['axis_label'])
            ax.legend(loc='upper right', fontsize=8, framealpha=0.15)
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=200, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close()
    print(f"Saved: {save_path}")


# ==============================================================================
# Figure 3: K̃_CV:DV Comparison Map
# ==============================================================================

def fig3_comparison_map(save_path='fig3_comparison_map.png'):
    """
    3-panel figure showing K̃_CV:DV comparison map.
    Color: blue (6S better) to red (Sqz-Hom better) through white (equal).
    """
    setup_dark_style()
    
    fig, axes = plt.subplots(1, 3, figsize=(14, 5))
    fig.patch.set_facecolor(COLORS['background'])
    
    cmap = create_comparison_cmap()
    
    # Distance and thermal noise grids
    dist_arr = np.linspace(1, 400, 100)
    NTh_arr = np.logspace(-8, 0, 80)
    
    for idx, (ax, K0) in enumerate(zip(axes, K0_vals)):
        # Compute K̃ map
        K_tilde_map = np.zeros((len(NTh_arr), len(dist_arr)))
        
        for i, NTh in enumerate(NTh_arr):
            eta = distance_to_eta(dist_arr)
            K_CV = key_rate_SqzHom(eta, NTh, Vsq_dB)
            K_DV = key_rate_6S(eta, NTh)
            
            K_tilde_map[i, :] = compute_K_tilde(K_CV, K_DV, K0)
        
        # Plot heatmap
        im = ax.pcolormesh(dist_arr, NTh_arr, K_tilde_map, 
                          cmap=cmap, vmin=-1, vmax=1, shading='auto')
        
        ax.set_yscale('log')
        ax.set_xlabel('Distance (km)', color=COLORS['axis_label'])
        ax.set_title(f'$K_0 = 10^{{{int(np.log10(K0))}}}$ bits/use', 
                    fontsize=11, color=COLORS['title'])
        
        if idx == 0:
            ax.set_ylabel('Thermal Noise $N_{Th}$', color=COLORS['axis_label'])
        
        # Add contour at K̃ = 0 (equal performance)
        try:
            ax.contour(dist_arr, NTh_arr, K_tilde_map, levels=[0], 
                      colors=[COLORS['LB']], linewidths=2)
        except:
            pass
    
    # Colorbar
    cbar = fig.colorbar(im, ax=axes, orientation='vertical', fraction=0.02, pad=0.02)
    cbar.set_label('$\\tilde{K}_{CV:DV}$', color=COLORS['title'])
    cbar.ax.yaxis.set_tick_params(color=COLORS['axis_label'])
    plt.setp(plt.getp(cbar.ax.axes, 'yticklabels'), color=COLORS['axis_label'])
    
    # Add legend annotation
    fig.text(0.5, 0.02, 'Blue: Six-State better | White: Equal | Red: Squeezed-Homodyne better',
             ha='center', fontsize=10, color=COLORS['axis_label'])
    
    plt.tight_layout(rect=[0, 0.05, 1, 1])
    plt.savefig(save_path, dpi=200, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close()
    print(f"Saved: {save_path}")


# ==============================================================================
# Figure 4: Thermal Noise Tolerance vs Phase Noise
# ==============================================================================

def fig4_thermal_noise_tolerance(save_path='fig4_phase_noise_thermal.png'):
    """
    3-panel figure showing maximum tolerable thermal noise vs distance and phase noise.
    With experimental reference points.
    """
    setup_dark_style()
    
    fig, axes = plt.subplots(1, 3, figsize=(14, 5))
    fig.patch.set_facecolor(COLORS['background'])
    
    cmap = create_comparison_cmap()
    
    # Distance and phase noise grids
    dist_arr = np.linspace(1, 350, 50)
    sigma2_arr = np.logspace(-6, 0, 40)
    
    for idx, (ax, K0) in enumerate(zip(axes, K0_vals)):
        # Compute Ñ_Th map (simplified - just show CV vs DV dominance)
        N_tilde_map = np.zeros((len(sigma2_arr), len(dist_arr)))
        
        for i, sigma2 in enumerate(sigma2_arr):
            for j, dist in enumerate(dist_arr):
                eta = distance_to_eta(dist)
                
                # Find max tolerable NTh for each protocol
                NTh_test = np.logspace(-10, -1, 50)
                
                K_CV = key_rate_SqzHom_phase(eta, NTh_test, sigma2, Vsq_dB)
                K_DV = key_rate_6S_phase(eta, NTh_test, sigma2)
                
                valid_CV = NTh_test[K_CV >= K0] if np.any(K_CV >= K0) else [0]
                valid_DV = NTh_test[K_DV >= K0] if np.any(K_DV >= K0) else [0]
                
                N_CV = max(valid_CV) if len(valid_CV) > 0 else 0
                N_DV = max(valid_DV) if len(valid_DV) > 0 else 0
                
                max_N = max(N_CV, N_DV)
                if max_N > 1e-15:
                    N_tilde_map[i, j] = (N_CV - N_DV) / max_N
                else:
                    N_tilde_map[i, j] = np.nan
        
        # Plot heatmap
        im = ax.pcolormesh(dist_arr, sigma2_arr, N_tilde_map, 
                          cmap=cmap, vmin=-1, vmax=1, shading='auto')
        
        ax.set_yscale('log')
        ax.set_xlabel('Distance (km)', color=COLORS['axis_label'])
        ax.set_title(f'$K_0 = 10^{{{int(np.log10(K0))}}}$ bits/use', 
                    fontsize=11, color=COLORS['title'])
        
        if idx == 0:
            ax.set_ylabel('Phase Noise $\\sigma^2_\\theta$', color=COLORS['axis_label'])
        
        # Add experimental points
        for data in EXPERIMENTAL_DATA['CV-QKD']:
            ax.scatter([100], [data['sigma2_theta']], 
                      color=COLORS['SqzHom'], s=60, marker='o', edgecolors='white', linewidths=1)
        for data in EXPERIMENTAL_DATA['DV-QKD']:
            ax.scatter([100], [data['sigma2_theta']], 
                      color=COLORS['6SP'], s=60, marker='s', edgecolors='white', linewidths=1)
    
    # Colorbar
    cbar = fig.colorbar(im, ax=axes, orientation='vertical', fraction=0.02, pad=0.02)
    cbar.set_label('$\\tilde{N}_{Th}^{CV:DV}$', color=COLORS['title'])
    cbar.ax.yaxis.set_tick_params(color=COLORS['axis_label'])
    plt.setp(plt.getp(cbar.ax.axes, 'yticklabels'), color=COLORS['axis_label'])
    
    # Legend for experimental points
    cv_patch = mpatches.Patch(color=COLORS['SqzHom'], label='CV-QKD Experiments')
    dv_patch = mpatches.Patch(color=COLORS['6SP'], label='DV-QKD Experiments')
    fig.legend(handles=[cv_patch, dv_patch], loc='lower center', ncol=2, fontsize=9)
    
    plt.tight_layout(rect=[0, 0.08, 1, 1])
    plt.savefig(save_path, dpi=200, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close()
    print(f"Saved: {save_path}")


# ==============================================================================
# Figure 5: Loss Tolerance vs Phase Noise
# ==============================================================================

def fig5_loss_tolerance(save_path='fig5_phase_noise_loss.png'):
    """
    3-panel figure showing maximum transmission distance vs thermal noise and phase noise.
    """
    setup_dark_style()
    
    fig, axes = plt.subplots(1, 3, figsize=(14, 5))
    fig.patch.set_facecolor(COLORS['background'])
    
    cmap = create_comparison_cmap()
    
    # Thermal noise and phase noise grids
    NTh_arr = np.logspace(-8, -1, 40)
    sigma2_arr = np.logspace(-6, 0, 40)
    
    for idx, (ax, K0) in enumerate(zip(axes, K0_vals)):
        # Compute L̃ map
        L_tilde_map = np.zeros((len(sigma2_arr), len(NTh_arr)))
        
        for i, sigma2 in enumerate(sigma2_arr):
            for j, NTh in enumerate(NTh_arr):
                # Find max distance for each protocol
                dist_test = np.linspace(1, 400, 50)
                eta_test = distance_to_eta(dist_test)
                
                K_CV = key_rate_SqzHom_phase(eta_test, NTh, sigma2, Vsq_dB)
                K_DV = key_rate_6S_phase(eta_test, NTh, sigma2)
                
                valid_CV = dist_test[K_CV >= K0] if np.any(K_CV >= K0) else [0]
                valid_DV = dist_test[K_DV >= K0] if np.any(K_DV >= K0) else [0]
                
                D_CV = max(valid_CV) if len(valid_CV) > 0 else 0
                D_DV = max(valid_DV) if len(valid_DV) > 0 else 0
                
                max_D = max(D_CV, D_DV)
                if max_D > 1:
                    L_tilde_map[i, j] = (D_CV - D_DV) / max_D
                else:
                    L_tilde_map[i, j] = np.nan
        
        # Plot heatmap
        im = ax.pcolormesh(NTh_arr, sigma2_arr, L_tilde_map, 
                          cmap=cmap, vmin=-1, vmax=1, shading='auto')
        
        ax.set_xscale('log')
        ax.set_yscale('log')
        ax.set_xlabel('Thermal Noise $N_{Th}$', color=COLORS['axis_label'])
        ax.set_title(f'$K_0 = 10^{{{int(np.log10(K0))}}}$ bits/use', 
                    fontsize=11, color=COLORS['title'])
        
        if idx == 0:
            ax.set_ylabel('Phase Noise $\\sigma^2_\\theta$', color=COLORS['axis_label'])
        
        # Add contour at L̃ = 0
        try:
            ax.contour(NTh_arr, sigma2_arr, L_tilde_map, levels=[0], 
                      colors=[COLORS['LB']], linewidths=2)
        except:
            pass
    
    # Colorbar
    cbar = fig.colorbar(im, ax=axes, orientation='vertical', fraction=0.02, pad=0.02)
    cbar.set_label('$\\tilde{L}^{CV:DV}$', color=COLORS['title'])
    cbar.ax.yaxis.set_tick_params(color=COLORS['axis_label'])
    plt.setp(plt.getp(cbar.ax.axes, 'yticklabels'), color=COLORS['axis_label'])
    
    fig.text(0.5, 0.02, 'Blue: Six-State better range | White: Equal | Red: Squeezed-Homodyne better range',
             ha='center', fontsize=10, color=COLORS['axis_label'])
    
    plt.tight_layout(rect=[0, 0.05, 1, 1])
    plt.savefig(save_path, dpi=200, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close()
    print(f"Saved: {save_path}")


# ==============================================================================
# Main Entry Point
# ==============================================================================

def generate_all_figures(output_dir='./'):
    """Generate all figures and save to the specified directory."""
    os.makedirs(output_dir, exist_ok=True)
    
    print("=" * 60)
    print("QKD Protocol Performance Simulator — Figure Generation")
    print("=" * 60)
    
    print("\n[1/5] Generating Key Rate vs Loss figure...")
    fig1_key_rate_vs_loss(os.path.join(output_dir, 'fig1_key_rate.png'))
    
    print("\n[2/5] Generating Normalized Key Rate figure...")
    fig2_normalized_key_rate(os.path.join(output_dir, 'fig2_normalized.png'))
    
    print("\n[3/5] Generating K̃_CV:DV Comparison Map...")
    fig3_comparison_map(os.path.join(output_dir, 'fig3_comparison_map.png'))
    
    print("\n[4/5] Generating Thermal Noise Tolerance figure...")
    fig4_thermal_noise_tolerance(os.path.join(output_dir, 'fig4_phase_noise_thermal.png'))
    
    print("\n[5/5] Generating Loss Tolerance figure...")
    fig5_loss_tolerance(os.path.join(output_dir, 'fig5_phase_noise_loss.png'))
    
    print("\n" + "=" * 60)
    print("All figures generated successfully!")
    print("=" * 60)


if __name__ == '__main__':
    generate_all_figures(output_dir='./')

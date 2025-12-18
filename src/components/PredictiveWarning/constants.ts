/**
 * Design tokens for predictive warning components
 * Using specified prediction color palette
 */

export const PREDICTION_COLORS = {
  // Primary prediction colors
  primary: '#8B5CF6',                        // prediction-primary (purple)
  glow: 'rgba(139, 92, 246, 0.4)',           // prediction-glow
  bg: 'rgba(139, 92, 246, 0.15)',            // prediction-bg
  pulse: 'rgba(139, 92, 246, 0.6)',          // prediction-pulse

  // Warning prediction colors
  warning: '#F59E0B',                        // prediction-warning
  warningGlow: 'rgba(245, 158, 11, 0.4)',    // prediction-warning-glow
  warningBg: 'rgba(245, 158, 11, 0.15)',     // prediction-warning-bg

  // Trajectory colors
  trajectory: {
    ascending: '#00F5A0',                    // trajectory-ascending
    descending: '#FF3D71',                   // trajectory-descending
    neutral: '#9CA3AF',                      // trajectory-neutral
  },

  // Confidence colors
  confidence: {
    high: '#00F5A0',                         // confidence-high
    medium: '#FFB800',                       // confidence-medium
    low: '#6B7280',                          // confidence-low
  },

  // Status colors (from existing design system)
  status: {
    good: '#00F5A0',
    goodGlow: 'rgba(0, 245, 160, 0.4)',
    goodBg: 'rgba(0, 245, 160, 0.1)',
    warning: '#FFB800',
    warningGlow: 'rgba(255, 184, 0, 0.4)',
    warningBg: 'rgba(255, 184, 0, 0.1)',
    error: '#FF3D71',
    errorGlow: 'rgba(255, 61, 113, 0.4)',
    errorBg: 'rgba(255, 61, 113, 0.1)',
  },

  // Text colors
  textPrimary: '#ffffff',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',

  // Background
  background: 'rgba(17, 24, 39, 0.95)',
  surface: 'rgba(31, 41, 55, 0.85)',
  border: 'rgba(75, 85, 99, 0.3)',
} as const;

// Urgency to style mapping
export const URGENCY_STYLES = {
  low: {
    border: PREDICTION_COLORS.primary,
    bg: PREDICTION_COLORS.bg,
    glow: PREDICTION_COLORS.glow,
    icon: '\u{1F4A1}',
  },
  medium: {
    border: PREDICTION_COLORS.warning,
    bg: PREDICTION_COLORS.warningBg,
    glow: PREDICTION_COLORS.warningGlow,
    icon: '\u26A0\uFE0F',
  },
  high: {
    border: PREDICTION_COLORS.status.error,
    bg: PREDICTION_COLORS.status.errorBg,
    glow: PREDICTION_COLORS.status.errorGlow,
    icon: '\u{1F6A8}',
  },
} as const;

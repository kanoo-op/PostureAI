/**
 * Design tokens for velocity display
 * Extends the existing DASHBOARD_COLORS from AngleDashboard
 */

import { DASHBOARD_COLORS } from '../AngleDashboard/constants';

export const VELOCITY_COLORS = {
  ...DASHBOARD_COLORS,

  // Velocity-specific colors (from design spec)
  velocity: {
    slow: '#3B82F6', // Blue
    slowGlow: 'rgba(59, 130, 246, 0.4)',
    optimal: '#00F5A0', // Primary green
    optimalGlow: 'rgba(0, 245, 160, 0.4)',
    fast: '#FF3D71', // Error red
    fastGlow: 'rgba(255, 61, 113, 0.4)',
  },

  // Phase indicator colors
  phase: {
    eccentric: '#8B5CF6', // Purple
    eccentricGlow: 'rgba(139, 92, 246, 0.4)',
    concentric: '#F59E0B', // Amber
    concentricGlow: 'rgba(245, 158, 11, 0.4)',
    isometric: '#6B7280', // Gray
  },

  // Acceleration indicators
  acceleration: {
    positive: '#00F5A0', // Speeding up
    negative: '#FF3D71', // Slowing down
    neutral: '#9CA3AF',
  },
} as const;

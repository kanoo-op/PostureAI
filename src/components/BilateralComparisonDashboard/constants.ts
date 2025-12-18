import { JointType } from './types';

// Design tokens from design specification
export const BILATERAL_COLORS = {
  // Primary palette (from DASHBOARD_COLORS)
  primary: '#00F5A0',
  secondary: '#00ddff',

  // Backgrounds
  background: 'rgba(17, 24, 39, 0.95)',
  surface: 'rgba(31, 41, 55, 0.85)',
  surfaceElevated: 'rgba(55, 65, 81, 0.6)',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',

  // Borders
  border: 'rgba(75, 85, 99, 0.3)',
  borderActive: 'rgba(75, 85, 99, 0.5)',

  // Status colors
  status: {
    good: '#00F5A0',
    goodBg: 'rgba(0, 245, 160, 0.1)',
    goodGlow: 'rgba(0, 245, 160, 0.4)',
    warning: '#FFB800',
    warningBg: 'rgba(255, 184, 0, 0.1)',
    warningGlow: 'rgba(255, 184, 0, 0.4)',
    error: '#FF3D71',
    errorBg: 'rgba(255, 61, 113, 0.1)',
    errorGlow: 'rgba(255, 61, 113, 0.4)',
  },

  // Side colors
  leftSide: '#3b82f6',
  rightSide: '#8b5cf6',

  // Trend colors
  trend: {
    improving: '#00F5A0',
    declining: '#FF3D71',
    stable: '#9CA3AF',
  },

  // Joint accent colors
  joint: {
    knee: '#10B981',
    hip: '#F59E0B',
    ankle: '#06B6D4',
  },
} as const;

// Joint labels (bilingual)
export const JOINT_LABELS: Record<JointType, { en: string; ko: string }> = {
  knee: { en: 'Knee', ko: '무릎' },
  hip: { en: 'Hip', ko: '엉덩이' },
  ankle: { en: 'Ankle', ko: '발목' },
};

// Side labels (bilingual)
export const SIDE_LABELS = {
  left: { en: 'Left', ko: '좌' },
  right: { en: 'Right', ko: '우' },
  balanced: { en: 'Balanced', ko: '균형' },
};

// Severity thresholds for angle differences
export const SEVERITY_THRESHOLDS = {
  good: 5,      // 0-5° difference = good
  warning: 15,  // 5-15° difference = warning
  // > 15° = error
};

// Symmetry score thresholds
export const SYMMETRY_SCORE_THRESHOLDS = {
  good: 85,     // >= 85 = good
  warning: 70,  // >= 70 = warning
  // < 70 = error
};

// Trend calculation window
export const TREND_WINDOW_SIZE = 5;

export const STORAGE_KEY = 'bilateralDashboard_expanded';

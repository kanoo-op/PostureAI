// src/components/ROMDisplayPanel/constants.ts

export const ROM_COLORS = {
  // Primary palette
  primary: '#00F5A0',
  secondary: '#00ddff',

  // Backgrounds
  background: 'rgba(17, 24, 39, 0.95)',     // gray-900
  backgroundSolid: '#111827',
  surface: 'rgba(31, 41, 55, 0.85)',
  surfaceElevated: 'rgba(55, 65, 81, 0.6)',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',

  // Borders
  border: 'rgba(75, 85, 99, 0.3)',
  borderActive: 'rgba(75, 85, 99, 0.5)',

  // Status colors for mobility assessment
  status: {
    good: '#00F5A0',           // Normal mobility
    goodGlow: 'rgba(0, 245, 160, 0.4)',
    goodBg: 'rgba(0, 245, 160, 0.1)',
    warning: '#FFB800',        // Limited mobility
    warningGlow: 'rgba(255, 184, 0, 0.4)',
    warningBg: 'rgba(255, 184, 0, 0.1)',
    error: '#FF3D71',          // Severely limited
    errorGlow: 'rgba(255, 61, 113, 0.4)',
    errorBg: 'rgba(255, 61, 113, 0.1)',
    hypermobile: '#8B5CF6',    // Hypermobile
    hypermobileGlow: 'rgba(139, 92, 246, 0.4)',
    hypermobileBg: 'rgba(139, 92, 246, 0.1)',
  },

  // Progress bar
  progress: {
    track: 'rgba(55, 65, 81, 0.8)',
    fillStart: '#00F5A0',
    fillEnd: '#00ddff',
  },

  // Accent
  accentCyan: '#06B6D4',
  accentViolet: '#8B5CF6',
} as const;

// Map MobilityAssessment to status colors
export const ASSESSMENT_STATUS_MAP = {
  normal: 'good',
  limited: 'warning',
  hypermobile: 'hypermobile',
} as const;

// Labels for bilingual display
export const ROM_LABELS = {
  title: { ko: 'ROM 분석', en: 'ROM Analysis' },
  sessionDuration: { ko: '세션 시간', en: 'Session' },
  currentRange: { ko: '현재 범위', en: 'Current Range' },
  minMax: { ko: '최소/최대', en: 'Min/Max' },
  normalRange: { ko: '정상 범위', en: 'Normal Range' },
  percentAchieved: { ko: '달성률', en: 'Achieved' },
  noData: { ko: '포즈를 감지하면 ROM 분석이 표시됩니다', en: 'ROM analysis will appear when pose is detected' },
  overallMobility: { ko: '전체 가동성', en: 'Overall Mobility' },
  normal: { ko: '정상', en: 'Normal' },
  limited: { ko: '제한적', en: 'Limited' },
  hypermobile: { ko: '과가동', en: 'Hypermobile' },
} as const;

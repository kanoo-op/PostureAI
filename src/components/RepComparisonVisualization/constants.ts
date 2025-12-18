import { JointAngleType } from '@/types/angleHistory';
import { MovementPhase } from './types';

// Design tokens from design specification
export const REP_COMPARISON_COLORS = {
  // Primary palette
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
    warning: '#FFB800',
    warningBg: 'rgba(255, 184, 0, 0.1)',
    error: '#FF3D71',
    errorBg: 'rgba(255, 61, 113, 0.1)',
  },

  // Rep line colors (up to 8 reps)
  repLines: [
    '#00F5A0', // rep 1 - primary green
    '#00ddff', // rep 2 - cyan
    '#8b5cf6', // rep 3 - purple
    '#F59E0B', // rep 4 - amber
    '#EC4899', // rep 5 - pink
    '#06B6D4', // rep 6 - teal
    '#84CC16', // rep 7 - lime
    '#F97316', // rep 8 - orange
  ],

  // Chart specific
  deviationBand: 'rgba(255, 184, 0, 0.15)',
  referenceLine: 'rgba(156, 163, 175, 0.4)',
  chartGrid: 'rgba(75, 85, 99, 0.2)',
  chartAxis: 'rgba(156, 163, 175, 0.6)',
} as const;

// Joint labels (bilingual) - extended from JOINT_LABELS in BilateralComparisonDashboard
export const JOINT_ANGLE_LABELS: Record<JointAngleType, { en: string; ko: string }> = {
  kneeFlexion: { en: 'Knee Flexion', ko: '무릎 굽힘' },
  hipFlexion: { en: 'Hip Flexion', ko: '엉덩이 굽힘' },
  torsoAngle: { en: 'Torso Angle', ko: '상체 기울기' },
  ankleAngle: { en: 'Ankle Angle', ko: '발목 각도' },
  elbowAngle: { en: 'Elbow Angle', ko: '팔꿈치 각도' },
  shoulderAngle: { en: 'Shoulder Angle', ko: '어깨 각도' },
  spineAlignment: { en: 'Spine Alignment', ko: '척추 정렬' },
  kneeValgus: { en: 'Knee Valgus', ko: '무릎 정렬' },
  elbowValgus: { en: 'Elbow Valgus', ko: '팔꿈치 정렬' },
  armSymmetry: { en: 'Arm Symmetry', ko: '팔 대칭' },
};

// Phase labels (bilingual)
export const PHASE_LABELS: Record<MovementPhase, { en: string; ko: string }> = {
  setup: { en: 'Setup', ko: '준비' },
  descent: { en: 'Descent', ko: '하강' },
  bottom: { en: 'Bottom', ko: '최저점' },
  ascent: { en: 'Ascent', ko: '상승' },
  lockout: { en: 'Lockout', ko: '완료' },
};

// Deviation thresholds (degrees)
export const DEVIATION_THRESHOLDS = {
  minor: 5, // < 5 degrees
  moderate: 10, // 5-10 degrees
  significant: 15, // > 10 degrees
};

// Chart dimensions
export const CHART_DIMENSIONS = {
  height: 200,
  heightCompact: 120,
  marginTop: 20,
  marginRight: 20,
  marginBottom: 40,
  marginLeft: 50,
};

// Maximum reps for comparison
export const MAX_SELECTED_REPS = 8;

// Default joints to show
export const DEFAULT_JOINTS: JointAngleType[] = ['kneeFlexion', 'hipFlexion', 'torsoAngle'];

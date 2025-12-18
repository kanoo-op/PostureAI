import { JointAngleType, ExerciseType } from '@/types/angleHistory';

// Design tokens from specification
export const SUMMARY_COLORS = {
  // Primary palette
  primary: '#00F5A0',
  primaryGlow: 'rgba(0, 245, 160, 0.4)',
  secondary: '#00ddff',
  secondaryGlow: 'rgba(0, 221, 255, 0.4)',

  // Backgrounds
  background: 'rgba(17, 24, 39, 0.95)',
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

  // Accent colors
  accent: {
    cyan: '#06B6D4',
    violet: '#8B5CF6',
    amber: '#F59E0B',
  },

  // Trend colors
  trend: {
    improving: '#00F5A0',
    declining: '#FF3D71',
    stable: '#9CA3AF',
  },
} as const;

// Joint labels (bilingual)
export const JOINT_LABELS: Record<JointAngleType, { ko: string; en: string }> = {
  kneeFlexion: { ko: '무릎 굴곡', en: 'Knee Flexion' },
  hipFlexion: { ko: '엉덩이 굴곡', en: 'Hip Flexion' },
  torsoAngle: { ko: '상체 각도', en: 'Torso Angle' },
  ankleAngle: { ko: '발목 각도', en: 'Ankle Angle' },
  elbowAngle: { ko: '팔꿈치 각도', en: 'Elbow Angle' },
  shoulderAngle: { ko: '어깨 각도', en: 'Shoulder Angle' },
  spineAlignment: { ko: '척추 정렬', en: 'Spine Alignment' },
  kneeValgus: { ko: '무릎 정렬', en: 'Knee Valgus' },
  elbowValgus: { ko: '팔꿈치 정렬', en: 'Elbow Valgus' },
  armSymmetry: { ko: '팔 대칭', en: 'Arm Symmetry' },
};

// Exercise labels (bilingual)
export const EXERCISE_LABELS: Record<ExerciseType, { ko: string; en: string }> = {
  squat: { ko: '스쿼트', en: 'Squat' },
  pushup: { ko: '푸시업', en: 'Push-up' },
  lunge: { ko: '런지', en: 'Lunge' },
  plank: { ko: '플랭크', en: 'Plank' },
  deadlift: { ko: '데드리프트', en: 'Deadlift' },
  'static-posture': { ko: '정적 자세', en: 'Static Posture' },
};

// Form breakdown labels
export const FORM_LABELS = {
  good: { ko: '올바른 자세', en: 'Good Form' },
  warning: { ko: '주의 필요', en: 'Needs Attention' },
  error: { ko: '교정 필요', en: 'Needs Correction' },
};

// Symmetry thresholds
export const SYMMETRY_THRESHOLDS = {
  good: 5,    // 0-5° difference
  warning: 15, // 5-15° difference
  // >15° = error
};

// Score thresholds for styling
export const SCORE_THRESHOLDS = {
  good: 80,
  warning: 50,
};

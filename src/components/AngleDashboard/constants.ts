// src/components/AngleDashboard/constants.ts

import { JointAngleType, ExerciseType } from '@/types/angleHistory';
import { CalibrationProfile } from '@/types/calibration';
import { BodyPartCategory } from './types';

// Design tokens matching the design specification
export const DASHBOARD_COLORS = {
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
    goodGlow: 'rgba(0, 245, 160, 0.4)',
    goodBg: 'rgba(0, 245, 160, 0.1)',
    warning: '#FFB800',
    warningGlow: 'rgba(255, 184, 0, 0.4)',
    warningBg: 'rgba(255, 184, 0, 0.1)',
    error: '#FF3D71',
    errorGlow: 'rgba(255, 61, 113, 0.4)',
    errorBg: 'rgba(255, 61, 113, 0.1)',
  },

  // Trend colors
  trend: {
    improving: '#00F5A0',
    declining: '#FF3D71',
    stable: '#9CA3AF',
  },

  // Gauge
  gauge: {
    track: 'rgba(55, 65, 81, 0.8)',
    fillStart: '#00F5A0',
    fillEnd: '#00ddff',
  },

  // Body part accent colors
  bodyPart: {
    upper: '#8B5CF6',  // Purple for shoulders, elbows
    core: '#F59E0B',   // Amber for torso, spine
    lower: '#10B981',  // Green for hips, knees, ankles
    armLeft: '#3b82f6',   // Blue for left arm
    armRight: '#8b5cf6',  // Purple for right arm
  },

  // Depth confidence colors
  depth: {
    reliable: '#00F5A0',
    reliableGlow: 'rgba(0, 245, 160, 0.4)',
    reliableBg: 'rgba(0, 245, 160, 0.1)',
    moderate: '#FFB800',
    moderateGlow: 'rgba(255, 184, 0, 0.4)',
    moderateBg: 'rgba(255, 184, 0, 0.1)',
    unreliable: '#FF3D71',
    unreliableGlow: 'rgba(255, 61, 113, 0.4)',
    unreliableBg: 'rgba(255, 61, 113, 0.1)',
  },

  // Calibration colors
  calibration: {
    active: '#00ddff',
    activeGlow: 'rgba(0, 221, 255, 0.4)',
    activeBg: 'rgba(0, 221, 255, 0.1)',
  },
} as const;

// Body part to angle type mapping per exercise
export const EXERCISE_ANGLE_MAPPING: Record<ExerciseType, Record<BodyPartCategory, JointAngleType[]>> = {
  squat: {
    upper: ['shoulderAngle'],
    core: ['torsoAngle', 'spineAlignment'],
    lower: ['kneeFlexion', 'hipFlexion', 'ankleAngle', 'kneeValgus'],
  },
  pushup: {
    upper: ['elbowAngle', 'shoulderAngle', 'elbowValgus', 'armSymmetry'],  // UPDATED
    core: ['torsoAngle', 'spineAlignment'],
    lower: ['hipFlexion'],
  },
  lunge: {
    upper: ['shoulderAngle'],
    core: ['torsoAngle', 'spineAlignment'],
    lower: ['kneeFlexion', 'hipFlexion', 'ankleAngle'],
  },
  plank: {
    upper: ['shoulderAngle', 'elbowAngle'],
    core: ['torsoAngle', 'spineAlignment'],
    lower: ['hipFlexion', 'ankleAngle'],
  },
  deadlift: {
    upper: ['shoulderAngle'],
    core: ['torsoAngle', 'spineAlignment'],
    lower: ['kneeFlexion', 'hipFlexion'],
  },
  'static-posture': {
    upper: ['shoulderAngle', 'elbowAngle'],
    core: ['torsoAngle', 'spineAlignment'],
    lower: ['kneeFlexion', 'hipFlexion', 'ankleAngle'],
  },
};

// Default optimal angle ranges per joint type (exercise-agnostic defaults)
export const DEFAULT_ANGLE_THRESHOLDS: Record<JointAngleType, { min: number; max: number; warningBuffer: number }> = {
  kneeFlexion: { min: 80, max: 100, warningBuffer: 15 },
  hipFlexion: { min: 70, max: 110, warningBuffer: 15 },
  torsoAngle: { min: 0, max: 35, warningBuffer: 10 },
  ankleAngle: { min: 70, max: 90, warningBuffer: 10 },
  elbowAngle: { min: 80, max: 100, warningBuffer: 15 },
  shoulderAngle: { min: 160, max: 180, warningBuffer: 10 },
  spineAlignment: { min: 170, max: 180, warningBuffer: 10 },
  kneeValgus: { min: 0, max: 5, warningBuffer: 3 }, // Percentage
  elbowValgus: { min: 0, max: 8, warningBuffer: 7 },    // NEW
  armSymmetry: { min: 90, max: 100, warningBuffer: 20 }, // NEW (percentage)
};

// Backward compatibility alias
export const ANGLE_THRESHOLDS = DEFAULT_ANGLE_THRESHOLDS;

// Function to get dynamic angle thresholds based on calibration profile
export function getAngleThresholds(
  calibrationProfile?: CalibrationProfile | null
): Record<JointAngleType, { min: number; max: number; warningBuffer: number }> {
  if (!calibrationProfile || !calibrationProfile.isComplete) {
    return DEFAULT_ANGLE_THRESHOLDS;
  }

  const thresholds = { ...DEFAULT_ANGLE_THRESHOLDS };

  for (const [jointType, romRange] of Object.entries(calibrationProfile.joints)) {
    if (romRange && thresholds[jointType as JointAngleType]) {
      const originalBuffer = DEFAULT_ANGLE_THRESHOLDS[jointType as JointAngleType].warningBuffer;
      thresholds[jointType as JointAngleType] = {
        min: romRange.min,
        max: romRange.max,
        warningBuffer: Math.min(originalBuffer, (romRange.max - romRange.min) * 0.15),
      };
    }
  }

  return thresholds;
}

// Labels for joint types
export const ANGLE_LABELS: Record<JointAngleType, { en: string; ko: string }> = {
  kneeFlexion: { en: 'Knee Flexion', ko: '무릎 굴곡' },
  hipFlexion: { en: 'Hip Flexion', ko: '엉덩이 굴곡' },
  torsoAngle: { en: 'Torso Angle', ko: '상체 기울기' },
  ankleAngle: { en: 'Ankle Angle', ko: '발목 각도' },
  elbowAngle: { en: 'Elbow Angle', ko: '팔꿈치 각도' },
  shoulderAngle: { en: 'Shoulder Angle', ko: '어깨 각도' },
  spineAlignment: { en: 'Spine Alignment', ko: '척추 정렬' },
  kneeValgus: { en: 'Knee Valgus', ko: '무릎 정렬' },
  elbowValgus: { en: 'Elbow Alignment', ko: '팔꿈치 정렬' },  // NEW
  armSymmetry: { en: 'Arm Symmetry', ko: '팔 대칭' },         // NEW
};

// Body part section labels
export const BODY_PART_LABELS: Record<BodyPartCategory, { en: string; ko: string; icon: string }> = {
  upper: { en: 'Upper Body', ko: '상체', icon: '💪' },
  core: { en: 'Core', ko: '코어', icon: '🎯' },
  lower: { en: 'Lower Body', ko: '하체', icon: '🦵' },
};

// localStorage key for toggle persistence
export const DASHBOARD_STORAGE_KEY = 'angleDashboard_visible';

// Trend calculation window (number of samples)
export const TREND_WINDOW_SIZE = 10;

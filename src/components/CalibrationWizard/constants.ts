// src/components/CalibrationWizard/constants.ts

import { CalibrationPoseInstruction, CalibrationStep } from '@/types/calibration';

// Calibration-specific color tokens
export const CALIBRATION_COLORS = {
  // Primary calibration colors
  active: '#00ddff',
  activeGlow: 'rgba(0, 221, 255, 0.4)',
  activeBg: 'rgba(0, 221, 255, 0.1)',
  complete: '#00F5A0',
  completeGlow: 'rgba(0, 245, 160, 0.4)',
  completeBg: 'rgba(0, 245, 160, 0.1)',
  pending: '#9CA3AF',
  inProgress: '#FFB800',
  inProgressGlow: 'rgba(255, 184, 0, 0.4)',

  // Wizard step colors
  stepActive: '#00ddff',
  stepComplete: '#00F5A0',
  stepPending: '#4B5563',

  // Confidence colors
  confidenceHigh: '#00F5A0',
  confidenceMedium: '#FFB800',
  confidenceLow: '#FF3D71',

  // Backgrounds & surfaces
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

  // Status
  statusGood: '#00F5A0',
  statusWarning: '#FFB800',
  statusError: '#FF3D71',
} as const;

// Calibration pose instructions for each step
export const CALIBRATION_POSE_INSTRUCTIONS: Record<CalibrationStep, CalibrationPoseInstruction> = {
  intro: {
    step: 'intro',
    jointType: null,
    titleKo: '캘리브레이션 시작',
    titleEn: 'Start Calibration',
    instructionKo: '개인화된 각도 범위를 측정합니다',
    instructionEn: 'We will measure your personalized angle ranges',
    minPosition: 'neutral',
    maxPosition: 'neutral',
    svgGuide: 'standing',
  },
  kneeFlexion: {
    step: 'kneeFlexion',
    jointType: 'kneeFlexion',
    titleKo: '무릎 굴곡 범위',
    titleEn: 'Knee Flexion Range',
    instructionKo: '편하게 스쿼트 자세로 내려갔다가 올라오세요',
    instructionEn: 'Comfortably squat down and stand back up',
    minPosition: 'extended',
    maxPosition: 'flexed',
    svgGuide: 'squat-deep',
  },
  hipFlexion: {
    step: 'hipFlexion',
    jointType: 'hipFlexion',
    titleKo: '엉덩이 굴곡 범위',
    titleEn: 'Hip Flexion Range',
    instructionKo: '상체를 앞으로 숙였다가 일어서세요',
    instructionEn: 'Bend forward at the hips and stand back up',
    minPosition: 'extended',
    maxPosition: 'flexed',
    svgGuide: 'hip-hinge',
  },
  torsoAngle: {
    step: 'torsoAngle',
    jointType: 'torsoAngle',
    titleKo: '상체 기울기 범위',
    titleEn: 'Torso Angle Range',
    instructionKo: '상체를 앞으로 기울였다가 바로 세우세요',
    instructionEn: 'Lean your torso forward and straighten up',
    minPosition: 'neutral',
    maxPosition: 'flexed',
    svgGuide: 'hip-hinge',
  },
  ankleAngle: {
    step: 'ankleAngle',
    jointType: 'ankleAngle',
    titleKo: '발목 각도 범위',
    titleEn: 'Ankle Angle Range',
    instructionKo: '무릎을 앞으로 밀었다가 원위치하세요',
    instructionEn: 'Push your knees forward and return',
    minPosition: 'neutral',
    maxPosition: 'flexed',
    svgGuide: 'squat-deep',
  },
  elbowAngle: {
    step: 'elbowAngle',
    jointType: 'elbowAngle',
    titleKo: '팔꿈치 각도 범위',
    titleEn: 'Elbow Angle Range',
    instructionKo: '팔을 완전히 폈다가 굽히세요',
    instructionEn: 'Fully extend and bend your arms',
    minPosition: 'extended',
    maxPosition: 'flexed',
    svgGuide: 'arm-bent',
  },
  shoulderAngle: {
    step: 'shoulderAngle',
    jointType: 'shoulderAngle',
    titleKo: '어깨 각도 범위',
    titleEn: 'Shoulder Angle Range',
    instructionKo: '팔을 옆으로 들었다가 내리세요',
    instructionEn: 'Raise arms to the side and lower them',
    minPosition: 'neutral',
    maxPosition: 'extended',
    svgGuide: 't-pose',
  },
  summary: {
    step: 'summary',
    jointType: null,
    titleKo: '캘리브레이션 완료',
    titleEn: 'Calibration Complete',
    instructionKo: '모든 관절의 가동 범위가 측정되었습니다',
    instructionEn: 'All joint ranges have been measured',
    minPosition: 'neutral',
    maxPosition: 'neutral',
    svgGuide: 'standing',
  },
};

// Order of calibration steps
export const CALIBRATION_STEP_ORDER: CalibrationStep[] = [
  'intro',
  'kneeFlexion',
  'hipFlexion',
  'torsoAngle',
  'ankleAngle',
  'elbowAngle',
  'shoulderAngle',
  'summary',
];

// Steps that involve pose capture (exclude intro and summary)
export const POSE_STEPS: CalibrationStep[] = [
  'kneeFlexion',
  'hipFlexion',
  'torsoAngle',
  'ankleAngle',
  'elbowAngle',
  'shoulderAngle',
];

// Minimum confidence threshold for accepting measurements
export const MIN_CONFIDENCE_THRESHOLD = 0.7;

// Countdown duration in seconds
export const CAPTURE_COUNTDOWN_SECONDS = 3;

// Number of samples to collect during capture
export const MIN_SAMPLES_REQUIRED = 10;

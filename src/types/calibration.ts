// src/types/calibration.ts

import { JointAngleType } from './angleHistory';

// ROM range for a single joint
export interface JointROMRange {
  min: number;      // Minimum comfortable angle (degrees)
  max: number;      // Maximum comfortable angle (degrees)
  optimal: number;  // Mid-point optimal angle
}

// Calibration data for all joints
export interface CalibrationProfile {
  id: string;                                    // UUID
  version: number;                               // Schema version (start at 1)
  createdAt: number;                             // Unix timestamp (ms)
  updatedAt: number;                             // Unix timestamp (ms)
  joints: Partial<Record<JointAngleType, JointROMRange>>;
  isComplete: boolean;                           // All required joints calibrated
  confidenceScores: Partial<Record<JointAngleType, number>>; // 0-1 per joint
}

// Calibration wizard step definitions
export type CalibrationStep =
  | 'intro'
  | 'kneeFlexion'
  | 'hipFlexion'
  | 'torsoAngle'
  | 'ankleAngle'
  | 'elbowAngle'
  | 'shoulderAngle'
  | 'summary';

// Calibration wizard state
export interface CalibrationWizardState {
  currentStep: CalibrationStep;
  completedSteps: CalibrationStep[];
  capturedData: Partial<Record<JointAngleType, number[]>>;
  isCapturing: boolean;
  countdown: number;
  confidence: number;
}

// Pose instruction for calibration
export interface CalibrationPoseInstruction {
  step: CalibrationStep;
  jointType: JointAngleType | null;
  titleKo: string;
  titleEn: string;
  instructionKo: string;
  instructionEn: string;
  minPosition: 'flexed' | 'extended' | 'neutral';
  maxPosition: 'flexed' | 'extended' | 'neutral';
  svgGuide: 'squat-deep' | 'squat-standing' | 'hip-hinge' | 'standing' | 'arm-bent' | 'arm-extended' | 't-pose';
}

// Storage schema for calibration
export interface CalibrationStorage {
  version: number;
  profile: CalibrationProfile | null;
  lastCalibrationDate: number | null;
}

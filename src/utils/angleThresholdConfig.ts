// src/utils/angleThresholdConfig.ts
// Unified 3D angle configuration system for all exercises

import { CalibrationProfile, JointROMRange } from '@/types/calibration';
import { ExerciseType, JointAngleType } from '@/types/angleHistory';
import { PHYSIOLOGICAL_BOUNDS } from './calibrationStorage';

// ============================================
// Type Definitions
// ============================================

// Range definition for angle thresholds
export interface AngleRange {
  min: number;
  max: number;
}

// Single joint angle threshold
export interface AngleThreshold {
  ideal: AngleRange;
  acceptable: AngleRange;
}

// Complete thresholds for an exercise
export interface ExerciseThresholds {
  exerciseType: ExerciseType;
  joints: Record<string, AngleThreshold>;
  symmetry?: AngleThreshold;
  phaseModifiers?: Record<string, number>;
}

// Skill level type
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

// Skill level modifier configuration
export interface SkillLevelModifier {
  idealRangeMultiplier: number;
  acceptableRangeMultiplier: number;
  description: string;
}

// Complete threshold configuration
export interface ThresholdConfig {
  version: number;
  exercises: Record<ExerciseType, ExerciseThresholds>;
  skillModifiers: Record<SkillLevel, SkillLevelModifier>;
  symmetry: AngleThreshold;
  phaseModifiers: Record<string, Record<string, number>>;
}

// ============================================
// Skill Level Modifiers
// ============================================

export const SKILL_LEVEL_MODIFIERS: Record<SkillLevel, SkillLevelModifier> = {
  beginner: {
    idealRangeMultiplier: 1.3,
    acceptableRangeMultiplier: 1.5,
    description: 'Relaxed thresholds for learning proper form',
  },
  intermediate: {
    idealRangeMultiplier: 1.0,
    acceptableRangeMultiplier: 1.0,
    description: 'Standard thresholds for regular training',
  },
  advanced: {
    idealRangeMultiplier: 0.8,
    acceptableRangeMultiplier: 0.9,
    description: 'Strict thresholds for precision training',
  },
};

// ============================================
// Symmetry Thresholds
// ============================================

export const SYMMETRY_THRESHOLDS: AngleThreshold = {
  ideal: { min: 85, max: 100 },
  acceptable: { min: 70, max: 84 },
};

// ============================================
// Phase Modifiers
// ============================================

export const PHASE_MODIFIERS: Record<ExerciseType, Record<string, number>> = {
  squat: {
    standing: 1.0,
    descending: 1.0,
    bottom: 0.9,
    ascending: 0.95,
  },
  deadlift: {
    setup: 1.0,
    lift: 0.8,
    lockout: 1.0,
    descent: 1.0,
  },
  lunge: {
    standing: 1.0,
    descending: 1.0,
    bottom: 0.95,
    ascending: 0.95,
  },
  pushup: {
    up: 1.0,
    descending: 1.0,
    bottom: 0.95,
    ascending: 0.95,
  },
  plank: {
    holding: 1.0,
  },
  'static-posture': {
    neutral: 1.0,
  },
};

// ============================================
// Default Thresholds (Extracted from Analyzers)
// ============================================

export const DEFAULT_THRESHOLDS: Record<ExerciseType, ExerciseThresholds> = {
  // Squat Thresholds (from squatAnalyzer.ts lines 193-227)
  squat: {
    exerciseType: 'squat',
    joints: {
      kneeAngle: { ideal: { min: 80, max: 100 }, acceptable: { min: 70, max: 110 } },
      hipAngle: { ideal: { min: 70, max: 110 }, acceptable: { min: 60, max: 120 } },
      torsoInclination: { ideal: { min: 0, max: 35 }, acceptable: { min: 0, max: 45 } },
      kneeValgus: { ideal: { min: 0, max: 5 }, acceptable: { min: 0, max: 10 } },
      ankleAngle: { ideal: { min: 15, max: 35 }, acceptable: { min: 10, max: 45 } },
      kneeDeviation3D: { ideal: { min: 0, max: 5 }, acceptable: { min: 5, max: 10 } },
    },
    symmetry: SYMMETRY_THRESHOLDS,
    phaseModifiers: PHASE_MODIFIERS.squat,
  },

  // Lunge Thresholds (from lungeAnalyzer.ts lines 131-160)
  lunge: {
    exerciseType: 'lunge',
    joints: {
      frontKneeAngle: { ideal: { min: 85, max: 100 }, acceptable: { min: 75, max: 110 } },
      backKneeAngle: { ideal: { min: 85, max: 105 }, acceptable: { min: 70, max: 120 } },
      hipAngle: { ideal: { min: 80, max: 110 }, acceptable: { min: 70, max: 120 } },
      torsoInclination: { ideal: { min: 0, max: 15 }, acceptable: { min: 0, max: 25 } },
      kneeOverToe: { ideal: { min: -0.05, max: 0.05 }, acceptable: { min: -0.10, max: 0.10 } },
      hipFlexorTightness: { ideal: { min: 170, max: 180 }, acceptable: { min: 165, max: 180 } },
      pelvicTilt: { ideal: { min: 0, max: 10 }, acceptable: { min: 0, max: 15 } },
    },
    phaseModifiers: PHASE_MODIFIERS.lunge,
  },

  // Deadlift Thresholds (from deadliftAnalyzer.ts lines 192-262)
  deadlift: {
    exerciseType: 'deadlift',
    joints: {
      hipHinge: { ideal: { min: 75, max: 100 }, acceptable: { min: 65, max: 115 } },
      kneeAngle: { ideal: { min: 140, max: 165 }, acceptable: { min: 125, max: 175 } },
      spineAlignment: { ideal: { min: 0, max: 25 }, acceptable: { min: 0, max: 40 } },
      barPath: { ideal: { min: 0, max: 5 }, acceptable: { min: 0, max: 12 } },
      lumbarSpine: { ideal: { min: 0, max: 15 }, acceptable: { min: 0, max: 25 } },
      thoracicSpine: { ideal: { min: 0, max: 20 }, acceptable: { min: 0, max: 35 } },
      hipDominantRatio: { ideal: { min: 1.5, max: 3.0 }, acceptable: { min: 1.0, max: 4.0 } },
    },
    symmetry: SYMMETRY_THRESHOLDS,
    phaseModifiers: PHASE_MODIFIERS.deadlift,
  },

  // Pushup Thresholds (from pushupAnalyzer.ts lines 94-119)
  pushup: {
    exerciseType: 'pushup',
    joints: {
      elbowAngle: { ideal: { min: 80, max: 100 }, acceptable: { min: 70, max: 110 } },
      bodyAlignment: { ideal: { min: 0, max: 10 }, acceptable: { min: 0, max: 20 } },
      hipPosition: { ideal: { min: 0, max: 8 }, acceptable: { min: 0, max: 15 } },
      depth: { ideal: { min: 80, max: 100 }, acceptable: { min: 60, max: 100 } },
      elbowValgus: { ideal: { min: 0, max: 8 }, acceptable: { min: 0, max: 15 } },
      armSymmetry: { ideal: { min: 90, max: 100 }, acceptable: { min: 70, max: 100 } },
    },
    phaseModifiers: PHASE_MODIFIERS.pushup,
  },

  // Plank Thresholds (from plankAnalyzer.ts lines 100-115)
  plank: {
    exerciseType: 'plank',
    joints: {
      bodyAlignment: { ideal: { min: 0, max: 8 }, acceptable: { min: 0, max: 15 } },
      hipPosition: { ideal: { min: -5, max: 5 }, acceptable: { min: -12, max: 12 } },
      shoulderAlignment: { ideal: { min: 0, max: 10 }, acceptable: { min: 0, max: 20 } },
      neckAlignment: { ideal: { min: 0, max: 10 }, acceptable: { min: 0, max: 20 } },
    },
    phaseModifiers: PHASE_MODIFIERS.plank,
  },

  // Static Posture Thresholds
  'static-posture': {
    exerciseType: 'static-posture',
    joints: {
      spineAlignment: { ideal: { min: 0, max: 5 }, acceptable: { min: 0, max: 10 } },
      shoulderLevel: { ideal: { min: 0, max: 3 }, acceptable: { min: 0, max: 6 } },
      hipLevel: { ideal: { min: 0, max: 3 }, acceptable: { min: 0, max: 6 } },
    },
    phaseModifiers: PHASE_MODIFIERS['static-posture'],
  },
};

// ============================================
// API Functions
// ============================================

/**
 * Get default thresholds for an exercise type
 * @param exerciseType - The type of exercise
 * @returns ExerciseThresholds for the specified exercise
 */
export function getExerciseThresholds(exerciseType: ExerciseType): ExerciseThresholds {
  const thresholds = DEFAULT_THRESHOLDS[exerciseType];
  if (!thresholds) {
    console.warn(`No thresholds defined for exercise: ${exerciseType}, using squat as fallback`);
    return DEFAULT_THRESHOLDS.squat;
  }
  return thresholds;
}

/**
 * Apply skill level modifier to a single threshold (internal helper)
 */
function applySkillModifierInternal(
  threshold: AngleThreshold,
  modifier: SkillLevelModifier
): AngleThreshold {
  const idealCenter = (threshold.ideal.min + threshold.ideal.max) / 2;
  const idealHalfWidth = (threshold.ideal.max - threshold.ideal.min) / 2;
  const acceptableCenter = (threshold.acceptable.min + threshold.acceptable.max) / 2;
  const acceptableHalfWidth = (threshold.acceptable.max - threshold.acceptable.min) / 2;

  return {
    ideal: {
      min: idealCenter - idealHalfWidth * modifier.idealRangeMultiplier,
      max: idealCenter + idealHalfWidth * modifier.idealRangeMultiplier,
    },
    acceptable: {
      min: acceptableCenter - acceptableHalfWidth * modifier.acceptableRangeMultiplier,
      max: acceptableCenter + acceptableHalfWidth * modifier.acceptableRangeMultiplier,
    },
  };
}

/**
 * Get thresholds adjusted for user skill level
 * @param exerciseType - The type of exercise
 * @param skillLevel - User's skill level (beginner, intermediate, advanced)
 * @returns ExerciseThresholds with ranges adjusted for skill level
 */
export function getThresholdsBySkillLevel(
  exerciseType: ExerciseType,
  skillLevel: SkillLevel
): ExerciseThresholds {
  const baseThresholds = getExerciseThresholds(exerciseType);
  const modifier = SKILL_LEVEL_MODIFIERS[skillLevel];
  const adjustedJoints: Record<string, AngleThreshold> = {};

  for (const [jointName, threshold] of Object.entries(baseThresholds.joints)) {
    adjustedJoints[jointName] = applySkillModifierInternal(threshold, modifier);
  }

  return {
    ...baseThresholds,
    joints: adjustedJoints,
    symmetry: baseThresholds.symmetry
      ? applySkillModifierInternal(baseThresholds.symmetry, modifier)
      : undefined,
  };
}

/**
 * Get threshold for a specific joint within an exercise
 * @param exerciseType - The type of exercise
 * @param jointType - The specific joint to get threshold for
 * @returns AngleThreshold for the specified joint, or null if not found
 */
export function getJointThreshold(
  exerciseType: ExerciseType,
  jointType: string
): AngleThreshold | null {
  const thresholds = getExerciseThresholds(exerciseType);
  return thresholds.joints[jointType] ?? null;
}

/**
 * Personalize threshold based on calibration data (internal helper)
 */
function personalizeThresholdInternal(
  threshold: AngleThreshold,
  romData: JointROMRange,
  jointType: JointAngleType
): AngleThreshold {
  const bounds = PHYSIOLOGICAL_BOUNDS[jointType];
  const userRange = romData.max - romData.min;
  const idealCenter = romData.optimal;
  const idealHalfWidth = userRange * 0.3;
  const acceptableHalfWidth = userRange * 0.4;

  const clamp = (value: number): number =>
    Math.max(bounds.absoluteMin, Math.min(bounds.absoluteMax, value));

  return {
    ideal: {
      min: clamp(idealCenter - idealHalfWidth),
      max: clamp(idealCenter + idealHalfWidth),
    },
    acceptable: {
      min: clamp(idealCenter - acceptableHalfWidth),
      max: clamp(idealCenter + acceptableHalfWidth),
    },
  };
}

/**
 * Get personalized thresholds based on user's calibration profile
 * Validates against PHYSIOLOGICAL_BOUNDS for safety
 * @param exerciseType - The type of exercise
 * @param profile - User's calibration profile with ROM data
 * @returns ExerciseThresholds personalized to user's calibration
 */
export function getPersonalizedThresholds(
  exerciseType: ExerciseType,
  profile: CalibrationProfile
): ExerciseThresholds {
  const baseThresholds = getExerciseThresholds(exerciseType);
  const adjustedJoints: Record<string, AngleThreshold> = {};

  // Mapping from exercise joint names to calibration joint types
  const jointMapping: Record<string, JointAngleType> = {
    kneeAngle: 'kneeFlexion',
    frontKneeAngle: 'kneeFlexion',
    backKneeAngle: 'kneeFlexion',
    hipAngle: 'hipFlexion',
    hipHinge: 'hipFlexion',
    torsoInclination: 'torsoAngle',
    spineAlignment: 'spineAlignment',
    ankleAngle: 'ankleAngle',
    elbowAngle: 'elbowAngle',
    elbowValgus: 'elbowValgus',
    kneeValgus: 'kneeValgus',
  };

  for (const [jointName, threshold] of Object.entries(baseThresholds.joints)) {
    const calibrationJoint = jointMapping[jointName];
    const calibrationData = calibrationJoint ? profile.joints[calibrationJoint] : undefined;

    if (calibrationData) {
      adjustedJoints[jointName] = personalizeThresholdInternal(
        threshold,
        calibrationData,
        calibrationJoint
      );
    } else {
      adjustedJoints[jointName] = threshold;
    }
  }

  return { ...baseThresholds, joints: adjustedJoints };
}

/**
 * Apply a phase modifier to a threshold
 * @param threshold - Base threshold to modify
 * @param modifier - Phase modifier (0.8 = 20% stricter, 1.2 = 20% more lenient)
 * @returns Modified AngleThreshold
 */
export function applyPhaseModifier(
  threshold: AngleThreshold,
  modifier: number
): AngleThreshold {
  const idealCenter = (threshold.ideal.min + threshold.ideal.max) / 2;
  const idealHalfWidth = (threshold.ideal.max - threshold.ideal.min) / 2;
  const acceptableCenter = (threshold.acceptable.min + threshold.acceptable.max) / 2;
  const acceptableHalfWidth = (threshold.acceptable.max - threshold.acceptable.min) / 2;

  return {
    ideal: {
      min: idealCenter - idealHalfWidth * modifier,
      max: idealCenter + idealHalfWidth * modifier,
    },
    acceptable: {
      min: acceptableCenter - acceptableHalfWidth * modifier,
      max: acceptableCenter + acceptableHalfWidth * modifier,
    },
  };
}

// ============================================
// Convenience Re-exports
// ============================================

// Re-export ExerciseType for convenience
export type { ExerciseType } from '@/types/angleHistory';

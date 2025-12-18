import type { ExerciseProfile } from '@/types/exerciseDetection';
import type { VideoExerciseType } from '@/types/video';

export const EXERCISE_PROFILES: Record<Exclude<VideoExerciseType, 'unknown'>, ExerciseProfile> = {
  squat: {
    type: 'squat',
    bodyOrientation: 'vertical',
    primaryJoints: ['knee', 'hip'],
    kneeAngleRange: { min: 70, max: 170, variance: 40 },
    hipAngleRange: { min: 45, max: 170, variance: 50 },
    elbowAngleRange: { min: 90, max: 180, variance: 30 },
    verticalMovementThreshold: 0.15,  // Normalized hip displacement
    horizontalMovementThreshold: 0.05,
    typicalCycleTime: { min: 1500, max: 5000 }
  },
  pushup: {
    type: 'pushup',
    bodyOrientation: 'horizontal',
    primaryJoints: ['elbow', 'shoulder'],
    kneeAngleRange: { min: 150, max: 180, variance: 15 },
    hipAngleRange: { min: 150, max: 180, variance: 15 },
    elbowAngleRange: { min: 45, max: 170, variance: 50 },
    verticalMovementThreshold: 0.03,
    horizontalMovementThreshold: 0.02,
    typicalCycleTime: { min: 1000, max: 4000 }
  },
  lunge: {
    type: 'lunge',
    bodyOrientation: 'vertical',
    primaryJoints: ['knee', 'hip'],
    kneeAngleRange: { min: 60, max: 170, variance: 45 },
    hipAngleRange: { min: 70, max: 170, variance: 40 },
    elbowAngleRange: { min: 90, max: 180, variance: 30 },
    verticalMovementThreshold: 0.12,
    horizontalMovementThreshold: 0.08,  // Higher due to stepping
    typicalCycleTime: { min: 2000, max: 6000 }
  },
  deadlift: {
    type: 'deadlift',
    bodyOrientation: 'vertical',
    primaryJoints: ['hip', 'knee'],
    kneeAngleRange: { min: 100, max: 170, variance: 30 },
    hipAngleRange: { min: 45, max: 170, variance: 60 },  // Large hip hinge
    elbowAngleRange: { min: 160, max: 180, variance: 10 },  // Arms stay straight
    verticalMovementThreshold: 0.10,
    horizontalMovementThreshold: 0.03,
    typicalCycleTime: { min: 2000, max: 7000 }
  },
  plank: {
    type: 'plank',
    bodyOrientation: 'horizontal',
    primaryJoints: ['hip', 'shoulder'],
    kneeAngleRange: { min: 160, max: 180, variance: 10 },
    hipAngleRange: { min: 160, max: 180, variance: 10 },
    elbowAngleRange: { min: 80, max: 100, variance: 10 },  // Or 170-180 for straight arm
    verticalMovementThreshold: 0.02,  // Very little movement
    horizontalMovementThreshold: 0.02,
    typicalCycleTime: { min: 10000, max: 60000 }  // Isometric hold
  }
};

export const DEFAULT_DETECTION_CONFIG = {
  framesToAnalyze: 30,
  confidenceThreshold: 0.7,
  timeoutMs: 5000,
  minFramesForDetection: 10
};

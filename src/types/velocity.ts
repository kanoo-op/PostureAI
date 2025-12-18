/**
 * Joint Velocity Tracking Type Definitions
 * Types for tracking frame-to-frame position changes, velocity, and movement quality analysis
 */

// Joint identifiers for velocity tracking
export type TrackedJoint =
  | 'leftKnee'
  | 'rightKnee'
  | 'leftHip'
  | 'rightHip'
  | 'leftShoulder'
  | 'rightShoulder'
  | 'leftAnkle'
  | 'rightAnkle';

// Movement phases
export type MovementPhase = 'eccentric' | 'concentric' | 'isometric' | 'transition';

// Velocity classification
export type VelocityCategory = 'too_slow' | 'slow' | 'optimal' | 'fast' | 'too_fast';

// Position snapshot with timestamp
export interface PositionSnapshot {
  x: number;
  y: number;
  z: number;
  timestamp: number; // performance.now() value in ms
  confidence: number; // keypoint score 0-1
}

// Single joint velocity data
export interface JointVelocityData {
  joint: TrackedJoint;
  currentVelocity: number; // units per second (pixels/s or normalized)
  smoothedVelocity: number; // EMA-smoothed velocity
  acceleration: number; // velocity change rate (units/s^2)
  category: VelocityCategory;
  isValid: boolean; // false if data insufficient or joint occluded
}

// Velocity thresholds per exercise type
export interface VelocityThresholds {
  tooSlow: number; // Below this = weakness indicator
  slow: number; // Controlled descent threshold
  optimal: { min: number; max: number }; // Ideal range
  fast: number; // Above this = warning
  tooFast: number; // Above this = poor control
}

// Exercise-specific velocity configuration
export interface ExerciseVelocityConfig {
  exerciseType: string;
  eccentricThresholds: VelocityThresholds;
  concentricThresholds: VelocityThresholds;
  trackedJoints: TrackedJoint[];
  primaryJoint: TrackedJoint; // Main joint for phase detection
}

// Tempo analysis result
export interface TempoAnalysis {
  eccentricDuration: number; // ms
  concentricDuration: number; // ms
  tempoRatio: number; // eccentric/concentric ratio (2:1 is often ideal)
  averageEccentricVelocity: number;
  averageConcentricVelocity: number;
  isControlled: boolean;
  feedback: string;
}

// Complete velocity analysis result
export interface VelocityAnalysisResult {
  timestamp: number;
  fps: number;
  deltaTime: number; // ms since last frame
  joints: Record<TrackedJoint, JointVelocityData>;
  currentPhase: MovementPhase;
  phaseProgress: number; // 0-1 progress through current phase
  tempo: TempoAnalysis | null; // null until full rep completed
  overallQuality: 'good' | 'warning' | 'error';
  feedbackMessage: string;
}

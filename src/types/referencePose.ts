// Reference keypoint matching BlazePose format
export interface ReferenceKeypoint {
  x: number;      // Normalized 0-1
  y: number;      // Normalized 0-1
  z: number;      // Depth
  visibility: number; // 0-1 confidence
}

// Exercise phase identifiers
export type ExercisePhase =
  | 'standing' | 'half-depth' | 'full-depth'  // Squat
  | 'up' | 'down'                              // Pushup
  | 'start' | 'mid' | 'end';                   // Generic

// Ideal pose data for a single phase
export interface IdealPoseData {
  exerciseType: string;
  phase: ExercisePhase;
  keypoints: ReferenceKeypoint[];  // 33 points
  description: string;
  criticalJoints: number[];  // Indices of joints to emphasize
}

// Complete reference data for an exercise
export interface ExerciseReferenceData {
  exerciseType: string;
  phases: IdealPoseData[];
  version: string;
  lastUpdated: string;
}

// Deviation result for a single joint
export interface JointDeviation {
  jointIndex: number;
  deviationDistance: number;  // Normalized distance
  deviationAngle: number;     // Degrees
  severity: 'aligned' | 'minor' | 'major';
  direction: { x: number; y: number };  // Vector toward ideal
}

// Complete deviation analysis
export interface DeviationAnalysis {
  overallScore: number;  // 0-100
  jointDeviations: JointDeviation[];
  worstJoints: number[];  // Top 3 most deviated
  phaseAlignment: number; // 0-1 how well aligned to phase
}

// User preferences for reference overlay
export interface ReferenceOverlayPreferences {
  enabled: boolean;
  opacity: number;  // 0-1
  showDeviationHighlights: boolean;
  selectedExercise: string | null;
}

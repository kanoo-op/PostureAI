import type { FramePoseData, VideoExerciseType } from './video';

// Detection result from frame analysis
export interface ExerciseDetectionResult {
  detectedType: VideoExerciseType;
  confidence: number;  // 0-1
  alternatives: AlternativeExercise[];
  analysisMetrics: DetectionMetrics;
  timestamp: number;
}

export interface AlternativeExercise {
  type: VideoExerciseType;
  confidence: number;
}

export interface DetectionMetrics {
  framesAnalyzed: number;
  verticalDisplacement: number;
  horizontalDisplacement: number;
  kneeAngleRange: [number, number];
  hipAngleRange: [number, number];
  elbowAngleRange: [number, number];
  bodyOrientation: 'vertical' | 'horizontal' | 'unknown';
  movementCycleDetected: boolean;
  cycleFrequency: number | null;  // Hz
}

// Exercise profile for matching
export interface ExerciseProfile {
  type: VideoExerciseType;
  bodyOrientation: 'vertical' | 'horizontal';
  primaryJoints: string[];
  kneeAngleRange: { min: number; max: number; variance: number };
  hipAngleRange: { min: number; max: number; variance: number };
  elbowAngleRange: { min: number; max: number; variance: number };
  verticalMovementThreshold: number;
  horizontalMovementThreshold: number;
  typicalCycleTime: { min: number; max: number };  // ms
}

// Detection state
export interface DetectionState {
  status: 'idle' | 'analyzing' | 'completed' | 'timeout' | 'error';
  progress: number;  // 0-100
  result: ExerciseDetectionResult | null;
  error: string | null;
}

// Configuration
export interface DetectionConfig {
  framesToAnalyze: number;  // Default: 30
  confidenceThreshold: number;  // Default: 0.7
  timeoutMs: number;  // Default: 5000
  minFramesForDetection: number;  // Default: 10
}

// Cache entry for detection results
export interface DetectionCacheEntry {
  videoChecksum: string;
  result: ExerciseDetectionResult;
  cachedAt: number;
  expiresAt: number;
}

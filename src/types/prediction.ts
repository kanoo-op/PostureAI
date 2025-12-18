/**
 * Angle Prediction Type Definitions
 * Types for predictive form analysis and early warning system
 */

import type { TrackedJoint, MovementPhase } from './velocity';
import type { FeedbackLevel } from '@/utils/squatAnalyzer';

// Prediction configuration
export interface PredictionConfig {
  lookAheadMs: number;           // How far ahead to predict (default: 300ms)
  confidenceThreshold: number;   // Minimum confidence to show prediction (0.7)
  hysteresisMs: number;          // Debounce time for warnings (100ms)
  minSamplesForPrediction: number; // Minimum history needed (5)
}

export const DEFAULT_PREDICTION_CONFIG: PredictionConfig = {
  lookAheadMs: 300,
  confidenceThreshold: 0.7,
  hysteresisMs: 100,
  minSamplesForPrediction: 5,
};

// Tracked angle types for prediction
export type PredictedAngle =
  | 'leftKnee'
  | 'rightKnee'
  | 'leftHip'
  | 'rightHip'
  | 'torso'
  | 'leftAnkle'
  | 'rightAnkle';

// Angular velocity data for prediction
export interface AnglePredictionData {
  angle: PredictedAngle;
  currentValue: number;           // Current angle in degrees
  angularVelocity: number;        // degrees/second
  angularAcceleration: number;    // degrees/second squared
  predictedValue: number;         // Predicted angle after lookAheadMs
  confidence: number;             // 0-1 confidence score
  timestamp: number;
  isValid: boolean;
}

// Threshold types that can be crossed
export type ThresholdType = 'warning' | 'error';

// Direction of threshold crossing
export type CrossingDirection = 'entering' | 'exiting';

// Predicted threshold crossing event
export interface PredictedThresholdCrossing {
  joint: PredictedAngle;
  currentAngle: number;
  predictedAngle: number;
  thresholdType: ThresholdType;
  thresholdValue: number;
  crossingDirection: CrossingDirection;
  timeToThreshold: number;        // ms until threshold crossing
  confidence: number;             // 0-1
  riskLevel: FeedbackLevel;       // 'good' | 'warning' | 'error'
}

// Predictive warning feedback item
export interface PredictiveWarning {
  id: string;                     // Unique ID for deduplication
  joint: PredictedAngle;
  message: string;                // Korean feedback message
  correction: string;             // Suggested correction
  urgency: 'low' | 'medium' | 'high';
  timeToIssue: number;           // ms until predicted issue
  confidence: number;
  timestamp: number;
  expiresAt: number;             // When this warning should be removed
}

// Complete prediction result
export interface AnglePredictionResult {
  timestamp: number;
  predictions: Record<PredictedAngle, AnglePredictionData>;
  thresholdCrossings: PredictedThresholdCrossing[];
  warnings: PredictiveWarning[];
  overallRiskLevel: FeedbackLevel;
  isReliable: boolean;           // Whether prediction has enough data
}

// State for prediction engine
export interface AnglePredictionState {
  angleHistory: Record<PredictedAngle, number[]>;
  timestampHistory: Record<PredictedAngle, number[]>;
  previousAngularVelocity: Record<PredictedAngle, number>;
  activeWarnings: Map<string, PredictiveWarning>;
  lastWarningTime: Record<string, number>;  // For hysteresis
  frameCount: number;
}

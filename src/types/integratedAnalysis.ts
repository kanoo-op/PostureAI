/**
 * Integrated Velocity-Angle Analysis Type Definitions
 */

import type { TrackedJoint, VelocityCategory, MovementPhase } from './velocity';
import type { FeedbackLevel } from '@/utils/squatAnalyzer';
import type { AnglePredictionResult, PredictiveWarning } from './prediction';

// Movement quality based on velocity-angle correlation
export type MovementQuality = 'controlled' | 'moderate' | 'rushed';

// Velocity context for feedback items
export type VelocityContext = 'high_velocity' | 'optimal_velocity' | 'low_velocity' | null;

// Angular velocity tracking (degrees per second)
export interface AngularVelocityData {
  joint: string;
  angularVelocity: number; // degrees/second
  smoothedAngularVelocity: number;
  previousAngle: number;
  currentAngle: number;
  isValid: boolean;
}

// Tempo-aware threshold configuration
export interface TempoAwareThresholds {
  strictnessMultiplier: number; // 1.0 = normal, 0.8 = 20% stricter
  mode: 'strict' | 'normal' | 'lenient';
  reason: string;
}

// Velocity-correlated risk assessment
export interface VelocityCorrelatedRisk {
  riskType: 'knee_valgus' | 'spine_rounding' | 'asymmetry' | 'general';
  baseRiskLevel: FeedbackLevel;
  velocityAdjustedLevel: FeedbackLevel;
  velocityContext: VelocityContext;
  confidence: number; // 0-1
}

// Extended FeedbackItem with velocity context
export interface IntegratedFeedbackItem {
  level: FeedbackLevel;
  message: string;
  correction: string;
  value: number;
  idealRange: { min: number; max: number };
  acceptableRange: { min: number; max: number };
  velocityContext: VelocityContext;
  angularVelocity?: number;
  isVelocityCorrelated: boolean;
}

// Combined analysis result
export interface IntegratedAnalysisResult {
  timestamp: number;
  movementQuality: MovementQuality;
  qualityScore: number; // 0-100
  angularVelocities: Record<string, AngularVelocityData>;
  velocityCorrelatedRisks: VelocityCorrelatedRisk[];
  tempoThresholds: TempoAwareThresholds;
  feedbackItems: IntegratedFeedbackItem[];
  overallVelocityCategory: VelocityCategory;
  phase: MovementPhase;
  // NEW: Prediction data
  prediction?: AnglePredictionResult;
  predictiveWarnings?: PredictiveWarning[];
}

// State for integrated analyzer
export interface IntegratedAnalyzerState {
  previousAngles: Record<string, number>;
  previousTimestamp: number;
  angularVelocityHistory: Record<string, number[]>;
  qualityHistory: MovementQuality[];
  frameCount: number;
}

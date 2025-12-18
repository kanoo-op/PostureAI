/**
 * Integrated Velocity-Angle Analyzer
 * Combines velocity tracking with angle analysis for movement quality assessment
 */

import type {
  MovementQuality,
  VelocityContext,
  AngularVelocityData,
  TempoAwareThresholds,
  VelocityCorrelatedRisk,
  IntegratedAnalysisResult,
  IntegratedAnalyzerState,
} from '@/types/integratedAnalysis';
import type { FeedbackLevel } from './squatAnalyzer';
import type { VelocityCategory, MovementPhase, JointVelocityData } from '@/types/velocity';

// Configuration constants
const ANGULAR_VELOCITY_THRESHOLDS = {
  controlled: { max: 60 },  // degrees/second
  moderate: { min: 60, max: 120 },
  rushed: { min: 120 },
};

const HIGH_VELOCITY_RISK_MULTIPLIER = 1.5; // Issues 50% more severe at high velocity
const STRICT_THRESHOLD_MULTIPLIER = 0.8; // 20% stricter during slow controlled reps
const EMA_ALPHA = 0.3; // Smoothing factor for angular velocity
const MIN_FRAMES_FOR_QUALITY = 3;
const ANGULAR_VELOCITY_HISTORY_SIZE = 10;

/**
 * Calculate angular velocity between frames
 * @returns degrees per second
 */
export function calculateAngularVelocity(
  previousAngle: number,
  currentAngle: number,
  deltaTimeMs: number
): number {
  if (deltaTimeMs <= 0) return 0;
  const deltaAngle = Math.abs(currentAngle - previousAngle);
  return (deltaAngle / deltaTimeMs) * 1000; // Convert to degrees/second
}

/**
 * Smooth angular velocity using EMA
 */
export function smoothAngularVelocity(
  currentVelocity: number,
  previousSmoothed: number
): number {
  return EMA_ALPHA * currentVelocity + (1 - EMA_ALPHA) * previousSmoothed;
}

/**
 * Classify movement quality based on angular velocity
 */
export function classifyMovementQuality(angularVelocity: number): MovementQuality {
  if (angularVelocity <= ANGULAR_VELOCITY_THRESHOLDS.controlled.max) {
    return 'controlled';
  }
  if (angularVelocity <= ANGULAR_VELOCITY_THRESHOLDS.moderate.max) {
    return 'moderate';
  }
  return 'rushed';
}

/**
 * Determine velocity context for feedback items
 */
export function determineVelocityContext(
  jointVelocity: number,
  thresholds: { optimal: { min: number; max: number } }
): VelocityContext {
  if (jointVelocity > thresholds.optimal.max * 1.5) {
    return 'high_velocity';
  }
  if (jointVelocity < thresholds.optimal.min * 0.5) {
    return 'low_velocity';
  }
  return 'optimal_velocity';
}

/**
 * Calculate tempo-aware thresholds based on movement quality
 */
export function calculateTempoAwareThresholds(
  movementQuality: MovementQuality,
  phase: MovementPhase
): TempoAwareThresholds {
  // Stricter thresholds for slow, controlled movements
  if (movementQuality === 'controlled' && phase === 'eccentric') {
    return {
      strictnessMultiplier: STRICT_THRESHOLD_MULTIPLIER,
      mode: 'strict',
      reason: 'Controlled eccentric phase - stricter form standards apply',
    };
  }

  // More lenient during fast concentric (explosive) movements
  if (movementQuality === 'rushed' && phase === 'concentric') {
    return {
      strictnessMultiplier: 1.2,
      mode: 'lenient',
      reason: 'Explosive concentric phase - slightly relaxed thresholds',
    };
  }

  return {
    strictnessMultiplier: 1.0,
    mode: 'normal',
    reason: 'Standard thresholds',
  };
}

/**
 * Assess velocity-correlated risk for form issues
 */
export function assessVelocityCorrelatedRisk(
  riskType: 'knee_valgus' | 'spine_rounding' | 'asymmetry' | 'general',
  baseLevel: FeedbackLevel,
  velocityContext: VelocityContext,
  angularVelocity: number
): VelocityCorrelatedRisk {
  let adjustedLevel = baseLevel;
  let confidence = 0.8;

  // Escalate risk level if issue occurs at high velocity
  if (velocityContext === 'high_velocity' && baseLevel !== 'good') {
    if (baseLevel === 'warning') {
      adjustedLevel = 'error';
      confidence = 0.9;
    }
  }

  // High angular velocity with form issues is more concerning
  if (angularVelocity > ANGULAR_VELOCITY_THRESHOLDS.rushed.min && baseLevel !== 'good') {
    adjustedLevel = 'error';
    confidence = 0.95;
  }

  return {
    riskType,
    baseRiskLevel: baseLevel,
    velocityAdjustedLevel: adjustedLevel,
    velocityContext,
    confidence,
  };
}

/**
 * Create initial state for integrated analyzer
 */
export function createIntegratedAnalyzerState(): IntegratedAnalyzerState {
  return {
    previousAngles: {},
    previousTimestamp: 0,
    angularVelocityHistory: {},
    qualityHistory: [],
    frameCount: 0,
  };
}

/**
 * Main integrated analysis function
 * Combines angle data with velocity data for comprehensive movement quality assessment
 */
export function analyzeIntegrated(
  currentAngles: Record<string, number>,
  jointVelocities: Record<string, JointVelocityData>,
  timestamp: number,
  phase: MovementPhase,
  state: IntegratedAnalyzerState
): { result: IntegratedAnalysisResult; newState: IntegratedAnalyzerState } {
  const deltaTime = state.previousTimestamp > 0 ? timestamp - state.previousTimestamp : 33;

  // Calculate angular velocities for each tracked angle
  const angularVelocities: Record<string, AngularVelocityData> = {};
  const newAngularVelocityHistory = { ...state.angularVelocityHistory };

  for (const [key, currentAngle] of Object.entries(currentAngles)) {
    const previousAngle = state.previousAngles[key] ?? currentAngle;
    const rawAngularVelocity = calculateAngularVelocity(previousAngle, currentAngle, deltaTime);

    const history = state.angularVelocityHistory[key] ?? [];
    const previousSmoothed = history.length > 0 ? history[history.length - 1] : rawAngularVelocity;
    const smoothed = smoothAngularVelocity(rawAngularVelocity, previousSmoothed);

    angularVelocities[key] = {
      joint: key,
      angularVelocity: rawAngularVelocity,
      smoothedAngularVelocity: smoothed,
      previousAngle,
      currentAngle,
      isValid: true,
    };

    // Update history
    newAngularVelocityHistory[key] = [...history, smoothed].slice(-ANGULAR_VELOCITY_HISTORY_SIZE);
  }

  // Calculate overall movement quality from average angular velocity
  const avgAngularVelocity = Object.values(angularVelocities).length > 0
    ? Object.values(angularVelocities).reduce((sum, av) => sum + av.smoothedAngularVelocity, 0) / Object.values(angularVelocities).length
    : 0;

  const movementQuality = classifyMovementQuality(avgAngularVelocity);

  // Calculate quality score (0-100)
  let qualityScore = 100;
  if (movementQuality === 'moderate') qualityScore = 70;
  if (movementQuality === 'rushed') qualityScore = 40;

  // Get tempo-aware thresholds
  const tempoThresholds = calculateTempoAwareThresholds(movementQuality, phase);

  // Determine overall velocity category from joint velocities
  const jointVelocityValues = Object.values(jointVelocities).filter(jv => jv.isValid);
  const avgJointVelocity = jointVelocityValues.length > 0
    ? jointVelocityValues.reduce((sum, jv) => sum + jv.smoothedVelocity, 0) / jointVelocityValues.length
    : 0;

  let overallVelocityCategory: VelocityCategory = 'optimal';
  if (avgJointVelocity > 300) overallVelocityCategory = 'too_fast';
  else if (avgJointVelocity > 200) overallVelocityCategory = 'fast';
  else if (avgJointVelocity < 50) overallVelocityCategory = 'slow';
  else if (avgJointVelocity < 20) overallVelocityCategory = 'too_slow';

  // Update state
  const newQualityHistory = [...state.qualityHistory, movementQuality].slice(-30);

  return {
    result: {
      timestamp,
      movementQuality,
      qualityScore,
      angularVelocities,
      velocityCorrelatedRisks: [], // Populated by exercise-specific analyzers
      tempoThresholds,
      feedbackItems: [], // Populated by exercise-specific analyzers
      overallVelocityCategory,
      phase,
    },
    newState: {
      previousAngles: { ...currentAngles },
      previousTimestamp: timestamp,
      angularVelocityHistory: newAngularVelocityHistory,
      qualityHistory: newQualityHistory,
      frameCount: state.frameCount + 1,
    },
  };
}

/**
 * Check if analysis performance is within budget (16ms)
 */
export function isWithinPerformanceBudget(startTime: number): boolean {
  return performance.now() - startTime < 16; // 16ms budget for 60fps
}

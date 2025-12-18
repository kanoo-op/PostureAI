/**
 * Depth Normalization Utility Module
 *
 * Implements depth-based perspective correction for 3D angle measurements
 * to ensure consistent feedback regardless of user distance from camera.
 *
 * BlazePose Z-coordinate characteristics:
 * - Z values are relative to hip midpoint (negative = closer to camera)
 * - Z accuracy varies significantly with distance and lighting
 * - Z values are more reliable for torso keypoints than extremities
 *
 * Perspective correction methodology:
 * - When user is closer to camera, angles appear more pronounced
 * - When user is farther, angles appear more flattened
 * - Baseline calibration (T-pose) establishes reference depth for correction
 *
 * Sensitivity weights rationale:
 * - Knee flexion is highly sensitive to camera perspective
 * - Hip flexion is also highly sensitive
 * - Torso inclination is moderately sensitive (more stable due to larger body segment)
 * - Ankle angle is moderately sensitive
 */

import { BLAZEPOSE_KEYPOINTS } from '@/types/pose';

// ============================================
// Type Definitions
// ============================================

/**
 * Angle types for sensitivity-weighted corrections
 * Each angle type has different sensitivity to camera perspective
 */
export type AngleType = 'kneeFlexion' | 'hipFlexion' | 'torsoInclination' | 'ankleAngle';

/**
 * Configuration for depth normalization behavior
 */
export interface DepthNormalizationConfig {
  /** Enable/disable depth normalization (default: true) */
  enabled: boolean;
  /** Reference depth for calibration (default: 0.5) */
  baselineDepth: number;
  /** Below this confidence, fall back to 2D calculations (default: 0.5) */
  minConfidenceThreshold: number;
  /** Cap perspective correction to prevent overcorrection (default: 1.2) */
  maxCorrectionFactor: number;
  /** Floor for correction to prevent undercorrection (default: 0.8) */
  minCorrectionFactor: number;
  /** EMA smoothing alpha for Z values (default: 0.3) */
  temporalSmoothingAlpha: number;
}

/**
 * Result of depth confidence calculation
 */
export interface DepthConfidenceResult {
  /** 0-1 confidence score */
  score: number;
  /** true if score >= minConfidenceThreshold */
  isReliable: boolean;
  /** Which calculation mode to use */
  fallbackMode: '3d' | '2d';
  /** Z-coordinate variance across keypoints */
  variance: number;
  /** Average BlazePose confidence score for key joints */
  averageKeypointScore: number;
}

/**
 * Result of perspective correction calculation
 */
export interface PerspectiveResult {
  /** Correction multiplier (0.8-1.2) */
  factor: number;
  /** Reference depth used for calculation */
  baselineDepth: number;
  /** Current average Z depth */
  averageDepth: number;
  /** Map of corrected angles per angle type */
  adjustedAngles: Map<AngleType, number>;
  /** Depth confidence information */
  depthConfidence: DepthConfidenceResult;
}

/**
 * Calibration state for T-pose detection
 */
export interface CalibrationState {
  /** Whether calibration has been performed */
  isCalibrated: boolean;
  /** Calibrated baseline depth value */
  baselineDepth: number;
  /** Timestamp of last calibration */
  calibrationTimestamp: number | null;
  /** Whether T-pose was detected during calibration */
  tPoseDetected: boolean;
}

/**
 * Keypoint interface for type safety
 */
export interface Keypoint {
  x: number;
  y: number;
  z?: number;
  score?: number;
}

// ============================================
// Constants
// ============================================

/**
 * Sensitivity weights per angle type
 * Higher values = more sensitive to camera perspective
 *
 * Rationale:
 * - Knee flexion (0.85): Highly sensitive due to depth plane alignment
 * - Hip flexion (0.80): Highly sensitive, similar to knee
 * - Ankle angle (0.70): Moderately sensitive
 * - Torso inclination (0.60): Less sensitive due to larger body segment
 */
export const ANGLE_SENSITIVITY_WEIGHTS: Record<AngleType, number> = {
  kneeFlexion: 0.85,
  hipFlexion: 0.80,
  torsoInclination: 0.60,
  ankleAngle: 0.70,
};

/**
 * Default configuration values
 */
export const DEFAULT_DEPTH_CONFIG: DepthNormalizationConfig = {
  enabled: true,
  baselineDepth: 0.5,
  minConfidenceThreshold: 0.5,
  maxCorrectionFactor: 1.2,
  minCorrectionFactor: 0.8,
  temporalSmoothingAlpha: 0.3,
};

/**
 * Key joints used for depth calculation
 * These are the most reliable joints for Z-coordinate estimation
 */
export const DEPTH_KEY_JOINTS = [
  BLAZEPOSE_KEYPOINTS.LEFT_HIP,
  BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
  BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
  BLAZEPOSE_KEYPOINTS.RIGHT_KNEE,
  BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
  BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
];

// T-pose detection thresholds
const TPOSE_ARM_HORIZONTAL_THRESHOLD = 20; // degrees from horizontal
const TPOSE_BODY_VERTICAL_THRESHOLD = 15; // degrees from vertical

// ============================================
// DepthSmoother Class
// ============================================

/**
 * Exponential Moving Average (EMA) smoother for Z values
 * Follows the same pattern as AngleSmoother
 */
export class DepthSmoother {
  private previousZ: number | null = null;
  private alpha: number;

  constructor(alpha: number = 0.3) {
    this.alpha = alpha;
  }

  /**
   * Apply EMA smoothing to a Z value
   * @param rawZ - Raw Z coordinate value
   * @returns Smoothed Z value
   */
  smooth(rawZ: number): number {
    if (this.previousZ === null) {
      this.previousZ = rawZ;
      return rawZ;
    }
    const smoothed = this.alpha * rawZ + (1 - this.alpha) * this.previousZ;
    this.previousZ = smoothed;
    return smoothed;
  }

  /**
   * Reset the smoother state
   */
  reset(): void {
    this.previousZ = null;
  }

  /**
   * Get current alpha value
   */
  getAlpha(): number {
    return this.alpha;
  }

  /**
   * Update alpha value
   */
  setAlpha(alpha: number): void {
    this.alpha = alpha;
  }
}

// ============================================
// Core Functions
// ============================================

/**
 * Calculate depth confidence based on keypoint data
 *
 * Confidence scoring algorithm:
 * - High variance in Z values indicates unreliable depth data
 * - Low keypoint confidence scores indicate poor detection
 * - Combined score determines whether to use 3D or fall back to 2D
 *
 * @param keypoints - BlazePose keypoint array
 * @param config - Depth normalization configuration
 * @returns DepthConfidenceResult with confidence score and reliability status
 */
export function calculateDepthConfidence(
  keypoints: Keypoint[],
  config: DepthNormalizationConfig = DEFAULT_DEPTH_CONFIG
): DepthConfidenceResult {
  // Extract Z values and scores from key joints
  const zValues: number[] = [];
  const keypointScores: number[] = [];

  for (const jointIndex of DEPTH_KEY_JOINTS) {
    const keypoint = keypoints[jointIndex];
    if (keypoint && typeof keypoint.z === 'number') {
      zValues.push(keypoint.z);
      keypointScores.push(keypoint.score ?? 0);
    }
  }

  // Handle case with insufficient data
  if (zValues.length < 3) {
    return {
      score: 0,
      isReliable: false,
      fallbackMode: '2d',
      variance: 1,
      averageKeypointScore: 0,
    };
  }

  // Calculate variance of Z values
  const meanZ = zValues.reduce((sum, z) => sum + z, 0) / zValues.length;
  const variance = zValues.reduce((sum, z) => sum + Math.pow(z - meanZ, 2), 0) / zValues.length;

  // Normalize variance (higher variance = lower confidence)
  // Typical good variance is < 0.01, bad is > 0.05
  const normalizedVariance = Math.min(1, variance / 0.05);

  // Calculate average keypoint confidence
  const averageKeypointScore = keypointScores.reduce((sum, s) => sum + s, 0) / keypointScores.length;

  // Combined confidence score
  // score = avgKeypointScore * (1 - normalizedVariance)
  const score = averageKeypointScore * (1 - normalizedVariance);

  const isReliable = score >= config.minConfidenceThreshold;

  return {
    score: Math.round(score * 100) / 100,
    isReliable,
    fallbackMode: isReliable ? '3d' : '2d',
    variance: Math.round(variance * 10000) / 10000,
    averageKeypointScore: Math.round(averageKeypointScore * 100) / 100,
  };
}

/**
 * Calculate perspective correction factor based on depth
 *
 * @param keypoints - BlazePose keypoint array
 * @param config - Depth normalization configuration
 * @returns PerspectiveResult with correction factor and adjusted angles
 */
export function calculatePerspectiveFactor(
  keypoints: Keypoint[],
  config: DepthNormalizationConfig = DEFAULT_DEPTH_CONFIG
): PerspectiveResult {
  // Calculate depth confidence first
  const depthConfidence = calculateDepthConfidence(keypoints, config);

  // If depth is unreliable, return neutral factor
  if (!depthConfidence.isReliable) {
    return {
      factor: 1.0,
      baselineDepth: config.baselineDepth,
      averageDepth: config.baselineDepth,
      adjustedAngles: new Map(),
      depthConfidence,
    };
  }

  // Calculate average Z depth of key joints
  const zValues: number[] = [];
  for (const jointIndex of DEPTH_KEY_JOINTS) {
    const keypoint = keypoints[jointIndex];
    if (keypoint && typeof keypoint.z === 'number') {
      zValues.push(keypoint.z);
    }
  }

  const averageDepth = zValues.length > 0
    ? zValues.reduce((sum, z) => sum + z, 0) / zValues.length
    : config.baselineDepth;

  // Calculate depth ratio
  // When user is closer (smaller Z), ratio < 1, so factor > 1
  // When user is farther (larger Z), ratio > 1, so factor < 1
  const depthRatio = averageDepth / config.baselineDepth;

  // Calculate raw factor (inverse relationship)
  // Closer = angles appear larger, so we reduce them
  // Farther = angles appear smaller, so we increase them
  const rawFactor = 1 / depthRatio;

  // Clamp between min and max correction factors
  const factor = Math.max(
    config.minCorrectionFactor,
    Math.min(config.maxCorrectionFactor, rawFactor)
  );

  return {
    factor: Math.round(factor * 1000) / 1000,
    baselineDepth: config.baselineDepth,
    averageDepth: Math.round(averageDepth * 1000) / 1000,
    adjustedAngles: new Map(),
    depthConfidence,
  };
}

/**
 * Apply perspective correction to a raw angle
 *
 * @param rawAngle - Original calculated angle in degrees
 * @param perspectiveFactor - Correction factor from calculatePerspectiveFactor
 * @param angleType - Type of angle for sensitivity weighting
 * @returns Corrected angle value
 */
export function applyPerspectiveCorrection(
  rawAngle: number,
  perspectiveFactor: number,
  angleType: AngleType
): number {
  // Get sensitivity weight for this angle type
  const weight = ANGLE_SENSITIVITY_WEIGHTS[angleType];

  // Calculate adjustment
  // adjustment = (factor - 1.0) * weight
  // When factor > 1, angle increases; when factor < 1, angle decreases
  const adjustment = (perspectiveFactor - 1.0) * weight;

  // Apply adjustment
  // correctedAngle = rawAngle * (1 + adjustment)
  const correctedAngle = rawAngle * (1 + adjustment);

  return Math.round(correctedAngle * 10) / 10;
}

/**
 * Detect T-pose for calibration
 *
 * T-pose requirements:
 * - Arms extended horizontally (shoulder-elbow-wrist alignment)
 * - Body upright (shoulder-hip-ankle vertical alignment)
 *
 * @param keypoints - BlazePose keypoint array
 * @returns boolean indicating if T-pose is detected
 */
export function detectTPose(keypoints: Keypoint[]): boolean {
  // Required keypoints for T-pose detection
  const leftShoulder = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER];
  const rightShoulder = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER];
  const leftElbow = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ELBOW];
  const rightElbow = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW];
  const leftWrist = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_WRIST];
  const rightWrist = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_WRIST];
  const leftHip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP];
  const rightHip = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP];
  const leftAnkle = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE];
  const rightAnkle = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE];

  // Validate all required keypoints exist and have sufficient confidence
  const requiredKeypoints = [
    leftShoulder, rightShoulder,
    leftElbow, rightElbow,
    leftWrist, rightWrist,
    leftHip, rightHip,
    leftAnkle, rightAnkle,
  ];

  for (const kp of requiredKeypoints) {
    if (!kp || (kp.score !== undefined && kp.score < 0.5)) {
      return false;
    }
  }

  // Check if arms are extended horizontally
  // Left arm: shoulder to wrist should be roughly horizontal
  const leftArmAngle = Math.abs(
    Math.atan2(leftWrist.y - leftShoulder.y, leftWrist.x - leftShoulder.x) * (180 / Math.PI)
  );
  const leftArmHorizontal = Math.abs(leftArmAngle) < TPOSE_ARM_HORIZONTAL_THRESHOLD ||
    Math.abs(leftArmAngle - 180) < TPOSE_ARM_HORIZONTAL_THRESHOLD;

  // Right arm: shoulder to wrist should be roughly horizontal
  const rightArmAngle = Math.abs(
    Math.atan2(rightWrist.y - rightShoulder.y, rightWrist.x - rightShoulder.x) * (180 / Math.PI)
  );
  const rightArmHorizontal = Math.abs(rightArmAngle) < TPOSE_ARM_HORIZONTAL_THRESHOLD ||
    Math.abs(rightArmAngle - 180) < TPOSE_ARM_HORIZONTAL_THRESHOLD;

  // Check if body is upright
  // Calculate midpoints
  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
  const hipMidX = (leftHip.x + rightHip.x) / 2;
  const hipMidY = (leftHip.y + rightHip.y) / 2;
  const ankleMidX = (leftAnkle.x + rightAnkle.x) / 2;
  const ankleMidY = (leftAnkle.y + rightAnkle.y) / 2;

  // Check vertical alignment (shoulder to ankle)
  const bodyAngle = Math.abs(
    Math.atan2(ankleMidX - shoulderMidX, ankleMidY - shoulderMidY) * (180 / Math.PI)
  );
  const bodyVertical = Math.abs(bodyAngle) < TPOSE_BODY_VERTICAL_THRESHOLD;

  return leftArmHorizontal && rightArmHorizontal && bodyVertical;
}

/**
 * Create initial calibration state
 */
export function createInitialCalibrationState(): CalibrationState {
  return {
    isCalibrated: false,
    baselineDepth: DEFAULT_DEPTH_CONFIG.baselineDepth,
    calibrationTimestamp: null,
    tPoseDetected: false,
  };
}

/**
 * Perform calibration with current keypoints
 *
 * @param keypoints - BlazePose keypoint array (ideally in T-pose)
 * @param currentState - Current calibration state
 * @returns Updated calibration state
 */
export function performCalibration(
  keypoints: Keypoint[],
  currentState: CalibrationState
): CalibrationState {
  // Check for T-pose
  const tPoseDetected = detectTPose(keypoints);

  // Calculate average depth of key joints
  const zValues: number[] = [];
  for (const jointIndex of DEPTH_KEY_JOINTS) {
    const keypoint = keypoints[jointIndex];
    if (keypoint && typeof keypoint.z === 'number') {
      zValues.push(keypoint.z);
    }
  }

  if (zValues.length < 3) {
    return {
      ...currentState,
      tPoseDetected,
    };
  }

  const baselineDepth = zValues.reduce((sum, z) => sum + z, 0) / zValues.length;

  return {
    isCalibrated: true,
    baselineDepth: Math.round(baselineDepth * 1000) / 1000,
    calibrationTimestamp: Date.now(),
    tPoseDetected,
  };
}

/**
 * Create depth normalization config with calibration data
 *
 * @param calibrationState - Calibration state with baseline depth
 * @param overrides - Optional config overrides
 * @returns DepthNormalizationConfig with calibrated baseline
 */
export function createConfigFromCalibration(
  calibrationState: CalibrationState,
  overrides: Partial<DepthNormalizationConfig> = {}
): DepthNormalizationConfig {
  return {
    ...DEFAULT_DEPTH_CONFIG,
    baselineDepth: calibrationState.isCalibrated
      ? calibrationState.baselineDepth
      : DEFAULT_DEPTH_CONFIG.baselineDepth,
    ...overrides,
  };
}

/**
 * 3D Pelvic Tilt Analysis Module
 * Analyzes anterior/posterior and lateral pelvic tilt for hip alignment assessment
 * Uses MediaPipe BlazePose landmarks for real-time analysis
 */

import {
  Point3D,
  calculateAngleWithVertical,
  calculateAngleWithHorizontal,
  keypointToPoint3D,
  isValidKeypoint,
  midpoint,
  distance3D,
} from './pose3DUtils'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'
import { CircularBuffer } from './circularBuffer'
import { AngleSmootherSet, SmoothingConfig } from './angleSmoother'
import {
  applyPerspectiveCorrection,
  DepthNormalizationConfig,
  DEFAULT_DEPTH_CONFIG,
  calculateDepthConfidence,
  calculatePerspectiveFactor,
} from './depthNormalization'

// ============================================
// Type Definitions
// ============================================

export type FeedbackLevel = 'good' | 'warning' | 'error'

export interface PelvicTiltResult {
  anteriorTiltAngle: number        // Degrees of anterior/posterior tilt (positive = anterior)
  lateralTiltAngle: number         // Degrees of lateral tilt (positive = right side higher)
  stabilityScore: number           // 0-100 stability score based on variance
  isValid: boolean                 // Whether calculation was successful
  tiltDirection: 'anterior' | 'posterior' | 'neutral'
  lateralDirection: 'left_high' | 'right_high' | 'neutral'
}

export interface PelvicTiltAnalyzerState {
  anteriorTiltHistory: CircularBuffer<number>
  lateralTiltHistory: CircularBuffer<number>
  smootherSet?: AngleSmootherSet<'anteriorTilt' | 'lateralTilt'>
  depthConfig?: DepthNormalizationConfig
  frameCount: number
}

export interface PelvicTiltFeedbackItem {
  level: FeedbackLevel
  message: string
  value: number
  idealRange: { min: number; max: number }
  acceptableRange: { min: number; max: number }
}

export interface Keypoint {
  x: number
  y: number
  z?: number
  score?: number
}

// ============================================
// Thresholds
// ============================================

export const PELVIC_TILT_THRESHOLDS = {
  anteriorTilt: {
    ideal: { min: 0, max: 10 },      // 0-10 degrees is ideal
    acceptable: { min: 0, max: 15 }, // 0-15 degrees is acceptable
  },
  lateralTilt: {
    ideal: { min: 0, max: 5 },       // 0-5 degrees is ideal
    acceptable: { min: 0, max: 8 },  // 0-8 degrees is acceptable
  },
  stability: {
    highThreshold: 85,    // >= 85 is high stability
    mediumThreshold: 60,  // >= 60 is medium stability
    // < 60 is low stability
  },
} as const

const STABILITY_BUFFER_SIZE = 30  // ~1 second of history at 30fps
const MIN_KEYPOINT_SCORE = 0.5

// ============================================
// Factory Function for Initial State
// ============================================

/**
 * Create initial pelvic tilt analyzer state
 * @param smoothingConfig - Optional smoothing configuration
 * @param depthConfig - Optional depth normalization configuration
 */
export function createInitialPelvicTiltState(
  smoothingConfig?: Partial<SmoothingConfig>,
  depthConfig?: Partial<DepthNormalizationConfig>
): PelvicTiltAnalyzerState {
  return {
    anteriorTiltHistory: new CircularBuffer<number>(STABILITY_BUFFER_SIZE),
    lateralTiltHistory: new CircularBuffer<number>(STABILITY_BUFFER_SIZE),
    smootherSet: smoothingConfig
      ? new AngleSmootherSet(['anteriorTilt', 'lateralTilt'], smoothingConfig)
      : undefined,
    depthConfig: depthConfig ? { ...DEFAULT_DEPTH_CONFIG, ...depthConfig } : undefined,
    frameCount: 0,
  }
}

// ============================================
// Main Analysis Function
// ============================================

/**
 * Analyze pelvic tilt from BlazePose keypoints
 *
 * @param keypoints - BlazePose 33 keypoint array
 * @param state - Optional analyzer state for stability tracking
 * @returns Analysis result with tilt angles and stability score
 */
export function analyzePelvicTilt(
  keypoints: Keypoint[],
  state?: PelvicTiltAnalyzerState
): { result: PelvicTiltResult; newState: PelvicTiltAnalyzerState } {
  // Extract required keypoints
  const leftHip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP]
  const rightHip = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP]
  const leftShoulder = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]
  const rightShoulder = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]

  // Initialize state if not provided
  const currentState = state ?? createInitialPelvicTiltState()

  // Validate keypoints
  const requiredKeypoints = [leftHip, rightHip, leftShoulder, rightShoulder]
  const allValid = requiredKeypoints.every(kp => isValidKeypoint(kp, MIN_KEYPOINT_SCORE))

  if (!allValid) {
    return {
      result: createInvalidResult(),
      newState: currentState,
    }
  }

  // Convert to Point3D
  const points = {
    leftHip: keypointToPoint3D(leftHip),
    rightHip: keypointToPoint3D(rightHip),
    leftShoulder: keypointToPoint3D(leftShoulder),
    rightShoulder: keypointToPoint3D(rightShoulder),
  }

  // Calculate hip center and shoulder center
  const hipCenter = midpoint(points.leftHip, points.rightHip)
  const shoulderCenter = midpoint(points.leftShoulder, points.rightShoulder)

  // Calculate anterior tilt angle
  // Uses the angle between hip center to estimated sacrum position and vertical
  // Estimated sacrum is slightly behind and below hip center
  const sacrumEstimate = estimateSacrumPosition(points.leftHip, points.rightHip, shoulderCenter)
  let anteriorTiltAngle = calculateAnteriorTilt(hipCenter, sacrumEstimate, shoulderCenter)

  // Calculate lateral tilt angle
  // Compares Y-positions of left and right hips relative to body orientation
  let lateralTiltAngle = calculateLateralTilt(points.leftHip, points.rightHip)

  // Apply smoothing if available
  if (currentState.smootherSet) {
    const smoothed = currentState.smootherSet.smoothAll({
      anteriorTilt: anteriorTiltAngle,
      lateralTilt: lateralTiltAngle,
    })
    anteriorTiltAngle = smoothed.anteriorTilt.smoothedValue
    lateralTiltAngle = smoothed.lateralTilt.smoothedValue
  }

  // Apply depth normalization if configured
  if (currentState.depthConfig?.enabled !== false) {
    const depthConfidence = calculateDepthConfidence(keypoints, currentState.depthConfig ?? DEFAULT_DEPTH_CONFIG)
    if (depthConfidence.isReliable) {
      const perspectiveResult = calculatePerspectiveFactor(keypoints, currentState.depthConfig ?? DEFAULT_DEPTH_CONFIG)
      anteriorTiltAngle = applyPerspectiveCorrection(anteriorTiltAngle, perspectiveResult.factor, 'hipFlexion')
    }
  }

  // Update history buffers for stability calculation
  currentState.anteriorTiltHistory.push(anteriorTiltAngle)
  currentState.lateralTiltHistory.push(lateralTiltAngle)
  currentState.frameCount++

  // Calculate stability score
  const stabilityScore = calculateStabilityScore(
    currentState.anteriorTiltHistory,
    currentState.lateralTiltHistory
  )

  // Determine tilt directions
  const tiltDirection = anteriorTiltAngle > 5 ? 'anterior' : anteriorTiltAngle < -5 ? 'posterior' : 'neutral'
  const lateralDirection = lateralTiltAngle > 3 ? 'right_high' : lateralTiltAngle < -3 ? 'left_high' : 'neutral'

  return {
    result: {
      anteriorTiltAngle: Math.round(anteriorTiltAngle * 10) / 10,
      lateralTiltAngle: Math.round(lateralTiltAngle * 10) / 10,
      stabilityScore: Math.round(stabilityScore),
      isValid: true,
      tiltDirection,
      lateralDirection,
    },
    newState: currentState,
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Estimate sacrum position from hip points and shoulder center
 * Sacrum is approximately behind and slightly below hip center
 */
function estimateSacrumPosition(
  leftHip: Point3D,
  rightHip: Point3D,
  shoulderCenter: Point3D
): Point3D {
  const hipCenter = midpoint(leftHip, rightHip)

  // Estimate sacrum as slightly behind hip center (negative Z direction)
  // and slightly below (positive Y direction in screen coordinates)
  const hipShoulderDistance = distance3D(hipCenter, shoulderCenter)
  const sacrumOffset = hipShoulderDistance * 0.1  // 10% of torso length

  return {
    x: hipCenter.x,
    y: hipCenter.y + sacrumOffset * 0.3,  // Slightly below
    z: hipCenter.z - sacrumOffset,         // Behind
  }
}

/**
 * Calculate anterior pelvic tilt angle
 * Positive = anterior tilt (pelvis tilted forward)
 * Negative = posterior tilt (pelvis tilted backward)
 */
function calculateAnteriorTilt(
  hipCenter: Point3D,
  sacrumEstimate: Point3D,
  _shoulderCenter: Point3D
): number {
  // Create a reference point for the ideal pelvis position
  // The angle between hip-sacrum line and vertical indicates tilt
  const pelvicAngle = calculateAngleWithVertical(sacrumEstimate, hipCenter)

  // Normalize to anterior/posterior range
  // Typical anterior tilt is 0-20 degrees, posterior is 0-10 degrees
  return pelvicAngle - 90  // Offset so 0 is neutral
}

/**
 * Calculate lateral pelvic tilt angle
 * Positive = right hip higher (left hip drop)
 * Negative = left hip higher (right hip drop)
 */
function calculateLateralTilt(leftHip: Point3D, rightHip: Point3D): number {
  // Calculate angle of hip line from horizontal
  const angle = calculateAngleWithHorizontal(leftHip, rightHip)
  return angle  // Positive means right side is higher
}

/**
 * Calculate stability score from history buffers
 * Higher stability = lower variance in tilt angles
 */
function calculateStabilityScore(
  anteriorHistory: CircularBuffer<number>,
  lateralHistory: CircularBuffer<number>
): number {
  if (anteriorHistory.size < 5) {
    return 100  // Not enough data, assume stable
  }

  // Calculate variance for both angles
  const anteriorValues = anteriorHistory.getLatest()
  const lateralValues = lateralHistory.getLatest()

  const anteriorVariance = calculateVariance(anteriorValues)
  const lateralVariance = calculateVariance(lateralValues)

  // Combined variance (weighted average)
  const combinedVariance = anteriorVariance * 0.6 + lateralVariance * 0.4

  // Convert variance to score (lower variance = higher score)
  // Max expected variance is ~100 (10 degree standard deviation squared)
  const normalizedVariance = Math.min(100, combinedVariance)
  const score = 100 - normalizedVariance

  return Math.max(0, Math.min(100, score))
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length
}

function createInvalidResult(): PelvicTiltResult {
  return {
    anteriorTiltAngle: 0,
    lateralTiltAngle: 0,
    stabilityScore: 0,
    isValid: false,
    tiltDirection: 'neutral',
    lateralDirection: 'neutral',
  }
}

// ============================================
// Feedback Generation Functions
// ============================================

/**
 * Create standardized feedback for pelvic tilt analysis
 * @param result - Pelvic tilt analysis result
 * @param exerciseType - Type of exercise for context-specific messages
 */
export function createPelvicTiltFeedback(
  result: PelvicTiltResult,
  exerciseType: 'squat' | 'lunge' | 'deadlift'
): {
  anteriorTilt: PelvicTiltFeedbackItem
  lateralTilt: PelvicTiltFeedbackItem
  stability: PelvicTiltFeedbackItem
} {
  // Anterior tilt feedback
  const anteriorFeedback = createAnteriorTiltFeedback(
    result.anteriorTiltAngle,
    result.tiltDirection,
    exerciseType
  )

  // Lateral tilt feedback
  const lateralFeedback = createLateralTiltFeedback(
    result.lateralTiltAngle,
    result.lateralDirection
  )

  // Stability feedback
  const stabilityFeedback = createStabilityFeedback(result.stabilityScore)

  return {
    anteriorTilt: anteriorFeedback,
    lateralTilt: lateralFeedback,
    stability: stabilityFeedback,
  }
}

function createAnteriorTiltFeedback(
  angle: number,
  direction: 'anterior' | 'posterior' | 'neutral',
  _exerciseType: 'squat' | 'lunge' | 'deadlift'
): PelvicTiltFeedbackItem {
  const absAngle = Math.abs(angle)
  const { ideal, acceptable } = PELVIC_TILT_THRESHOLDS.anteriorTilt

  let level: FeedbackLevel
  let message: string

  if (absAngle <= ideal.max) {
    level = 'good'
    message = '골반 위치가 좋습니다'  // Pelvis position is good
  } else if (absAngle <= acceptable.max) {
    level = 'warning'
    if (direction === 'anterior') {
      message = '골반이 약간 앞으로 기울어져 있습니다. 코어를 조이세요'  // Pelvis is slightly tilted forward. Tighten your core
    } else {
      message = '골반이 약간 뒤로 기울어져 있습니다. 허리를 자연스럽게 펴세요'  // Pelvis is slightly tilted backward
    }
  } else {
    level = 'error'
    if (direction === 'anterior') {
      message = '전방 골반 경사가 심합니다. 복부를 긴장시키고 엉덩이를 조여주세요'  // Excessive anterior pelvic tilt
    } else {
      message = '후방 골반 경사가 심합니다. 허리의 자연스러운 곡선을 유지하세요'  // Excessive posterior pelvic tilt
    }
  }

  return {
    level,
    message,
    value: absAngle,
    idealRange: ideal,
    acceptableRange: acceptable,
  }
}

function createLateralTiltFeedback(
  angle: number,
  direction: 'left_high' | 'right_high' | 'neutral'
): PelvicTiltFeedbackItem {
  const absAngle = Math.abs(angle)
  const { ideal, acceptable } = PELVIC_TILT_THRESHOLDS.lateralTilt

  let level: FeedbackLevel
  let message: string

  if (absAngle <= ideal.max) {
    level = 'good'
    message = '골반 좌우 균형이 좋습니다'  // Pelvis lateral balance is good
  } else if (absAngle <= acceptable.max) {
    level = 'warning'
    if (direction === 'right_high') {
      message = '오른쪽 골반이 약간 높습니다. 양쪽 균형을 맞추세요'  // Right hip is slightly higher
    } else {
      message = '왼쪽 골반이 약간 높습니다. 양쪽 균형을 맞추세요'  // Left hip is slightly higher
    }
  } else {
    level = 'error'
    if (direction === 'right_high') {
      message = '오른쪽 골반이 과도하게 높습니다. 좌우 체중 분배를 확인하세요'  // Right hip is excessively higher
    } else {
      message = '왼쪽 골반이 과도하게 높습니다. 좌우 체중 분배를 확인하세요'  // Left hip is excessively higher
    }
  }

  return {
    level,
    message,
    value: absAngle,
    idealRange: ideal,
    acceptableRange: acceptable,
  }
}

function createStabilityFeedback(score: number): PelvicTiltFeedbackItem {
  const { highThreshold, mediumThreshold } = PELVIC_TILT_THRESHOLDS.stability

  let level: FeedbackLevel
  let message: string

  if (score >= highThreshold) {
    level = 'good'
    message = '골반 안정성이 우수합니다'  // Pelvis stability is excellent
  } else if (score >= mediumThreshold) {
    level = 'warning'
    message = '골반 안정성을 유지하세요. 움직임 중 흔들림이 감지됩니다'  // Maintain pelvis stability
  } else {
    level = 'error'
    message = '골반이 불안정합니다. 코어를 긴장시키고 천천히 움직이세요'  // Pelvis is unstable
  }

  return {
    level,
    message,
    value: score,
    idealRange: { min: highThreshold, max: 100 },
    acceptableRange: { min: mediumThreshold, max: 100 },
  }
}

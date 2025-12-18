/**
 * Torso Rotation Analyzer Utility Module
 * 몸통 회전 분석을 위한 유틸리티 모듈
 *
 * 스쿼트, 데드리프트, 런지 분석기에서 사용되는 공통 몸통 회전 추적 기능 제공
 */

import {
  Point3D,
  keypointToPoint3D,
  isValidKeypoint,
  calculateTorsoRotation,
  angleBetweenSegments,
} from './pose3DUtils'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'
import type { FeedbackItem, FeedbackLevel, CorrectionDirection } from './squatAnalyzer'

// ============================================
// Type Definitions
// ============================================

export interface TorsoRotationResult {
  // Existing fields (preserve backward compatibility)
  rotationAngle: number           // Transverse plane rotation (existing)
  rotationDirection: 'left' | 'right' | 'none'  // Direction of rotation
  isValid: boolean                // Whether all required keypoints were detected

  // NEW: Frontal plane metrics
  frontalTiltAngle: number        // Shoulder tilt vs hip tilt in YZ plane (0 = aligned)
  frontalTiltDirection: 'left' | 'right' | 'none'  // Which shoulder is higher

  // NEW: Full 3D analysis
  full3DAngle: number             // 3D angle between shoulder and hip vectors

  // NEW: Compound score
  compoundScore: number           // Combined score 0-100 (100 = perfect alignment)
}

export interface Keypoint {
  x: number
  y: number
  z?: number
  score?: number
}

export type RotationExerciseType = 'squat' | 'deadlift' | 'lunge'

// ============================================
// Threshold Constants
// ============================================

export const ROTATION_THRESHOLDS = {
  ideal: { min: 0, max: 10 },      // Acceptable rotation (< 10 degrees)
  acceptable: { min: 0, max: 20 }, // Warning zone (10-20 degrees)
  // Above acceptable.max = error (> 20 degrees)
} as const

// Phase-aware threshold reduction for deadlift lift phase (20% stricter)
export const LIFT_PHASE_THRESHOLD_MULTIPLIER = 0.8

// Score weights for each exercise
export const ROTATION_SCORE_WEIGHTS = {
  squat: 0.06,    // 6% weight
  deadlift: 0.07, // 7% weight
  lunge: 0.05,    // 5% weight
} as const

// Frontal plane (coronal) thresholds - shoulder tilt relative to hip tilt
export const FRONTAL_THRESHOLDS = {
  ideal: { min: 0, max: 8 },       // Acceptable tilt (< 8 degrees)
  acceptable: { min: 0, max: 15 }, // Warning zone (8-15 degrees)
  // Above acceptable.max = error (> 15 degrees)
} as const

// Weights for combining transverse and frontal plane measurements
export const COMPOUND_SCORE_WEIGHTS = {
  transverse: 0.6,  // 60% weight for horizontal rotation
  frontal: 0.4,     // 40% weight for frontal tilt
} as const

// 3D angle thresholds (full shoulder-to-hip vector angle)
export const FULL_3D_THRESHOLDS = {
  ideal: { min: 0, max: 12 },      // Good 3D alignment
  acceptable: { min: 0, max: 22 }, // Warning zone
} as const

// ============================================
// Constants
// ============================================

const MIN_KEYPOINT_SCORE = 0.5

// ============================================
// Frontal Plane Analysis Functions
// ============================================

/**
 * Calculate frontal plane tilt (shoulder line tilt vs hip line tilt)
 * Measures the YZ plane projection to detect lateral tilt
 *
 * @param leftShoulder - Left shoulder Point3D
 * @param rightShoulder - Right shoulder Point3D
 * @param leftHip - Left hip Point3D
 * @param rightHip - Right hip Point3D
 * @returns { tiltAngle: number, tiltDirection: 'left' | 'right' | 'none' }
 */
export function calculateFrontalPlaneTilt(
  leftShoulder: Point3D,
  rightShoulder: Point3D,
  leftHip: Point3D,
  rightHip: Point3D
): { tiltAngle: number; tiltDirection: 'left' | 'right' | 'none' } {
  // Calculate Y-coordinate differences (vertical tilt)
  // In screen coordinates, lower Y = higher position
  const shoulderYDiff = leftShoulder.y - rightShoulder.y // Positive = left shoulder lower
  const hipYDiff = leftHip.y - rightHip.y // Positive = left hip lower

  // Calculate horizontal widths for angle calculation
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x)
  const hipWidth = Math.abs(leftHip.x - rightHip.x)

  // Edge case: very narrow width (user facing sideways)
  if (shoulderWidth < 10 || hipWidth < 10) {
    return { tiltAngle: 0, tiltDirection: 'none' }
  }

  // Calculate tilt angles using arctangent
  const shoulderTiltRad = Math.atan2(shoulderYDiff, shoulderWidth)
  const hipTiltRad = Math.atan2(hipYDiff, hipWidth)

  // Relative tilt: shoulder tilt minus hip tilt
  const relativeTiltRad = shoulderTiltRad - hipTiltRad
  const relativeTiltDeg = Math.abs(relativeTiltRad * (180 / Math.PI))

  // Determine direction: positive relativeTilt means left shoulder higher relative to hips
  let tiltDirection: 'left' | 'right' | 'none' = 'none'
  if (relativeTiltDeg > 3) {
    tiltDirection = relativeTiltRad < 0 ? 'left' : 'right'
  }

  return {
    tiltAngle: Math.round(relativeTiltDeg * 10) / 10,
    tiltDirection,
  }
}

// ============================================
// Compound Score Functions
// ============================================

/**
 * Helper: Calculate score for a single plane measurement
 */
function calculatePlaneScore(
  angle: number,
  idealMax: number,
  acceptableMax: number
): number {
  if (angle <= idealMax) {
    return 100
  }
  if (angle <= acceptableMax) {
    const ratio = (angle - idealMax) / (acceptableMax - idealMax)
    return Math.round(100 - ratio * 40) // 100 -> 60 in warning zone
  }
  // Beyond acceptable
  const overage = angle - acceptableMax
  return Math.max(0, Math.round(60 - overage * 3))
}

/**
 * Calculate compound rotation score combining transverse and frontal plane measurements
 *
 * @param transverseAngle - Rotation angle in transverse plane (degrees)
 * @param frontalTiltAngle - Tilt angle in frontal plane (degrees)
 * @returns Compound score 0-100 (100 = perfect alignment)
 */
export function calculateCompoundRotationScore(
  transverseAngle: number,
  frontalTiltAngle: number
): number {
  // Calculate individual scores (100 = perfect, 0 = worst)
  const transverseScore = calculatePlaneScore(
    transverseAngle,
    ROTATION_THRESHOLDS.ideal.max,
    ROTATION_THRESHOLDS.acceptable.max
  )

  const frontalScore = calculatePlaneScore(
    frontalTiltAngle,
    FRONTAL_THRESHOLDS.ideal.max,
    FRONTAL_THRESHOLDS.acceptable.max
  )

  // Weighted combination
  const compoundScore =
    transverseScore * COMPOUND_SCORE_WEIGHTS.transverse +
    frontalScore * COMPOUND_SCORE_WEIGHTS.frontal

  return Math.round(compoundScore)
}

// ============================================
// Core Analysis Functions
// ============================================

/**
 * Analyze torso rotation from keypoints
 *
 * @param keypoints - BlazePose keypoints array
 * @returns Torso rotation analysis result
 */
export function analyzeTorsoRotation(
  keypoints: Keypoint[]
): TorsoRotationResult {
  // Extract required keypoints
  const leftShoulder = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]
  const rightShoulder = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]
  const leftHip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP]
  const rightHip = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP]

  // Validate keypoints
  const allValid =
    isValidKeypoint(leftShoulder, MIN_KEYPOINT_SCORE) &&
    isValidKeypoint(rightShoulder, MIN_KEYPOINT_SCORE) &&
    isValidKeypoint(leftHip, MIN_KEYPOINT_SCORE) &&
    isValidKeypoint(rightHip, MIN_KEYPOINT_SCORE)

  if (!allValid) {
    return createInvalidRotationResult()
  }

  // Convert to Point3D
  const leftShoulderPt = keypointToPoint3D(leftShoulder)
  const rightShoulderPt = keypointToPoint3D(rightShoulder)
  const leftHipPt = keypointToPoint3D(leftHip)
  const rightHipPt = keypointToPoint3D(rightHip)

  // Calculate rotation angle
  const rotationAngle = calculateTorsoRotation(
    leftShoulderPt,
    rightShoulderPt,
    leftHipPt,
    rightHipPt
  )

  // Determine rotation direction based on Z-depth comparison
  // If left shoulder is more forward (smaller Z) than right, shoulders rotated left
  const leftShoulderZ = leftShoulder.z ?? 0
  const rightShoulderZ = rightShoulder.z ?? 0
  const leftHipZ = leftHip.z ?? 0
  const rightHipZ = rightHip.z ?? 0

  const shoulderZDiff = leftShoulderZ - rightShoulderZ
  const hipZDiff = leftHipZ - rightHipZ
  const relativeRotation = shoulderZDiff - hipZDiff

  let rotationDirection: 'left' | 'right' | 'none' = 'none'
  if (rotationAngle > 5) {
    rotationDirection = relativeRotation < 0 ? 'left' : 'right'
  }

  // NEW: Calculate frontal plane tilt
  const { tiltAngle: frontalTiltAngle, tiltDirection: frontalTiltDirection } =
    calculateFrontalPlaneTilt(leftShoulderPt, rightShoulderPt, leftHipPt, rightHipPt)

  // NEW: Calculate full 3D angle between shoulder and hip vectors
  const full3DAngle = angleBetweenSegments(
    leftShoulderPt,
    rightShoulderPt,
    leftHipPt,
    rightHipPt
  )

  // NEW: Calculate compound score
  const compoundScore = calculateCompoundRotationScore(rotationAngle, frontalTiltAngle)

  return {
    rotationAngle,
    rotationDirection,
    isValid: true,
    // NEW fields
    frontalTiltAngle,
    frontalTiltDirection,
    full3DAngle: Math.round(full3DAngle * 10) / 10,
    compoundScore,
  }
}

/**
 * Create an invalid rotation result for graceful degradation
 */
function createInvalidRotationResult(): TorsoRotationResult {
  return {
    rotationAngle: 0,
    rotationDirection: 'none',
    isValid: false,
    // NEW fields with safe defaults
    frontalTiltAngle: 0,
    frontalTiltDirection: 'none',
    full3DAngle: 0,
    compoundScore: 100, // Default to perfect when invalid (graceful degradation)
  }
}

// ============================================
// Feedback Generation Functions
// ============================================

/**
 * Create feedback item for torso rotation
 *
 * @param result - Torso rotation analysis result
 * @param exerciseType - Type of exercise
 * @param isLiftPhase - For deadlift, whether currently in lift phase (stricter thresholds)
 * @param frontLeg - For lunge, which leg is forward (adjusts baseline expectation)
 * @returns Feedback item or null if invalid
 */
export function createTorsoRotationFeedback(
  result: TorsoRotationResult,
  exerciseType: RotationExerciseType,
  isLiftPhase: boolean = false,
  frontLeg?: 'left' | 'right' | 'unknown'
): FeedbackItem | null {
  if (!result.isValid) {
    return null // Graceful degradation
  }

  const {
    rotationAngle,
    rotationDirection,
    frontalTiltAngle,
    frontalTiltDirection,
    compoundScore,
  } = result

  // Apply stricter thresholds for deadlift lift phase
  let idealMax = ROTATION_THRESHOLDS.ideal.max
  let acceptableMax = ROTATION_THRESHOLDS.acceptable.max
  if (exerciseType === 'deadlift' && isLiftPhase) {
    idealMax = ROTATION_THRESHOLDS.ideal.max * LIFT_PHASE_THRESHOLD_MULTIPLIER
    acceptableMax = ROTATION_THRESHOLDS.acceptable.max * LIFT_PHASE_THRESHOLD_MULTIPLIER
  }

  // For lunge, we expect some natural rotation based on front leg position
  // Adjust effective rotation based on expected baseline
  let effectiveRotation = rotationAngle
  if (exerciseType === 'lunge' && frontLeg && frontLeg !== 'unknown') {
    // Slight rotation toward front leg is natural, reduce by 3 degrees
    const expectedDirection = frontLeg === 'left' ? 'left' : 'right'
    if (rotationDirection === expectedDirection && rotationAngle > 3) {
      effectiveRotation = Math.max(0, rotationAngle - 3)
    }
  }

  // Determine primary issue: transverse rotation or frontal tilt
  const transverseIssue = effectiveRotation > idealMax
  const frontalIssue = frontalTiltAngle > FRONTAL_THRESHOLDS.ideal.max

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection = 'none'
  let reportedValue = effectiveRotation

  // Priority: Check for severe issues first, then moderate
  if (effectiveRotation > acceptableMax || frontalTiltAngle > FRONTAL_THRESHOLDS.acceptable.max) {
    level = 'error'

    if (effectiveRotation > acceptableMax && frontalTiltAngle > FRONTAL_THRESHOLDS.acceptable.max) {
      // Both planes have issues
      message = `몸통이 회전하고 기울어졌습니다. 어깨와 골반을 정렬하세요 / Torso is both rotated and tilted. Align shoulders with hips`
      reportedValue = compoundScore // Use compound score when both issues
    } else if (frontalTiltAngle > FRONTAL_THRESHOLDS.acceptable.max) {
      // Frontal tilt is the main issue
      const dirKo = frontalTiltDirection === 'left' ? '왼쪽' : '오른쪽'
      const dirEn = frontalTiltDirection === 'left' ? 'left' : 'right'
      const correctKo = frontalTiltDirection === 'left' ? '오른쪽' : '왼쪽'
      const correctEn = frontalTiltDirection === 'left' ? 'right' : 'left'
      message = `${dirKo} 어깨가 너무 높습니다. ${correctKo} 어깨를 올리세요 / ${dirEn} shoulder is too high. Raise ${correctEn} shoulder`
      reportedValue = frontalTiltAngle
    } else {
      // Transverse rotation is the main issue (existing)
      const dirKo = rotationDirection === 'left' ? '왼쪽으로' : '오른쪽으로'
      const dirEn = rotationDirection === 'left' ? 'left' : 'right'
      const correctKo = rotationDirection === 'left' ? '오른쪽' : '왼쪽'
      const correctEn = rotationDirection === 'left' ? 'right' : 'left'
      message = `몸통이 ${dirKo} 과도하게 회전했습니다. ${correctKo} 어깨를 앞으로 가져오세요 / Excessive torso rotation to the ${dirEn}. Bring ${correctEn} shoulder forward`
    }
  } else if (transverseIssue || frontalIssue) {
    level = 'warning'

    if (transverseIssue && frontalIssue) {
      message = `몸통 정렬이 약간 틀어졌습니다. 어깨와 골반을 정렬하세요 / Slight torso misalignment. Align shoulders with hips`
      reportedValue = compoundScore
    } else if (frontalIssue) {
      const dirKo = frontalTiltDirection === 'left' ? '왼쪽' : '오른쪽'
      const dirEn = frontalTiltDirection === 'left' ? 'left' : 'right'
      message = `${dirKo} 어깨가 약간 높습니다. 어깨 높이를 맞추세요 / ${dirEn} shoulder is slightly high. Level your shoulders`
      reportedValue = frontalTiltAngle
    } else {
      const dirKo = rotationDirection === 'left' ? '왼쪽으로' : '오른쪽으로'
      const dirEn = rotationDirection === 'left' ? 'left' : 'right'
      message = `몸통이 ${dirKo} 약간 회전했습니다. 어깨와 골반을 정렬하세요 / Slight torso rotation to the ${dirEn}. Align shoulders with hips`
    }
  } else {
    level = 'good'
    message = '몸통 정렬이 좋습니다 / Good torso alignment'
  }

  return {
    level,
    message,
    correction,
    value: Math.round(reportedValue * 10) / 10,
    idealRange: { min: 0, max: idealMax },
    acceptableRange: { min: 0, max: acceptableMax },
  }
}

/**
 * Calculate score contribution for torso rotation
 * Updated to optionally use compound score for comprehensive evaluation
 *
 * @param feedback - Rotation feedback item
 * @param result - Optional full TorsoRotationResult for compound scoring
 * @returns Score 0-100
 */
export function calculateRotationScore(
  feedback: FeedbackItem | null,
  result?: TorsoRotationResult
): number {
  if (!feedback) {
    return 100 // If not analyzed, don't penalize
  }

  // If full result provided, use compound score directly
  if (result?.isValid && result.compoundScore !== undefined) {
    return result.compoundScore
  }

  // Fallback to existing calculation for backward compatibility
  const { value, idealRange, acceptableRange } = feedback

  if (value <= idealRange.max) {
    return 100
  }
  if (value <= acceptableRange.max) {
    const distance = value - idealRange.max
    const maxDistance = acceptableRange.max - idealRange.max
    const ratio = distance / maxDistance
    return Math.round(90 - ratio * 30)
  }
  // Beyond acceptable range
  const distance = value - acceptableRange.max
  const score = Math.max(0, 60 - distance * 3)
  return Math.round(score)
}

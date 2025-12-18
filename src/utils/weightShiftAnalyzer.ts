/**
 * Weight Shift Analysis Utility Module
 * Calculates center of mass and detects lateral/anterior-posterior weight shifts
 * for squats, lunges, and deadlifts
 */

import {
  Point3D,
  keypointToPoint3D,
  isValidKeypoint,
  midpoint,
  distance2D,
} from './pose3DUtils'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'
import { AngleSmootherSet, SmoothingConfig } from './angleSmoother'

// ============================================
// Type Definitions
// ============================================

export type FeedbackLevel = 'good' | 'warning' | 'error'
export type CorrectionDirection = 'left' | 'right' | 'forward' | 'backward' | 'none'
export type ExerciseType = 'squat' | 'lunge' | 'deadlift'

export interface FeedbackItem {
  level: FeedbackLevel
  message: string
  correction: CorrectionDirection
  value: number
  idealRange: { min: number; max: number }
  acceptableRange: { min: number; max: number }
}

export interface LateralShift {
  /** Percentage distribution to the left (0-100) */
  leftPercent: number
  /** Percentage distribution to the right (0-100) */
  rightPercent: number
  /** Deviation from center in normalized units (-1 to 1, negative = left) */
  deviation: number
  /** Status: 'left', 'right', or 'center' */
  status: 'left' | 'right' | 'center'
}

export interface AnteriorPosteriorShift {
  /** Percentage distribution forward (0-100) */
  forwardPercent: number
  /** Percentage distribution backward (0-100) */
  backwardPercent: number
  /** Deviation from base of support center (-1 to 1, negative = backward) */
  deviation: number
  /** Status: 'forward', 'backward', or 'centered' */
  status: 'forward' | 'backward' | 'centered'
}

export interface CenterOfMass {
  /** Approximated center of mass position */
  position: Point3D
  /** Confidence score based on keypoint validity (0-1) */
  confidence: number
}

export interface BaseOfSupport {
  /** Midpoint between feet */
  center: Point3D
  /** Left foot position (ankle or heel) */
  left: Point3D
  /** Right foot position (ankle or heel) */
  right: Point3D
  /** Front boundary (foot indices) */
  frontBoundary: number
  /** Back boundary (heels) */
  backBoundary: number
  /** Width of the base */
  width: number
  /** Depth of the base (anterior-posterior) */
  depth: number
}

export interface WeightShiftResult {
  /** Overall balance score (0-100) */
  score: number
  /** Center of mass approximation */
  centerOfMass: CenterOfMass
  /** Base of support boundaries */
  baseOfSupport: BaseOfSupport
  /** Lateral weight shift analysis */
  lateralShift: LateralShift
  /** Anterior-posterior shift analysis */
  anteriorPosteriorShift: AnteriorPosteriorShift
  /** Feedback items */
  feedbacks: {
    lateral: FeedbackItem
    anteriorPosterior: FeedbackItem
  }
  /** Whether analysis is valid (sufficient keypoints detected) */
  isValid: boolean
}

export interface WeightShiftAnalyzerState {
  /** Previous lateral deviation for smoothing */
  previousLateralDeviation: number | null
  /** Previous AP deviation for smoothing */
  previousAPDeviation: number | null
  /** Optional angle smoother set */
  smootherSet?: AngleSmootherSet<'lateralDeviation' | 'apDeviation'>
}

export interface Keypoint {
  x: number
  y: number
  z?: number
  score?: number
}

// ============================================
// Constants and Thresholds
// ============================================

// Biomechanical weights for body segment contribution to center of mass
// Based on anthropometric data (Winter, 2009)
const BODY_SEGMENT_WEIGHTS = {
  shoulders: 0.30, // Head + arms + upper torso
  hips: 0.50, // Lower torso + pelvis (heaviest segment)
  ankles: 0.20, // Legs (support points)
} as const

const EXERCISE_THRESHOLDS: Record<
  ExerciseType,
  {
    lateral: { ideal: { min: number; max: number }; acceptable: { min: number; max: number } }
    anteriorPosterior: { ideal: { min: number; max: number }; acceptable: { min: number; max: number } }
  }
> = {
  squat: {
    lateral: {
      ideal: { min: 45, max: 55 }, // 45-55% balanced
      acceptable: { min: 40, max: 60 }, // Up to 60/40 distribution
    },
    anteriorPosterior: {
      ideal: { min: 45, max: 55 },
      acceptable: { min: 35, max: 65 },
    },
  },
  lunge: {
    lateral: {
      ideal: { min: 40, max: 60 }, // Lunges allow more lateral variance
      acceptable: { min: 30, max: 70 },
    },
    anteriorPosterior: {
      ideal: { min: 50, max: 70 }, // Front leg bears more weight
      acceptable: { min: 40, max: 80 },
    },
  },
  deadlift: {
    lateral: {
      ideal: { min: 45, max: 55 },
      acceptable: { min: 38, max: 62 },
    },
    anteriorPosterior: {
      ideal: { min: 40, max: 60 }, // Slight forward lean expected
      acceptable: { min: 30, max: 70 },
    },
  },
} as const

const MIN_KEYPOINT_SCORE = 0.5

// ============================================
// Core Calculation Functions
// ============================================

/**
 * Calculate weighted centroid (center of mass approximation)
 * Uses biomechanical weights for shoulders, hips, and ankles
 */
function calculateWeightedCentroid(
  shoulderCenter: Point3D,
  hipCenter: Point3D,
  ankleCenter: Point3D
): Point3D {
  const { shoulders, hips, ankles } = BODY_SEGMENT_WEIGHTS

  return {
    x: shoulderCenter.x * shoulders + hipCenter.x * hips + ankleCenter.x * ankles,
    y: shoulderCenter.y * shoulders + hipCenter.y * hips + ankleCenter.y * ankles,
    z: shoulderCenter.z * shoulders + hipCenter.z * hips + ankleCenter.z * ankles,
  }
}

/**
 * Calculate base of support boundaries from foot positions
 */
function calculateBaseOfSupport(
  leftAnkle: Point3D,
  rightAnkle: Point3D,
  leftHeel: Point3D,
  rightHeel: Point3D,
  leftFootIndex: Point3D,
  rightFootIndex: Point3D
): BaseOfSupport {
  const center = midpoint(leftAnkle, rightAnkle)
  const width = distance2D(leftAnkle, rightAnkle)

  // Front boundary: average Y of foot indices (lower Y = more forward in screen coords)
  const frontBoundary = (leftFootIndex.y + rightFootIndex.y) / 2
  // Back boundary: average Y of heels (higher Y = more backward in screen coords)
  const backBoundary = (leftHeel.y + rightHeel.y) / 2
  const depth = Math.abs(backBoundary - frontBoundary)

  return {
    center,
    left: leftAnkle,
    right: rightAnkle,
    frontBoundary,
    backBoundary,
    width,
    depth,
  }
}

/**
 * Calculate lateral weight shift based on center of mass position
 * relative to base of support midline
 */
function calculateLateralShift(centerOfMass: Point3D, baseOfSupport: BaseOfSupport): LateralShift {
  const { center, width } = baseOfSupport

  if (width === 0) {
    return { leftPercent: 50, rightPercent: 50, deviation: 0, status: 'center' }
  }

  // Calculate deviation from center (-1 to 1 scale)
  // Negative = left, Positive = right
  const rawDeviation = (centerOfMass.x - center.x) / (width / 2)
  const deviation = Math.max(-1, Math.min(1, rawDeviation))

  // Convert to percentages
  // deviation of 0 = 50/50, deviation of 1 = 0/100 (all right)
  const rightPercent = 50 + deviation * 50
  const leftPercent = 100 - rightPercent

  // Determine status
  let status: 'left' | 'right' | 'center'
  if (deviation < -0.1) {
    status = 'left'
  } else if (deviation > 0.1) {
    status = 'right'
  } else {
    status = 'center'
  }

  return {
    leftPercent: Math.round(leftPercent * 10) / 10,
    rightPercent: Math.round(rightPercent * 10) / 10,
    deviation: Math.round(deviation * 100) / 100,
    status,
  }
}

/**
 * Calculate anterior-posterior weight shift
 * Uses center of mass position relative to heel-toe boundaries
 */
function calculateAnteriorPosteriorShift(
  centerOfMass: Point3D,
  baseOfSupport: BaseOfSupport
): AnteriorPosteriorShift {
  const { frontBoundary, backBoundary, depth } = baseOfSupport

  if (depth === 0) {
    return { forwardPercent: 50, backwardPercent: 50, deviation: 0, status: 'centered' }
  }

  // In screen coordinates: lower Y = forward, higher Y = backward
  // Calculate how far forward/backward the CoM is from center
  const centerY = (frontBoundary + backBoundary) / 2

  // Positive deviation = forward (CoM Y is less than center Y)
  const rawDeviation = (centerY - centerOfMass.y) / (depth / 2)
  const deviation = Math.max(-1, Math.min(1, rawDeviation))

  // Convert to percentages
  const forwardPercent = 50 + deviation * 50
  const backwardPercent = 100 - forwardPercent

  // Determine status
  let status: 'forward' | 'backward' | 'centered'
  if (deviation > 0.1) {
    status = 'forward'
  } else if (deviation < -0.1) {
    status = 'backward'
  } else {
    status = 'centered'
  }

  return {
    forwardPercent: Math.round(forwardPercent * 10) / 10,
    backwardPercent: Math.round(backwardPercent * 10) / 10,
    deviation: Math.round(deviation * 100) / 100,
    status,
  }
}

// ============================================
// Feedback Generation Functions
// ============================================

/**
 * Generate feedback for lateral weight shift
 */
function analyzeLateralShiftFeedback(
  lateralShift: LateralShift,
  exerciseType: ExerciseType
): FeedbackItem {
  const thresholds = EXERCISE_THRESHOLDS[exerciseType].lateral
  const { leftPercent, rightPercent, status } = lateralShift

  // Use the higher percentage as the value to check
  const dominantPercent = Math.max(leftPercent, rightPercent)

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (dominantPercent >= thresholds.ideal.min && dominantPercent <= thresholds.ideal.max) {
    level = 'good'
    message = '좌우 균형이 좋습니다 / Good lateral balance'
    correction = 'none'
  } else if (
    dominantPercent >= thresholds.acceptable.min &&
    dominantPercent <= thresholds.acceptable.max
  ) {
    level = 'warning'
    if (status === 'left') {
      message = `왼쪽으로 치우쳐 있습니다 (${leftPercent.toFixed(0)}%) / Leaning left`
      correction = 'right'
    } else {
      message = `오른쪽으로 치우쳐 있습니다 (${rightPercent.toFixed(0)}%) / Leaning right`
      correction = 'left'
    }
  } else {
    level = 'error'
    if (status === 'left') {
      message = `왼쪽으로 과도하게 치우쳐 있습니다 (${leftPercent.toFixed(0)}%) / Excessive left lean`
      correction = 'right'
    } else {
      message = `오른쪽으로 과도하게 치우쳐 있습니다 (${rightPercent.toFixed(0)}%) / Excessive right lean`
      correction = 'left'
    }
  }

  return {
    level,
    message,
    correction,
    value: Math.round(dominantPercent * 10) / 10,
    idealRange: thresholds.ideal,
    acceptableRange: thresholds.acceptable,
  }
}

/**
 * Generate feedback for anterior-posterior weight shift
 */
function analyzeAnteriorPosteriorFeedback(
  apShift: AnteriorPosteriorShift,
  exerciseType: ExerciseType
): FeedbackItem {
  const thresholds = EXERCISE_THRESHOLDS[exerciseType].anteriorPosterior
  const { forwardPercent, backwardPercent, status } = apShift

  const dominantPercent = Math.max(forwardPercent, backwardPercent)

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (dominantPercent >= thresholds.ideal.min && dominantPercent <= thresholds.ideal.max) {
    level = 'good'
    message = '전후 균형이 좋습니다 / Good anterior-posterior balance'
    correction = 'none'
  } else if (
    dominantPercent >= thresholds.acceptable.min &&
    dominantPercent <= thresholds.acceptable.max
  ) {
    level = 'warning'
    if (status === 'forward') {
      message = `앞쪽으로 치우쳐 있습니다 (${forwardPercent.toFixed(0)}%) / Leaning forward`
      correction = 'backward'
    } else {
      message = `뒤쪽으로 치우쳐 있습니다 (${backwardPercent.toFixed(0)}%) / Leaning backward`
      correction = 'forward'
    }
  } else {
    level = 'error'
    if (status === 'forward') {
      message = `앞쪽으로 과도하게 치우쳐 있습니다 (${forwardPercent.toFixed(0)}%) / Excessive forward lean`
      correction = 'backward'
    } else {
      message = `뒤쪽으로 과도하게 치우쳐 있습니다 (${backwardPercent.toFixed(0)}%) / Excessive backward lean`
      correction = 'forward'
    }
  }

  return {
    level,
    message,
    correction,
    value: Math.round(dominantPercent * 10) / 10,
    idealRange: thresholds.ideal,
    acceptableRange: thresholds.acceptable,
  }
}

// ============================================
// Helper Functions
// ============================================

function calculateConfidence(keypoints: (Keypoint | undefined)[]): number {
  const validScores = keypoints
    .filter((kp) => kp && kp.score !== undefined)
    .map((kp) => kp!.score!)

  if (validScores.length === 0) return 0

  return validScores.reduce((sum, score) => sum + score, 0) / validScores.length
}

function calculateItemScore(feedback: FeedbackItem): number {
  const { value, idealRange, acceptableRange } = feedback

  if (value >= idealRange.min && value <= idealRange.max) {
    return 100
  }

  if (value >= acceptableRange.min && value <= acceptableRange.max) {
    if (value < idealRange.min) {
      const distance = idealRange.min - value
      const maxDistance = idealRange.min - acceptableRange.min
      const ratio = maxDistance > 0 ? distance / maxDistance : 0
      return Math.round(90 - ratio * 30)
    } else {
      const distance = value - idealRange.max
      const maxDistance = acceptableRange.max - idealRange.max
      const ratio = maxDistance > 0 ? distance / maxDistance : 0
      return Math.round(90 - ratio * 30)
    }
  }

  if (value < acceptableRange.min) {
    const distance = acceptableRange.min - value
    return Math.round(Math.max(0, 60 - distance * 2))
  } else {
    const distance = value - acceptableRange.max
    return Math.round(Math.max(0, 60 - distance * 2))
  }
}

function calculateOverallScore(lateralFeedback: FeedbackItem, apFeedback: FeedbackItem): number {
  const lateralScore = calculateItemScore(lateralFeedback)
  const apScore = calculateItemScore(apFeedback)

  // Weight: 50% lateral, 50% anterior-posterior
  return Math.round(lateralScore * 0.5 + apScore * 0.5)
}

function createInvalidResult(): WeightShiftResult {
  const invalidFeedback: FeedbackItem = {
    level: 'warning',
    message: '자세를 인식할 수 없습니다 / Unable to detect pose',
    correction: 'none',
    value: 0,
    idealRange: { min: 0, max: 0 },
    acceptableRange: { min: 0, max: 0 },
  }

  return {
    score: 0,
    centerOfMass: {
      position: { x: 0, y: 0, z: 0 },
      confidence: 0,
    },
    baseOfSupport: {
      center: { x: 0, y: 0, z: 0 },
      left: { x: 0, y: 0, z: 0 },
      right: { x: 0, y: 0, z: 0 },
      frontBoundary: 0,
      backBoundary: 0,
      width: 0,
      depth: 0,
    },
    lateralShift: {
      leftPercent: 50,
      rightPercent: 50,
      deviation: 0,
      status: 'center',
    },
    anteriorPosteriorShift: {
      forwardPercent: 50,
      backwardPercent: 50,
      deviation: 0,
      status: 'centered',
    },
    feedbacks: {
      lateral: invalidFeedback,
      anteriorPosterior: invalidFeedback,
    },
    isValid: false,
  }
}

function updateLateralShiftFromSmoothed(
  original: LateralShift,
  smoothedDeviation: number
): LateralShift {
  const deviation = Math.max(-1, Math.min(1, smoothedDeviation))
  const rightPercent = 50 + deviation * 50
  const leftPercent = 100 - rightPercent

  let status: 'left' | 'right' | 'center'
  if (deviation < -0.1) status = 'left'
  else if (deviation > 0.1) status = 'right'
  else status = 'center'

  return {
    leftPercent: Math.round(leftPercent * 10) / 10,
    rightPercent: Math.round(rightPercent * 10) / 10,
    deviation: Math.round(deviation * 100) / 100,
    status,
  }
}

function updateAPShiftFromSmoothed(
  original: AnteriorPosteriorShift,
  smoothedDeviation: number
): AnteriorPosteriorShift {
  const deviation = Math.max(-1, Math.min(1, smoothedDeviation))
  const forwardPercent = 50 + deviation * 50
  const backwardPercent = 100 - forwardPercent

  let status: 'forward' | 'backward' | 'centered'
  if (deviation > 0.1) status = 'forward'
  else if (deviation < -0.1) status = 'backward'
  else status = 'centered'

  return {
    forwardPercent: Math.round(forwardPercent * 10) / 10,
    backwardPercent: Math.round(backwardPercent * 10) / 10,
    deviation: Math.round(deviation * 100) / 100,
    status,
  }
}

// ============================================
// Main Analysis Function
// ============================================

/**
 * Analyze weight shift from pose keypoints
 *
 * @param keypoints - MediaPipe BlazePose 33 keypoint array
 * @param exerciseType - Type of exercise being performed
 * @param state - Previous analyzer state for smoothing
 * @returns Weight shift analysis result and updated state
 */
export function analyzeWeightShift(
  keypoints: Keypoint[],
  exerciseType: ExerciseType,
  state: WeightShiftAnalyzerState
): { result: WeightShiftResult; newState: WeightShiftAnalyzerState } {
  // Extract required keypoints
  const leftShoulder = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]
  const rightShoulder = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]
  const leftHip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP]
  const rightHip = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP]
  const leftAnkle = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]
  const rightAnkle = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]
  const leftHeel = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HEEL]
  const rightHeel = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HEEL]
  const leftFootIndex = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_FOOT_INDEX]
  const rightFootIndex = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_FOOT_INDEX]

  // Validate required keypoints
  const requiredKeypoints = [
    leftShoulder,
    rightShoulder,
    leftHip,
    rightHip,
    leftAnkle,
    rightAnkle,
    leftHeel,
    rightHeel,
    leftFootIndex,
    rightFootIndex,
  ]

  const allValid = requiredKeypoints.every((kp) => isValidKeypoint(kp, MIN_KEYPOINT_SCORE))

  if (!allValid) {
    return {
      result: createInvalidResult(),
      newState: state,
    }
  }

  // Convert to Point3D
  const points = {
    leftShoulder: keypointToPoint3D(leftShoulder),
    rightShoulder: keypointToPoint3D(rightShoulder),
    leftHip: keypointToPoint3D(leftHip),
    rightHip: keypointToPoint3D(rightHip),
    leftAnkle: keypointToPoint3D(leftAnkle),
    rightAnkle: keypointToPoint3D(rightAnkle),
    leftHeel: keypointToPoint3D(leftHeel),
    rightHeel: keypointToPoint3D(rightHeel),
    leftFootIndex: keypointToPoint3D(leftFootIndex),
    rightFootIndex: keypointToPoint3D(rightFootIndex),
  }

  // Calculate body segment centers
  const shoulderCenter = midpoint(points.leftShoulder, points.rightShoulder)
  const hipCenter = midpoint(points.leftHip, points.rightHip)
  const ankleCenter = midpoint(points.leftAnkle, points.rightAnkle)

  // Calculate center of mass
  const comPosition = calculateWeightedCentroid(shoulderCenter, hipCenter, ankleCenter)
  const centerOfMass: CenterOfMass = {
    position: comPosition,
    confidence: calculateConfidence(requiredKeypoints),
  }

  // Calculate base of support
  const baseOfSupport = calculateBaseOfSupport(
    points.leftAnkle,
    points.rightAnkle,
    points.leftHeel,
    points.rightHeel,
    points.leftFootIndex,
    points.rightFootIndex
  )

  // Calculate weight shifts
  let lateralShift = calculateLateralShift(comPosition, baseOfSupport)
  let anteriorPosteriorShift = calculateAnteriorPosteriorShift(comPosition, baseOfSupport)

  // Apply smoothing if available
  if (state.smootherSet) {
    const smoothed = state.smootherSet.smoothAll({
      lateralDeviation: lateralShift.deviation,
      apDeviation: anteriorPosteriorShift.deviation,
    })

    // Update shifts with smoothed values
    lateralShift = updateLateralShiftFromSmoothed(
      lateralShift,
      smoothed.lateralDeviation.smoothedValue
    )
    anteriorPosteriorShift = updateAPShiftFromSmoothed(
      anteriorPosteriorShift,
      smoothed.apDeviation.smoothedValue
    )
  }

  // Generate feedback
  const lateralFeedback = analyzeLateralShiftFeedback(lateralShift, exerciseType)
  const apFeedback = analyzeAnteriorPosteriorFeedback(anteriorPosteriorShift, exerciseType)

  // Calculate overall score
  const score = calculateOverallScore(lateralFeedback, apFeedback)

  return {
    result: {
      score,
      centerOfMass,
      baseOfSupport,
      lateralShift,
      anteriorPosteriorShift,
      feedbacks: {
        lateral: lateralFeedback,
        anteriorPosterior: apFeedback,
      },
      isValid: true,
    },
    newState: {
      previousLateralDeviation: lateralShift.deviation,
      previousAPDeviation: anteriorPosteriorShift.deviation,
      smootherSet: state.smootherSet,
    },
  }
}

// ============================================
// Factory and Utility Functions
// ============================================

/**
 * Create initial analyzer state
 * @param smoothingConfig - Optional smoothing configuration
 */
export function createInitialWeightShiftState(
  smoothingConfig?: Partial<SmoothingConfig>
): WeightShiftAnalyzerState {
  return {
    previousLateralDeviation: null,
    previousAPDeviation: null,
    smootherSet: smoothingConfig
      ? new AngleSmootherSet(['lateralDeviation', 'apDeviation'], smoothingConfig)
      : undefined,
  }
}

/**
 * Get level label in Korean
 */
export function getLevelLabel(level: FeedbackLevel): string {
  switch (level) {
    case 'good':
      return '좋음'
    case 'warning':
      return '주의'
    case 'error':
      return '교정필요'
  }
}

/**
 * Format weight distribution as display string
 */
export function formatWeightDistribution(lateralShift: LateralShift): string {
  return `${lateralShift.leftPercent.toFixed(0)}% 좌 / ${lateralShift.rightPercent.toFixed(0)}% 우`
}

/**
 * Format AP distribution as display string
 */
export function formatAPDistribution(apShift: AnteriorPosteriorShift): string {
  return `${apShift.forwardPercent.toFixed(0)}% 전방 / ${apShift.backwardPercent.toFixed(0)}% 후방`
}

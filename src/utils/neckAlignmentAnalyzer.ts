/**
 * Neck Alignment Analyzer Utility Module
 * 목 정렬 분석을 위한 유틸리티 모듈
 *
 * 모든 운동 분석기에서 사용되는 공통 목 정렬 추적 기능 제공
 */

import {
  Point3D,
  keypointToPoint3D,
  midpoint,
  calculateAngleWithVertical,
  calculate3DAngle,
  isValidKeypoint,
} from './pose3DUtils'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'
import type { FeedbackItem, FeedbackLevel, CorrectionDirection } from './squatAnalyzer'

// ============================================
// Type Definitions
// ============================================

export type NeckPostureType = 'neutral' | 'forward' | 'extended' | 'flexed'

export interface NeckAlignmentResult {
  neckAngle: number              // Ear-shoulder line relative to vertical (degrees)
  forwardPosture: number         // Forward head posture deviation (percentage)
  extensionFlexion: number       // Neck extension/flexion angle (degrees, + = extension, - = flexion)
  postureType: NeckPostureType   // Categorized posture type
  isValid: boolean               // Whether ear keypoints were detected with sufficient confidence
}

export interface Keypoint {
  x: number
  y: number
  z?: number
  score?: number
}

// ============================================
// Threshold Constants
// ============================================

export const NECK_THRESHOLDS = {
  // General exercise thresholds
  general: {
    neckAngle: {
      ideal: { min: 0, max: 10 },      // Neutral alignment with vertical
      acceptable: { min: 0, max: 20 },
    },
    forwardPosture: {
      ideal: { min: 0, max: 5 },       // Percentage of torso length
      acceptable: { min: 0, max: 12 },
    },
    extensionFlexion: {
      ideal: { min: -5, max: 10 },     // Slight extension OK, tucked chin OK
      acceptable: { min: -15, max: 20 },
    },
  },
  // Exercise-specific overrides
  squat: {
    neckAngle: { ideal: { min: 0, max: 15 }, acceptable: { min: 0, max: 25 } },
    forwardPosture: { ideal: { min: 0, max: 8 }, acceptable: { min: 0, max: 15 } },
    extensionFlexion: { ideal: { min: 0, max: 15 }, acceptable: { min: -10, max: 25 } },
  },
  pushup: {
    neckAngle: { ideal: { min: 0, max: 12 }, acceptable: { min: 0, max: 22 } },
    forwardPosture: { ideal: { min: 0, max: 6 }, acceptable: { min: 0, max: 12 } },
    extensionFlexion: { ideal: { min: -10, max: 5 }, acceptable: { min: -20, max: 15 } },
  },
  plank: {
    neckAngle: { ideal: { min: 0, max: 10 }, acceptable: { min: 0, max: 18 } },
    forwardPosture: { ideal: { min: 0, max: 5 }, acceptable: { min: 0, max: 10 } },
    extensionFlexion: { ideal: { min: -8, max: 8 }, acceptable: { min: -15, max: 15 } },
  },
  deadlift: {
    neckAngle: { ideal: { min: 0, max: 12 }, acceptable: { min: 0, max: 22 } },
    forwardPosture: { ideal: { min: 0, max: 10 }, acceptable: { min: 0, max: 18 } },
    extensionFlexion: { ideal: { min: -5, max: 15 }, acceptable: { min: -12, max: 25 } },
  },
  lunge: {
    neckAngle: { ideal: { min: 0, max: 10 }, acceptable: { min: 0, max: 18 } },
    forwardPosture: { ideal: { min: 0, max: 5 }, acceptable: { min: 0, max: 12 } },
    extensionFlexion: { ideal: { min: -5, max: 10 }, acceptable: { min: -12, max: 18 } },
  },
} as const

export type ExerciseType = keyof typeof NECK_THRESHOLDS

// ============================================
// Constants
// ============================================

const MIN_KEYPOINT_SCORE = 0.5

// ============================================
// Core Analysis Functions
// ============================================

/**
 * Analyze neck alignment from keypoints
 *
 * @param keypoints - BlazePose keypoints array
 * @param exerciseType - Type of exercise for threshold selection
 * @returns Neck alignment analysis result
 */
export function analyzeNeckAlignment(
  keypoints: Keypoint[],
  exerciseType: ExerciseType = 'general'
): NeckAlignmentResult {
  // Extract ear keypoints (LEFT_EAR: 7, RIGHT_EAR: 8)
  const leftEar = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_EAR]
  const rightEar = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_EAR]
  const nose = keypoints[BLAZEPOSE_KEYPOINTS.NOSE]
  const leftShoulder = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]
  const rightShoulder = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]
  const leftHip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP]
  const rightHip = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP]

  // Validate ear keypoints - graceful degradation
  const leftEarValid = isValidKeypoint(leftEar, MIN_KEYPOINT_SCORE)
  const rightEarValid = isValidKeypoint(rightEar, MIN_KEYPOINT_SCORE)
  const hasValidEar = leftEarValid || rightEarValid

  const shouldersValid = isValidKeypoint(leftShoulder, MIN_KEYPOINT_SCORE) &&
                         isValidKeypoint(rightShoulder, MIN_KEYPOINT_SCORE)

  if (!hasValidEar || !shouldersValid) {
    return createInvalidNeckResult()
  }

  // Use available ear(s) - prefer midpoint if both available
  let earPoint: Point3D
  if (leftEarValid && rightEarValid) {
    earPoint = midpoint(keypointToPoint3D(leftEar), keypointToPoint3D(rightEar))
  } else if (leftEarValid) {
    earPoint = keypointToPoint3D(leftEar)
  } else {
    earPoint = keypointToPoint3D(rightEar)
  }

  const shoulderCenter = midpoint(
    keypointToPoint3D(leftShoulder),
    keypointToPoint3D(rightShoulder)
  )

  const hipCenter = isValidKeypoint(leftHip, MIN_KEYPOINT_SCORE) && isValidKeypoint(rightHip, MIN_KEYPOINT_SCORE)
    ? midpoint(keypointToPoint3D(leftHip), keypointToPoint3D(rightHip))
    : null

  // 1. Neck Angle: Ear-Shoulder line relative to vertical
  const neckAngle = calculateAngleWithVertical(shoulderCenter, earPoint)

  // 2. Forward Posture: Horizontal displacement of ear relative to shoulder
  const torsoLength = hipCenter
    ? Math.sqrt(Math.pow(shoulderCenter.x - hipCenter.x, 2) + Math.pow(shoulderCenter.y - hipCenter.y, 2))
    : 100 // fallback normalization
  const horizontalDisplacement = earPoint.x - shoulderCenter.x
  const forwardPosture = torsoLength > 0
    ? Math.max(0, (horizontalDisplacement / torsoLength) * 100)
    : 0

  // 3. Extension/Flexion: Using nose position relative to ear-shoulder plane
  let extensionFlexion = 0
  if (isValidKeypoint(nose, MIN_KEYPOINT_SCORE)) {
    const nosePoint = keypointToPoint3D(nose)
    // Angle between nose-ear line and ear-shoulder line
    extensionFlexion = calculate3DAngle(nosePoint, earPoint, shoulderCenter) - 90
    // Positive = looking up (extension), Negative = chin tucked (flexion)
  }

  // Determine posture type
  const postureType = determinePostureType(neckAngle, forwardPosture, extensionFlexion, exerciseType)

  return {
    neckAngle: Math.round(neckAngle * 10) / 10,
    forwardPosture: Math.round(forwardPosture * 10) / 10,
    extensionFlexion: Math.round(extensionFlexion * 10) / 10,
    postureType,
    isValid: true,
  }
}

/**
 * Determine the posture type based on neck measurements
 */
function determinePostureType(
  neckAngle: number,
  forwardPosture: number,
  extensionFlexion: number,
  exerciseType: ExerciseType
): NeckPostureType {
  const thresholds = NECK_THRESHOLDS[exerciseType]

  if (forwardPosture > thresholds.forwardPosture.acceptable.max) {
    return 'forward'
  }
  if (extensionFlexion > thresholds.extensionFlexion.acceptable.max) {
    return 'extended'
  }
  if (extensionFlexion < thresholds.extensionFlexion.acceptable.min) {
    return 'flexed'
  }
  return 'neutral'
}

/**
 * Create an invalid neck result for graceful degradation
 */
function createInvalidNeckResult(): NeckAlignmentResult {
  return {
    neckAngle: 0,
    forwardPosture: 0,
    extensionFlexion: 0,
    postureType: 'neutral',
    isValid: false,
  }
}

// ============================================
// Feedback Generation Functions
// ============================================

/**
 * Create feedback item for neck alignment
 *
 * @param result - Neck alignment analysis result
 * @param exerciseType - Type of exercise for threshold selection
 * @returns Feedback item or null if invalid
 */
export function createNeckAlignmentFeedback(
  result: NeckAlignmentResult,
  exerciseType: ExerciseType = 'general'
): FeedbackItem | null {
  if (!result.isValid) {
    return null // Graceful degradation - don't provide feedback if ears not detected
  }

  const thresholds = NECK_THRESHOLDS[exerciseType]
  const { neckAngle, forwardPosture, extensionFlexion, postureType } = result

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection
  let primaryValue = neckAngle

  // Prioritize feedback based on severity
  if (postureType === 'forward' || forwardPosture > thresholds.forwardPosture.ideal.max) {
    primaryValue = forwardPosture
    if (forwardPosture <= thresholds.forwardPosture.ideal.max) {
      level = 'good'
      message = '목 정렬이 좋습니다'
      correction = 'none'
    } else if (forwardPosture <= thresholds.forwardPosture.acceptable.max) {
      level = 'warning'
      message = '턱을 살짝 당겨 머리를 뒤로 가져오세요'
      correction = 'backward'
    } else {
      level = 'error'
      message = '거북목 자세입니다. 귀가 어깨 위에 오도록 하세요'
      correction = 'backward'
    }
  } else if (postureType === 'extended' || extensionFlexion > thresholds.extensionFlexion.ideal.max) {
    primaryValue = extensionFlexion
    if (extensionFlexion <= thresholds.extensionFlexion.ideal.max) {
      level = 'good'
      message = '목 정렬이 좋습니다'
      correction = 'none'
    } else if (extensionFlexion <= thresholds.extensionFlexion.acceptable.max) {
      level = 'warning'
      message = '고개를 살짝 숙여 바닥을 바라보세요'
      correction = 'down'
    } else {
      level = 'error'
      message = '목이 과신전되었습니다. 목 부상 위험'
      correction = 'down'
    }
  } else if (postureType === 'flexed' || extensionFlexion < thresholds.extensionFlexion.ideal.min) {
    primaryValue = Math.abs(extensionFlexion)
    if (extensionFlexion >= thresholds.extensionFlexion.ideal.min) {
      level = 'good'
      message = '목 정렬이 좋습니다'
      correction = 'none'
    } else if (extensionFlexion >= thresholds.extensionFlexion.acceptable.min) {
      level = 'warning'
      message = '턱이 너무 당겨져 있습니다. 시선을 약간 올리세요'
      correction = 'up'
    } else {
      level = 'error'
      message = '목이 과굴곡되었습니다. 척추 중립을 유지하세요'
      correction = 'up'
    }
  } else {
    // Neutral position
    level = 'good'
    message = '목이 척추와 일직선으로 잘 유지되고 있습니다'
    correction = 'none'
  }

  return {
    level,
    message,
    correction,
    value: Math.round(primaryValue * 10) / 10,
    idealRange: thresholds.neckAngle.ideal,
    acceptableRange: thresholds.neckAngle.acceptable,
  }
}

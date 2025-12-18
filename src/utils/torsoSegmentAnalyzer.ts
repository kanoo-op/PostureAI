/**
 * Torso Segment Analyzer Utility Module
 * 몸통 세그먼트 분석 유틸리티 모듈
 *
 * Provides multi-segment torso analysis with upper, mid, and lower
 * segment tracking for granular posture feedback.
 */

import {
  Point3D,
  keypointToPoint3D,
  calculateUpperTorsoAngle,
  calculateMidTorsoAngle,
  calculateLowerTorsoAngle,
  calculateUpperTorsoAngle2D,
  calculateTorsoSegmentAngles2D,
  has3DCoordinates,
  isValidKeypoint,
} from './pose3DUtils'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'
import type { FeedbackLevel } from './squatAnalyzer'
import type {
  TorsoSegmentResult,
  TorsoSegmentAngles,
  RoundingState,
  TorsoSegmentFeedback,
  TorsoSegmentVisualizationData,
} from '@/types/torsoSegment'

// ============================================
// Threshold Constants
// ============================================

export const TORSO_SEGMENT_THRESHOLDS = {
  upper: {
    ideal: { min: 0, max: 12 },      // Neck upright within 12°
    acceptable: { min: 0, max: 20 },  // Within 20°
    roundingThreshold: 15,            // Forward head > 15°
    extensionThreshold: -8,           // Hyperextension < -8°
  },
  mid: {
    ideal: { min: 0, max: 15 },       // Thoracic spine within 15°
    acceptable: { min: 0, max: 25 },
    roundingThreshold: 20,            // Kyphotic rounding > 20°
    extensionThreshold: -10,
  },
  lower: {
    ideal: { min: 0, max: 18 },       // Lumbar within 18°
    acceptable: { min: 0, max: 30 },
    roundingThreshold: 25,            // Flexion rounding > 25°
    extensionThreshold: -12,          // Hyperextension < -12°
  },
} as const

export const ALIGNMENT_SCORE_WEIGHTS = {
  upper: 0.30,   // 30% - neck/head position important for posture
  mid: 0.40,     // 40% - thoracic spine most critical
  lower: 0.30,   // 30% - lumbar spine
} as const

export const ALIGNMENT_SCORE_LEVELS = {
  excellent: { min: 85, max: 100 },  // Green
  good: { min: 70, max: 84 },        // Cyan
  fair: { min: 50, max: 69 },        // Yellow/Warning
  poor: { min: 0, max: 49 },         // Red/Error
} as const

export const MIN_KEYPOINT_SCORE = 0.5

// ============================================
// Keypoint Interface
// ============================================

export interface Keypoint {
  x: number
  y: number
  z?: number
  score?: number
}

// ============================================
// Core Analysis Functions
// ============================================

/**
 * Analyze torso segments from keypoints
 * Main entry point for multi-segment torso analysis
 */
export function analyzeTorsoSegments(
  keypoints: Keypoint[],
  minScore: number = MIN_KEYPOINT_SCORE
): TorsoSegmentResult {
  // Extract required keypoints
  const nose = keypoints[BLAZEPOSE_KEYPOINTS.NOSE]
  const leftEar = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_EAR]
  const rightEar = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_EAR]
  const leftShoulder = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]
  const rightShoulder = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]
  const leftHip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP]
  const rightHip = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP]

  // Validate core keypoints (shoulders and hips required)
  const coreValid = [
    leftShoulder, rightShoulder, leftHip, rightHip
  ].every(kp => isValidKeypoint(kp, minScore))

  if (!coreValid) {
    return createInvalidResult()
  }

  // Check if upper segment keypoints are valid
  const upperValid = [
    nose, leftEar, rightEar
  ].every(kp => isValidKeypoint(kp, minScore))

  // Convert to Point3D
  const points = {
    nose: keypointToPoint3D(nose),
    leftEar: keypointToPoint3D(leftEar),
    rightEar: keypointToPoint3D(rightEar),
    leftShoulder: keypointToPoint3D(leftShoulder),
    rightShoulder: keypointToPoint3D(rightShoulder),
    leftHip: keypointToPoint3D(leftHip),
    rightHip: keypointToPoint3D(rightHip),
  }

  // Determine if 3D calculation is possible
  const use3D = has3DCoordinates([
    points.leftShoulder, points.rightShoulder,
    points.leftHip, points.rightHip
  ])

  // Calculate segment angles
  let angles: TorsoSegmentAngles

  if (use3D) {
    const midAngle = calculateMidTorsoAngle(
      points.leftShoulder, points.rightShoulder,
      points.leftHip, points.rightHip
    )
    const lowerAngle = calculateLowerTorsoAngle(
      points.leftShoulder, points.rightShoulder,
      points.leftHip, points.rightHip
    )
    const upperAngle = upperValid
      ? calculateUpperTorsoAngle(
          points.nose, points.leftEar, points.rightEar,
          points.leftShoulder, points.rightShoulder
        )
      : midAngle * 0.8  // Estimate from mid if upper unavailable

    angles = { upper: upperAngle, mid: midAngle, lower: lowerAngle }
  } else {
    // 2D fallback
    const segmentAngles2D = calculateTorsoSegmentAngles2D(
      points.leftShoulder, points.rightShoulder,
      points.leftHip, points.rightHip
    )
    const upperAngle = upperValid
      ? calculateUpperTorsoAngle2D(
          points.nose, points.leftEar, points.rightEar,
          points.leftShoulder, points.rightShoulder
        )
      : segmentAngles2D.mid * 0.8

    angles = {
      upper: upperAngle,
      mid: segmentAngles2D.mid,
      lower: segmentAngles2D.lower
    }
  }

  // Round angles
  angles = {
    upper: Math.round(angles.upper * 10) / 10,
    mid: Math.round(angles.mid * 10) / 10,
    lower: Math.round(angles.lower * 10) / 10,
  }

  // Calculate levels
  const levels = {
    upper: getSegmentLevel('upper', angles.upper),
    mid: getSegmentLevel('mid', angles.mid),
    lower: getSegmentLevel('lower', angles.lower),
  }

  // Detect rounding/extension
  const roundingDetection = {
    upper: detectRounding('upper', angles.upper),
    mid: detectRounding('mid', angles.mid),
    lower: detectRounding('lower', angles.lower),
  }

  // Calculate alignment score
  const alignmentScore = calculateAlignmentScore(angles)
  const alignmentLevel = getAlignmentLevel(alignmentScore)

  return {
    angles,
    levels,
    alignmentScore,
    alignmentLevel,
    roundingDetection,
    isValid: true,
  }
}

/**
 * Create invalid result when keypoints are insufficient
 */
function createInvalidResult(): TorsoSegmentResult {
  return {
    angles: { upper: 0, mid: 0, lower: 0 },
    levels: { upper: 'good', mid: 'good', lower: 'good' },
    alignmentScore: 0,
    alignmentLevel: 'poor',
    roundingDetection: {
      upper: { detected: false, type: 'neutral', magnitude: 0, direction: 'none' },
      mid: { detected: false, type: 'neutral', magnitude: 0, direction: 'none' },
      lower: { detected: false, type: 'neutral', magnitude: 0, direction: 'none' },
    },
    isValid: false,
  }
}

/**
 * Get feedback level for a segment based on angle
 */
function getSegmentLevel(
  segment: 'upper' | 'mid' | 'lower',
  angle: number
): FeedbackLevel {
  const absAngle = Math.abs(angle)
  const thresholds = TORSO_SEGMENT_THRESHOLDS[segment]

  if (absAngle >= thresholds.ideal.min && absAngle <= thresholds.ideal.max) {
    return 'good'
  } else if (absAngle >= thresholds.acceptable.min && absAngle <= thresholds.acceptable.max) {
    return 'warning'
  }
  return 'error'
}

/**
 * Detect rounding or extension state for a segment
 */
function detectRounding(
  segment: 'upper' | 'mid' | 'lower',
  angle: number
): RoundingState {
  const thresholds = TORSO_SEGMENT_THRESHOLDS[segment]

  if (angle > thresholds.roundingThreshold) {
    return {
      detected: true,
      type: 'rounding',
      magnitude: angle - thresholds.roundingThreshold,
      direction: 'forward',
    }
  } else if (angle < thresholds.extensionThreshold) {
    return {
      detected: true,
      type: 'extension',
      magnitude: Math.abs(angle - thresholds.extensionThreshold),
      direction: 'backward',
    }
  }

  return {
    detected: false,
    type: 'neutral',
    magnitude: 0,
    direction: 'none',
  }
}

/**
 * Calculate weighted alignment score (0-100)
 */
function calculateAlignmentScore(
  angles: TorsoSegmentAngles
): number {
  const segments: ('upper' | 'mid' | 'lower')[] = ['upper', 'mid', 'lower']
  let totalScore = 0

  for (const segment of segments) {
    const thresholds = TORSO_SEGMENT_THRESHOLDS[segment]
    const absAngle = Math.abs(angles[segment])
    const weight = ALIGNMENT_SCORE_WEIGHTS[segment]

    // Score based on distance from ideal range
    let segmentScore: number
    if (absAngle <= thresholds.ideal.max) {
      segmentScore = 100
    } else if (absAngle <= thresholds.acceptable.max) {
      // Linear interpolation between ideal.max and acceptable.max
      const range = thresholds.acceptable.max - thresholds.ideal.max
      const deviation = absAngle - thresholds.ideal.max
      segmentScore = 100 - (deviation / range) * 30  // 70-100 range
    } else {
      // Beyond acceptable - rapid falloff
      const beyond = absAngle - thresholds.acceptable.max
      segmentScore = Math.max(0, 70 - beyond * 3)  // 0-70 range
    }

    totalScore += segmentScore * weight
  }

  return Math.round(totalScore)
}

/**
 * Get alignment level from score
 */
function getAlignmentLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= ALIGNMENT_SCORE_LEVELS.excellent.min) return 'excellent'
  if (score >= ALIGNMENT_SCORE_LEVELS.good.min) return 'good'
  if (score >= ALIGNMENT_SCORE_LEVELS.fair.min) return 'fair'
  return 'poor'
}

// ============================================
// Feedback Generation
// ============================================

/**
 * Generate bilingual feedback for all segments
 */
export function createTorsoSegmentFeedback(
  result: TorsoSegmentResult
): TorsoSegmentFeedback[] {
  if (!result.isValid) return []

  const feedbackList: TorsoSegmentFeedback[] = []
  const segments: ('upper' | 'mid' | 'lower')[] = ['upper', 'mid', 'lower']

  for (const segment of segments) {
    const angle = result.angles[segment]
    const level = result.levels[segment]
    const rounding = result.roundingDetection[segment]

    const message = generateSegmentMessage(segment, angle, level, rounding)
    const correctionDirection = rounding.direction === 'forward'
      ? 'backward'
      : rounding.direction === 'backward'
      ? 'forward'
      : 'none'

    feedbackList.push({
      segment,
      level,
      angle,
      message,
      correctionDirection,
    })
  }

  return feedbackList
}

/**
 * Generate bilingual message for a specific segment
 */
function generateSegmentMessage(
  segment: 'upper' | 'mid' | 'lower',
  angle: number,
  level: FeedbackLevel,
  rounding: RoundingState
): string {
  const segmentNames = {
    upper: { ko: '상부 척추 (목/어깨)', en: 'Upper spine (neck/shoulders)' },
    mid: { ko: '중부 척추 (등)', en: 'Mid spine (thoracic)' },
    lower: { ko: '하부 척추 (허리)', en: 'Lower spine (lumbar)' },
  }

  const name = segmentNames[segment]

  // Suppress unused variable warning - angle could be used for detailed messages in future
  void angle

  if (level === 'good') {
    return `${name.ko} 정렬 양호 / ${name.en} alignment is good`
  }

  if (rounding.detected) {
    if (rounding.type === 'rounding') {
      const corrections = {
        upper: { ko: '턱을 당기고 목을 세우세요', en: 'Tuck chin and straighten neck' },
        mid: { ko: '가슴을 펴고 어깨를 뒤로 당기세요', en: 'Open chest and pull shoulders back' },
        lower: { ko: '골반을 중립으로 유지하고 코어를 조이세요', en: 'Keep pelvis neutral and engage core' },
      }
      return `${name.ko} 굽음 감지. ${corrections[segment].ko} / ${name.en} rounding detected. ${corrections[segment].en}`
    } else if (rounding.type === 'extension') {
      const corrections = {
        upper: { ko: '목을 과도하게 젖히지 마세요', en: 'Avoid hyperextending neck' },
        mid: { ko: '등을 과도하게 젖히지 마세요', en: 'Avoid overarching upper back' },
        lower: { ko: '허리를 과도하게 젖히지 마세요. 코어를 조이세요', en: 'Avoid overarching lower back. Engage core' },
      }
      return `${name.ko} 과신전 감지. ${corrections[segment].ko} / ${name.en} hyperextension detected. ${corrections[segment].en}`
    }
  }

  // Generic warning
  if (level === 'warning') {
    return `${name.ko} 자세 조정 필요 / ${name.en} posture needs adjustment`
  }

  return `${name.ko} 교정 필요 / ${name.en} needs correction`
}

// ============================================
// Visualization Data Extraction
// ============================================

/**
 * Extract visualization data for rendering torso segments
 */
export function extractVisualizationData(
  keypoints: Keypoint[],
  minScore: number = MIN_KEYPOINT_SCORE
): TorsoSegmentVisualizationData | null {
  const nose = keypoints[BLAZEPOSE_KEYPOINTS.NOSE]
  const leftEar = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_EAR]
  const rightEar = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_EAR]
  const leftShoulder = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]
  const rightShoulder = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]
  const leftHip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP]
  const rightHip = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP]

  // Core keypoints required
  if (![
    leftShoulder, rightShoulder, leftHip, rightHip
  ].every(kp => isValidKeypoint(kp, minScore))) {
    return null
  }

  const shoulderCenter = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
  }

  const hipCenter = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
  }

  const midSpine = {
    x: shoulderCenter.x + (hipCenter.x - shoulderCenter.x) * 0.4,
    y: shoulderCenter.y + (hipCenter.y - shoulderCenter.y) * 0.4,
  }

  // Upper segment start (ear center or estimate from nose)
  let upperStart: { x: number; y: number }
  if ([nose, leftEar, rightEar].every(kp => isValidKeypoint(kp, minScore))) {
    const earCenter = {
      x: (leftEar.x + rightEar.x) / 2,
      y: (leftEar.y + rightEar.y) / 2,
    }
    // Neck point between ear center and shoulder center
    upperStart = {
      x: earCenter.x,
      y: (earCenter.y + shoulderCenter.y) / 2,
    }
  } else {
    // Estimate from shoulder center
    upperStart = {
      x: shoulderCenter.x,
      y: shoulderCenter.y - 30,  // Estimate 30px above shoulders
    }
  }

  return {
    upperStart,
    upperEnd: shoulderCenter,
    midEnd: midSpine,
    lowerEnd: hipCenter,
  }
}

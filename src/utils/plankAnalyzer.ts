/**
 * Plank Exercise Analyzer
 * 플랭크 운동을 위한 3D 신체 정렬 분석 및 폼 스코어링 모듈
 */

import {
  Point3D,
  calculate3DAngle,
  calculateAngleWithVertical,
  keypointToPoint3D,
  isValidKeypoint,
  midpoint,
  distance2D,
} from './pose3DUtils'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'
import { AngleSmootherSet, SmoothingConfig, createPlankSmootherSet } from './angleSmoother'
import {
  analyzeNeckAlignment as analyzeNeckAlignmentFromKeypoints,
  createNeckAlignmentFeedback,
  NeckAlignmentResult,
  NECK_THRESHOLDS,
} from './neckAlignmentAnalyzer'
import {
  calculateDepthConfidence,
  calculatePerspectiveFactor,
  applyPerspectiveCorrection,
  DepthNormalizationConfig,
  DepthConfidenceResult,
  CalibrationState,
  DEFAULT_DEPTH_CONFIG,
} from './depthNormalization'

// ============================================
// Type Exports
// ============================================

export type FeedbackLevel = 'good' | 'warning' | 'error'
export type CorrectionDirection = 'up' | 'down' | 'forward' | 'backward' | 'straighten' | 'lower' | 'raise' | 'inward' | 'outward' | 'none'

export interface FeedbackItem {
  level: FeedbackLevel
  message: string
  correction: CorrectionDirection
  value: number
  idealRange: { min: number; max: number }
  acceptableRange: { min: number; max: number }
}

export interface PlankAnalyzerState {
  holdStartTime: number | null     // Timestamp when valid plank started
  currentHoldTime: number          // Current hold duration in ms
  totalHoldTime: number            // Total accumulated hold time in ms
  isHolding: boolean               // Whether currently in valid plank position
  averageScore: number             // Running average score during hold
  frameCount: number               // Number of frames analyzed in current hold
  // Optional smoothing state
  smootherSet?: AngleSmootherSet<
    'bodyAlignmentAngle' | 'hipDeviationAngle' | 'shoulderWristOffset' | 'neckAngle'
  >
  // Optional depth normalization configuration
  depthConfig?: DepthNormalizationConfig
  // Optional calibration state for T-pose baseline
  calibrationState?: CalibrationState
}

export interface PlankAnalysisResult {
  score: number                    // 0-100 overall score
  feedbacks: {
    bodyAlignment: FeedbackItem    // Shoulder-hip-ankle alignment
    hipPosition: FeedbackItem      // Hip sag or pike detection
    shoulderAlignment: FeedbackItem // Shoulders over wrists
    neckAlignment: FeedbackItem    // Neck position relative to spine
  }
  holdTime: number                 // Current hold time in seconds
  isValidPlank: boolean            // Whether pose qualifies as valid plank
  rawAngles: {
    bodyAlignmentAngle: number     // Deviation from 180° (straight line)
    hipDeviationAngle: number      // Hip sag/pike angle
    shoulderWristOffset: number    // Horizontal offset percentage
    neckAngle: number              // Neck angle from vertical
    neckForwardPosture?: number    // Forward head posture deviation
    neckExtensionFlexion?: number  // Neck extension/flexion angle
    // Depth normalization info
    depthConfidence?: DepthConfidenceResult
    perspectiveFactor?: number
  }
}

export interface Keypoint {
  x: number
  y: number
  z?: number
  score?: number
}

// ============================================
// Constants
// ============================================

const THRESHOLDS = {
  bodyAlignment: {
    ideal: { min: 0, max: 8 },      // Deviation from straight line (180°)
    acceptable: { min: 0, max: 15 },
  },
  hipPosition: {
    ideal: { min: -5, max: 5 },     // Negative = sag, Positive = pike
    acceptable: { min: -12, max: 12 },
  },
  shoulderAlignment: {
    ideal: { min: 0, max: 10 },     // Percentage offset from wrists
    acceptable: { min: 0, max: 20 },
  },
  // Use centralized plank thresholds from neckAlignmentAnalyzer
  neckAlignment: NECK_THRESHOLDS.plank.neckAngle,
} as const

const MIN_KEYPOINT_SCORE = 0.5
const VALID_PLANK_THRESHOLD = 60    // Minimum score to be considered valid plank

// ============================================
// Internal Interfaces
// ============================================

interface PlankPoints {
  leftShoulder: Point3D
  rightShoulder: Point3D
  leftElbow: Point3D
  rightElbow: Point3D
  leftWrist: Point3D
  rightWrist: Point3D
  leftHip: Point3D
  rightHip: Point3D
  leftAnkle: Point3D
  rightAnkle: Point3D
  nose: Point3D
}

interface PlankRawAngles {
  bodyAlignmentAngle: number
  hipDeviationAngle: number
  shoulderWristOffset: number
  neckAngle: number
  // Depth normalization info
  depthConfidence?: DepthConfidenceResult
  perspectiveFactor?: number
}

interface PlankFeedbacks {
  bodyAlignment: FeedbackItem
  hipPosition: FeedbackItem
  shoulderAlignment: FeedbackItem
  neckAlignment: FeedbackItem
}

// ============================================
// Factory Function
// ============================================

/**
 * 초기 플랭크 상태 생성
 * @param smoothingConfig - Optional smoothing configuration. Pass to enable angle smoothing.
 * @param depthConfig - Optional depth normalization configuration. Pass to enable perspective correction.
 */
export function createInitialPlankState(
  smoothingConfig?: Partial<SmoothingConfig>,
  depthConfig?: Partial<DepthNormalizationConfig>
): PlankAnalyzerState {
  return {
    holdStartTime: null,
    currentHoldTime: 0,
    totalHoldTime: 0,
    isHolding: false,
    averageScore: 0,
    frameCount: 0,
    smootherSet: smoothingConfig ? createPlankSmootherSet(smoothingConfig) : undefined,
    depthConfig: depthConfig ? { ...DEFAULT_DEPTH_CONFIG, ...depthConfig } : undefined,
  }
}

// ============================================
// Helper Functions
// ============================================

function round(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * 플랭크 자세의 원시 각도 값 계산
 */
function calculatePlankRawAngles(
  points: PlankPoints,
  smootherSet?: AngleSmootherSet<
    'bodyAlignmentAngle' | 'hipDeviationAngle' | 'shoulderWristOffset' | 'neckAngle'
  >,
  keypoints?: Keypoint[],
  depthConfig?: DepthNormalizationConfig
): PlankRawAngles {
  // 1. Body Alignment: Calculate shoulder-hip-ankle angle
  const shoulderCenter = midpoint(points.leftShoulder, points.rightShoulder)
  const hipCenter = midpoint(points.leftHip, points.rightHip)
  const ankleCenter = midpoint(points.leftAnkle, points.rightAnkle)

  // Use calculate3DAngle for body alignment (180° = perfect straight line)
  const bodyAngle = calculate3DAngle(shoulderCenter, hipCenter, ankleCenter)
  const bodyAlignmentAngleRaw = Math.abs(180 - bodyAngle)

  // 2. Hip Position: Calculate deviation using vertical projection
  // Project hip position relative to shoulder-ankle line
  const expectedHipY = (shoulderCenter.y + ankleCenter.y) / 2
  const hipDeviation = hipCenter.y - expectedHipY
  // Convert to angle approximation based on torso length
  const torsoLength = distance2D(shoulderCenter, ankleCenter)
  const hipDeviationAngleRaw = torsoLength > 0
    ? Math.atan(hipDeviation / (torsoLength / 2)) * (180 / Math.PI)
    : 0

  // 3. Shoulder Alignment: Shoulders over wrists check
  const wristCenter = midpoint(points.leftWrist, points.rightWrist)
  const shoulderWristHorizontalDiff = Math.abs(shoulderCenter.x - wristCenter.x)
  const referenceWidth = distance2D(points.leftShoulder, points.rightShoulder)
  const shoulderWristOffsetRaw = referenceWidth > 0
    ? (shoulderWristHorizontalDiff / referenceWidth) * 100
    : 0

  // 4. Neck Alignment: Use calculateAngleWithVertical from hip-shoulder line to shoulder-nose
  const neckAngleCalc = calculateAngleWithVertical(shoulderCenter, points.nose)
  // Adjust based on body position (plank is horizontal, so compare to horizontal)
  const bodyTilt = calculateAngleWithVertical(hipCenter, shoulderCenter)
  const neckAngleRaw = Math.abs(neckAngleCalc - bodyTilt)

  // Apply smoothing if available
  let bodyAlignmentAngle = bodyAlignmentAngleRaw
  let hipDeviationAngle = hipDeviationAngleRaw
  let shoulderWristOffset = shoulderWristOffsetRaw
  let neckAngle = neckAngleRaw

  if (smootherSet) {
    const smoothed = smootherSet.smoothAll({
      bodyAlignmentAngle: bodyAlignmentAngleRaw,
      hipDeviationAngle: hipDeviationAngleRaw,
      shoulderWristOffset: shoulderWristOffsetRaw,
      neckAngle: neckAngleRaw,
    })

    bodyAlignmentAngle = smoothed.bodyAlignmentAngle.smoothedValue
    hipDeviationAngle = smoothed.hipDeviationAngle.smoothedValue
    shoulderWristOffset = smoothed.shoulderWristOffset.smoothedValue
    neckAngle = smoothed.neckAngle.smoothedValue
  }

  // Apply depth normalization if enabled and keypoints are available
  let depthConfidence: DepthConfidenceResult | undefined
  let perspectiveFactor: number | undefined

  if (keypoints && depthConfig?.enabled !== false) {
    const config = depthConfig ?? DEFAULT_DEPTH_CONFIG
    depthConfidence = calculateDepthConfidence(keypoints, config)

    if (depthConfidence.isReliable) {
      const perspectiveResult = calculatePerspectiveFactor(keypoints, config)
      perspectiveFactor = perspectiveResult.factor

      // Apply perspective correction to angles (plank uses body alignment and hip deviation)
      bodyAlignmentAngle = applyPerspectiveCorrection(bodyAlignmentAngle, perspectiveFactor, 'torsoInclination')
      hipDeviationAngle = applyPerspectiveCorrection(hipDeviationAngle, perspectiveFactor, 'hipFlexion')
    }
  }

  return {
    bodyAlignmentAngle: round(bodyAlignmentAngle),
    hipDeviationAngle: round(hipDeviationAngle),
    shoulderWristOffset: round(shoulderWristOffset), // Percentage - don't apply depth correction
    neckAngle: round(neckAngle),
    depthConfidence,
    perspectiveFactor,
  }
}

// ============================================
// Individual Analysis Functions
// ============================================

/**
 * 몸통 정렬 분석
 */
function analyzeBodyAlignment(angle: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.bodyAlignment

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (angle >= ideal.min && angle <= ideal.max) {
    level = 'good'
    message = '몸이 일직선으로 잘 유지되고 있습니다'
    correction = 'none'
  } else if (angle >= acceptable.min && angle <= acceptable.max) {
    level = 'warning'
    message = '몸을 좀 더 일직선으로 유지하세요'
    correction = 'straighten'
  } else {
    level = 'error'
    message = '몸이 너무 구부러졌습니다. 코어에 힘을 주세요'
    correction = 'straighten'
  }

  return {
    level,
    message,
    correction,
    value: angle,
    idealRange: ideal,
    acceptableRange: acceptable,
  }
}

/**
 * 엉덩이 위치 분석
 */
function analyzeHipPosition(angle: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.hipPosition

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  // Negative angle = hip sag (hips too low)
  // Positive angle = hip pike (hips too high)

  if (angle >= ideal.min && angle <= ideal.max) {
    level = 'good'
    message = '엉덩이 위치가 좋습니다'
    correction = 'none'
  } else if (angle >= acceptable.min && angle <= acceptable.max) {
    level = 'warning'
    if (angle < ideal.min) {
      message = '엉덩이가 조금 처졌습니다. 코어에 힘을 주세요'
      correction = 'raise'
    } else {
      message = '엉덩이가 조금 올라갔습니다. 살짝 낮추세요'
      correction = 'lower'
    }
  } else {
    level = 'error'
    if (angle < acceptable.min) {
      message = '엉덩이가 너무 처졌습니다. 복근에 힘을 주고 올리세요'
      correction = 'raise'
    } else {
      message = '엉덩이가 너무 높습니다. 파이크 자세가 됐습니다'
      correction = 'lower'
    }
  }

  return {
    level,
    message,
    correction,
    value: angle,
    idealRange: ideal,
    acceptableRange: acceptable,
  }
}

/**
 * 어깨 정렬 분석
 */
function analyzeShoulderAlignment(offset: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.shoulderAlignment

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (offset >= ideal.min && offset <= ideal.max) {
    level = 'good'
    message = '어깨가 손목 위에 잘 정렬되어 있습니다'
    correction = 'none'
  } else if (offset >= acceptable.min && offset <= acceptable.max) {
    level = 'warning'
    message = '어깨를 손목 바로 위로 이동하세요'
    correction = 'forward'
  } else {
    level = 'error'
    message = '어깨 위치가 손목에서 너무 벗어났습니다'
    correction = 'forward'
  }

  return {
    level,
    message,
    correction,
    value: offset,
    idealRange: ideal,
    acceptableRange: acceptable,
  }
}

/**
 * 목 정렬 분석
 */
function analyzeNeckAlignment(angle: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.neckAlignment

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (angle >= ideal.min && angle <= ideal.max) {
    level = 'good'
    message = '목이 척추와 일직선으로 잘 유지되고 있습니다'
    correction = 'none'
  } else if (angle >= acceptable.min && angle <= acceptable.max) {
    level = 'warning'
    message = '고개를 너무 들거나 숙이지 마세요. 바닥을 바라보세요'
    correction = 'straighten'
  } else {
    level = 'error'
    message = '목 위치가 잘못되었습니다. 척추 연장선상에 머리를 유지하세요'
    correction = 'straighten'
  }

  return {
    level,
    message,
    correction,
    value: angle,
    idealRange: ideal,
    acceptableRange: acceptable,
  }
}

// ============================================
// Scoring Functions
// ============================================

/**
 * 개별 항목 점수 계산
 */
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

/**
 * 대칭 범위를 가진 항목의 점수 계산 (hipPosition 등)
 */
function calculateItemScoreSymmetric(feedback: FeedbackItem): number {
  const { value, idealRange, acceptableRange } = feedback

  if (value >= idealRange.min && value <= idealRange.max) {
    return 100
  }

  if (value >= acceptableRange.min && value <= acceptableRange.max) {
    let distance: number
    let maxDistance: number

    if (value < idealRange.min) {
      distance = idealRange.min - value
      maxDistance = idealRange.min - acceptableRange.min
    } else {
      distance = value - idealRange.max
      maxDistance = acceptableRange.max - idealRange.max
    }

    const ratio = maxDistance > 0 ? distance / maxDistance : 0
    return Math.round(90 - ratio * 30)
  }

  let distance: number
  if (value < acceptableRange.min) {
    distance = acceptableRange.min - value
  } else {
    distance = value - acceptableRange.max
  }
  return Math.round(Math.max(0, 60 - distance * 2))
}

/**
 * 전체 점수 계산
 */
function calculateOverallScore(feedbacks: PlankFeedbacks): number {
  // Weighted scoring - body alignment and hip position most critical for plank
  const weights = {
    bodyAlignment: 0.35,
    hipPosition: 0.30,
    shoulderAlignment: 0.20,
    neckAlignment: 0.15,
  }

  const scores = {
    bodyAlignment: calculateItemScore(feedbacks.bodyAlignment),
    hipPosition: calculateItemScoreSymmetric(feedbacks.hipPosition),
    shoulderAlignment: calculateItemScore(feedbacks.shoulderAlignment),
    neckAlignment: calculateItemScore(feedbacks.neckAlignment),
  }

  const totalScore =
    scores.bodyAlignment * weights.bodyAlignment +
    scores.hipPosition * weights.hipPosition +
    scores.shoulderAlignment * weights.shoulderAlignment +
    scores.neckAlignment * weights.neckAlignment

  return Math.round(totalScore)
}

// ============================================
// State Management Functions
// ============================================

/**
 * 홀드 상태 결정
 */
function determineHoldStatus(
  score: number,
  state: PlankAnalyzerState,
  currentTime: number
): { isValidPlank: boolean; newState: PlankAnalyzerState } {
  const isCurrentlyValid = score >= VALID_PLANK_THRESHOLD

  let newState: PlankAnalyzerState

  if (isCurrentlyValid && !state.isHolding) {
    // Starting a new hold
    newState = {
      ...state,
      holdStartTime: currentTime,
      currentHoldTime: 0,
      isHolding: true,
      averageScore: score,
      frameCount: 1,
    }
  } else if (isCurrentlyValid && state.isHolding) {
    // Continuing hold
    const holdTime = state.holdStartTime ? currentTime - state.holdStartTime : 0
    const newFrameCount = state.frameCount + 1
    const newAverageScore = ((state.averageScore * state.frameCount) + score) / newFrameCount

    newState = {
      ...state,
      currentHoldTime: holdTime,
      averageScore: newAverageScore,
      frameCount: newFrameCount,
    }
  } else if (!isCurrentlyValid && state.isHolding) {
    // Ending hold - add current hold time to total
    newState = {
      ...state,
      totalHoldTime: state.totalHoldTime + state.currentHoldTime,
      holdStartTime: null,
      currentHoldTime: 0,
      isHolding: false,
    }
  } else {
    // Not holding and not valid - no change
    newState = state
  }

  return {
    isValidPlank: isCurrentlyValid,
    newState,
  }
}

/**
 * 유효하지 않은 분석 결과 생성
 */
function createInvalidResult(): PlankAnalysisResult {
  const invalidFeedback: FeedbackItem = {
    level: 'warning',
    message: '자세를 인식할 수 없습니다',
    correction: 'none',
    value: 0,
    idealRange: { min: 0, max: 0 },
    acceptableRange: { min: 0, max: 0 },
  }

  return {
    score: 0,
    feedbacks: {
      bodyAlignment: invalidFeedback,
      hipPosition: invalidFeedback,
      shoulderAlignment: invalidFeedback,
      neckAlignment: invalidFeedback,
    },
    holdTime: 0,
    isValidPlank: false,
    rawAngles: {
      bodyAlignmentAngle: 0,
      hipDeviationAngle: 0,
      shoulderWristOffset: 0,
      neckAngle: 0,
    },
  }
}

// ============================================
// Main Analysis Function
// ============================================

/**
 * 플랭크 자세 분석
 *
 * @param keypoints - BlazePose 키포인트 배열
 * @param state - 현재 플랭크 분석 상태
 * @param currentTime - 현재 시간 (기본값: Date.now())
 * @returns 분석 결과와 새로운 상태
 */
export function analyzePlank(
  keypoints: Keypoint[],
  state: PlankAnalyzerState,
  currentTime: number = Date.now()
): { result: PlankAnalysisResult; newState: PlankAnalyzerState } {
  // Extract required keypoints
  const nose = keypoints[BLAZEPOSE_KEYPOINTS.NOSE]
  const leftShoulder = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]
  const rightShoulder = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]
  const leftElbow = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ELBOW]
  const rightElbow = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW]
  const leftWrist = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_WRIST]
  const rightWrist = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_WRIST]
  const leftHip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP]
  const rightHip = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP]
  const leftAnkle = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]
  const rightAnkle = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]

  // Validate keypoints
  const requiredKeypoints = [
    nose,
    leftShoulder, rightShoulder,
    leftElbow, rightElbow,
    leftWrist, rightWrist,
    leftHip, rightHip,
    leftAnkle, rightAnkle,
  ]

  const allValid = requiredKeypoints.every(kp => isValidKeypoint(kp, MIN_KEYPOINT_SCORE))

  if (!allValid) {
    // Handle hold interruption due to detection loss
    const { newState } = determineHoldStatus(0, state, currentTime)
    return {
      result: createInvalidResult(),
      newState,
    }
  }

  // Convert to Point3D
  const points: PlankPoints = {
    nose: keypointToPoint3D(nose),
    leftShoulder: keypointToPoint3D(leftShoulder),
    rightShoulder: keypointToPoint3D(rightShoulder),
    leftElbow: keypointToPoint3D(leftElbow),
    rightElbow: keypointToPoint3D(rightElbow),
    leftWrist: keypointToPoint3D(leftWrist),
    rightWrist: keypointToPoint3D(rightWrist),
    leftHip: keypointToPoint3D(leftHip),
    rightHip: keypointToPoint3D(rightHip),
    leftAnkle: keypointToPoint3D(leftAnkle),
    rightAnkle: keypointToPoint3D(rightAnkle),
  }

  // Calculate raw angles (with optional depth normalization)
  const rawAngles = calculatePlankRawAngles(points, state.smootherSet, keypoints, state.depthConfig)

  // Analyze each component
  const bodyAlignmentFeedback = analyzeBodyAlignment(rawAngles.bodyAlignmentAngle)
  const hipPositionFeedback = analyzeHipPosition(rawAngles.hipDeviationAngle)
  const shoulderAlignmentFeedback = analyzeShoulderAlignment(rawAngles.shoulderWristOffset)

  // Use centralized neck alignment analyzer
  const neckResult = analyzeNeckAlignmentFromKeypoints(keypoints, 'plank')
  const neckAlignmentFeedback = neckResult.isValid
    ? (createNeckAlignmentFeedback(neckResult, 'plank') ?? analyzeNeckAlignment(rawAngles.neckAngle))
    : analyzeNeckAlignment(rawAngles.neckAngle)

  // Calculate overall score
  const score = calculateOverallScore({
    bodyAlignment: bodyAlignmentFeedback,
    hipPosition: hipPositionFeedback,
    shoulderAlignment: shoulderAlignmentFeedback,
    neckAlignment: neckAlignmentFeedback,
  })

  // Determine hold status
  const { isValidPlank, newState } = determineHoldStatus(score, state, currentTime)

  return {
    result: {
      score,
      feedbacks: {
        bodyAlignment: bodyAlignmentFeedback,
        hipPosition: hipPositionFeedback,
        shoulderAlignment: shoulderAlignmentFeedback,
        neckAlignment: neckAlignmentFeedback,
      },
      holdTime: newState.currentHoldTime / 1000, // Convert to seconds
      isValidPlank,
      rawAngles: {
        ...rawAngles,
        neckForwardPosture: neckResult.isValid ? neckResult.forwardPosture : undefined,
        neckExtensionFlexion: neckResult.isValid ? neckResult.extensionFlexion : undefined,
      },
    },
    newState,
  }
}

// ============================================
// Utility Export Functions
// ============================================

/**
 * 피드백 레벨을 한국어로 변환
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
 * 홀드 시간을 포맷팅 (mm:ss)
 */
export function formatHoldTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 점수에 따른 레벨 반환
 */
export function getScoreLevel(score: number): FeedbackLevel {
  if (score >= 80) return 'good'
  if (score >= 60) return 'warning'
  return 'error'
}

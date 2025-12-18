/**
 * 3D 좌표 기반 데드리프트 분석 모듈
 * MediaPipe BlazePose 랜드마크를 사용한 실시간 데드리프트 자세 분석
 */

import {
  Point3D,
  calculate3DAngle,
  calculateAngleWithVertical,
  keypointToPoint3D,
  isValidKeypoint,
  midpoint,
  distance2D,
  symmetryScore,
} from './pose3DUtils'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'
import { AngleSmootherSet, SmoothingConfig, createDeadliftSmootherSet } from './angleSmoother'
import { analyzeNeckAlignment, createNeckAlignmentFeedback, NeckAlignmentResult } from './neckAlignmentAnalyzer'
import {
  analyzeTorsoRotation,
  createTorsoRotationFeedback,
  calculateRotationScore,
  ROTATION_SCORE_WEIGHTS,
  TorsoRotationResult,
} from './torsoRotationAnalyzer'
import {
  analyzePelvicTilt,
  createPelvicTiltFeedback,
  createInitialPelvicTiltState,
  PelvicTiltResult,
  PelvicTiltAnalyzerState,
  PelvicTiltFeedbackItem,
} from './pelvicTiltAnalyzer'
import {
  calculateDepthConfidence,
  calculatePerspectiveFactor,
  applyPerspectiveCorrection,
  DepthNormalizationConfig,
  DepthConfidenceResult,
  CalibrationState,
  DEFAULT_DEPTH_CONFIG,
} from './depthNormalization'
import {
  createIntegratedAnalyzerState,
  analyzeIntegrated,
  assessVelocityCorrelatedRisk,
} from './integratedVelocityAngleAnalyzer'
import type {
  IntegratedAnalyzerState,
  VelocityContext,
  IntegratedFeedbackItem,
} from '@/types/integratedAnalysis'
import type { VelocityAnalysisResult } from '@/types/velocity'

// ============================================
// 타입 정의
// ============================================

export type FeedbackLevel = 'good' | 'warning' | 'error'
export type DeadliftPhase = 'setup' | 'lift' | 'lockout' | 'descent'
export type CorrectionDirection = 'up' | 'down' | 'forward' | 'backward' | 'inward' | 'outward' | 'none'

export interface FeedbackItem {
  level: FeedbackLevel
  message: string
  correction: CorrectionDirection
  value: number
  idealRange: { min: number; max: number }
  acceptableRange: { min: number; max: number }
}

export type SpineSegment = 'lumbar' | 'thoracic'

export interface SpineSegmentFeedback {
  segment: SpineSegment
  level: FeedbackLevel
  message: string
  correction: CorrectionDirection
  angle: number
  idealRange: { min: number; max: number }
  acceptableRange: { min: number; max: number }
}

export interface SpineCurvatureAnalysis {
  lumbar: SpineSegmentFeedback
  thoracic: SpineSegmentFeedback
  overallLevel: FeedbackLevel
  isNeutral: boolean
}

export interface HipHingeQualityResult {
  hipDominantRatio: number        // Ratio of hip angle change to knee angle change (ideal: 1.5-3.0)
  isSquatStyle: boolean           // True if knee bend exceeds hip hinge inappropriately
  initiationTiming: 'hip-first' | 'knee-first' | 'simultaneous' | 'unknown'
  level: FeedbackLevel
  message: string
}

export interface DeadliftAnalysisResult {
  score: number // 0-100 종합 점수
  feedbacks: {
    hipHinge: FeedbackItem
    kneeAngle: FeedbackItem
    spineAlignment: FeedbackItem
    barPath: FeedbackItem
    neckAlignment?: FeedbackItem
    torsoRotation?: FeedbackItem
    hipHingeQuality?: FeedbackItem
    pelvicTilt?: {
      anteriorTilt: PelvicTiltFeedbackItem
      lateralTilt: PelvicTiltFeedbackItem
      stability: PelvicTiltFeedbackItem
    }
    symmetry?: {
      knee: FeedbackItem
      hipHinge: FeedbackItem
    }
    spineCurvature?: SpineCurvatureAnalysis
  }
  repCompleted: boolean
  phase: DeadliftPhase
  rawAngles: {
    leftHipHingeAngle: number
    rightHipHingeAngle: number
    avgHipHingeAngle: number
    leftKneeAngle: number
    rightKneeAngle: number
    avgKneeAngle: number
    spineAngle: number
    barPathDeviation: number
    kneeSymmetryScore?: number
    hipHingeSymmetryScore?: number
    upperSpineAngle?: number  // thoracic: shoulder center to mid-spine
    midSpineAngle?: number    // overall: shoulder center to hip center
    lowerSpineAngle?: number  // lumbar: mid-spine to hip center
    neckAngle?: number
    neckForwardPosture?: number
    neckExtensionFlexion?: number
    torsoRotationAngle?: number
    pelvicTiltAngle?: number
    lateralPelvicTilt?: number
    pelvicStabilityScore?: number
    // Depth normalization info
    depthConfidence?: DepthConfidenceResult
    perspectiveFactor?: number
    // Hip hinge quality for debugging/visualization
    hipHingeQuality?: HipHingeQualityResult
  }
}

export interface DeadliftAnalyzerState {
  previousPhase: DeadliftPhase
  repCount: number
  lockoutReached: boolean
  lastHipAngle: number
  // Hip hinge quality tracking
  previousHipAngle?: number
  previousKneeAngle?: number
  hipDeltaHistory: number[]    // Last N frames of hip angle changes
  kneeDeltaHistory: number[]   // Last N frames of knee angle changes
  frameCount: number
  // Optional smoothing state
  smootherSet?: AngleSmootherSet<
    'leftHipHingeAngle' | 'rightHipHingeAngle' | 'leftKneeAngle' | 'rightKneeAngle' |
    'spineAngle' | 'upperSpineAngle' | 'lowerSpineAngle' | 'neckAngle' | 'torsoRotationAngle'
  >
  // Optional depth normalization configuration
  depthConfig?: DepthNormalizationConfig
  // Optional calibration state for T-pose baseline
  calibrationState?: CalibrationState
  // NEW: Velocity tracking integration
  velocityIntegrationState?: {
    integratedState: IntegratedAnalyzerState
    liftPhaseVelocityContext: VelocityContext
    applyStricterSpineThresholds: boolean
  }
  // Pelvic tilt analyzer state
  pelvicTiltState?: PelvicTiltAnalyzerState
}

export interface Keypoint {
  x: number
  y: number
  z?: number
  score?: number
}

// ============================================
// 상수 정의
// ============================================

const THRESHOLDS = {
  hipHinge: {
    // Shoulder-Hip-Knee angle (hip hinge)
    // At lockout: ~170-180 degrees (standing tall)
    // At bottom: ~70-110 degrees (proper hinge)
    ideal: { min: 75, max: 100 },
    acceptable: { min: 65, max: 115 },
  },
  kneeAngle: {
    // Hip-Knee-Ankle angle
    // Conventional deadlift: slight knee bend ~140-160 degrees
    ideal: { min: 140, max: 165 },
    acceptable: { min: 125, max: 175 },
  },
  spineAlignment: {
    // Angle with vertical (0 = perfectly upright, 90 = horizontal)
    // Some forward lean is expected, but excessive rounding is bad
    ideal: { min: 0, max: 25 },      // Neutral spine with controlled lean
    acceptable: { min: 0, max: 40 }, // Slight rounding warning zone
  },
  barPath: {
    // Horizontal deviation as percentage of torso length
    // Bar should stay close to body midline
    ideal: { min: 0, max: 5 },       // Very close to body
    acceptable: { min: 0, max: 12 }, // Acceptable drift
  },
} as const

const SYMMETRY_THRESHOLDS = {
  ideal: { min: 85, max: 100 },
  acceptable: { min: 70, max: 84 },
} as const

// 페이즈 판별을 위한 엉덩이 각도 임계값
const PHASE_THRESHOLDS = {
  lockout: 155,     // Hip angle threshold for lockout (standing tall)
  setup: 120,       // Hip angle threshold for setup position
  hysteresis: 5,    // State change hysteresis to prevent flickering
} as const

const MIN_KEYPOINT_SCORE = 0.5

const SPINE_SEGMENT_THRESHOLDS = {
  lumbar: {
    // Stricter thresholds for lumbar - more injury prone
    ideal: { min: 0, max: 15 },
    acceptable: { min: 0, max: 25 },
  },
  thoracic: {
    // More lenient for thoracic - some rounding acceptable
    ideal: { min: 0, max: 20 },
    acceptable: { min: 0, max: 35 },
  },
} as const

const HIP_HINGE_QUALITY_THRESHOLDS = {
  hipDominantRatio: {
    // Hip angle change should be 1.5-3x knee angle change for proper hinge
    ideal: { min: 1.5, max: 3.0 },
    acceptable: { min: 1.0, max: 4.0 },
  },
  squatStyleDetection: {
    // If knee angle change > hip angle change * threshold, it's squat-style
    kneeToHipRatioThreshold: 0.8,  // Knee change shouldn't exceed 80% of hip change
  },
  initiationWindow: {
    // Time window (in frames) to detect which joint moves first
    frameThreshold: 3,
    angleDeltaThreshold: 5,  // Minimum angle change to consider as "initiated"
  },
} as const

// Phase-aware threshold reduction (20% stricter during lift phase)
const LIFT_PHASE_THRESHOLD_MULTIPLIER = 0.8

// ============================================
// 대칭성 분석 함수
// ============================================

type SymmetryDirection = 'left' | 'right' | 'balanced'

function analyzeSymmetry(
  leftAngle: number,
  rightAngle: number,
  jointName: string
): FeedbackItem & { direction: SymmetryDirection } {
  const score = symmetryScore(leftAngle, rightAngle)
  const diff = leftAngle - rightAngle

  let level: FeedbackLevel
  let message: string
  let direction: SymmetryDirection = 'balanced'

  if (score >= SYMMETRY_THRESHOLDS.ideal.min) {
    level = 'good'
    message = `${jointName} 좌우 균형이 좋습니다`
    direction = 'balanced'
  } else if (score >= SYMMETRY_THRESHOLDS.acceptable.min) {
    level = 'warning'
    if (diff > 0) {
      message = `${jointName} 오른쪽이 약간 불균형합니다`
      direction = 'right'
    } else {
      message = `${jointName} 왼쪽이 약간 불균형합니다`
      direction = 'left'
    }
  } else {
    level = 'error'
    if (diff > 0) {
      message = `${jointName} 오른쪽 불균형 교정 필요`
      direction = 'right'
    } else {
      message = `${jointName} 왼쪽 불균형 교정 필요`
      direction = 'left'
    }
  }

  return {
    level,
    message,
    correction: 'none',
    value: score,
    idealRange: SYMMETRY_THRESHOLDS.ideal,
    acceptableRange: SYMMETRY_THRESHOLDS.acceptable,
    direction,
  }
}

// ============================================
// 메인 분석 함수
// ============================================

interface Points {
  leftShoulder: Point3D
  rightShoulder: Point3D
  leftHip: Point3D
  rightHip: Point3D
  leftKnee: Point3D
  rightKnee: Point3D
  leftAnkle: Point3D
  rightAnkle: Point3D
  leftWrist: Point3D
  rightWrist: Point3D
}

/**
 * 데드리프트 자세 분석 메인 함수
 *
 * @param keypoints - MediaPipe BlazePose 33개 키포인트 배열
 * @param state - 이전 분석 상태 (반복 카운트, 페이즈 추적용)
 * @returns 분석 결과 및 업데이트된 상태
 */
export function analyzeDeadlift(
  keypoints: Keypoint[],
  state: DeadliftAnalyzerState
): { result: DeadliftAnalysisResult; newState: DeadliftAnalyzerState } {
  // 필요한 키포인트 추출
  const leftShoulder = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]
  const rightShoulder = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]
  const leftHip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP]
  const rightHip = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP]
  const leftKnee = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_KNEE]
  const rightKnee = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]
  const leftAnkle = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]
  const rightAnkle = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]
  const leftWrist = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_WRIST]
  const rightWrist = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_WRIST]

  // 키포인트 유효성 검사
  const requiredKeypoints = [
    leftShoulder, rightShoulder,
    leftHip, rightHip,
    leftKnee, rightKnee,
    leftAnkle, rightAnkle,
    leftWrist, rightWrist,
  ]

  const allValid = requiredKeypoints.every(kp => isValidKeypoint(kp, MIN_KEYPOINT_SCORE))

  if (!allValid) {
    return {
      result: createInvalidResult(),
      newState: state,
    }
  }

  // Point3D로 변환
  const points: Points = {
    leftShoulder: keypointToPoint3D(leftShoulder),
    rightShoulder: keypointToPoint3D(rightShoulder),
    leftHip: keypointToPoint3D(leftHip),
    rightHip: keypointToPoint3D(rightHip),
    leftKnee: keypointToPoint3D(leftKnee),
    rightKnee: keypointToPoint3D(rightKnee),
    leftAnkle: keypointToPoint3D(leftAnkle),
    rightAnkle: keypointToPoint3D(rightAnkle),
    leftWrist: keypointToPoint3D(leftWrist),
    rightWrist: keypointToPoint3D(rightWrist),
  }

  // 각도 계산 (with optional depth normalization)
  const rawAngles = calculateRawAngles(points, state.smootherSet, keypoints, state.depthConfig)

  // 각 항목 분석
  const hipHingeFeedback = analyzeHipHinge(rawAngles.avgHipHingeAngle)
  const kneeAngleFeedback = analyzeKneeAngle(rawAngles.avgKneeAngle)
  const spineAlignmentFeedback = analyzeSpineAlignment(rawAngles.spineAngle)
  const barPathFeedback = analyzeBarPath(rawAngles.barPathDeviation)

  // 대칭성 분석
  const kneeSymmetry = analyzeSymmetry(
    rawAngles.leftKneeAngle,
    rawAngles.rightKneeAngle,
    '무릎'
  )
  const hipHingeSymmetry = analyzeSymmetry(
    rawAngles.leftHipHingeAngle,
    rawAngles.rightHipHingeAngle,
    '힙 힌지'
  )

  // 페이즈 및 반복 완료 판별
  const { phase, repCompleted, newState } = determinePhaseAndRep(
    rawAngles.avgHipHingeAngle,
    state
  )

  // 척추 곡률 분석 (페이즈 기반 임계값 적용)
  const spineCurvatureAnalysis = analyzeSpineCurvature(
    rawAngles.upperSpineAngle,
    rawAngles.lowerSpineAngle,
    phase
  )

  // Torso rotation analysis (with stricter thresholds during lift phase)
  const rotationResult = analyzeTorsoRotation(keypoints)
  const isLiftPhase = phase === 'lift'
  const rotationFeedback = createTorsoRotationFeedback(rotationResult, 'deadlift', isLiftPhase)

  // 목 정렬 분석
  const neckResult = analyzeNeckAlignment(keypoints, 'deadlift')
  const neckFeedback = createNeckAlignmentFeedback(neckResult, 'deadlift')

  // 힙 힌지 품질 분석
  const hipHingeQualityAnalysis = analyzeHipHingeQuality(
    rawAngles.avgHipHingeAngle,
    rawAngles.avgKneeAngle,
    state,
    phase
  )

  // Pelvic tilt analysis
  const pelvicTiltResult = analyzePelvicTilt(
    keypoints,
    state.pelvicTiltState ?? createInitialPelvicTiltState(undefined, state.depthConfig)
  )
  const pelvicFeedback = pelvicTiltResult.result.isValid
    ? createPelvicTiltFeedback(pelvicTiltResult.result, 'deadlift')
    : undefined

  // 종합 점수 계산
  const score = calculateOverallScore({
    hipHinge: hipHingeFeedback,
    kneeAngle: kneeAngleFeedback,
    spineAlignment: spineAlignmentFeedback,
    barPath: barPathFeedback,
    kneeSymmetry,
    hipHingeSymmetry,
    spineCurvature: spineCurvatureAnalysis,
    neckAlignment: neckFeedback,
    torsoRotation: rotationFeedback,
    hipHingeQuality: hipHingeQualityAnalysis.feedback,
    pelvicTilt: pelvicFeedback,
  })

  return {
    result: {
      score,
      feedbacks: {
        hipHinge: hipHingeFeedback,
        kneeAngle: kneeAngleFeedback,
        spineAlignment: spineAlignmentFeedback,
        barPath: barPathFeedback,
        neckAlignment: neckFeedback ?? undefined,
        torsoRotation: rotationFeedback ?? undefined,
        hipHingeQuality: hipHingeQualityAnalysis.feedback,
        pelvicTilt: pelvicFeedback,
        symmetry: {
          knee: kneeSymmetry,
          hipHinge: hipHingeSymmetry,
        },
        spineCurvature: spineCurvatureAnalysis,
      },
      repCompleted,
      phase,
      rawAngles: {
        leftHipHingeAngle: rawAngles.leftHipHingeAngle,
        rightHipHingeAngle: rawAngles.rightHipHingeAngle,
        avgHipHingeAngle: rawAngles.avgHipHingeAngle,
        leftKneeAngle: rawAngles.leftKneeAngle,
        rightKneeAngle: rawAngles.rightKneeAngle,
        avgKneeAngle: rawAngles.avgKneeAngle,
        spineAngle: rawAngles.spineAngle,
        barPathDeviation: rawAngles.barPathDeviation,
        kneeSymmetryScore: kneeSymmetry.value,
        hipHingeSymmetryScore: hipHingeSymmetry.value,
        upperSpineAngle: rawAngles.upperSpineAngle,
        midSpineAngle: rawAngles.midSpineAngle,
        lowerSpineAngle: rawAngles.lowerSpineAngle,
        neckAngle: neckResult.isValid ? neckResult.neckAngle : undefined,
        neckForwardPosture: neckResult.isValid ? neckResult.forwardPosture : undefined,
        neckExtensionFlexion: neckResult.isValid ? neckResult.extensionFlexion : undefined,
        torsoRotationAngle: rotationResult.isValid ? rotationResult.rotationAngle : undefined,
        pelvicTiltAngle: pelvicTiltResult.result.isValid ? pelvicTiltResult.result.anteriorTiltAngle : undefined,
        lateralPelvicTilt: pelvicTiltResult.result.isValid ? pelvicTiltResult.result.lateralTiltAngle : undefined,
        pelvicStabilityScore: pelvicTiltResult.result.isValid ? pelvicTiltResult.result.stabilityScore : undefined,
        depthConfidence: rawAngles.depthConfidence,
        perspectiveFactor: rawAngles.perspectiveFactor,
        hipHingeQuality: hipHingeQualityAnalysis.result,
      },
    },
    newState: {
      ...newState,
      previousHipAngle: rawAngles.avgHipHingeAngle,
      previousKneeAngle: rawAngles.avgKneeAngle,
      hipDeltaHistory: hipHingeQualityAnalysis.newHistories.hip,
      kneeDeltaHistory: hipHingeQualityAnalysis.newHistories.knee,
      frameCount: (state.frameCount || 0) + 1,
      pelvicTiltState: pelvicTiltResult.newState,
    },
  }
}

// ============================================
// 각도 계산 함수
// ============================================

interface RawAngles {
  leftHipHingeAngle: number
  rightHipHingeAngle: number
  avgHipHingeAngle: number
  leftKneeAngle: number
  rightKneeAngle: number
  avgKneeAngle: number
  spineAngle: number
  barPathDeviation: number
  upperSpineAngle: number   // thoracic: shoulder center to mid-spine
  midSpineAngle: number     // overall: same as spineAngle
  lowerSpineAngle: number   // lumbar: mid-spine to hip center
  // Depth normalization info
  depthConfidence?: DepthConfidenceResult
  perspectiveFactor?: number
}

function calculateRawAngles(
  points: Points,
  smootherSet?: AngleSmootherSet<
    'leftHipHingeAngle' | 'rightHipHingeAngle' | 'leftKneeAngle' | 'rightKneeAngle' |
    'spineAngle' | 'upperSpineAngle' | 'lowerSpineAngle' | 'neckAngle' | 'torsoRotationAngle'
  >,
  keypoints?: Keypoint[],
  depthConfig?: DepthNormalizationConfig
): RawAngles {
  // Hip Hinge Angle: shoulder-hip-knee
  const leftHipHingeAngleRaw = calculate3DAngle(
    points.leftShoulder,
    points.leftHip,
    points.leftKnee
  )
  const rightHipHingeAngleRaw = calculate3DAngle(
    points.rightShoulder,
    points.rightHip,
    points.rightKnee
  )

  // Knee Angle: hip-knee-ankle
  const leftKneeAngleRaw = calculate3DAngle(
    points.leftHip,
    points.leftKnee,
    points.leftAnkle
  )
  const rightKneeAngleRaw = calculate3DAngle(
    points.rightHip,
    points.rightKnee,
    points.rightAnkle
  )

  // Spine Alignment: hip-midpoint to shoulder-midpoint angle with vertical
  const hipCenter = midpoint(points.leftHip, points.rightHip)
  const shoulderCenter = midpoint(points.leftShoulder, points.rightShoulder)
  const spineAngleRaw = calculateAngleWithVertical(hipCenter, shoulderCenter)

  // Estimate mid-spine point (약 40% from shoulders toward hips)
  const midSpinePoint = estimateMidSpinePoint(shoulderCenter, hipCenter)

  // Upper spine angle (thoracic): shoulder center to mid-spine angle with vertical
  const upperSpineAngleRaw = calculateAngleWithVertical(midSpinePoint, shoulderCenter)

  // Lower spine angle (lumbar): mid-spine to hip center angle with vertical
  const lowerSpineAngleRaw = calculateAngleWithVertical(hipCenter, midSpinePoint)

  // Bar Path Deviation: wrist midpoint horizontal distance from body midline
  const wristMidpoint = midpoint(points.leftWrist, points.rightWrist)
  const bodyMidline = midpoint(hipCenter, shoulderCenter)
  const torsoLength = distance2D(hipCenter, shoulderCenter)

  // Calculate horizontal deviation as percentage of torso length
  let barPathDeviation = 0
  if (torsoLength > 0) {
    const horizontalDiff = Math.abs(wristMidpoint.x - bodyMidline.x)
    barPathDeviation = (horizontalDiff / torsoLength) * 100
  }

  // Apply smoothing if available
  let leftHipHingeAngle = leftHipHingeAngleRaw
  let rightHipHingeAngle = rightHipHingeAngleRaw
  let leftKneeAngle = leftKneeAngleRaw
  let rightKneeAngle = rightKneeAngleRaw
  let spineAngle = spineAngleRaw
  let upperSpineAngle = upperSpineAngleRaw
  let lowerSpineAngle = lowerSpineAngleRaw

  if (smootherSet) {
    const smoothed = smootherSet.smoothAll({
      leftHipHingeAngle: leftHipHingeAngleRaw,
      rightHipHingeAngle: rightHipHingeAngleRaw,
      leftKneeAngle: leftKneeAngleRaw,
      rightKneeAngle: rightKneeAngleRaw,
      spineAngle: spineAngleRaw,
      upperSpineAngle: upperSpineAngleRaw,
      lowerSpineAngle: lowerSpineAngleRaw,
      neckAngle: 0, // Neck angle is calculated separately via neckAlignmentAnalyzer
      torsoRotationAngle: 0, // Torso rotation is calculated separately via torsoRotationAnalyzer
    })

    leftHipHingeAngle = smoothed.leftHipHingeAngle.smoothedValue
    rightHipHingeAngle = smoothed.rightHipHingeAngle.smoothedValue
    leftKneeAngle = smoothed.leftKneeAngle.smoothedValue
    rightKneeAngle = smoothed.rightKneeAngle.smoothedValue
    spineAngle = smoothed.spineAngle.smoothedValue
    upperSpineAngle = smoothed.upperSpineAngle.smoothedValue
    lowerSpineAngle = smoothed.lowerSpineAngle.smoothedValue
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

      // Apply perspective correction to angles
      leftHipHingeAngle = applyPerspectiveCorrection(leftHipHingeAngle, perspectiveFactor, 'hipFlexion')
      rightHipHingeAngle = applyPerspectiveCorrection(rightHipHingeAngle, perspectiveFactor, 'hipFlexion')
      leftKneeAngle = applyPerspectiveCorrection(leftKneeAngle, perspectiveFactor, 'kneeFlexion')
      rightKneeAngle = applyPerspectiveCorrection(rightKneeAngle, perspectiveFactor, 'kneeFlexion')
      spineAngle = applyPerspectiveCorrection(spineAngle, perspectiveFactor, 'torsoInclination')
    }
  }

  return {
    leftHipHingeAngle,
    rightHipHingeAngle,
    avgHipHingeAngle: (leftHipHingeAngle + rightHipHingeAngle) / 2,
    leftKneeAngle,
    rightKneeAngle,
    avgKneeAngle: (leftKneeAngle + rightKneeAngle) / 2,
    spineAngle,
    barPathDeviation, // Percentage - don't apply depth correction
    upperSpineAngle,
    midSpineAngle: spineAngle,
    lowerSpineAngle,
    depthConfidence,
    perspectiveFactor,
  }
}

// ============================================
// 개별 항목 분석 함수
// ============================================

function analyzeHipHinge(angle: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.hipHinge

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (angle >= ideal.min && angle <= ideal.max) {
    level = 'good'
    message = '힙 힌지 각도가 완벽합니다'
    correction = 'none'
  } else if (angle >= acceptable.min && angle <= acceptable.max) {
    level = 'warning'
    if (angle < ideal.min) {
      message = '엉덩이를 조금 더 뒤로 빼세요'
      correction = 'backward'
    } else {
      message = '조금 더 숙여주세요'
      correction = 'forward'
    }
  } else {
    level = 'error'
    if (angle < acceptable.min) {
      message = '엉덩이가 너무 많이 빠졌습니다'
      correction = 'forward'
    } else {
      message = '힙 힌지가 부족합니다'
      correction = 'backward'
    }
  }

  return {
    level,
    message,
    correction,
    value: Math.round(angle * 10) / 10,
    idealRange: ideal,
    acceptableRange: acceptable,
  }
}

function analyzeKneeAngle(angle: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.kneeAngle

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (angle >= ideal.min && angle <= ideal.max) {
    level = 'good'
    message = '무릎 각도가 적절합니다'
    correction = 'none'
  } else if (angle >= acceptable.min && angle <= acceptable.max) {
    level = 'warning'
    if (angle < ideal.min) {
      message = '무릎을 조금 더 펴세요'
      correction = 'up'
    } else {
      message = '무릎을 살짝 구부리세요'
      correction = 'down'
    }
  } else {
    level = 'error'
    if (angle < acceptable.min) {
      message = '무릎이 너무 많이 굽혀졌습니다'
      correction = 'up'
    } else {
      message = '무릎을 잠그지 마세요'
      correction = 'down'
    }
  }

  return {
    level,
    message,
    correction,
    value: Math.round(angle * 10) / 10,
    idealRange: ideal,
    acceptableRange: acceptable,
  }
}

function analyzeSpineAlignment(angle: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.spineAlignment

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (angle >= ideal.min && angle <= ideal.max) {
    level = 'good'
    message = '척추가 중립 상태입니다'
    correction = 'none'
  } else if (angle >= acceptable.min && angle <= acceptable.max) {
    level = 'warning'
    message = '허리가 살짝 둥글어지고 있습니다'
    correction = 'backward'
  } else {
    level = 'error'
    message = '허리가 너무 둥글게 굽어졌습니다'
    correction = 'backward'
  }

  return {
    level,
    message,
    correction,
    value: Math.round(angle * 10) / 10,
    idealRange: ideal,
    acceptableRange: acceptable,
  }
}

function analyzeBarPath(deviation: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.barPath

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (deviation >= ideal.min && deviation <= ideal.max) {
    level = 'good'
    message = '바 경로가 몸에 가깝습니다'
    correction = 'none'
  } else if (deviation >= acceptable.min && deviation <= acceptable.max) {
    level = 'warning'
    message = '바를 몸에 더 가깝게 유지하세요'
    correction = 'inward'
  } else {
    level = 'error'
    message = '바가 몸에서 너무 멀리 떨어졌습니다'
    correction = 'inward'
  }

  return {
    level,
    message,
    correction,
    value: Math.round(deviation * 10) / 10,
    idealRange: ideal,
    acceptableRange: acceptable,
  }
}

// ============================================
// 척추 곡률 분석 함수
// ============================================

/**
 * 어깨 중심과 엉덩이 중심 사이의 중간 척추 위치 추정
 * 약 40% 지점 (어깨에서 엉덩이 방향으로)
 */
function estimateMidSpinePoint(shoulderCenter: Point3D, hipCenter: Point3D): Point3D {
  const WEIGHT = 0.4 // 40% from shoulders toward hips
  return {
    x: shoulderCenter.x + (hipCenter.x - shoulderCenter.x) * WEIGHT,
    y: shoulderCenter.y + (hipCenter.y - shoulderCenter.y) * WEIGHT,
    z: shoulderCenter.z + (hipCenter.z - shoulderCenter.z) * WEIGHT,
  }
}

/**
 * 분절별 척추 곡률 분석
 * @param upperAngle - 상부 척추 각도 (흉추 영역)
 * @param lowerAngle - 하부 척추 각도 (요추 영역)
 * @param phase - 현재 데드리프트 페이즈
 */
function analyzeSpineCurvature(
  upperAngle: number,
  lowerAngle: number,
  phase: DeadliftPhase
): SpineCurvatureAnalysis {
  // 리프트 페이즈에서는 더 엄격한 기준 적용
  const multiplier = phase === 'lift' ? LIFT_PHASE_THRESHOLD_MULTIPLIER : 1

  const lumbarThresholds = {
    ideal: {
      min: SPINE_SEGMENT_THRESHOLDS.lumbar.ideal.min,
      max: SPINE_SEGMENT_THRESHOLDS.lumbar.ideal.max * multiplier,
    },
    acceptable: {
      min: SPINE_SEGMENT_THRESHOLDS.lumbar.acceptable.min,
      max: SPINE_SEGMENT_THRESHOLDS.lumbar.acceptable.max * multiplier,
    },
  }

  const thoracicThresholds = {
    ideal: {
      min: SPINE_SEGMENT_THRESHOLDS.thoracic.ideal.min,
      max: SPINE_SEGMENT_THRESHOLDS.thoracic.ideal.max * multiplier,
    },
    acceptable: {
      min: SPINE_SEGMENT_THRESHOLDS.thoracic.acceptable.min,
      max: SPINE_SEGMENT_THRESHOLDS.thoracic.acceptable.max * multiplier,
    },
  }

  // 요추 분석
  const lumbar = analyzeSpineSegment(lowerAngle, 'lumbar', lumbarThresholds)

  // 흉추 분석
  const thoracic = analyzeSpineSegment(upperAngle, 'thoracic', thoracicThresholds)

  // 전체 레벨 결정 (더 심각한 쪽 기준)
  const overallLevel: FeedbackLevel =
    lumbar.level === 'error' || thoracic.level === 'error'
      ? 'error'
      : lumbar.level === 'warning' || thoracic.level === 'warning'
      ? 'warning'
      : 'good'

  // 중립 척추 여부
  const isNeutral = lumbar.level === 'good' && thoracic.level === 'good'

  return {
    lumbar,
    thoracic,
    overallLevel,
    isNeutral,
  }
}

function analyzeSpineSegment(
  angle: number,
  segment: SpineSegment,
  thresholds: { ideal: { min: number; max: number }; acceptable: { min: number; max: number } }
): SpineSegmentFeedback {
  const { ideal, acceptable } = thresholds
  const segmentName = segment === 'lumbar' ? '요추(허리)' : '흉추(등)'

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (angle >= ideal.min && angle <= ideal.max) {
    level = 'good'
    message = `${segmentName} 정렬이 좋습니다`
    correction = 'none'
  } else if (angle >= acceptable.min && angle <= acceptable.max) {
    level = 'warning'
    message = segment === 'lumbar'
      ? '허리가 약간 둥글어지고 있습니다. 코어를 조이세요'
      : '등 상부가 약간 굽어지고 있습니다'
    correction = 'backward'
  } else {
    level = 'error'
    message = segment === 'lumbar'
      ? '허리가 과도하게 굽어졌습니다! 부상 위험'
      : '등 상부가 너무 많이 굽어졌습니다'
    correction = 'backward'
  }

  return {
    segment,
    level,
    message,
    correction,
    angle: Math.round(angle * 10) / 10,
    idealRange: ideal,
    acceptableRange: acceptable,
  }
}

// ============================================
// 힙 힌지 품질 분석 함수
// ============================================

/**
 * Calculate hip-dominant ratio using delta between frames
 * Measures how much hip angle changes relative to knee angle change
 */
function calculateHipDominantRatio(
  currentHipAngle: number,
  previousHipAngle: number | undefined,
  currentKneeAngle: number,
  previousKneeAngle: number | undefined
): number {
  if (previousHipAngle === undefined || previousKneeAngle === undefined) {
    return 2.0  // Default to ideal ratio when no previous data
  }

  const hipDelta = Math.abs(currentHipAngle - previousHipAngle)
  const kneeDelta = Math.abs(currentKneeAngle - previousKneeAngle)

  // Avoid division by zero - if knee barely moves, hip is dominant
  if (kneeDelta < 0.5) {
    return hipDelta > 1 ? 5.0 : 2.0  // High ratio or neutral
  }

  return hipDelta / kneeDelta
}

/**
 * Detect squat-style deadlift where knees bend excessively relative to hip hinge
 * @param hipDelta - Change in hip angle
 * @param kneeDelta - Change in knee angle
 * @param currentKneeAngle - Current knee angle (lower = more bent)
 */
function detectSquatStyleDeadlift(
  hipDelta: number,
  kneeDelta: number,
  currentKneeAngle: number
): boolean {
  const { squatStyleDetection } = HIP_HINGE_QUALITY_THRESHOLDS

  // Check if knee is bending significantly (below 140 degrees indicates significant bend)
  const significantKneeBend = currentKneeAngle < 140

  // Check if knee change exceeds threshold relative to hip change
  if (hipDelta < 1) {
    // If hip barely moves but knee does, it's squat-style
    return kneeDelta > 3 && significantKneeBend
  }

  const kneeToHipRatio = kneeDelta / hipDelta
  return kneeToHipRatio > squatStyleDetection.kneeToHipRatioThreshold && significantKneeBend
}

/**
 * Track which joint initiates the lift phase movement
 * Hip-first initiation is ideal for deadlifts
 */
function trackHipDriveInitiation(
  hipDeltaHistory: number[],
  kneeDeltaHistory: number[],
  phase: DeadliftPhase
): 'hip-first' | 'knee-first' | 'simultaneous' | 'unknown' {
  // Only analyze during lift phase
  if (phase !== 'lift' || hipDeltaHistory.length < 3) {
    return 'unknown'
  }

  const { initiationWindow } = HIP_HINGE_QUALITY_THRESHOLDS
  const recentHipDeltas = hipDeltaHistory.slice(-initiationWindow.frameThreshold)
  const recentKneeDeltas = kneeDeltaHistory.slice(-initiationWindow.frameThreshold)

  // Find first significant movement
  let hipInitFrame = -1
  let kneeInitFrame = -1

  for (let i = 0; i < recentHipDeltas.length; i++) {
    if (hipInitFrame === -1 && recentHipDeltas[i] > initiationWindow.angleDeltaThreshold) {
      hipInitFrame = i
    }
    if (kneeInitFrame === -1 && recentKneeDeltas[i] > initiationWindow.angleDeltaThreshold) {
      kneeInitFrame = i
    }
  }

  if (hipInitFrame === -1 && kneeInitFrame === -1) {
    return 'unknown'
  }

  if (hipInitFrame === -1) return 'knee-first'
  if (kneeInitFrame === -1) return 'hip-first'

  const frameDiff = hipInitFrame - kneeInitFrame
  if (Math.abs(frameDiff) <= 1) return 'simultaneous'
  return frameDiff < 0 ? 'hip-first' : 'knee-first'
}

/**
 * Main aggregator function for hip hinge quality analysis
 * Returns a FeedbackItem for inclusion in overall analysis
 */
function analyzeHipHingeQuality(
  currentHipAngle: number,
  currentKneeAngle: number,
  state: DeadliftAnalyzerState,
  phase: DeadliftPhase
): { feedback: FeedbackItem; result: HipHingeQualityResult; newHistories: { hip: number[]; knee: number[] } } {
  const { ideal, acceptable } = HIP_HINGE_QUALITY_THRESHOLDS.hipDominantRatio

  // Calculate hip dominant ratio
  const hipDominantRatio = calculateHipDominantRatio(
    currentHipAngle,
    state.previousHipAngle,
    currentKneeAngle,
    state.previousKneeAngle
  )

  // Calculate deltas for history
  const hipDelta = state.previousHipAngle !== undefined
    ? Math.abs(currentHipAngle - state.previousHipAngle)
    : 0
  const kneeDelta = state.previousKneeAngle !== undefined
    ? Math.abs(currentKneeAngle - state.previousKneeAngle)
    : 0

  // Update histories (keep last 10 frames)
  const newHipHistory = [...(state.hipDeltaHistory || []), hipDelta].slice(-10)
  const newKneeHistory = [...(state.kneeDeltaHistory || []), kneeDelta].slice(-10)

  // Detect squat-style
  const isSquatStyle = detectSquatStyleDeadlift(hipDelta, kneeDelta, currentKneeAngle)

  // Track initiation timing
  const initiationTiming = trackHipDriveInitiation(newHipHistory, newKneeHistory, phase)

  // Determine feedback level and message
  let level: FeedbackLevel
  let message: string

  if (isSquatStyle) {
    level = 'error'
    message = '스쿼트 스타일 데드리프트입니다. 엉덩이를 먼저 움직이세요'
  } else if (hipDominantRatio >= ideal.min && hipDominantRatio <= ideal.max) {
    level = 'good'
    message = '힙 힌지 패턴이 이상적입니다'
  } else if (hipDominantRatio >= acceptable.min && hipDominantRatio <= acceptable.max) {
    level = 'warning'
    if (hipDominantRatio < ideal.min) {
      message = '무릎 움직임을 줄이고 엉덩이 힌지에 집중하세요'
    } else {
      message = '무릎을 약간 더 구부려도 됩니다'
    }
  } else {
    level = 'error'
    if (hipDominantRatio < acceptable.min) {
      message = '무릎이 너무 많이 구부러집니다. 힙 힌지를 강화하세요'
    } else {
      message = '무릎을 더 사용하여 안정성을 높이세요'
    }
  }

  // Add initiation feedback for lift phase
  if (phase === 'lift' && initiationTiming === 'knee-first') {
    level = level === 'good' ? 'warning' : level
    message = '엉덩이가 먼저 움직여야 합니다. 힙 드라이브를 시작하세요'
  }

  const result: HipHingeQualityResult = {
    hipDominantRatio: Math.round(hipDominantRatio * 100) / 100,
    isSquatStyle,
    initiationTiming,
    level,
    message,
  }

  const feedback: FeedbackItem = {
    level,
    message,
    correction: isSquatStyle || hipDominantRatio < ideal.min ? 'backward' : 'none',
    value: Math.round(hipDominantRatio * 100) / 100,
    idealRange: ideal,
    acceptableRange: acceptable,
  }

  return { feedback, result, newHistories: { hip: newHipHistory, knee: newKneeHistory } }
}

// ============================================
// 점수 계산
// ============================================

interface Feedbacks {
  hipHinge: FeedbackItem
  kneeAngle: FeedbackItem
  spineAlignment: FeedbackItem
  barPath: FeedbackItem
  kneeSymmetry?: FeedbackItem
  hipHingeSymmetry?: FeedbackItem
  spineCurvature?: SpineCurvatureAnalysis
  neckAlignment?: FeedbackItem | null
  torsoRotation?: FeedbackItem | null
  hipHingeQuality?: FeedbackItem
  pelvicTilt?: {
    anteriorTilt: PelvicTiltFeedbackItem
    lateralTilt: PelvicTiltFeedbackItem
    stability: PelvicTiltFeedbackItem
  }
}

function calculateOverallScore(feedbacks: Feedbacks): number {
  // Updated weights (sum = 1.0) - adjusted to include pelvic tilt
  const weights = {
    hipHinge: 0.20,          // Was 0.22, reduced by 0.02
    spineAlignment: 0.08,    // Was 0.09, reduced by 0.01
    spineCurvature: 0.10,    // Was 0.11, reduced by 0.01
    kneeAngle: 0.13,         // Was 0.14, reduced by 0.01
    barPath: 0.09,           // Was 0.10, reduced by 0.01
    symmetry: 0.13,          // Was 0.14, reduced by 0.01
    neckAlignment: 0.06,     // Unchanged
    torsoRotation: 0.07,     // Unchanged
    hipHingeQuality: 0.07,   // Unchanged
    pelvicTilt: 0.07,        // NEW - 7% weight for pelvic analysis
  }

  // 각 항목별 점수 계산
  const scores = {
    hipHinge: calculateItemScore(feedbacks.hipHinge),
    spineAlignment: calculateItemScore(feedbacks.spineAlignment),
    kneeAngle: calculateItemScore(feedbacks.kneeAngle),
    barPath: calculateItemScore(feedbacks.barPath),
    neckAlignment: feedbacks.neckAlignment ? calculateItemScore(feedbacks.neckAlignment) : 100,
  }

  // Calculate symmetry score (average of knee and hip hinge symmetry)
  let symmetryScoreValue = 100
  if (feedbacks.kneeSymmetry && feedbacks.hipHingeSymmetry) {
    symmetryScoreValue = (feedbacks.kneeSymmetry.value + feedbacks.hipHingeSymmetry.value) / 2
  }

  // Calculate spine curvature score with lumbar weighted at 60%
  let spineCurvatureScore = 100
  if (feedbacks.spineCurvature) {
    const lumbarScore = calculateItemScore({
      level: feedbacks.spineCurvature.lumbar.level,
      value: feedbacks.spineCurvature.lumbar.angle,
      idealRange: feedbacks.spineCurvature.lumbar.idealRange,
      acceptableRange: feedbacks.spineCurvature.lumbar.acceptableRange,
      message: '',
      correction: 'none',
    })
    const thoracicScore = calculateItemScore({
      level: feedbacks.spineCurvature.thoracic.level,
      value: feedbacks.spineCurvature.thoracic.angle,
      idealRange: feedbacks.spineCurvature.thoracic.idealRange,
      acceptableRange: feedbacks.spineCurvature.thoracic.acceptableRange,
      message: '',
      correction: 'none',
    })
    // Lumbar weighted 60%, Thoracic 40%
    spineCurvatureScore = lumbarScore * 0.6 + thoracicScore * 0.4
  }

  // Calculate pelvic tilt score (average of all pelvic tilt components)
  let pelvicTiltScore = 100
  if (feedbacks.pelvicTilt) {
    const anteriorScore = calculatePelvicTiltItemScore(feedbacks.pelvicTilt.anteriorTilt)
    const lateralScore = calculatePelvicTiltItemScore(feedbacks.pelvicTilt.lateralTilt)
    const stabilityScore = feedbacks.pelvicTilt.stability.value  // Already 0-100
    // Weighted: anterior 40%, lateral 30%, stability 30%
    pelvicTiltScore = anteriorScore * 0.4 + lateralScore * 0.3 + stabilityScore * 0.3
  }

  // 가중 평균
  const totalScore =
    scores.hipHinge * weights.hipHinge +
    scores.spineAlignment * weights.spineAlignment +
    spineCurvatureScore * weights.spineCurvature +
    scores.kneeAngle * weights.kneeAngle +
    scores.barPath * weights.barPath +
    symmetryScoreValue * weights.symmetry +
    scores.neckAlignment * weights.neckAlignment +
    (feedbacks.torsoRotation ? calculateRotationScore(feedbacks.torsoRotation) : 100) * weights.torsoRotation +
    (feedbacks.hipHingeQuality ? calculateItemScore(feedbacks.hipHingeQuality) : 100) * weights.hipHingeQuality +
    pelvicTiltScore * weights.pelvicTilt

  return Math.round(totalScore)
}

/**
 * Calculate score for pelvic tilt feedback item
 */
function calculatePelvicTiltItemScore(feedback: PelvicTiltFeedbackItem): number {
  const { value, idealRange, acceptableRange } = feedback

  // Ideal range: 100 points
  if (value >= idealRange.min && value <= idealRange.max) {
    return 100
  }

  // Acceptable range: 60-90 points
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

  // Outside acceptable range: 0-60 points
  if (value < acceptableRange.min) {
    const distance = acceptableRange.min - value
    const score = Math.max(0, 60 - distance * 2)
    return Math.round(score)
  } else {
    const distance = value - acceptableRange.max
    const score = Math.max(0, 60 - distance * 2)
    return Math.round(score)
  }
}

function calculateItemScore(feedback: FeedbackItem): number {
  const { value, idealRange, acceptableRange } = feedback

  // 이상적 범위 내: 100점
  if (value >= idealRange.min && value <= idealRange.max) {
    return 100
  }

  // 허용 범위 내: 60-90점
  if (value >= acceptableRange.min && value <= acceptableRange.max) {
    // 이상적 범위에서 얼마나 벗어났는지에 따라 점수 감소
    if (value < idealRange.min) {
      const distance = idealRange.min - value
      const maxDistance = idealRange.min - acceptableRange.min
      const ratio = distance / maxDistance
      return Math.round(90 - ratio * 30)
    } else {
      const distance = value - idealRange.max
      const maxDistance = acceptableRange.max - idealRange.max
      const ratio = distance / maxDistance
      return Math.round(90 - ratio * 30)
    }
  }

  // 허용 범위 밖: 0-60점
  if (value < acceptableRange.min) {
    const distance = acceptableRange.min - value
    const score = Math.max(0, 60 - distance * 2)
    return Math.round(score)
  } else {
    const distance = value - acceptableRange.max
    const score = Math.max(0, 60 - distance * 2)
    return Math.round(score)
  }
}

// ============================================
// 페이즈 및 반복 판별
// ============================================

function determinePhaseAndRep(
  currentHipAngle: number,
  state: DeadliftAnalyzerState
): { phase: DeadliftPhase; repCompleted: boolean; newState: DeadliftAnalyzerState } {
  const { previousPhase, lockoutReached, repCount, lastHipAngle } = state

  let phase: DeadliftPhase = previousPhase
  let repCompleted = false
  let newLockoutReached = lockoutReached
  let newRepCount = repCount

  // 현재 엉덩이 각도에 따른 페이즈 결정
  if (currentHipAngle > PHASE_THRESHOLDS.lockout) {
    // 락아웃 상태 (standing tall)
    if (previousPhase === 'lift' && !lockoutReached) {
      // 들어올리는 중에 락아웃 도달 = 1회 완료
      repCompleted = true
      newRepCount = repCount + 1
    }
    newLockoutReached = true
    phase = 'lockout'
  } else if (currentHipAngle < PHASE_THRESHOLDS.setup) {
    // 셋업 상태 (bent position)
    phase = 'setup'
    newLockoutReached = false
  } else {
    // 중간 상태 - 방향 판단
    const angleDiff = currentHipAngle - lastHipAngle

    if (Math.abs(angleDiff) > PHASE_THRESHOLDS.hysteresis) {
      if (angleDiff > 0) {
        // 각도가 늘어남 = 들어올리는 중
        phase = 'lift'
      } else {
        // 각도가 줄어듦 = 내려놓는 중
        phase = 'descent'
      }
    }
    // 히스테리시스 범위 내면 이전 페이즈 유지
  }

  return {
    phase,
    repCompleted,
    newState: {
      ...state,
      previousPhase: phase,
      repCount: newRepCount,
      lockoutReached: newLockoutReached,
      lastHipAngle: currentHipAngle,
    },
  }
}

// ============================================
// 유틸리티 함수
// ============================================

function createInvalidResult(): DeadliftAnalysisResult {
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
      hipHinge: invalidFeedback,
      kneeAngle: invalidFeedback,
      spineAlignment: invalidFeedback,
      barPath: invalidFeedback,
      hipHingeQuality: invalidFeedback,
      spineCurvature: undefined,
    },
    repCompleted: false,
    phase: 'setup',
    rawAngles: {
      leftHipHingeAngle: 0,
      rightHipHingeAngle: 0,
      avgHipHingeAngle: 0,
      leftKneeAngle: 0,
      rightKneeAngle: 0,
      avgKneeAngle: 0,
      spineAngle: 0,
      barPathDeviation: 0,
      upperSpineAngle: 0,
      midSpineAngle: 0,
      lowerSpineAngle: 0,
      hipHingeQuality: undefined,
    },
  }
}

/**
 * 초기 분석 상태 생성
 * @param smoothingConfig - Optional smoothing configuration. Pass to enable angle smoothing.
 * @param depthConfig - Optional depth normalization configuration. Pass to enable perspective correction.
 */
export function createInitialDeadliftState(
  smoothingConfig?: Partial<SmoothingConfig>,
  depthConfig?: Partial<DepthNormalizationConfig>
): DeadliftAnalyzerState {
  return {
    previousPhase: 'setup',
    repCount: 0,
    lockoutReached: false,
    lastHipAngle: 90, // Assume starting in bent position
    // Initialize hip hinge quality tracking
    previousHipAngle: undefined,
    previousKneeAngle: undefined,
    hipDeltaHistory: [],
    kneeDeltaHistory: [],
    frameCount: 0,
    smootherSet: smoothingConfig ? createDeadliftSmootherSet(smoothingConfig) : undefined,
    depthConfig: depthConfig ? { ...DEFAULT_DEPTH_CONFIG, ...depthConfig } : undefined,
  }
}

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
 * 페이즈를 한국어로 변환
 */
export function getPhaseLabel(phase: DeadliftPhase): string {
  switch (phase) {
    case 'setup':
      return '준비자세'
    case 'lift':
      return '들어올리는 중'
    case 'lockout':
      return '락아웃'
    case 'descent':
      return '내려놓는 중'
  }
}

/**
 * 분석 결과에서 대칭성 데이터를 UI용으로 변환
 */
export function createDeadliftSymmetryData(
  result: DeadliftAnalysisResult
): Array<{
  jointName: string
  score: number
  leftAngle: number
  rightAngle: number
  level: FeedbackLevel
  direction: 'left' | 'right' | 'balanced'
  message: string
}> {
  if (!result.feedbacks.symmetry) return []

  const kneeSymmetry = result.feedbacks.symmetry.knee
  const hipHingeSymmetry = result.feedbacks.symmetry.hipHinge

  // Extract direction from message (a simple heuristic based on Korean text)
  const getDirection = (message: string): 'left' | 'right' | 'balanced' => {
    if (message.includes('왼쪽')) return 'left'
    if (message.includes('오른쪽')) return 'right'
    return 'balanced'
  }

  return [
    {
      jointName: '무릎',
      score: result.rawAngles.kneeSymmetryScore ?? 0,
      leftAngle: result.rawAngles.leftKneeAngle,
      rightAngle: result.rawAngles.rightKneeAngle,
      level: kneeSymmetry.level,
      direction: getDirection(kneeSymmetry.message),
      message: kneeSymmetry.message,
    },
    {
      jointName: '힙 힌지',
      score: result.rawAngles.hipHingeSymmetryScore ?? 0,
      leftAngle: result.rawAngles.leftHipHingeAngle,
      rightAngle: result.rawAngles.rightHipHingeAngle,
      level: hipHingeSymmetry.level,
      direction: getDirection(hipHingeSymmetry.message),
      message: hipHingeSymmetry.message,
    },
  ]
}

// ============================================
// Velocity-Integrated Analysis Functions
// ============================================

/**
 * Analyze deadlift with integrated velocity tracking
 * Applies 20% stricter spine thresholds when lift velocity exceeds optimal range
 */
export function analyzeDeadliftWithVelocity(
  keypoints: Keypoint[],
  state: DeadliftAnalyzerState,
  velocityResult: VelocityAnalysisResult | null
): {
  result: DeadliftAnalysisResult & { velocityCorrelatedFeedbacks?: IntegratedFeedbackItem[] };
  newState: DeadliftAnalyzerState;
} {
  // Run base analysis
  const { result: baseResult, newState: baseNewState } = analyzeDeadlift(keypoints, state)

  if (!velocityResult) {
    return { result: baseResult, newState: baseNewState }
  }

  // Determine if stricter spine thresholds should apply
  const primaryJoint = velocityResult.joints.leftHip ?? velocityResult.joints.rightHip
  const isHighVelocityLift = velocityResult.currentPhase === 'concentric'
    && primaryJoint?.isValid === true
    && primaryJoint.smoothedVelocity > 180 // Exceeds optimal max for deadlift

  // Initialize integration state
  const integrationState = state.velocityIntegrationState?.integratedState
    ?? createIntegratedAnalyzerState()

  const currentAngles: Record<string, number> = {
    leftHipHinge: baseResult.rawAngles.leftHipHingeAngle,
    rightHipHinge: baseResult.rawAngles.rightHipHingeAngle,
    spine: baseResult.rawAngles.spineAngle,
    lumbar: baseResult.rawAngles.lowerSpineAngle ?? 0,
  }

  const { result: integratedResult, newState: newIntegratedState } = analyzeIntegrated(
    currentAngles,
    velocityResult.joints,
    velocityResult.timestamp,
    velocityResult.currentPhase,
    integrationState
  )

  // Assess spine rounding risk at high velocity
  const velocityCorrelatedFeedbacks: IntegratedFeedbackItem[] = []

  if (baseResult.feedbacks.spineAlignment.level !== 'good' && isHighVelocityLift) {
    const spineRisk = assessVelocityCorrelatedRisk(
      'spine_rounding',
      baseResult.feedbacks.spineAlignment.level,
      'high_velocity',
      integratedResult.angularVelocities.spine?.smoothedAngularVelocity ?? 0
    )

    velocityCorrelatedFeedbacks.push({
      ...baseResult.feedbacks.spineAlignment,
      level: spineRisk.velocityAdjustedLevel,
      velocityContext: 'high_velocity',
      angularVelocity: integratedResult.angularVelocities.spine?.smoothedAngularVelocity,
      isVelocityCorrelated: true,
      message: 'Spine rounding at high velocity - injury risk!',
    })
  }

  return {
    result: {
      ...baseResult,
      velocityCorrelatedFeedbacks,
    },
    newState: {
      ...baseNewState,
      velocityIntegrationState: {
        integratedState: newIntegratedState,
        liftPhaseVelocityContext: isHighVelocityLift ? 'high_velocity' : 'optimal_velocity',
        applyStricterSpineThresholds: isHighVelocityLift,
      },
    },
  }
}

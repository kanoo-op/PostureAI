/**
 * 3D 좌표 기반 스쿼트 분석 모듈
 * MediaPipe BlazePose 랜드마크를 사용한 실시간 스쿼트 자세 분석
 */

import {
  Point3D,
  calculate3DAngle,
  calculateAngleWithVertical,
  keypointToPoint3D,
  isValidKeypoint,
  midpoint,
  distance2D,
  distance3D,
  pointToLineDistance,
  symmetryScore,
} from './pose3DUtils'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'
import { AngleSmootherSet, SmoothingConfig, createSquatSmootherSet } from './angleSmoother'
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
  determineVelocityContext,
} from './integratedVelocityAngleAnalyzer'
import type {
  IntegratedAnalyzerState,
  VelocityContext,
  IntegratedFeedbackItem,
  VelocityCorrelatedRisk,
} from '@/types/integratedAnalysis'
import type { VelocityAnalysisResult, JointVelocityData } from '@/types/velocity'

// ============================================
// 타입 정의
// ============================================

export type FeedbackLevel = 'good' | 'warning' | 'error'
export type SquatPhase = 'standing' | 'descending' | 'bottom' | 'ascending'
export type CorrectionDirection = 'up' | 'down' | 'forward' | 'backward' | 'inward' | 'outward' | 'none'

// Knee alignment types for 3D analysis
export type KneeDeviationType = 'valgus' | 'varus' | 'neutral'

export interface KneeAlignmentResult {
  leftDeviation: number          // Distance from hip-ankle line in normalized units (positive = medial/valgus, negative = lateral/varus)
  rightDeviation: number         // Same for right knee
  leftDeviationType: KneeDeviationType
  rightDeviationType: KneeDeviationType
  leftDeviationDegrees: number   // Approximate angle in degrees
  rightDeviationDegrees: number
  dynamicValgusChange: number    // Change from standing baseline (positive = increased valgus)
  peakDeviation: number          // Maximum deviation seen during current rep
  isValid: boolean               // Whether calculation was successful
}

export interface FeedbackItem {
  level: FeedbackLevel
  message: string
  correction: CorrectionDirection
  value: number // 측정된 실제 값
  idealRange: { min: number; max: number }
  acceptableRange: { min: number; max: number }
}

export interface SquatAnalysisResult {
  score: number // 0-100 종합 점수
  feedbacks: {
    kneeAngle: FeedbackItem
    hipAngle: FeedbackItem
    torsoInclination: FeedbackItem
    kneeValgus: FeedbackItem
    ankleAngle: FeedbackItem
    neckAlignment?: FeedbackItem
    torsoRotation?: FeedbackItem
    pelvicTilt?: {
      anteriorTilt: PelvicTiltFeedbackItem
      lateralTilt: PelvicTiltFeedbackItem
      stability: PelvicTiltFeedbackItem
    }
    symmetry?: {
      knee: FeedbackItem
      hip: FeedbackItem
      ankle?: FeedbackItem
    }
  }
  repCompleted: boolean
  phase: SquatPhase
  rawAngles: {
    leftKneeAngle: number
    rightKneeAngle: number
    leftHipAngle: number
    rightHipAngle: number
    torsoAngle: number
    kneeValgusPercent: number
    kneeSymmetryScore?: number
    hipSymmetryScore?: number
    leftAnkleAngle: number
    rightAnkleAngle: number
    avgAnkleAngle: number
    heelRiseDetected: boolean
    ankleSymmetryScore?: number
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
    // 3D knee alignment data
    kneeDeviation3D?: {
      leftDegrees: number
      rightDegrees: number
      leftType: KneeDeviationType
      rightType: KneeDeviationType
      dynamicChange: number
      peakDeviation: number
    }
  }
}

export interface SquatAnalyzerState {
  previousPhase: SquatPhase
  bottomReached: boolean
  repCount: number
  lastKneeAngle: number
  // Optional smoothing state
  smootherSet?: AngleSmootherSet<
    'leftKneeAngle' | 'rightKneeAngle' | 'leftHipAngle' | 'rightHipAngle' |
    'torsoAngle' | 'leftAnkleAngle' | 'rightAnkleAngle' | 'neckAngle' | 'torsoRotationAngle'
  >
  // Optional depth normalization configuration
  depthConfig?: DepthNormalizationConfig
  // Optional calibration state for T-pose baseline
  calibrationState?: CalibrationState
  // Knee alignment baseline for dynamic tracking
  standingKneeAlignment?: {
    leftDeviation: number
    rightDeviation: number
    capturedAt: number  // timestamp
  }
  // Peak deviation tracking per rep
  currentRepPeakDeviation?: number
  // NEW: Velocity tracking integration
  velocityIntegrationState?: {
    integratedState: IntegratedAnalyzerState
    tempoAwareMode: boolean
    lastVelocityContext: VelocityContext
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
  kneeAngle: {
    ideal: { min: 80, max: 100 },
    acceptable: { min: 70, max: 110 },
  },
  hipAngle: {
    ideal: { min: 70, max: 110 },
    acceptable: { min: 60, max: 120 },
  },
  torsoInclination: {
    ideal: { min: 0, max: 35 },
    acceptable: { min: 0, max: 45 },
  },
  kneeValgus: {
    ideal: { min: 0, max: 5 }, // 퍼센트
    acceptable: { min: 0, max: 10 },
  },
  ankleAngle: {
    ideal: { min: 15, max: 35 },     // Ideal dorsiflexion range
    acceptable: { min: 10, max: 45 }, // Acceptable range
  },
  heelRise: {
    yPositionThreshold: 0.02, // 2% Y-position difference indicates heel rise
  },
  kneeDeviation3D: {
    ideal: { min: 0, max: 5 },       // 0-5 degrees deviation is ideal
    acceptable: { min: 5, max: 10 }, // 5-10 degrees is acceptable
    // > 10 degrees is error
  },
} as const

const SYMMETRY_THRESHOLDS = {
  ideal: { min: 85, max: 100 },
  acceptable: { min: 70, max: 84 },
} as const

// 페이즈 판별을 위한 무릎 각도 임계값
const PHASE_THRESHOLDS = {
  standing: 160, // 서있는 상태 (무릎 거의 펴짐)
  bottom: 110, // 바닥 상태 (가장 깊게 앉은 상태)
  hysteresis: 5, // 상태 변경 시 히스테리시스
} as const

const MIN_KEYPOINT_SCORE = 0.5

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

/**
 * 스쿼트 자세 분석 메인 함수
 *
 * @param keypoints - MediaPipe BlazePose 33개 키포인트 배열
 * @param state - 이전 분석 상태 (반복 카운트, 페이즈 추적용)
 * @returns 분석 결과 및 업데이트된 상태
 */
export function analyzeSquat(
  keypoints: Keypoint[],
  state: SquatAnalyzerState
): { result: SquatAnalysisResult; newState: SquatAnalyzerState } {
  // 필요한 키포인트 추출
  const leftShoulder = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]
  const rightShoulder = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]
  const leftHip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP]
  const rightHip = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP]
  const leftKnee = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_KNEE]
  const rightKnee = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]
  const leftAnkle = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]
  const rightAnkle = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]
  const leftHeel = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HEEL]
  const rightHeel = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HEEL]
  const leftFootIndex = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_FOOT_INDEX]
  const rightFootIndex = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_FOOT_INDEX]

  // 키포인트 유효성 검사
  const requiredKeypoints = [
    leftShoulder, rightShoulder,
    leftHip, rightHip,
    leftKnee, rightKnee,
    leftAnkle, rightAnkle,
    leftHeel, rightHeel,
    leftFootIndex, rightFootIndex,
  ]

  const allValid = requiredKeypoints.every(kp => isValidKeypoint(kp, MIN_KEYPOINT_SCORE))

  if (!allValid) {
    return {
      result: createInvalidResult(),
      newState: state,
    }
  }

  // Point3D로 변환
  const points = {
    leftShoulder: keypointToPoint3D(leftShoulder),
    rightShoulder: keypointToPoint3D(rightShoulder),
    leftHip: keypointToPoint3D(leftHip),
    rightHip: keypointToPoint3D(rightHip),
    leftKnee: keypointToPoint3D(leftKnee),
    rightKnee: keypointToPoint3D(rightKnee),
    leftAnkle: keypointToPoint3D(leftAnkle),
    rightAnkle: keypointToPoint3D(rightAnkle),
    leftHeel: keypointToPoint3D(leftHeel),
    rightHeel: keypointToPoint3D(rightHeel),
    leftFootIndex: keypointToPoint3D(leftFootIndex),
    rightFootIndex: keypointToPoint3D(rightFootIndex),
  }

  // 각도 계산 (with optional depth normalization and knee baseline)
  const rawAngles = calculateRawAngles(
    points,
    state.smootherSet,
    keypoints,
    state.depthConfig,
    state.standingKneeAlignment
  )

  // 각 항목 분석
  const kneeAngleFeedback = analyzeKneeAngle(rawAngles.avgKneeAngle)
  const hipAngleFeedback = analyzeHipAngle(rawAngles.avgHipAngle)
  const torsoFeedback = analyzeTorsoInclination(rawAngles.torsoAngle)
  const valgusFeeback = analyzeKneeValgus(
    rawAngles.kneeValgusPercent,
    rawAngles.kneeAlignment3D
  )
  const ankleAngleFeedback = analyzeAnkleAngle(
    rawAngles.avgAnkleAngle,
    rawAngles.heelRiseDetected
  )

  // 대칭성 분석
  const kneeSymmetry = analyzeSymmetry(
    rawAngles.leftKneeAngle,
    rawAngles.rightKneeAngle,
    '무릎'
  )
  const hipSymmetry = analyzeSymmetry(
    rawAngles.leftHipAngle,
    rawAngles.rightHipAngle,
    '엉덩이'
  )
  const ankleSymmetry = analyzeSymmetry(
    rawAngles.leftAnkleAngle,
    rawAngles.rightAnkleAngle,
    '발목'
  )

  // 목 정렬 분석
  const neckResult = analyzeNeckAlignment(keypoints, 'squat')
  const neckFeedback = createNeckAlignmentFeedback(neckResult, 'squat')

  // Torso rotation analysis
  const rotationResult = analyzeTorsoRotation(keypoints)
  const rotationFeedback = createTorsoRotationFeedback(rotationResult, 'squat')

  // Pelvic tilt analysis
  const pelvicTiltResult = analyzePelvicTilt(
    keypoints,
    state.pelvicTiltState ?? createInitialPelvicTiltState(undefined, state.depthConfig)
  )
  const pelvicFeedback = pelvicTiltResult.result.isValid
    ? createPelvicTiltFeedback(pelvicTiltResult.result, 'squat')
    : undefined

  // 종합 점수 계산
  const score = calculateOverallScore({
    kneeAngle: kneeAngleFeedback,
    hipAngle: hipAngleFeedback,
    torsoInclination: torsoFeedback,
    kneeValgus: valgusFeeback,
    ankleAngle: ankleAngleFeedback,
    kneeSymmetry,
    hipSymmetry,
    ankleSymmetry,
    neckAlignment: neckFeedback,
    torsoRotation: rotationFeedback,
    pelvicTilt: pelvicFeedback,
  })

  // 페이즈 및 반복 완료 판별
  const { phase, repCompleted, newState } = determinePhaseAndRep(
    rawAngles.avgKneeAngle,
    state
  )

  // Create updated state with knee alignment tracking
  let updatedState = { ...newState }

  // Capture standing baseline when in standing phase
  if (phase === 'standing' && !state.standingKneeAlignment && rawAngles.kneeAlignment3D?.isValid) {
    updatedState = {
      ...updatedState,
      standingKneeAlignment: {
        leftDeviation: rawAngles.kneeAlignment3D.leftDeviationDegrees,
        rightDeviation: rawAngles.kneeAlignment3D.rightDeviationDegrees,
        capturedAt: Date.now(),
      },
    }
  }

  // Track peak deviation during rep
  if (rawAngles.kneeAlignment3D?.isValid) {
    const currentPeak = rawAngles.kneeAlignment3D.peakDeviation
    if (phase === 'standing') {
      updatedState = { ...updatedState, currentRepPeakDeviation: 0 }  // Reset at start
    } else {
      updatedState = {
        ...updatedState,
        currentRepPeakDeviation: Math.max(
          state.currentRepPeakDeviation ?? 0,
          currentPeak
        ),
      }
    }
  }

  // Update pelvic tilt state
  updatedState = {
    ...updatedState,
    pelvicTiltState: pelvicTiltResult.newState,
  }

  return {
    result: {
      score,
      feedbacks: {
        kneeAngle: kneeAngleFeedback,
        hipAngle: hipAngleFeedback,
        torsoInclination: torsoFeedback,
        kneeValgus: valgusFeeback,
        ankleAngle: ankleAngleFeedback,
        neckAlignment: neckFeedback ?? undefined,
        torsoRotation: rotationFeedback ?? undefined,
        pelvicTilt: pelvicFeedback,
        symmetry: {
          knee: kneeSymmetry,
          hip: hipSymmetry,
          ankle: ankleSymmetry,
        },
      },
      repCompleted,
      phase,
      rawAngles: {
        leftKneeAngle: rawAngles.leftKneeAngle,
        rightKneeAngle: rawAngles.rightKneeAngle,
        leftHipAngle: rawAngles.leftHipAngle,
        rightHipAngle: rawAngles.rightHipAngle,
        torsoAngle: rawAngles.torsoAngle,
        kneeValgusPercent: rawAngles.kneeValgusPercent,
        kneeSymmetryScore: kneeSymmetry.value,
        hipSymmetryScore: hipSymmetry.value,
        leftAnkleAngle: rawAngles.leftAnkleAngle,
        rightAnkleAngle: rawAngles.rightAnkleAngle,
        avgAnkleAngle: rawAngles.avgAnkleAngle,
        heelRiseDetected: rawAngles.heelRiseDetected,
        ankleSymmetryScore: ankleSymmetry.value,
        neckAngle: neckResult.isValid ? neckResult.neckAngle : undefined,
        neckForwardPosture: neckResult.isValid ? neckResult.forwardPosture : undefined,
        neckExtensionFlexion: neckResult.isValid ? neckResult.extensionFlexion : undefined,
        torsoRotationAngle: rotationResult.isValid ? rotationResult.rotationAngle : undefined,
        pelvicTiltAngle: pelvicTiltResult.result.isValid ? pelvicTiltResult.result.anteriorTiltAngle : undefined,
        lateralPelvicTilt: pelvicTiltResult.result.isValid ? pelvicTiltResult.result.lateralTiltAngle : undefined,
        pelvicStabilityScore: pelvicTiltResult.result.isValid ? pelvicTiltResult.result.stabilityScore : undefined,
        depthConfidence: rawAngles.depthConfidence,
        perspectiveFactor: rawAngles.perspectiveFactor,
        // 3D knee alignment data
        kneeDeviation3D: rawAngles.kneeAlignment3D?.isValid ? {
          leftDegrees: rawAngles.kneeAlignment3D.leftDeviationDegrees,
          rightDegrees: rawAngles.kneeAlignment3D.rightDeviationDegrees,
          leftType: rawAngles.kneeAlignment3D.leftDeviationType,
          rightType: rawAngles.kneeAlignment3D.rightDeviationType,
          dynamicChange: rawAngles.kneeAlignment3D.dynamicValgusChange,
          peakDeviation: updatedState.currentRepPeakDeviation ?? 0,
        } : undefined,
      },
    },
    newState: updatedState,
  }
}

// ============================================
// 각도 계산 함수
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
  leftHeel: Point3D
  rightHeel: Point3D
  leftFootIndex: Point3D
  rightFootIndex: Point3D
}

/**
 * Analyze knee alignment in 3D space relative to hip-ankle line
 *
 * Uses pointToLineDistance to calculate how far each knee deviates
 * from the ideal alignment (directly between hip and ankle).
 *
 * Positive deviation = knee is medial (toward midline) = VALGUS
 * Negative deviation = knee is lateral (away from midline) = VARUS
 */
function analyzeKneeAlignment3D(
  points: Points,
  standingBaseline?: { leftDeviation: number; rightDeviation: number }
): KneeAlignmentResult {
  // Calculate perpendicular distance from knee to hip-ankle line
  const leftKneeDistance = pointToLineDistance(
    points.leftKnee,
    points.leftHip,
    points.leftAnkle
  )
  const rightKneeDistance = pointToLineDistance(
    points.rightKnee,
    points.rightHip,
    points.rightAnkle
  )

  // Determine direction of deviation (medial vs lateral)
  // Compare knee X position to midpoint of hip-ankle X positions
  const leftHipAnkleMidX = (points.leftHip.x + points.leftAnkle.x) / 2
  const rightHipAnkleMidX = (points.rightHip.x + points.rightAnkle.x) / 2

  // For left leg: if knee.x > midpoint.x, knee is medial (valgus)
  // For right leg: if knee.x < midpoint.x, knee is medial (valgus)
  const leftIsMedial = points.leftKnee.x > leftHipAnkleMidX
  const rightIsMedial = points.rightKnee.x < rightHipAnkleMidX

  // Signed deviation: positive = valgus, negative = varus
  const leftDeviation = leftIsMedial ? leftKneeDistance : -leftKneeDistance
  const rightDeviation = rightIsMedial ? rightKneeDistance : -rightKneeDistance

  // Convert to approximate degrees using leg length as reference
  const leftLegLength = distance3D(points.leftHip, points.leftAnkle)
  const rightLegLength = distance3D(points.rightHip, points.rightAnkle)

  // Angle = arcsin(deviation / legLength) converted to degrees
  const leftDeviationDegrees = leftLegLength > 0
    ? Math.asin(Math.min(1, Math.abs(leftDeviation) / leftLegLength)) * (180 / Math.PI) * Math.sign(leftDeviation)
    : 0
  const rightDeviationDegrees = rightLegLength > 0
    ? Math.asin(Math.min(1, Math.abs(rightDeviation) / rightLegLength)) * (180 / Math.PI) * Math.sign(rightDeviation)
    : 0

  // Determine deviation type based on thresholds
  const getDeviationType = (degrees: number): KneeDeviationType => {
    const absDegrees = Math.abs(degrees)
    if (absDegrees <= THRESHOLDS.kneeDeviation3D.ideal.max) {
      return 'neutral'
    }
    return degrees > 0 ? 'valgus' : 'varus'
  }

  // Calculate dynamic valgus change from standing baseline
  let dynamicValgusChange = 0
  if (standingBaseline) {
    const avgCurrentDeviation = (leftDeviationDegrees + rightDeviationDegrees) / 2
    const avgBaselineDeviation = (standingBaseline.leftDeviation + standingBaseline.rightDeviation) / 2
    dynamicValgusChange = avgCurrentDeviation - avgBaselineDeviation
  }

  return {
    leftDeviation,
    rightDeviation,
    leftDeviationType: getDeviationType(leftDeviationDegrees),
    rightDeviationType: getDeviationType(rightDeviationDegrees),
    leftDeviationDegrees: Math.round(leftDeviationDegrees * 10) / 10,
    rightDeviationDegrees: Math.round(rightDeviationDegrees * 10) / 10,
    dynamicValgusChange: Math.round(dynamicValgusChange * 10) / 10,
    peakDeviation: Math.max(Math.abs(leftDeviationDegrees), Math.abs(rightDeviationDegrees)),
    isValid: leftLegLength > 0 && rightLegLength > 0,
  }
}

interface RawAngles {
  leftKneeAngle: number
  rightKneeAngle: number
  avgKneeAngle: number
  leftHipAngle: number
  rightHipAngle: number
  avgHipAngle: number
  torsoAngle: number
  kneeValgusPercent: number
  leftAnkleAngle: number
  rightAnkleAngle: number
  avgAnkleAngle: number
  heelRiseDetected: boolean
  // Depth normalization info
  depthConfidence?: DepthConfidenceResult
  perspectiveFactor?: number
  // 3D Knee alignment metrics
  kneeAlignment3D?: KneeAlignmentResult
}

function calculateRawAngles(
  points: Points,
  smootherSet?: AngleSmootherSet<
    'leftKneeAngle' | 'rightKneeAngle' | 'leftHipAngle' | 'rightHipAngle' |
    'torsoAngle' | 'leftAnkleAngle' | 'rightAnkleAngle' | 'neckAngle' | 'torsoRotationAngle'
  >,
  keypoints?: Keypoint[],
  depthConfig?: DepthNormalizationConfig,
  standingKneeBaseline?: { leftDeviation: number; rightDeviation: number }
): RawAngles {
  // 무릎 각도: 엉덩이-무릎-발목
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

  // 엉덩이 각도: 어깨-엉덩이-무릎
  const leftHipAngleRaw = calculate3DAngle(
    points.leftShoulder,
    points.leftHip,
    points.leftKnee
  )
  const rightHipAngleRaw = calculate3DAngle(
    points.rightShoulder,
    points.rightHip,
    points.rightKnee
  )

  // 상체 기울기: 엉덩이 중심에서 어깨 중심까지의 벡터와 수직선 사이 각도
  const hipCenter = midpoint(points.leftHip, points.rightHip)
  const shoulderCenter = midpoint(points.leftShoulder, points.rightShoulder)
  const torsoAngleRaw = calculateAngleWithVertical(hipCenter, shoulderCenter)

  // 무릎 정렬 (Knee Valgus): 엉덩이 너비 대비 무릎 너비 비율
  const hipWidth = distance2D(points.leftHip, points.rightHip)
  const kneeWidth = distance2D(points.leftKnee, points.rightKnee)

  // 무릎이 엉덩이보다 좁아진 비율 (양수면 valgus)
  let kneeValgusPercent = 0
  if (hipWidth > 0) {
    kneeValgusPercent = ((hipWidth - kneeWidth) / hipWidth) * 100
    // 음수 (무릎이 더 넓은 경우)는 0으로 처리
    kneeValgusPercent = Math.max(0, kneeValgusPercent)
  }

  // Calculate ankle dorsiflexion angle: knee-ankle-foot_index
  const leftAnkleAngleRaw = calculate3DAngle(
    points.leftKnee,
    points.leftAnkle,
    points.leftFootIndex
  )
  const rightAnkleAngleRaw = calculate3DAngle(
    points.rightKnee,
    points.rightAnkle,
    points.rightFootIndex
  )

  // Detect heel rise by comparing heel Y-position vs foot_index Y-position
  // In screen coordinates, lower Y = higher position (heel lifting)
  const leftHeelRise = (points.leftFootIndex.y - points.leftHeel.y) >
    (Math.abs(points.leftAnkle.y - points.leftHeel.y) * THRESHOLDS.heelRise.yPositionThreshold)
  const rightHeelRise = (points.rightFootIndex.y - points.rightHeel.y) >
    (Math.abs(points.rightAnkle.y - points.rightHeel.y) * THRESHOLDS.heelRise.yPositionThreshold)
  const heelRiseDetected = leftHeelRise || rightHeelRise

  // Apply smoothing if available
  let leftKneeAngle = leftKneeAngleRaw
  let rightKneeAngle = rightKneeAngleRaw
  let leftHipAngle = leftHipAngleRaw
  let rightHipAngle = rightHipAngleRaw
  let torsoAngle = torsoAngleRaw
  let leftAnkleAngle = leftAnkleAngleRaw
  let rightAnkleAngle = rightAnkleAngleRaw

  if (smootherSet) {
    const smoothed = smootherSet.smoothAll({
      leftKneeAngle: leftKneeAngleRaw,
      rightKneeAngle: rightKneeAngleRaw,
      leftHipAngle: leftHipAngleRaw,
      rightHipAngle: rightHipAngleRaw,
      torsoAngle: torsoAngleRaw,
      leftAnkleAngle: leftAnkleAngleRaw,
      rightAnkleAngle: rightAnkleAngleRaw,
      neckAngle: 0, // Neck angle is calculated separately via neckAlignmentAnalyzer
      torsoRotationAngle: 0, // Torso rotation is calculated separately via torsoRotationAnalyzer
    })

    leftKneeAngle = smoothed.leftKneeAngle.smoothedValue
    rightKneeAngle = smoothed.rightKneeAngle.smoothedValue
    leftHipAngle = smoothed.leftHipAngle.smoothedValue
    rightHipAngle = smoothed.rightHipAngle.smoothedValue
    torsoAngle = smoothed.torsoAngle.smoothedValue
    leftAnkleAngle = smoothed.leftAnkleAngle.smoothedValue
    rightAnkleAngle = smoothed.rightAnkleAngle.smoothedValue
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
      leftKneeAngle = applyPerspectiveCorrection(leftKneeAngle, perspectiveFactor, 'kneeFlexion')
      rightKneeAngle = applyPerspectiveCorrection(rightKneeAngle, perspectiveFactor, 'kneeFlexion')
      leftHipAngle = applyPerspectiveCorrection(leftHipAngle, perspectiveFactor, 'hipFlexion')
      rightHipAngle = applyPerspectiveCorrection(rightHipAngle, perspectiveFactor, 'hipFlexion')
      torsoAngle = applyPerspectiveCorrection(torsoAngle, perspectiveFactor, 'torsoInclination')
      leftAnkleAngle = applyPerspectiveCorrection(leftAnkleAngle, perspectiveFactor, 'ankleAngle')
      rightAnkleAngle = applyPerspectiveCorrection(rightAnkleAngle, perspectiveFactor, 'ankleAngle')
    }
  }

  // Calculate 3D knee alignment
  const kneeAlignment3D = analyzeKneeAlignment3D(points, standingKneeBaseline)

  return {
    leftKneeAngle,
    rightKneeAngle,
    avgKneeAngle: (leftKneeAngle + rightKneeAngle) / 2,
    leftHipAngle,
    rightHipAngle,
    avgHipAngle: (leftHipAngle + rightHipAngle) / 2,
    torsoAngle,
    kneeValgusPercent, // This is a percentage, not an angle - don't apply depth correction
    leftAnkleAngle,
    rightAnkleAngle,
    avgAnkleAngle: (leftAnkleAngle + rightAnkleAngle) / 2,
    heelRiseDetected, // Boolean - don't smooth
    depthConfidence,
    perspectiveFactor,
    kneeAlignment3D,
  }
}

// ============================================
// 개별 항목 분석 함수
// ============================================

function analyzeKneeAngle(angle: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.kneeAngle

  // 스쿼트 시 무릎 각도는 180(서있음)에서 줄어들어야 함
  // 여기서 angle은 굽힘 각도 (180 - 실제 굽힌 정도)

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (angle >= ideal.min && angle <= ideal.max) {
    level = 'good'
    message = '완벽한 무릎 각도입니다'
    correction = 'none'
  } else if (angle >= acceptable.min && angle <= acceptable.max) {
    level = 'warning'
    if (angle < ideal.min) {
      message = '무릎을 조금 더 펴세요'
      correction = 'up'
    } else {
      message = '조금 더 깊이 앉으세요'
      correction = 'down'
    }
  } else {
    level = 'error'
    if (angle < acceptable.min) {
      message = '무릎이 너무 많이 굽혀졌습니다'
      correction = 'up'
    } else {
      message = '더 깊이 앉아야 합니다'
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

function analyzeHipAngle(angle: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.hipAngle

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (angle >= ideal.min && angle <= ideal.max) {
    level = 'good'
    message = '좋은 엉덩이 각도입니다'
    correction = 'none'
  } else if (angle >= acceptable.min && angle <= acceptable.max) {
    level = 'warning'
    if (angle < ideal.min) {
      message = '엉덩이를 조금 더 뒤로 빼세요'
      correction = 'backward'
    } else {
      message = '엉덩이를 조금 더 앞으로 가져오세요'
      correction = 'forward'
    }
  } else {
    level = 'error'
    if (angle < acceptable.min) {
      message = '엉덩이가 너무 뒤로 빠졌습니다'
      correction = 'forward'
    } else {
      message = '엉덩이를 더 뒤로 빼세요 (힙 힌지)'
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

function analyzeTorsoInclination(angle: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.torsoInclination

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (angle >= ideal.min && angle <= ideal.max) {
    level = 'good'
    message = '상체가 적절히 기울어져 있습니다'
    correction = 'none'
  } else if (angle >= acceptable.min && angle <= acceptable.max) {
    level = 'warning'
    message = '상체를 조금 더 세워주세요'
    correction = 'backward'
  } else {
    level = 'error'
    message = '상체가 너무 앞으로 기울어졌습니다'
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

/**
 * Analyze knee valgus/varus using 3D alignment data
 * Falls back to 2D analysis if 3D data unavailable
 */
function analyzeKneeValgus(
  percent: number,  // Legacy 2D percent for fallback
  alignment3D?: KneeAlignmentResult
): FeedbackItem {
  // Use 3D analysis if available
  if (alignment3D?.isValid) {
    const avgDeviation = (Math.abs(alignment3D.leftDeviationDegrees) + Math.abs(alignment3D.rightDeviationDegrees)) / 2
    const { ideal, acceptable } = THRESHOLDS.kneeDeviation3D

    let level: FeedbackLevel
    let message: string
    let correction: CorrectionDirection

    // Check for valgus (knock-knee)
    const hasValgus = alignment3D.leftDeviationType === 'valgus' || alignment3D.rightDeviationType === 'valgus'
    // Check for varus (bow-legged)
    const hasVarus = alignment3D.leftDeviationType === 'varus' || alignment3D.rightDeviationType === 'varus'

    if (avgDeviation <= ideal.max) {
      level = 'good'
      message = '무릎 정렬이 좋습니다 (3D)'
      correction = 'none'
    } else if (avgDeviation <= acceptable.max) {
      level = 'warning'
      if (hasValgus) {
        message = '무릎이 안쪽으로 약간 모입니다 (Valgus)'
        correction = 'outward'
      } else if (hasVarus) {
        message = '무릎이 바깥쪽으로 약간 벌어집니다 (Varus)'
        correction = 'inward'
      } else {
        message = '무릎 정렬을 확인하세요'
        correction = 'none'
      }
    } else {
      level = 'error'
      if (hasValgus) {
        message = '무릎이 안쪽으로 많이 모입니다 (Knee Valgus) - 바깥으로 밀어주세요'
        correction = 'outward'
      } else if (hasVarus) {
        message = '무릎이 바깥으로 과도하게 벌어집니다 (Knee Varus) - 안쪽으로 모아주세요'
        correction = 'inward'
      } else {
        message = '무릎 정렬 교정이 필요합니다'
        correction = 'none'
      }
    }

    // Add dynamic valgus warning if significant increase during movement
    if (alignment3D.dynamicValgusChange > 5) {
      message += ' (동적 Valgus 증가 감지)'
    }

    return {
      level,
      message,
      correction,
      value: Math.round(avgDeviation * 10) / 10,
      idealRange: ideal,
      acceptableRange: acceptable,
    }
  }

  // Fallback to legacy 2D analysis
  const { ideal, acceptable } = THRESHOLDS.kneeValgus

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (percent >= ideal.min && percent <= ideal.max) {
    level = 'good'
    message = '무릎 정렬이 좋습니다'
    correction = 'none'
  } else if (percent >= acceptable.min && percent <= acceptable.max) {
    level = 'warning'
    message = '무릎을 바깥쪽으로 밀어주세요'
    correction = 'outward'
  } else {
    level = 'error'
    message = '무릎이 안쪽으로 모이고 있습니다 (Knee Valgus)'
    correction = 'outward'
  }

  return {
    level,
    message,
    correction,
    value: Math.round(percent * 10) / 10,
    idealRange: ideal,
    acceptableRange: acceptable,
  }
}

function analyzeAnkleAngle(angle: number, heelRiseDetected: boolean): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.ankleAngle

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  // Heel rise takes priority in feedback
  if (heelRiseDetected) {
    level = 'warning'
    message = '발뒤꿈치가 들리고 있습니다 (발목 가동성 제한)'
    correction = 'down'
    return {
      level,
      message,
      correction,
      value: Math.round(angle * 10) / 10,
      idealRange: ideal,
      acceptableRange: acceptable,
    }
  }

  // Dorsiflexion angle assessment
  // Lower angle = less dorsiflexion mobility
  if (angle >= ideal.min && angle <= ideal.max) {
    level = 'good'
    message = '발목 가동성이 좋습니다'
    correction = 'none'
  } else if (angle >= acceptable.min && angle <= acceptable.max) {
    level = 'warning'
    if (angle < ideal.min) {
      message = '발목 가동성이 약간 제한됩니다'
      correction = 'forward'
    } else {
      message = '발목이 과도하게 굽혀져 있습니다'
      correction = 'backward'
    }
  } else {
    level = 'error'
    if (angle < acceptable.min) {
      message = '발목 가동성이 부족합니다 (스트레칭 권장)'
      correction = 'forward'
    } else {
      message = '발목 각도가 불안정합니다'
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

// ============================================
// 점수 계산
// ============================================

interface Feedbacks {
  kneeAngle: FeedbackItem
  hipAngle: FeedbackItem
  torsoInclination: FeedbackItem
  kneeValgus: FeedbackItem
  ankleAngle?: FeedbackItem
  kneeSymmetry?: FeedbackItem
  hipSymmetry?: FeedbackItem
  ankleSymmetry?: FeedbackItem
  neckAlignment?: FeedbackItem | null
  torsoRotation?: FeedbackItem | null
  pelvicTilt?: {
    anteriorTilt: PelvicTiltFeedbackItem
    lateralTilt: PelvicTiltFeedbackItem
    stability: PelvicTiltFeedbackItem
  }
}

function calculateOverallScore(feedbacks: Feedbacks): number {
  // Updated weights (sum = 1.0) - adjusted to include pelvic tilt
  const weights = {
    kneeAngle: 0.19,         // Was 0.21, reduced by 0.02
    hipAngle: 0.14,          // Was 0.16, reduced by 0.02
    torsoInclination: 0.12,  // Was 0.13, reduced by 0.01
    kneeValgus: 0.12,        // Was 0.13, reduced by 0.01
    ankleAngle: 0.13,        // Was 0.14, reduced by 0.01
    symmetry: 0.09,          // Was 0.10, reduced by 0.01
    neckAlignment: 0.06,     // Was 0.07, reduced by 0.01
    torsoRotation: 0.06,     // Unchanged
    pelvicTilt: 0.09,        // NEW - 9% weight for pelvic analysis
  }

  // 각 항목별 점수 계산
  const scores = {
    kneeAngle: calculateItemScore(feedbacks.kneeAngle),
    hipAngle: calculateItemScore(feedbacks.hipAngle),
    torsoInclination: calculateItemScore(feedbacks.torsoInclination),
    kneeValgus: calculateItemScore(feedbacks.kneeValgus),
    ankleAngle: feedbacks.ankleAngle ? calculateItemScore(feedbacks.ankleAngle) : 100,
    neckAlignment: feedbacks.neckAlignment ? calculateItemScore(feedbacks.neckAlignment) : 100,
  }

  // Calculate symmetry score (average of all symmetry scores)
  let symmetryScoreValue = 100
  const symmetryScores: number[] = []
  if (feedbacks.kneeSymmetry) symmetryScores.push(feedbacks.kneeSymmetry.value)
  if (feedbacks.hipSymmetry) symmetryScores.push(feedbacks.hipSymmetry.value)
  if (feedbacks.ankleSymmetry) symmetryScores.push(feedbacks.ankleSymmetry.value)
  if (symmetryScores.length > 0) {
    symmetryScoreValue = symmetryScores.reduce((a, b) => a + b, 0) / symmetryScores.length
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
    scores.kneeAngle * weights.kneeAngle +
    scores.hipAngle * weights.hipAngle +
    scores.torsoInclination * weights.torsoInclination +
    scores.kneeValgus * weights.kneeValgus +
    scores.ankleAngle * weights.ankleAngle +
    symmetryScoreValue * weights.symmetry +
    scores.neckAlignment * weights.neckAlignment +
    (feedbacks.torsoRotation ? calculateRotationScore(feedbacks.torsoRotation) : 100) * weights.torsoRotation +
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
  currentKneeAngle: number,
  state: SquatAnalyzerState
): { phase: SquatPhase; repCompleted: boolean; newState: SquatAnalyzerState } {
  const { previousPhase, bottomReached, repCount, lastKneeAngle } = state

  let phase: SquatPhase = previousPhase
  let repCompleted = false
  let newBottomReached = bottomReached
  let newRepCount = repCount

  // 현재 무릎 각도에 따른 페이즈 결정
  if (currentKneeAngle > PHASE_THRESHOLDS.standing) {
    // 서있는 상태
    if (previousPhase === 'ascending' && bottomReached) {
      // 올라오는 중에 서있는 상태 도달 = 1회 완료
      repCompleted = true
      newRepCount = repCount + 1
      newBottomReached = false
    }
    phase = 'standing'
  } else if (currentKneeAngle < PHASE_THRESHOLDS.bottom) {
    // 바닥 상태 (가장 깊이 앉음)
    phase = 'bottom'
    newBottomReached = true
  } else {
    // 중간 상태 - 방향 판단
    const angleDiff = currentKneeAngle - lastKneeAngle

    if (Math.abs(angleDiff) > PHASE_THRESHOLDS.hysteresis) {
      if (angleDiff < 0) {
        // 각도가 줄어듦 = 내려가는 중
        phase = 'descending'
      } else {
        // 각도가 늘어남 = 올라가는 중
        phase = 'ascending'
      }
    }
    // 히스테리시스 범위 내면 이전 페이즈 유지
  }

  return {
    phase,
    repCompleted,
    newState: {
      previousPhase: phase,
      bottomReached: newBottomReached,
      repCount: newRepCount,
      lastKneeAngle: currentKneeAngle,
    },
  }
}

// ============================================
// 유틸리티 함수
// ============================================

function createInvalidResult(): SquatAnalysisResult {
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
      kneeAngle: invalidFeedback,
      hipAngle: invalidFeedback,
      torsoInclination: invalidFeedback,
      kneeValgus: invalidFeedback,
      ankleAngle: invalidFeedback,
    },
    repCompleted: false,
    phase: 'standing',
    rawAngles: {
      leftKneeAngle: 0,
      rightKneeAngle: 0,
      leftHipAngle: 0,
      rightHipAngle: 0,
      torsoAngle: 0,
      kneeValgusPercent: 0,
      leftAnkleAngle: 0,
      rightAnkleAngle: 0,
      avgAnkleAngle: 0,
      heelRiseDetected: false,
    },
  }
}

/**
 * 초기 분석 상태 생성
 * @param smoothingConfig - Optional smoothing configuration. Pass to enable angle smoothing.
 * @param depthConfig - Optional depth normalization configuration. Pass to enable perspective correction.
 */
export function createInitialState(
  smoothingConfig?: Partial<SmoothingConfig>,
  depthConfig?: Partial<DepthNormalizationConfig>
): SquatAnalyzerState {
  return {
    previousPhase: 'standing',
    bottomReached: false,
    repCount: 0,
    lastKneeAngle: 180,
    smootherSet: smoothingConfig ? createSquatSmootherSet(smoothingConfig) : undefined,
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
export function getPhaseLabel(phase: SquatPhase): string {
  switch (phase) {
    case 'standing':
      return '서있음'
    case 'descending':
      return '내려가는 중'
    case 'bottom':
      return '최저점'
    case 'ascending':
      return '올라오는 중'
  }
}

/**
 * 분석 결과에서 대칭성 데이터를 UI용으로 변환
 */
export function createSymmetryData(
  result: SquatAnalysisResult
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
  const hipSymmetry = result.feedbacks.symmetry.hip

  // Extract direction from message (a simple heuristic based on Korean text)
  const getDirection = (message: string): 'left' | 'right' | 'balanced' => {
    if (message.includes('왼쪽')) return 'left'
    if (message.includes('오른쪽')) return 'right'
    return 'balanced'
  }

  const data = [
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
      jointName: '엉덩이',
      score: result.rawAngles.hipSymmetryScore ?? 0,
      leftAngle: result.rawAngles.leftHipAngle,
      rightAngle: result.rawAngles.rightHipAngle,
      level: hipSymmetry.level,
      direction: getDirection(hipSymmetry.message),
      message: hipSymmetry.message,
    },
  ]

  // Add ankle symmetry if available
  if (result.feedbacks.symmetry.ankle) {
    const ankleSymmetry = result.feedbacks.symmetry.ankle
    data.push({
      jointName: '발목',
      score: result.rawAngles.ankleSymmetryScore ?? 0,
      leftAngle: result.rawAngles.leftAnkleAngle,
      rightAngle: result.rawAngles.rightAnkleAngle,
      level: ankleSymmetry.level,
      direction: getDirection(ankleSymmetry.message),
      message: ankleSymmetry.message,
    })
  }

  return data
}

// ============================================
// Velocity-Integrated Analysis Functions
// ============================================

/**
 * Analyze squat with integrated velocity tracking
 * Returns enhanced feedback with velocity context
 */
export function analyzeSquatWithVelocity(
  keypoints: Keypoint[],
  state: SquatAnalyzerState,
  velocityResult: VelocityAnalysisResult | null
): {
  result: SquatAnalysisResult & { velocityCorrelatedFeedbacks?: IntegratedFeedbackItem[] };
  newState: SquatAnalyzerState;
} {
  // Run base squat analysis
  const { result: baseResult, newState: baseNewState } = analyzeSquat(keypoints, state)

  // If no velocity data, return base result
  if (!velocityResult) {
    return { result: baseResult, newState: baseNewState }
  }

  // Initialize integration state if needed
  const integrationState = state.velocityIntegrationState?.integratedState
    ?? createIntegratedAnalyzerState()

  // Collect current angles for angular velocity calculation
  const currentAngles: Record<string, number> = {
    leftKnee: baseResult.rawAngles.leftKneeAngle,
    rightKnee: baseResult.rawAngles.rightKneeAngle,
    leftHip: baseResult.rawAngles.leftHipAngle,
    rightHip: baseResult.rawAngles.rightHipAngle,
    torso: baseResult.rawAngles.torsoAngle,
  }

  // Run integrated analysis
  const { result: integratedResult, newState: newIntegratedState } = analyzeIntegrated(
    currentAngles,
    velocityResult.joints,
    velocityResult.timestamp,
    velocityResult.currentPhase,
    integrationState
  )

  // Determine velocity context
  const primaryJoint = velocityResult.joints.leftHip ?? velocityResult.joints.rightHip
  const velocityContext = primaryJoint?.isValid
    ? determineVelocityContext(primaryJoint.smoothedVelocity, { optimal: { min: 80, max: 150 } })
    : null

  // Assess velocity-correlated risks
  const velocityCorrelatedRisks: VelocityCorrelatedRisk[] = []

  // Knee valgus at high velocity is more dangerous
  if (baseResult.feedbacks.kneeValgus.level !== 'good') {
    velocityCorrelatedRisks.push(
      assessVelocityCorrelatedRisk(
        'knee_valgus',
        baseResult.feedbacks.kneeValgus.level,
        velocityContext,
        integratedResult.angularVelocities.leftKnee?.smoothedAngularVelocity ?? 0
      )
    )
  }

  // Create enhanced feedback items with velocity context
  const velocityCorrelatedFeedbacks: IntegratedFeedbackItem[] = []

  // Knee valgus with velocity context
  const kneeValgusRisk = velocityCorrelatedRisks.find(r => r.riskType === 'knee_valgus')
  if (kneeValgusRisk) {
    velocityCorrelatedFeedbacks.push({
      ...baseResult.feedbacks.kneeValgus,
      level: kneeValgusRisk.velocityAdjustedLevel,
      velocityContext: kneeValgusRisk.velocityContext,
      angularVelocity: integratedResult.angularVelocities.leftKnee?.smoothedAngularVelocity,
      isVelocityCorrelated: true,
      message: kneeValgusRisk.velocityContext === 'high_velocity'
        ? `${baseResult.feedbacks.kneeValgus.message} (Fast descent - increased risk)`
        : baseResult.feedbacks.kneeValgus.message,
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
        tempoAwareMode: integratedResult.movementQuality === 'controlled',
        lastVelocityContext: velocityContext,
      },
    },
  }
}

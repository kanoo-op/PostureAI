/**
 * 3D 좌표 기반 런지 분석 모듈
 * MediaPipe BlazePose 랜드마크를 사용한 실시간 런지 자세 분석
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
import { AngleSmootherSet, SmoothingConfig, createLungeSmootherSet } from './angleSmoother'
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

// ============================================
// 타입 정의
// ============================================

export type FeedbackLevel = 'good' | 'warning' | 'error'
export type LungePhase = 'standing' | 'descending' | 'bottom' | 'ascending'
export type CorrectionDirection = 'up' | 'down' | 'forward' | 'backward' | 'inward' | 'outward' | 'none'
export type LungeLeg = 'left' | 'right' | 'unknown'

export interface FeedbackItem {
  level: FeedbackLevel
  message: string
  correction: CorrectionDirection
  value: number
  idealRange: { min: number; max: number }
  acceptableRange: { min: number; max: number }
}

export interface LungeAnalysisResult {
  score: number // 0-100 종합 점수
  feedbacks: {
    frontKneeAngle: FeedbackItem
    backKneeAngle: FeedbackItem
    hipAngle: FeedbackItem
    torsoInclination: FeedbackItem
    kneeOverToe: FeedbackItem
    neckAlignment?: FeedbackItem
    hipFlexorTightness?: FeedbackItem  // Hip flexor tightness detection
    torsoRotation?: FeedbackItem
    pelvicTilt?: {
      anteriorTilt: PelvicTiltFeedbackItem
      lateralTilt: PelvicTiltFeedbackItem
      stability: PelvicTiltFeedbackItem
    }
  }
  repCompleted: boolean
  phase: LungePhase
  frontLeg: LungeLeg
  rawAngles: {
    frontKneeAngle: number
    backKneeAngle: number
    frontHipAngle: number
    backHipAngle: number
    torsoAngle: number
    kneeOverToeDistance: number
    neckAngle?: number
    neckForwardPosture?: number
    neckExtensionFlexion?: number
    backHipExtensionAngle?: number  // Front-hip to back-hip to back-knee angle
    pelvicTiltAngle?: number        // Hip line angle from vertical
    torsoRotationAngle?: number
    anteriorPelvicTilt?: number     // Pelvic tilt analyzer anterior angle
    lateralPelvicTilt?: number      // Pelvic tilt analyzer lateral angle
    pelvicStabilityScore?: number   // Pelvic tilt stability score
    // Depth normalization info
    depthConfidence?: DepthConfidenceResult
    perspectiveFactor?: number
  }
}

export interface LungeAnalyzerState {
  previousPhase: LungePhase
  bottomReached: boolean
  repCount: number
  lastFrontKneeAngle: number
  // Optional smoothing state
  smootherSet?: AngleSmootherSet<
    'frontKneeAngle' | 'backKneeAngle' | 'frontHipAngle' | 'backHipAngle' | 'torsoAngle' | 'neckAngle' | 'backHipExtensionAngle' | 'torsoRotationAngle'
  >
  // Optional depth normalization configuration
  depthConfig?: DepthNormalizationConfig
  // Optional calibration state for T-pose baseline
  calibrationState?: CalibrationState
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
  frontKneeAngle: {
    ideal: { min: 85, max: 100 },     // 이상적인 앞 무릎 각도 (약 90도)
    acceptable: { min: 75, max: 110 },
  },
  backKneeAngle: {
    ideal: { min: 85, max: 105 },     // 뒤 무릎도 약 90도에 가까워야 함
    acceptable: { min: 70, max: 120 },
  },
  hipAngle: {
    ideal: { min: 80, max: 110 },
    acceptable: { min: 70, max: 120 },
  },
  torsoInclination: {
    ideal: { min: 0, max: 15 },       // 런지는 상체를 더 세워야 함
    acceptable: { min: 0, max: 25 },
  },
  kneeOverToe: {
    ideal: { min: -0.05, max: 0.05 }, // 무릎이 발끝보다 약간 앞/뒤 허용 (비율)
    acceptable: { min: -0.10, max: 0.10 },
  },
  hipFlexorTightness: {
    ideal: { min: 170, max: 180 },      // Full hip extension (no tightness)
    acceptable: { min: 165, max: 180 }, // Minor tightness acceptable
  },
  pelvicTilt: {
    ideal: { min: 0, max: 10 },         // Minimal anterior tilt
    acceptable: { min: 0, max: 15 },    // Acceptable tilt range
  },
} as const

const PHASE_THRESHOLDS = {
  standing: 160,  // 서있는 상태 (앞 무릎 거의 펴짐)
  bottom: 100,    // 바닥 상태 (가장 깊게 내려간 상태)
  hysteresis: 5,  // 상태 변경 시 히스테리시스
} as const

const MIN_KEYPOINT_SCORE = 0.5

// ============================================
// 앞다리 감지 함수
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
  leftFootIndex: Point3D
  rightFootIndex: Point3D
}

/**
 * 런지에서 앞다리 감지
 * Z좌표(깊이)가 더 작은 쪽 = 카메라에 더 가까운 쪽 = 앞다리
 * 또는 발목 Y좌표가 더 낮은 쪽 (화면 아래쪽) = 앞다리
 */
function detectFrontLeg(points: Points): LungeLeg {
  // 발목 Z좌표로 판단 (더 작은 값이 카메라에 가까움 = 앞쪽)
  const leftAnkleZ = points.leftAnkle.z
  const rightAnkleZ = points.rightAnkle.z

  // Z 차이가 충분히 크면 Z로 판단
  const zDiff = Math.abs(leftAnkleZ - rightAnkleZ)
  if (zDiff > 0.05) {
    return leftAnkleZ < rightAnkleZ ? 'left' : 'right'
  }

  // Z 차이가 작으면 발끝 Y좌표로 판단 (더 아래 = 앞)
  const leftFootY = points.leftFootIndex.y
  const rightFootY = points.rightFootIndex.y

  if (Math.abs(leftFootY - rightFootY) > 0.03) {
    return leftFootY > rightFootY ? 'left' : 'right'
  }

  return 'unknown'
}

// ============================================
// 메인 분석 함수
// ============================================

/**
 * 런지 자세 분석 메인 함수
 *
 * @param keypoints - MediaPipe BlazePose 33개 키포인트 배열
 * @param state - 이전 분석 상태 (반복 카운트, 페이즈 추적용)
 * @returns 분석 결과 및 업데이트된 상태
 */
export function analyzeLunge(
  keypoints: Keypoint[],
  state: LungeAnalyzerState
): { result: LungeAnalysisResult; newState: LungeAnalyzerState } {
  // 필요한 키포인트 추출
  const leftShoulder = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]
  const rightShoulder = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]
  const leftHip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP]
  const rightHip = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP]
  const leftKnee = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_KNEE]
  const rightKnee = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]
  const leftAnkle = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]
  const rightAnkle = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]
  const leftFootIndex = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_FOOT_INDEX]
  const rightFootIndex = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_FOOT_INDEX]

  // 키포인트 유효성 검사
  const requiredKeypoints = [
    leftShoulder, rightShoulder,
    leftHip, rightHip,
    leftKnee, rightKnee,
    leftAnkle, rightAnkle,
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
  const points: Points = {
    leftShoulder: keypointToPoint3D(leftShoulder),
    rightShoulder: keypointToPoint3D(rightShoulder),
    leftHip: keypointToPoint3D(leftHip),
    rightHip: keypointToPoint3D(rightHip),
    leftKnee: keypointToPoint3D(leftKnee),
    rightKnee: keypointToPoint3D(rightKnee),
    leftAnkle: keypointToPoint3D(leftAnkle),
    rightAnkle: keypointToPoint3D(rightAnkle),
    leftFootIndex: keypointToPoint3D(leftFootIndex),
    rightFootIndex: keypointToPoint3D(rightFootIndex),
  }

  // 앞다리 감지
  const frontLeg = detectFrontLeg(points)

  // 각도 계산 (with optional depth normalization)
  const rawAngles = calculateRawAngles(points, frontLeg, state.smootherSet, keypoints, state.depthConfig)

  // 페이즈 및 반복 완료 판별 (moved up to determine phase before hip flexor analysis)
  const { phase, repCompleted, newState } = determinePhaseAndRep(
    rawAngles.frontKneeAngle,
    state
  )

  // 각 항목 분석
  const frontKneeAngleFeedback = analyzeFrontKneeAngle(rawAngles.frontKneeAngle)
  const backKneeAngleFeedback = analyzeBackKneeAngle(rawAngles.backKneeAngle)
  const hipAngleFeedback = analyzeHipAngle(rawAngles.frontHipAngle)
  const torsoFeedback = analyzeTorsoInclination(rawAngles.torsoAngle)
  const kneeOverToeFeedback = analyzeKneeOverToe(rawAngles.kneeOverToeDistance)

  // 목 정렬 분석
  const neckResult = analyzeNeckAlignment(keypoints, 'lunge')
  const neckFeedback = createNeckAlignmentFeedback(neckResult, 'lunge')

  // 고관절 굴곡근 분석 (Hip flexor tightness analysis)
  const hipFlexorFeedback = analyzeHipFlexorTightness(
    rawAngles.backHipExtensionAngle,
    rawAngles.pelvicTiltAngle,
    phase
  )

  // Torso rotation analysis (with front leg adjustment)
  const rotationResult = analyzeTorsoRotation(keypoints)
  const rotationFeedback = createTorsoRotationFeedback(
    rotationResult,
    'lunge',
    false,
    frontLeg
  )

  // Pelvic tilt analysis
  const pelvicTiltResult = analyzePelvicTilt(
    keypoints,
    state.pelvicTiltState ?? createInitialPelvicTiltState(undefined, state.depthConfig)
  )
  const pelvicFeedback = pelvicTiltResult.result.isValid
    ? createPelvicTiltFeedback(pelvicTiltResult.result, 'lunge')
    : undefined

  // 종합 점수 계산
  const score = calculateOverallScore({
    frontKneeAngle: frontKneeAngleFeedback,
    backKneeAngle: backKneeAngleFeedback,
    hipAngle: hipAngleFeedback,
    torsoInclination: torsoFeedback,
    kneeOverToe: kneeOverToeFeedback,
    neckAlignment: neckFeedback,
    hipFlexorTightness: hipFlexorFeedback,
    torsoRotation: rotationFeedback,
    pelvicTilt: pelvicFeedback,
  })

  // Update state with pelvic tilt
  const updatedState = {
    ...newState,
    pelvicTiltState: pelvicTiltResult.newState,
  }

  return {
    result: {
      score,
      feedbacks: {
        frontKneeAngle: frontKneeAngleFeedback,
        backKneeAngle: backKneeAngleFeedback,
        hipAngle: hipAngleFeedback,
        torsoInclination: torsoFeedback,
        kneeOverToe: kneeOverToeFeedback,
        neckAlignment: neckFeedback ?? undefined,
        hipFlexorTightness: hipFlexorFeedback ?? undefined,
        torsoRotation: rotationFeedback ?? undefined,
        pelvicTilt: pelvicFeedback,
      },
      repCompleted,
      phase,
      frontLeg,
      rawAngles: {
        ...rawAngles,
        neckAngle: neckResult.isValid ? neckResult.neckAngle : undefined,
        neckForwardPosture: neckResult.isValid ? neckResult.forwardPosture : undefined,
        neckExtensionFlexion: neckResult.isValid ? neckResult.extensionFlexion : undefined,
        backHipExtensionAngle: rawAngles.backHipExtensionAngle,
        pelvicTiltAngle: rawAngles.pelvicTiltAngle,
        torsoRotationAngle: rotationResult.isValid ? rotationResult.rotationAngle : undefined,
        anteriorPelvicTilt: pelvicTiltResult.result.isValid ? pelvicTiltResult.result.anteriorTiltAngle : undefined,
        lateralPelvicTilt: pelvicTiltResult.result.isValid ? pelvicTiltResult.result.lateralTiltAngle : undefined,
        pelvicStabilityScore: pelvicTiltResult.result.isValid ? pelvicTiltResult.result.stabilityScore : undefined,
        depthConfidence: rawAngles.depthConfidence,
        perspectiveFactor: rawAngles.perspectiveFactor,
      },
    },
    newState: updatedState,
  }
}

// ============================================
// 각도 계산 함수
// ============================================

interface RawAngles {
  frontKneeAngle: number
  backKneeAngle: number
  frontHipAngle: number
  backHipAngle: number
  torsoAngle: number
  kneeOverToeDistance: number
  backHipExtensionAngle: number  // NEW: Front-hip to back-hip to back-knee angle
  pelvicTiltAngle: number        // NEW: Hip line angle from vertical
  // Depth normalization info
  depthConfidence?: DepthConfidenceResult
  perspectiveFactor?: number
}

function calculateRawAngles(
  points: Points,
  frontLeg: LungeLeg,
  smootherSet?: AngleSmootherSet<
    'frontKneeAngle' | 'backKneeAngle' | 'frontHipAngle' | 'backHipAngle' | 'torsoAngle' | 'neckAngle' | 'backHipExtensionAngle' | 'torsoRotationAngle'
  >,
  keypoints?: Keypoint[],
  depthConfig?: DepthNormalizationConfig
): RawAngles {
  // 앞다리와 뒷다리 포인트 결정
  const isLeftFront = frontLeg === 'left'

  const frontHip = isLeftFront ? points.leftHip : points.rightHip
  const frontKnee = isLeftFront ? points.leftKnee : points.rightKnee
  const frontAnkle = isLeftFront ? points.leftAnkle : points.rightAnkle
  const frontShoulder = isLeftFront ? points.leftShoulder : points.rightShoulder
  const frontFootIndex = isLeftFront ? points.leftFootIndex : points.rightFootIndex

  const backHip = isLeftFront ? points.rightHip : points.leftHip
  const backKnee = isLeftFront ? points.rightKnee : points.leftKnee
  const backAnkle = isLeftFront ? points.rightAnkle : points.leftAnkle
  const backShoulder = isLeftFront ? points.rightShoulder : points.leftShoulder

  // 앞 무릎 각도: 엉덩이-무릎-발목
  const frontKneeAngleRaw = calculate3DAngle(frontHip, frontKnee, frontAnkle)

  // 뒤 무릎 각도: 엉덩이-무릎-발목
  const backKneeAngleRaw = calculate3DAngle(backHip, backKnee, backAnkle)

  // 앞쪽 엉덩이 각도: 어깨-엉덩이-무릎
  const frontHipAngleRaw = calculate3DAngle(frontShoulder, frontHip, frontKnee)

  // 뒤쪽 엉덩이 각도
  const backHipAngleRaw = calculate3DAngle(backShoulder, backHip, backKnee)

  // 상체 기울기: 엉덩이 중심에서 어깨 중심까지의 벡터와 수직선 사이 각도
  const hipCenter = midpoint(points.leftHip, points.rightHip)
  const shoulderCenter = midpoint(points.leftShoulder, points.rightShoulder)
  const torsoAngleRaw = calculateAngleWithVertical(hipCenter, shoulderCenter)

  // Knee-over-toe 계산: 앞 무릎이 발끝보다 얼마나 앞에 있는지
  // 양수 = 무릎이 발끝보다 앞, 음수 = 무릎이 발끝보다 뒤
  const hipToAnkleDistance = distance2D(frontHip, frontAnkle)
  let kneeOverToeDistance = 0
  if (hipToAnkleDistance > 0) {
    // X좌표 차이를 엉덩이-발목 거리로 정규화
    kneeOverToeDistance = (frontKnee.x - frontFootIndex.x) / hipToAnkleDistance
  }

  // NEW: Back Hip Extension Angle (measures hip flexor flexibility)
  // Angle: frontHip -> backHip -> backKnee
  // When hip flexors are tight, this angle will be restricted (<170 degrees)
  const backHipExtensionAngleRaw = calculate3DAngle(frontHip, backHip, backKnee)

  // NEW: Pelvic Tilt Angle
  // Measures how much the pelvis tilts anteriorly (forward)
  // Use hip line (frontHip to backHip) angle from vertical
  const pelvicTiltAngleRaw = calculateAngleWithVertical(backHip, frontHip)

  // Apply smoothing if available
  let frontKneeAngle = frontKneeAngleRaw
  let backKneeAngle = backKneeAngleRaw
  let frontHipAngle = frontHipAngleRaw
  let backHipAngle = backHipAngleRaw
  let torsoAngle = torsoAngleRaw
  let backHipExtensionAngle = backHipExtensionAngleRaw

  if (smootherSet) {
    const smoothed = smootherSet.smoothAll({
      frontKneeAngle: frontKneeAngleRaw,
      backKneeAngle: backKneeAngleRaw,
      frontHipAngle: frontHipAngleRaw,
      backHipAngle: backHipAngleRaw,
      torsoAngle: torsoAngleRaw,
      neckAngle: 0, // Neck angle is calculated separately via neckAlignmentAnalyzer
      backHipExtensionAngle: backHipExtensionAngleRaw,
      torsoRotationAngle: 0, // Torso rotation is calculated separately via torsoRotationAnalyzer
    })

    frontKneeAngle = smoothed.frontKneeAngle.smoothedValue
    backKneeAngle = smoothed.backKneeAngle.smoothedValue
    frontHipAngle = smoothed.frontHipAngle.smoothedValue
    backHipAngle = smoothed.backHipAngle.smoothedValue
    torsoAngle = smoothed.torsoAngle.smoothedValue
    backHipExtensionAngle = smoothed.backHipExtensionAngle.smoothedValue
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
      frontKneeAngle = applyPerspectiveCorrection(frontKneeAngle, perspectiveFactor, 'kneeFlexion')
      backKneeAngle = applyPerspectiveCorrection(backKneeAngle, perspectiveFactor, 'kneeFlexion')
      frontHipAngle = applyPerspectiveCorrection(frontHipAngle, perspectiveFactor, 'hipFlexion')
      backHipAngle = applyPerspectiveCorrection(backHipAngle, perspectiveFactor, 'hipFlexion')
      torsoAngle = applyPerspectiveCorrection(torsoAngle, perspectiveFactor, 'torsoInclination')
    }
  }

  return {
    frontKneeAngle,
    backKneeAngle,
    frontHipAngle,
    backHipAngle,
    torsoAngle,
    kneeOverToeDistance, // Distance ratio - don't apply depth correction
    backHipExtensionAngle,
    pelvicTiltAngle: pelvicTiltAngleRaw, // Orientation metric - don't apply depth correction
    depthConfidence,
    perspectiveFactor,
  }
}

// ============================================
// 개별 항목 분석 함수
// ============================================

function analyzeFrontKneeAngle(angle: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.frontKneeAngle

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (angle >= ideal.min && angle <= ideal.max) {
    level = 'good'
    message = '앞 무릎 각도가 완벽합니다'
    correction = 'none'
  } else if (angle >= acceptable.min && angle <= acceptable.max) {
    level = 'warning'
    if (angle < ideal.min) {
      message = '앞 무릎을 조금 더 펴세요'
      correction = 'up'
    } else {
      message = '조금 더 깊이 내려가세요'
      correction = 'down'
    }
  } else {
    level = 'error'
    if (angle < acceptable.min) {
      message = '앞 무릎이 너무 많이 굽혀졌습니다'
      correction = 'up'
    } else {
      message = '더 깊이 내려가야 합니다'
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

function analyzeBackKneeAngle(angle: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.backKneeAngle

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (angle >= ideal.min && angle <= ideal.max) {
    level = 'good'
    message = '뒤 무릎 각도가 좋습니다'
    correction = 'none'
  } else if (angle >= acceptable.min && angle <= acceptable.max) {
    level = 'warning'
    if (angle < ideal.min) {
      message = '뒤 무릎을 조금 더 펴세요'
      correction = 'up'
    } else {
      message = '뒤 무릎을 더 굽히세요'
      correction = 'down'
    }
  } else {
    level = 'error'
    if (angle < acceptable.min) {
      message = '뒤 무릎이 너무 많이 굽혀졌습니다'
      correction = 'up'
    } else {
      message = '뒤 무릎을 더 깊이 내려야 합니다'
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
    message = '엉덩이 위치가 좋습니다'
    correction = 'none'
  } else if (angle >= acceptable.min && angle <= acceptable.max) {
    level = 'warning'
    if (angle < ideal.min) {
      message = '엉덩이를 조금 더 세워주세요'
      correction = 'backward'
    } else {
      message = '엉덩이를 조금 낮춰주세요'
      correction = 'down'
    }
  } else {
    level = 'error'
    if (angle < acceptable.min) {
      message = '엉덩이가 너무 앞으로 기울었습니다'
      correction = 'backward'
    } else {
      message = '엉덩이를 더 낮춰야 합니다'
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

function analyzeTorsoInclination(angle: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.torsoInclination

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (angle >= ideal.min && angle <= ideal.max) {
    level = 'good'
    message = '상체가 바르게 세워져 있습니다'
    correction = 'none'
  } else if (angle >= acceptable.min && angle <= acceptable.max) {
    level = 'warning'
    message = '상체를 더 세워주세요'
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
 * Analyze hip flexor tightness based on back hip extension angle
 * Only meaningful during bottom and ascending phases when deep lunge is expected
 *
 * @param backHipExtensionAngle - Angle from frontHip-backHip-backKnee
 * @param pelvicTiltAngle - Angle of pelvis from vertical
 * @param phase - Current lunge phase
 * @returns FeedbackItem with hip flexor tightness assessment
 */
function analyzeHipFlexorTightness(
  backHipExtensionAngle: number,
  pelvicTiltAngle: number,
  phase: LungePhase
): FeedbackItem | null {
  // Only analyze during deep lunge phases (bottom and ascending)
  if (phase !== 'bottom' && phase !== 'ascending') {
    return null
  }

  const { ideal, acceptable } = THRESHOLDS.hipFlexorTightness

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  // Check for hip flexor tightness indicators:
  // 1. Restricted back hip extension angle (<170 degrees)
  // 2. Excessive anterior pelvic tilt (>15 degrees)
  const hasExcessiveTilt = pelvicTiltAngle > THRESHOLDS.pelvicTilt.acceptable.max

  if (backHipExtensionAngle >= ideal.min && backHipExtensionAngle <= ideal.max && !hasExcessiveTilt) {
    level = 'good'
    message = '고관절 가동성이 좋습니다 / Good hip flexor mobility'
    correction = 'none'
  } else if (backHipExtensionAngle >= acceptable.min && backHipExtensionAngle <= acceptable.max) {
    level = 'warning'
    if (hasExcessiveTilt) {
      message = '골반이 앞으로 기울어졌습니다. 고관절 스트레칭이 필요합니다 / Anterior pelvic tilt detected. Hip flexor stretching recommended'
      correction = 'backward'
    } else {
      message = '뒷다리 고관절이 약간 제한됩니다 / Minor hip flexor restriction detected'
      correction = 'backward'
    }
  } else {
    level = 'error'
    // Tight hip flexors - provide specific stretching recommendations
    message = '고관절 굴곡근이 뻣뻣합니다. 권장 스트레칭: 무릎 꿇고 고관절 스트레칭, 카우치 스트레칭, 비둘기 자세 / Tight hip flexors detected. Recommended stretches: Kneeling hip flexor stretch, Couch stretch, Pigeon pose'
    correction = 'backward'
  }

  return {
    level,
    message,
    correction,
    value: Math.round(backHipExtensionAngle * 10) / 10,
    idealRange: ideal,
    acceptableRange: acceptable,
  }
}

function analyzeKneeOverToe(distance: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.kneeOverToe

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (distance >= ideal.min && distance <= ideal.max) {
    level = 'good'
    message = '무릎 위치가 적절합니다'
    correction = 'none'
  } else if (distance >= acceptable.min && distance <= acceptable.max) {
    level = 'warning'
    if (distance > ideal.max) {
      message = '무릎이 발끝보다 앞으로 나갔습니다'
      correction = 'backward'
    } else {
      message = '무릎을 조금 앞으로 내밀어도 됩니다'
      correction = 'forward'
    }
  } else {
    level = 'error'
    if (distance > acceptable.max) {
      message = '무릎이 발끝을 너무 많이 넘어갔습니다'
      correction = 'backward'
    } else {
      message = '무릎이 너무 뒤로 빠져있습니다'
      correction = 'forward'
    }
  }

  return {
    level,
    message,
    correction,
    value: Math.round(distance * 100) / 100,
    idealRange: ideal,
    acceptableRange: acceptable,
  }
}

// ============================================
// 점수 계산
// ============================================

interface Feedbacks {
  frontKneeAngle: FeedbackItem
  backKneeAngle: FeedbackItem
  hipAngle: FeedbackItem
  torsoInclination: FeedbackItem
  kneeOverToe: FeedbackItem
  neckAlignment?: FeedbackItem | null
  hipFlexorTightness?: FeedbackItem | null
  torsoRotation?: FeedbackItem | null
  pelvicTilt?: {
    anteriorTilt: PelvicTiltFeedbackItem
    lateralTilt: PelvicTiltFeedbackItem
    stability: PelvicTiltFeedbackItem
  }
}

function calculateOverallScore(feedbacks: Feedbacks): number {
  // Rebalanced weights (sum = 1.0) - adjusted to include pelvic tilt
  const weights = {
    frontKneeAngle: 0.22,      // Was 0.24, reduced by 0.02
    backKneeAngle: 0.14,       // Was 0.16, reduced by 0.02
    hipAngle: 0.10,            // Was 0.12, reduced by 0.02
    torsoInclination: 0.14,    // Was 0.16, reduced by 0.02
    kneeOverToe: 0.11,         // Was 0.12, reduced by 0.01
    neckAlignment: 0.07,       // Was 0.08, reduced by 0.01
    hipFlexorTightness: 0.06,  // Was 0.07, reduced by 0.01
    torsoRotation: 0.08,       // Was 0.05, adjusted for balance
    pelvicTilt: 0.08,          // NEW - 8% weight for pelvic analysis
  }

  // 각 항목별 점수 계산
  const scores = {
    frontKneeAngle: calculateItemScore(feedbacks.frontKneeAngle),
    backKneeAngle: calculateItemScore(feedbacks.backKneeAngle),
    hipAngle: calculateItemScore(feedbacks.hipAngle),
    torsoInclination: calculateItemScore(feedbacks.torsoInclination),
    kneeOverToe: calculateItemScore(feedbacks.kneeOverToe),
    neckAlignment: feedbacks.neckAlignment ? calculateItemScore(feedbacks.neckAlignment) : 100,
    hipFlexorTightness: feedbacks.hipFlexorTightness ? calculateItemScore(feedbacks.hipFlexorTightness) : 100,
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
    scores.frontKneeAngle * weights.frontKneeAngle +
    scores.backKneeAngle * weights.backKneeAngle +
    scores.hipAngle * weights.hipAngle +
    scores.torsoInclination * weights.torsoInclination +
    scores.kneeOverToe * weights.kneeOverToe +
    scores.neckAlignment * weights.neckAlignment +
    scores.hipFlexorTightness * weights.hipFlexorTightness +
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
  currentFrontKneeAngle: number,
  state: LungeAnalyzerState
): { phase: LungePhase; repCompleted: boolean; newState: LungeAnalyzerState } {
  const { previousPhase, bottomReached, repCount, lastFrontKneeAngle } = state

  let phase: LungePhase = previousPhase
  let repCompleted = false
  let newBottomReached = bottomReached
  let newRepCount = repCount

  // 현재 앞 무릎 각도에 따른 페이즈 결정
  if (currentFrontKneeAngle > PHASE_THRESHOLDS.standing) {
    // 서있는 상태
    if (previousPhase === 'ascending' && bottomReached) {
      // 올라오는 중에 서있는 상태 도달 = 1회 완료
      repCompleted = true
      newRepCount = repCount + 1
      newBottomReached = false
    }
    phase = 'standing'
  } else if (currentFrontKneeAngle < PHASE_THRESHOLDS.bottom) {
    // 바닥 상태 (가장 깊이 내려감)
    phase = 'bottom'
    newBottomReached = true
  } else {
    // 중간 상태 - 방향 판단
    const angleDiff = currentFrontKneeAngle - lastFrontKneeAngle

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
      lastFrontKneeAngle: currentFrontKneeAngle,
    },
  }
}

// ============================================
// 유틸리티 함수
// ============================================

function createInvalidResult(): LungeAnalysisResult {
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
      frontKneeAngle: invalidFeedback,
      backKneeAngle: invalidFeedback,
      hipAngle: invalidFeedback,
      torsoInclination: invalidFeedback,
      kneeOverToe: invalidFeedback,
    },
    repCompleted: false,
    phase: 'standing',
    frontLeg: 'unknown',
    rawAngles: {
      frontKneeAngle: 0,
      backKneeAngle: 0,
      frontHipAngle: 0,
      backHipAngle: 0,
      torsoAngle: 0,
      kneeOverToeDistance: 0,
      backHipExtensionAngle: 0,  // NEW
      pelvicTiltAngle: 0,        // NEW
    },
  }
}

/**
 * 초기 분석 상태 생성
 * @param smoothingConfig - Optional smoothing configuration. Pass to enable angle smoothing.
 * @param depthConfig - Optional depth normalization configuration. Pass to enable perspective correction.
 */
export function createInitialLungeState(
  smoothingConfig?: Partial<SmoothingConfig>,
  depthConfig?: Partial<DepthNormalizationConfig>
): LungeAnalyzerState {
  return {
    previousPhase: 'standing',
    bottomReached: false,
    repCount: 0,
    lastFrontKneeAngle: 180,
    smootherSet: smoothingConfig ? createLungeSmootherSet(smoothingConfig) : undefined,
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
export function getPhaseLabel(phase: LungePhase): string {
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
 * 앞다리를 한국어로 변환
 */
export function getFrontLegLabel(leg: LungeLeg): string {
  switch (leg) {
    case 'left':
      return '왼발 앞'
    case 'right':
      return '오른발 앞'
    case 'unknown':
      return '감지 중'
  }
}

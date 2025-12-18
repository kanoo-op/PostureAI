/**
 * 3D 좌표 기반 푸시업 분석 모듈
 * MediaPipe BlazePose 랜드마크를 사용한 실시간 푸시업 자세 분석
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
import { AngleSmootherSet, SmoothingConfig, createPushupSmootherSet } from './angleSmoother'
import {
  analyzeElbowValgus,
  analyzeArmSymmetry,
  ElbowValgusResult,
  ELBOW_VALGUS_THRESHOLDS,
} from './elbowValgusAnalyzer'
import { analyzeNeckAlignment, createNeckAlignmentFeedback, NeckAlignmentResult } from './neckAlignmentAnalyzer'

// ============================================
// 타입 정의
// ============================================

export type FeedbackLevel = 'good' | 'warning' | 'error'
export type PushupPhase = 'up' | 'descending' | 'bottom' | 'ascending'
export type CorrectionDirection = 'up' | 'down' | 'forward' | 'backward' | 'straighten' | 'lower' | 'raise' | 'inward' | 'outward' | 'none'

export interface FeedbackItem {
  level: FeedbackLevel
  message: string
  correction: CorrectionDirection
  value: number
  idealRange: { min: number; max: number }
  acceptableRange: { min: number; max: number }
}

export interface PushupAnalysisResult {
  score: number // 0-100 종합 점수
  feedbacks: {
    elbowAngle: FeedbackItem
    bodyAlignment: FeedbackItem
    hipPosition: FeedbackItem
    depth: FeedbackItem
    elbowValgus: FeedbackItem    // Elbow flare feedback
    armSymmetry: FeedbackItem    // Arm symmetry feedback
    neckAlignment?: FeedbackItem // Neck alignment feedback
  }
  repCompleted: boolean
  phase: PushupPhase
  rawAngles: {
    leftElbowAngle: number
    rightElbowAngle: number
    bodyAlignmentAngle: number
    hipSagAngle: number
    depthPercent: number
    leftElbowValgus: number
    rightElbowValgus: number
    armSymmetryScore: number
    neckAngle?: number
    neckForwardPosture?: number
    neckExtensionFlexion?: number
  }
}

export interface PushupAnalyzerState {
  previousPhase: PushupPhase
  bottomReached: boolean
  repCount: number
  lastElbowAngle: number
  // Optional smoothing state (updated to include valgus and neck)
  smootherSet?: AngleSmootherSet<
    'leftElbowAngle' | 'rightElbowAngle' | 'bodyAlignmentAngle' | 'hipSagAngle' |
    'leftElbowValgus' | 'rightElbowValgus' | 'neckAngle'
  >
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
  elbowAngle: {
    ideal: { min: 80, max: 100 },      // 바닥에서 최적의 팔꿈치 굽힘
    acceptable: { min: 70, max: 110 },
  },
  bodyAlignment: {
    ideal: { min: 0, max: 10 },        // 일직선에서 척추 각도 편차
    acceptable: { min: 0, max: 20 },
  },
  hipPosition: {
    ideal: { min: 0, max: 8 },         // 중립에서 엉덩이 처짐/들림 각도
    acceptable: { min: 0, max: 15 },
  },
  depth: {
    ideal: { min: 80, max: 100 },      // 전체 가동 범위의 퍼센트
    acceptable: { min: 60, max: 100 },
  },
  elbowValgus: {
    ideal: { min: 0, max: 8 },         // NEW: Elbow flare from neutral
    acceptable: { min: 0, max: 15 },
  },
  armSymmetry: {
    ideal: { min: 90, max: 100 },      // NEW: Symmetry percentage
    acceptable: { min: 70, max: 100 },
  },
} as const

// 페이즈 판별을 위한 팔꿈치 각도 임계값
const PHASE_THRESHOLDS = {
  up: 150,           // 팔이 거의 펴진 상태 (팔꿈치 각도 > 150°)
  bottom: 100,       // 팔이 굽혀진 상태 (팔꿈치 각도 < 100°)
  hysteresis: 5,     // 상태 변경 시 히스테리시스
} as const

const MIN_KEYPOINT_SCORE = 0.5

// ============================================
// 메인 분석 함수
// ============================================

/**
 * 푸시업 자세 분석 메인 함수
 *
 * @param keypoints - MediaPipe BlazePose 33개 키포인트 배열
 * @param state - 이전 분석 상태 (반복 카운트, 페이즈 추적용)
 * @returns 분석 결과 및 업데이트된 상태
 */
export function analyzePushup(
  keypoints: Keypoint[],
  state: PushupAnalyzerState
): { result: PushupAnalysisResult; newState: PushupAnalyzerState } {
  // 필요한 키포인트 추출
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

  // 키포인트 유효성 검사
  const requiredKeypoints = [
    leftShoulder, rightShoulder,
    leftElbow, rightElbow,
    leftWrist, rightWrist,
    leftHip, rightHip,
    leftAnkle, rightAnkle,
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
    leftElbow: keypointToPoint3D(leftElbow),
    rightElbow: keypointToPoint3D(rightElbow),
    leftWrist: keypointToPoint3D(leftWrist),
    rightWrist: keypointToPoint3D(rightWrist),
    leftHip: keypointToPoint3D(leftHip),
    rightHip: keypointToPoint3D(rightHip),
    leftAnkle: keypointToPoint3D(leftAnkle),
    rightAnkle: keypointToPoint3D(rightAnkle),
  }

  // 각도 계산
  const rawAngles = calculateRawAngles(points, state.smootherSet)

  // Analyze elbow valgus
  const elbowValgusResult = analyzeElbowValgus(keypoints)

  // Get valgus angles (with smoothing if available)
  let leftElbowValgus = elbowValgusResult?.leftValgusAngle ?? 0
  let rightElbowValgus = elbowValgusResult?.rightValgusAngle ?? 0

  if (state.smootherSet) {
    const smoothedValgus = state.smootherSet.smoothAll({
      leftElbowAngle: rawAngles.leftElbowAngle,
      rightElbowAngle: rawAngles.rightElbowAngle,
      bodyAlignmentAngle: rawAngles.bodyAlignmentAngle,
      hipSagAngle: rawAngles.hipSagAngle,
      leftElbowValgus: leftElbowValgus,
      rightElbowValgus: rightElbowValgus,
      neckAngle: 0, // Neck angle is calculated separately via neckAlignmentAnalyzer
    })
    leftElbowValgus = smoothedValgus.leftElbowValgus.smoothedValue
    rightElbowValgus = smoothedValgus.rightElbowValgus.smoothedValue
  }

  // Calculate arm symmetry score
  const armSymmetryResult = analyzeArmSymmetry(
    rawAngles.leftElbowAngle,
    rawAngles.rightElbowAngle
  )

  // 각 항목 분석
  const elbowAngleFeedback = analyzeElbowAngle(rawAngles.avgElbowAngle)
  const bodyAlignmentFeedback = analyzeBodyAlignment(rawAngles.bodyAlignmentAngle)
  const hipPositionFeedback = analyzeHipPosition(rawAngles.hipSagAngle)
  const depthFeedback = analyzeDepth(rawAngles.depthPercent)

  // Create elbow valgus and arm symmetry feedback items
  const avgValgus = (Math.abs(leftElbowValgus) + Math.abs(rightElbowValgus)) / 2
  const elbowValgusFeedback = analyzeElbowValgusFeedback(avgValgus)
  const armSymmetryFeedback = analyzeArmSymmetryFeedback(armSymmetryResult.score)

  // 목 정렬 분석
  const neckResult = analyzeNeckAlignment(keypoints, 'pushup')
  const neckFeedback = createNeckAlignmentFeedback(neckResult, 'pushup')

  // 종합 점수 계산
  const score = calculateOverallScore({
    elbowAngle: elbowAngleFeedback,
    bodyAlignment: bodyAlignmentFeedback,
    hipPosition: hipPositionFeedback,
    depth: depthFeedback,
    elbowValgus: elbowValgusFeedback,
    armSymmetry: armSymmetryFeedback,
    neckAlignment: neckFeedback,
  })

  // 페이즈 및 반복 완료 판별
  const { phase, repCompleted, newState } = determinePhaseAndRep(
    rawAngles.avgElbowAngle,
    state
  )

  return {
    result: {
      score,
      feedbacks: {
        elbowAngle: elbowAngleFeedback,
        bodyAlignment: bodyAlignmentFeedback,
        hipPosition: hipPositionFeedback,
        depth: depthFeedback,
        elbowValgus: elbowValgusFeedback,
        armSymmetry: armSymmetryFeedback,
        neckAlignment: neckFeedback ?? undefined,
      },
      repCompleted,
      phase,
      rawAngles: {
        leftElbowAngle: rawAngles.leftElbowAngle,
        rightElbowAngle: rawAngles.rightElbowAngle,
        bodyAlignmentAngle: rawAngles.bodyAlignmentAngle,
        hipSagAngle: rawAngles.hipSagAngle,
        depthPercent: rawAngles.depthPercent,
        leftElbowValgus: leftElbowValgus,
        rightElbowValgus: rightElbowValgus,
        armSymmetryScore: armSymmetryResult.score,
        neckAngle: neckResult.isValid ? neckResult.neckAngle : undefined,
        neckForwardPosture: neckResult.isValid ? neckResult.forwardPosture : undefined,
        neckExtensionFlexion: neckResult.isValid ? neckResult.extensionFlexion : undefined,
      },
    },
    newState,
  }
}

// ============================================
// 각도 계산 함수
// ============================================

interface Points {
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
}

interface RawAngles {
  leftElbowAngle: number
  rightElbowAngle: number
  avgElbowAngle: number
  bodyAlignmentAngle: number
  hipSagAngle: number
  depthPercent: number
}

// Type alias for pushup smoother set (with valgus and neck)
type PushupSmootherSet = AngleSmootherSet<
  'leftElbowAngle' | 'rightElbowAngle' | 'bodyAlignmentAngle' | 'hipSagAngle' |
  'leftElbowValgus' | 'rightElbowValgus' | 'neckAngle'
>

function calculateRawAngles(
  points: Points,
  smootherSet?: PushupSmootherSet
): RawAngles {
  // 팔꿈치 각도: 어깨-팔꿈치-손목
  const leftElbowAngleRaw = calculate3DAngle(
    points.leftShoulder,
    points.leftElbow,
    points.leftWrist
  )
  const rightElbowAngleRaw = calculate3DAngle(
    points.rightShoulder,
    points.rightElbow,
    points.rightWrist
  )

  // 몸통 정렬: 어깨-엉덩이-발목 중심점들의 각도
  const shoulderCenter = midpoint(points.leftShoulder, points.rightShoulder)
  const hipCenter = midpoint(points.leftHip, points.rightHip)
  const ankleCenter = midpoint(points.leftAnkle, points.rightAnkle)

  // 몸통 일직선 각도 (180도가 완벽한 일직선)
  const bodyAngle = calculate3DAngle(shoulderCenter, hipCenter, ankleCenter)
  // 180도에서 벗어난 정도를 측정 (편차)
  const bodyAlignmentAngleRaw = Math.abs(180 - bodyAngle)

  // 엉덩이 처짐/들림 감지
  // 어깨-발목 직선에서 엉덩이가 얼마나 벗어났는지 측정
  const shoulderToAnkleDistance = distance2D(shoulderCenter, ankleCenter)
  const shoulderToHipDistance = distance2D(shoulderCenter, hipCenter)
  const hipToAnkleDistance = distance2D(hipCenter, ankleCenter)

  // 삼각형의 높이 계산 (헤론의 공식 사용)
  const s = (shoulderToAnkleDistance + shoulderToHipDistance + hipToAnkleDistance) / 2
  const triangleArea = Math.sqrt(
    Math.max(0, s * (s - shoulderToAnkleDistance) * (s - shoulderToHipDistance) * (s - hipToAnkleDistance))
  )
  const hipDeviationDistance = shoulderToAnkleDistance > 0
    ? (2 * triangleArea) / shoulderToAnkleDistance
    : 0

  // 엉덩이 편차를 각도로 변환 (대략적인 변환)
  // Y 좌표로 엉덩이가 위인지 아래인지 판단
  const expectedHipY = (shoulderCenter.y + ankleCenter.y) / 2
  const hipSagAngleRaw = hipCenter.y > expectedHipY
    ? hipDeviationDistance * 2  // 엉덩이가 처짐 (양수)
    : -hipDeviationDistance * 2 // 엉덩이가 들림 (음수)

  // Apply smoothing if available
  // Note: Valgus and neck angles are smoothed separately in the main function,
  // but we need to pass placeholder values to satisfy the type
  if (smootherSet) {
    const smoothed = smootherSet.smoothAll({
      leftElbowAngle: leftElbowAngleRaw,
      rightElbowAngle: rightElbowAngleRaw,
      bodyAlignmentAngle: bodyAlignmentAngleRaw,
      hipSagAngle: Math.abs(hipSagAngleRaw),
      leftElbowValgus: 0,   // Smoothed separately in main function
      rightElbowValgus: 0,  // Smoothed separately in main function
      neckAngle: 0,         // Calculated separately via neckAlignmentAnalyzer
    })

    const avgElbowAngle = (smoothed.leftElbowAngle.smoothedValue + smoothed.rightElbowAngle.smoothedValue) / 2

    // 깊이 퍼센트 계산 (use smoothed avg elbow angle)
    const maxAngle = 180
    const targetAngle = 90
    const angleRange = maxAngle - targetAngle
    let depthPercent = 0
    if (avgElbowAngle <= targetAngle) {
      depthPercent = 100
    } else if (avgElbowAngle >= maxAngle) {
      depthPercent = 0
    } else {
      depthPercent = ((maxAngle - avgElbowAngle) / angleRange) * 100
    }

    return {
      leftElbowAngle: smoothed.leftElbowAngle.smoothedValue,
      rightElbowAngle: smoothed.rightElbowAngle.smoothedValue,
      avgElbowAngle,
      bodyAlignmentAngle: smoothed.bodyAlignmentAngle.smoothedValue,
      hipSagAngle: smoothed.hipSagAngle.smoothedValue,
      depthPercent, // Derived from smoothed angles
    }
  }

  // Return unsmoothed values
  const avgElbowAngle = (leftElbowAngleRaw + rightElbowAngleRaw) / 2

  // 깊이 퍼센트 계산
  // 180도(팔 완전히 펴짐)에서 90도(최적 바닥 위치)까지의 범위에서 계산
  const maxAngle = 180 // 시작 위치
  const targetAngle = 90 // 목표 바닥 위치
  const angleRange = maxAngle - targetAngle

  let depthPercent = 0
  if (avgElbowAngle <= targetAngle) {
    depthPercent = 100 // 목표 각도 이하면 100%
  } else if (avgElbowAngle >= maxAngle) {
    depthPercent = 0 // 완전히 펴진 상태면 0%
  } else {
    depthPercent = ((maxAngle - avgElbowAngle) / angleRange) * 100
  }

  return {
    leftElbowAngle: leftElbowAngleRaw,
    rightElbowAngle: rightElbowAngleRaw,
    avgElbowAngle,
    bodyAlignmentAngle: bodyAlignmentAngleRaw,
    hipSagAngle: Math.abs(hipSagAngleRaw), // 절대값으로 처리
    depthPercent,
  }
}

// ============================================
// 개별 항목 분석 함수
// ============================================

function analyzeElbowAngle(angle: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.elbowAngle

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (angle >= ideal.min && angle <= ideal.max) {
    level = 'good'
    message = '완벽한 팔꿈치 각도입니다'
    correction = 'none'
  } else if (angle >= acceptable.min && angle <= acceptable.max) {
    level = 'warning'
    if (angle < ideal.min) {
      message = '팔꿈치가 조금 많이 굽혀졌습니다'
      correction = 'raise'
    } else {
      message = '조금 더 내려가세요'
      correction = 'lower'
    }
  } else {
    level = 'error'
    if (angle < acceptable.min) {
      message = '팔꿈치가 너무 많이 굽혀졌습니다'
      correction = 'raise'
    } else {
      message = '더 깊이 내려가야 합니다'
      correction = 'lower'
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
    message = '몸이 너무 구부러졌습니다. 플랭크 자세를 유지하세요'
    correction = 'straighten'
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

function analyzeHipPosition(angle: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.hipPosition

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  // angle은 절대값으로 처리됨 (양수만)
  if (angle >= ideal.min && angle <= ideal.max) {
    level = 'good'
    message = '엉덩이 위치가 좋습니다'
    correction = 'none'
  } else if (angle >= acceptable.min && angle <= acceptable.max) {
    level = 'warning'
    message = '엉덩이를 조금 올려주세요'
    correction = 'raise'
  } else {
    level = 'error'
    message = '엉덩이가 너무 처졌습니다'
    correction = 'raise'
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

function analyzeDepth(percent: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.depth

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (percent >= ideal.min && percent <= ideal.max) {
    level = 'good'
    message = '충분한 깊이로 내려가고 있습니다'
    correction = 'none'
  } else if (percent >= acceptable.min && percent <= acceptable.max) {
    level = 'warning'
    message = '조금 더 깊이 내려가세요'
    correction = 'lower'
  } else {
    level = 'error'
    message = '깊이가 부족합니다. 가슴이 바닥에 가깝게 내려가세요'
    correction = 'lower'
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

// NEW: Elbow valgus feedback analysis
function analyzeElbowValgusFeedback(avgValgus: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.elbowValgus
  const absValgus = Math.abs(avgValgus)

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (absValgus >= ideal.min && absValgus <= ideal.max) {
    level = 'good'
    message = '팔꿈치 정렬이 좋습니다'
    correction = 'none'
  } else if (absValgus >= acceptable.min && absValgus <= acceptable.max) {
    level = 'warning'
    message = avgValgus > 0
      ? '팔꿈치가 약간 바깥으로 벌어졌습니다'
      : '팔꿈치가 약간 안으로 모였습니다'
    correction = avgValgus > 0 ? 'inward' : 'outward'
  } else {
    level = 'error'
    message = avgValgus > 0
      ? '팔꿈치가 너무 바깥으로 벌어졌습니다'
      : '팔꿈치가 너무 안으로 모였습니다'
    correction = avgValgus > 0 ? 'inward' : 'outward'
  }

  return {
    level,
    message,
    correction,
    value: Math.round(absValgus * 10) / 10,
    idealRange: ideal,
    acceptableRange: acceptable,
  }
}

// NEW: Arm symmetry feedback analysis
function analyzeArmSymmetryFeedback(score: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.armSymmetry

  let level: FeedbackLevel
  let message: string

  if (score >= ideal.min) {
    level = 'good'
    message = '좌우 팔 균형이 좋습니다'
  } else if (score >= acceptable.min) {
    level = 'warning'
    message = '좌우 팔 균형을 맞춰주세요'
  } else {
    level = 'error'
    message = '좌우 팔 높이가 많이 다릅니다'
  }

  return {
    level,
    message,
    correction: 'none',
    value: Math.round(score),
    idealRange: ideal,
    acceptableRange: acceptable,
  }
}

// ============================================
// 점수 계산
// ============================================

interface Feedbacks {
  elbowAngle: FeedbackItem
  bodyAlignment: FeedbackItem
  hipPosition: FeedbackItem
  depth: FeedbackItem
  elbowValgus: FeedbackItem
  armSymmetry: FeedbackItem
  neckAlignment?: FeedbackItem | null
}

function calculateOverallScore(feedbacks: Feedbacks): number {
  // 가중치 설정 (합계 = 1.0) - Updated to include neck alignment
  const weights = {
    elbowAngle: 0.24,
    bodyAlignment: 0.24,
    hipPosition: 0.14,
    depth: 0.14,
    elbowValgus: 0.09,
    armSymmetry: 0.09,
    neckAlignment: 0.06,
  }

  // 각 항목별 점수 계산
  const scores = {
    elbowAngle: calculateItemScore(feedbacks.elbowAngle),
    bodyAlignment: calculateItemScore(feedbacks.bodyAlignment),
    hipPosition: calculateItemScore(feedbacks.hipPosition),
    depth: calculateItemScore(feedbacks.depth),
    elbowValgus: calculateItemScore(feedbacks.elbowValgus),
    armSymmetry: calculateItemScore(feedbacks.armSymmetry),
    neckAlignment: feedbacks.neckAlignment ? calculateItemScore(feedbacks.neckAlignment) : 100,
  }

  // 가중 평균
  const totalScore =
    scores.elbowAngle * weights.elbowAngle +
    scores.bodyAlignment * weights.bodyAlignment +
    scores.hipPosition * weights.hipPosition +
    scores.depth * weights.depth +
    scores.elbowValgus * weights.elbowValgus +
    scores.armSymmetry * weights.armSymmetry +
    scores.neckAlignment * weights.neckAlignment

  return Math.round(totalScore)
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
  currentElbowAngle: number,
  state: PushupAnalyzerState
): { phase: PushupPhase; repCompleted: boolean; newState: PushupAnalyzerState } {
  const { previousPhase, bottomReached, repCount, lastElbowAngle } = state

  let phase: PushupPhase = previousPhase
  let repCompleted = false
  let newBottomReached = bottomReached
  let newRepCount = repCount

  // 현재 팔꿈치 각도에 따른 페이즈 결정
  if (currentElbowAngle > PHASE_THRESHOLDS.up) {
    // 위쪽 상태 (팔이 거의 펴짐)
    if (previousPhase === 'ascending' && bottomReached) {
      // 올라오는 중에 위쪽 상태 도달 = 1회 완료
      repCompleted = true
      newRepCount = repCount + 1
      newBottomReached = false
    }
    phase = 'up'
  } else if (currentElbowAngle < PHASE_THRESHOLDS.bottom) {
    // 바닥 상태 (가장 깊이 내려감)
    phase = 'bottom'
    newBottomReached = true
  } else {
    // 중간 상태 - 방향 판단
    const angleDiff = currentElbowAngle - lastElbowAngle

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
      lastElbowAngle: currentElbowAngle,
    },
  }
}

// ============================================
// 유틸리티 함수
// ============================================

function createInvalidResult(): PushupAnalysisResult {
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
      elbowAngle: invalidFeedback,
      bodyAlignment: invalidFeedback,
      hipPosition: invalidFeedback,
      depth: invalidFeedback,
      elbowValgus: invalidFeedback,    // NEW
      armSymmetry: invalidFeedback,    // NEW
    },
    repCompleted: false,
    phase: 'up',
    rawAngles: {
      leftElbowAngle: 0,
      rightElbowAngle: 0,
      bodyAlignmentAngle: 0,
      hipSagAngle: 0,
      depthPercent: 0,
      leftElbowValgus: 0,      // NEW
      rightElbowValgus: 0,     // NEW
      armSymmetryScore: 0,     // NEW
    },
  }
}

/**
 * 초기 분석 상태 생성
 * @param smoothingConfig - Optional smoothing configuration. Pass to enable angle smoothing.
 */
export function createInitialState(smoothingConfig?: Partial<SmoothingConfig>): PushupAnalyzerState {
  return {
    previousPhase: 'up',
    bottomReached: false,
    repCount: 0,
    lastElbowAngle: 180,
    smootherSet: smoothingConfig ? createPushupSmootherSet(smoothingConfig) : undefined,
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
export function getPhaseLabel(phase: PushupPhase): string {
  switch (phase) {
    case 'up':
      return '시작 자세'
    case 'descending':
      return '내려가는 중'
    case 'bottom':
      return '최저점'
    case 'ascending':
      return '올라오는 중'
  }
}

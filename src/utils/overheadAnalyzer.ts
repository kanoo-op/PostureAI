/**
 * 3D 좌표 기반 오버헤드 운동 분석 모듈
 * MediaPipe BlazePose 랜드마크를 사용한 실시간 오버헤드 프레스, 풀업 자세 분석
 */

import {
  Point3D,
  calculate3DAngle,
  calculateAngleWithVertical,
  keypointToPoint3D,
  isValidKeypoint,
  midpoint,
  symmetryScore,
} from './pose3DUtils'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'
import { AngleSmootherSet, SmoothingConfig } from './angleSmoother'

// ============================================
// 타입 정의
// ============================================

export type FeedbackLevel = 'good' | 'warning' | 'error'
export type OverheadPhase = 'start' | 'pressing' | 'lockout' | 'lowering'
export type CorrectionDirection = 'up' | 'down' | 'forward' | 'backward' | 'inward' | 'outward' | 'none'

export interface FeedbackItem {
  level: FeedbackLevel
  message: string
  correction: CorrectionDirection
  value: number
  idealRange: { min: number; max: number }
  acceptableRange: { min: number; max: number }
}

export interface OverheadAnalysisResult {
  score: number // 0-100
  feedbacks: {
    shoulderAngle: FeedbackItem      // elbow-shoulder-hip angle
    wristAngle: FeedbackItem         // elbow-wrist-hand angle
    shoulderElevation: FeedbackItem  // arm angle with vertical
    armSymmetry: FeedbackItem        // left/right comparison
  }
  phase: OverheadPhase
  repCompleted: boolean
  rawAngles: {
    leftShoulderAngle: number
    rightShoulderAngle: number
    avgShoulderAngle: number
    leftWristAngle: number
    rightWristAngle: number
    avgWristAngle: number
    leftElevation: number
    rightElevation: number
    avgElevation: number
    armSymmetryScore: number
  }
}

export interface OverheadAnalyzerState {
  previousPhase: OverheadPhase
  lockoutReached: boolean
  repCount: number
  lastElevation: number
  smootherSet?: AngleSmootherSet<
    'leftShoulderAngle' | 'rightShoulderAngle' | 'leftWristAngle' | 'rightWristAngle' |
    'leftElevation' | 'rightElevation'
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
  shoulderAngle: {
    // elbow-shoulder-hip angle during overhead press
    // At lockout: arms should be near vertical relative to torso (~160-180)
    // During pressing: angle decreases as arms come down
    ideal: { min: 160, max: 180 },
    acceptable: { min: 145, max: 180 },
  },
  wristAngle: {
    // elbow-wrist-hand alignment (straight wrist is ideal)
    // 180 = perfectly straight, <170 = flexed/extended wrist
    ideal: { min: 170, max: 180 },
    acceptable: { min: 155, max: 180 },
  },
  shoulderElevation: {
    // Angle of arm with vertical axis
    // 0 = arm perfectly vertical (overhead), 90 = arm horizontal
    // At lockout: should be close to 0-15 degrees
    lockoutIdeal: { min: 0, max: 15 },
    lockoutAcceptable: { min: 0, max: 25 },
    // During press: varies based on phase
    pressingIdeal: { min: 15, max: 60 },
    pressingAcceptable: { min: 0, max: 90 },
  },
  symmetry: {
    ideal: { min: 85, max: 100 },
    acceptable: { min: 70, max: 84 },
  },
} as const

const PHASE_THRESHOLDS = {
  lockout: 20,      // elevation angle below this = lockout position
  start: 70,        // elevation angle above this = start/lowered position
  hysteresis: 5,    // angle change buffer to prevent phase flickering
} as const

const MIN_KEYPOINT_SCORE = 0.5

// ============================================
// 점수 가중치
// ============================================

const SCORE_WEIGHTS = {
  shoulder: 0.30,
  wrist: 0.20,
  elevation: 0.35,
  symmetry: 0.15,
} as const

// ============================================
// 포인트 인터페이스
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
  leftIndex: Point3D
  rightIndex: Point3D
}

// ============================================
// 메인 분석 함수
// ============================================

/**
 * 오버헤드 운동 자세 분석 메인 함수
 *
 * @param keypoints - MediaPipe BlazePose 33개 키포인트 배열
 * @param state - 이전 분석 상태 (반복 카운트, 페이즈 추적용)
 * @returns 분석 결과 및 업데이트된 상태
 */
export function analyzeOverhead(
  keypoints: Keypoint[],
  state: OverheadAnalyzerState
): { result: OverheadAnalysisResult; newState: OverheadAnalyzerState } {
  // 1. 필요한 키포인트 추출
  const leftShoulder = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]
  const rightShoulder = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]
  const leftElbow = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ELBOW]
  const rightElbow = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW]
  const leftWrist = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_WRIST]
  const rightWrist = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_WRIST]
  const leftHip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP]
  const rightHip = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP]
  const leftIndex = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_INDEX]
  const rightIndex = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_INDEX]

  // 2. 키포인트 유효성 검사
  const requiredKeypoints = [
    leftShoulder, rightShoulder,
    leftElbow, rightElbow,
    leftWrist, rightWrist,
    leftHip, rightHip,
    leftIndex, rightIndex,
  ]

  const allValid = requiredKeypoints.every(kp => isValidKeypoint(kp, MIN_KEYPOINT_SCORE))

  if (!allValid) {
    return {
      result: createInvalidResult(),
      newState: state,
    }
  }

  // 3. Point3D로 변환
  const points: Points = {
    leftShoulder: keypointToPoint3D(leftShoulder),
    rightShoulder: keypointToPoint3D(rightShoulder),
    leftElbow: keypointToPoint3D(leftElbow),
    rightElbow: keypointToPoint3D(rightElbow),
    leftWrist: keypointToPoint3D(leftWrist),
    rightWrist: keypointToPoint3D(rightWrist),
    leftHip: keypointToPoint3D(leftHip),
    rightHip: keypointToPoint3D(rightHip),
    leftIndex: keypointToPoint3D(leftIndex),
    rightIndex: keypointToPoint3D(rightIndex),
  }

  // 4. 각도 계산
  const rawAngles = calculateOverheadRawAngles(points, state.smootherSet)

  // 5. 페이즈 판별 (먼저 수행하여 elevation 피드백에 사용)
  const { phase, repCompleted, newState } = determineOverheadPhase(
    rawAngles.avgElevation,
    state
  )

  // 6. 각 항목 분석
  const shoulderAngleFeedback = analyzeShoulderAngle(rawAngles.avgShoulderAngle)
  const wristAngleFeedback = analyzeWristAngle(rawAngles.avgWristAngle)
  const shoulderElevationFeedback = analyzeShoulderElevation(rawAngles.avgElevation, phase)
  const armSymmetryFeedback = analyzeArmSymmetry(rawAngles.leftElevation, rawAngles.rightElevation)

  // 7. 종합 점수 계산
  const score = calculateOverallScore({
    shoulderAngle: shoulderAngleFeedback,
    wristAngle: wristAngleFeedback,
    shoulderElevation: shoulderElevationFeedback,
    armSymmetry: armSymmetryFeedback,
  })

  // 8. 결과 반환
  return {
    result: {
      score,
      feedbacks: {
        shoulderAngle: shoulderAngleFeedback,
        wristAngle: wristAngleFeedback,
        shoulderElevation: shoulderElevationFeedback,
        armSymmetry: armSymmetryFeedback,
      },
      phase,
      repCompleted,
      rawAngles: {
        leftShoulderAngle: rawAngles.leftShoulderAngle,
        rightShoulderAngle: rawAngles.rightShoulderAngle,
        avgShoulderAngle: rawAngles.avgShoulderAngle,
        leftWristAngle: rawAngles.leftWristAngle,
        rightWristAngle: rawAngles.rightWristAngle,
        avgWristAngle: rawAngles.avgWristAngle,
        leftElevation: rawAngles.leftElevation,
        rightElevation: rawAngles.rightElevation,
        avgElevation: rawAngles.avgElevation,
        armSymmetryScore: rawAngles.armSymmetryScore,
      },
    },
    newState,
  }
}

// ============================================
// 각도 계산 함수
// ============================================

interface RawAngles {
  leftShoulderAngle: number
  rightShoulderAngle: number
  avgShoulderAngle: number
  leftWristAngle: number
  rightWristAngle: number
  avgWristAngle: number
  leftElevation: number
  rightElevation: number
  avgElevation: number
  armSymmetryScore: number
}

function calculateOverheadRawAngles(
  points: Points,
  smootherSet?: AngleSmootherSet<
    'leftShoulderAngle' | 'rightShoulderAngle' | 'leftWristAngle' | 'rightWristAngle' |
    'leftElevation' | 'rightElevation'
  >
): RawAngles {
  // Shoulder angle: elbow-shoulder-hip using calculate3DAngle()
  const leftShoulderAngleRaw = calculate3DAngle(
    points.leftElbow,
    points.leftShoulder,
    points.leftHip
  )
  const rightShoulderAngleRaw = calculate3DAngle(
    points.rightElbow,
    points.rightShoulder,
    points.rightHip
  )

  // Wrist angle: elbow-wrist-index using calculate3DAngle()
  const leftWristAngleRaw = calculate3DAngle(
    points.leftElbow,
    points.leftWrist,
    points.leftIndex
  )
  const rightWristAngleRaw = calculate3DAngle(
    points.rightElbow,
    points.rightWrist,
    points.rightIndex
  )

  // Shoulder elevation: angle of shoulder-elbow vector with vertical
  // Using calculateAngleWithVertical(shoulder, elbow) - note: shoulder is lower point
  const leftElevationRaw = calculateAngleWithVertical(points.leftShoulder, points.leftElbow)
  const rightElevationRaw = calculateAngleWithVertical(points.rightShoulder, points.rightElbow)

  // Apply smoothing if available
  let leftShoulderAngle = leftShoulderAngleRaw
  let rightShoulderAngle = rightShoulderAngleRaw
  let leftWristAngle = leftWristAngleRaw
  let rightWristAngle = rightWristAngleRaw
  let leftElevation = leftElevationRaw
  let rightElevation = rightElevationRaw

  if (smootherSet) {
    const smoothed = smootherSet.smoothAll({
      leftShoulderAngle: leftShoulderAngleRaw,
      rightShoulderAngle: rightShoulderAngleRaw,
      leftWristAngle: leftWristAngleRaw,
      rightWristAngle: rightWristAngleRaw,
      leftElevation: leftElevationRaw,
      rightElevation: rightElevationRaw,
    })

    leftShoulderAngle = smoothed.leftShoulderAngle.smoothedValue
    rightShoulderAngle = smoothed.rightShoulderAngle.smoothedValue
    leftWristAngle = smoothed.leftWristAngle.smoothedValue
    rightWristAngle = smoothed.rightWristAngle.smoothedValue
    leftElevation = smoothed.leftElevation.smoothedValue
    rightElevation = smoothed.rightElevation.smoothedValue
  }

  // Calculate averages and symmetry
  const avgShoulderAngle = (leftShoulderAngle + rightShoulderAngle) / 2
  const avgWristAngle = (leftWristAngle + rightWristAngle) / 2
  const avgElevation = (leftElevation + rightElevation) / 2
  const armSymmetryScore = symmetryScore(leftElevation, rightElevation)

  return {
    leftShoulderAngle: Math.round(leftShoulderAngle * 10) / 10,
    rightShoulderAngle: Math.round(rightShoulderAngle * 10) / 10,
    avgShoulderAngle: Math.round(avgShoulderAngle * 10) / 10,
    leftWristAngle: Math.round(leftWristAngle * 10) / 10,
    rightWristAngle: Math.round(rightWristAngle * 10) / 10,
    avgWristAngle: Math.round(avgWristAngle * 10) / 10,
    leftElevation: Math.round(leftElevation * 10) / 10,
    rightElevation: Math.round(rightElevation * 10) / 10,
    avgElevation: Math.round(avgElevation * 10) / 10,
    armSymmetryScore,
  }
}

// ============================================
// 개별 항목 분석 함수
// ============================================

function analyzeShoulderAngle(angle: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.shoulderAngle

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (angle >= ideal.min && angle <= ideal.max) {
    level = 'good'
    message = '어깨 각도가 적절합니다'
    correction = 'none'
  } else if (angle >= acceptable.min && angle <= acceptable.max) {
    level = 'warning'
    message = '팔을 더 위로 올리세요'
    correction = 'up'
  } else {
    level = 'error'
    message = '팔이 너무 낮습니다'
    correction = 'up'
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

function analyzeWristAngle(angle: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.wristAngle

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (angle >= ideal.min && angle <= ideal.max) {
    level = 'good'
    message = '손목 정렬이 좋습니다'
    correction = 'none'
  } else if (angle >= acceptable.min && angle <= acceptable.max) {
    level = 'warning'
    message = '손목을 곧게 유지하세요'
    correction = 'none'
  } else {
    level = 'error'
    message = '손목이 과도하게 꺾였습니다'
    correction = 'none'
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

function analyzeShoulderElevation(angle: number, phase: OverheadPhase): FeedbackItem {
  // Use different thresholds based on phase
  const isLockoutPhase = phase === 'lockout'
  const ideal = isLockoutPhase
    ? THRESHOLDS.shoulderElevation.lockoutIdeal
    : THRESHOLDS.shoulderElevation.pressingIdeal
  const acceptable = isLockoutPhase
    ? THRESHOLDS.shoulderElevation.lockoutAcceptable
    : THRESHOLDS.shoulderElevation.pressingAcceptable

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (angle >= ideal.min && angle <= ideal.max) {
    level = 'good'
    if (isLockoutPhase) {
      message = '완벽한 락아웃 자세입니다'
    } else {
      message = '좋은 자세로 진행 중입니다'
    }
    correction = 'none'
  } else if (angle >= acceptable.min && angle <= acceptable.max) {
    level = 'warning'
    if (isLockoutPhase) {
      message = '팔을 완전히 위로 펴세요'
    } else {
      message = '팔 위치를 조정하세요'
    }
    correction = 'up'
  } else {
    level = 'error'
    if (isLockoutPhase) {
      message = '락아웃이 불완전합니다'
    } else {
      message = '팔 각도가 범위를 벗어났습니다'
    }
    correction = 'up'
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

function analyzeArmSymmetry(leftAngle: number, rightAngle: number): FeedbackItem {
  const { ideal, acceptable } = THRESHOLDS.symmetry
  const score = symmetryScore(leftAngle, rightAngle)
  const diff = leftAngle - rightAngle

  let level: FeedbackLevel
  let message: string
  let correction: CorrectionDirection

  if (score >= ideal.min) {
    level = 'good'
    message = '좌우 균형이 좋습니다'
    correction = 'none'
  } else if (score >= acceptable.min) {
    level = 'warning'
    if (diff > 0) {
      message = '왼쪽 팔이 낮습니다'
      correction = 'up'
    } else {
      message = '오른쪽 팔이 낮습니다'
      correction = 'up'
    }
  } else {
    level = 'error'
    if (diff > 0) {
      message = '좌우 불균형 교정 필요 (왼쪽 낮음)'
    } else {
      message = '좌우 불균형 교정 필요 (오른쪽 낮음)'
    }
    correction = 'up'
  }

  return {
    level,
    message,
    correction,
    value: score,
    idealRange: ideal,
    acceptableRange: acceptable,
  }
}

// ============================================
// 페이즈 판별
// ============================================

function determineOverheadPhase(
  currentElevation: number,
  state: OverheadAnalyzerState
): { phase: OverheadPhase; repCompleted: boolean; newState: OverheadAnalyzerState } {
  const { previousPhase, lockoutReached, repCount, lastElevation } = state

  let phase: OverheadPhase = previousPhase
  let repCompleted = false
  let newLockoutReached = lockoutReached
  let newRepCount = repCount

  // Phase logic based on elevation angle
  // Lower elevation = arms more vertical = closer to lockout
  // Higher elevation = arms more horizontal = start/lowered position
  if (currentElevation < PHASE_THRESHOLDS.lockout) {
    // Lockout position (arms nearly vertical)
    phase = 'lockout'
    newLockoutReached = true
  } else if (currentElevation > PHASE_THRESHOLDS.start) {
    // Start position (arms at or below shoulder level)
    if (previousPhase === 'lowering' && lockoutReached) {
      // Completed a rep: went to lockout and back to start
      repCompleted = true
      newRepCount = repCount + 1
      newLockoutReached = false
    }
    phase = 'start'
  } else {
    // Middle zone - determine direction with hysteresis
    const angleDiff = currentElevation - lastElevation

    if (Math.abs(angleDiff) > PHASE_THRESHOLDS.hysteresis) {
      if (angleDiff < 0) {
        // Elevation decreasing = arms going up = pressing
        phase = 'pressing'
      } else {
        // Elevation increasing = arms going down = lowering
        phase = 'lowering'
      }
    }
    // Within hysteresis range - maintain previous phase
  }

  return {
    phase,
    repCompleted,
    newState: {
      previousPhase: phase,
      lockoutReached: newLockoutReached,
      repCount: newRepCount,
      lastElevation: currentElevation,
      smootherSet: state.smootherSet,
    },
  }
}

// ============================================
// 점수 계산
// ============================================

interface Feedbacks {
  shoulderAngle: FeedbackItem
  wristAngle: FeedbackItem
  shoulderElevation: FeedbackItem
  armSymmetry: FeedbackItem
}

function calculateOverallScore(feedbacks: Feedbacks): number {
  // Calculate individual scores based on level and value
  const shoulderScore = calculateItemScore(feedbacks.shoulderAngle)
  const wristScore = calculateItemScore(feedbacks.wristAngle)
  const elevationScore = calculateItemScore(feedbacks.shoulderElevation)
  const symmetryScore = feedbacks.armSymmetry.value // Already 0-100

  // Apply weights
  const totalScore =
    shoulderScore * SCORE_WEIGHTS.shoulder +
    wristScore * SCORE_WEIGHTS.wrist +
    elevationScore * SCORE_WEIGHTS.elevation +
    symmetryScore * SCORE_WEIGHTS.symmetry

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
// 유틸리티 함수
// ============================================

function createInvalidResult(): OverheadAnalysisResult {
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
      shoulderAngle: invalidFeedback,
      wristAngle: invalidFeedback,
      shoulderElevation: invalidFeedback,
      armSymmetry: invalidFeedback,
    },
    phase: 'start',
    repCompleted: false,
    rawAngles: {
      leftShoulderAngle: 0,
      rightShoulderAngle: 0,
      avgShoulderAngle: 0,
      leftWristAngle: 0,
      rightWristAngle: 0,
      avgWristAngle: 0,
      leftElevation: 0,
      rightElevation: 0,
      avgElevation: 0,
      armSymmetryScore: 0,
    },
  }
}

/**
 * 초기 분석 상태 생성
 * @param smoothingConfig - Optional smoothing configuration. Pass to enable angle smoothing.
 */
export function createInitialOverheadState(
  smoothingConfig?: Partial<SmoothingConfig>
): OverheadAnalyzerState {
  return {
    previousPhase: 'start',
    lockoutReached: false,
    repCount: 0,
    lastElevation: 90,
    smootherSet: smoothingConfig ? createOverheadSmootherSet(smoothingConfig) : undefined,
  }
}

/**
 * Create a smoother set for overhead analysis angles
 */
export function createOverheadSmootherSet(config?: Partial<SmoothingConfig>): AngleSmootherSet<
  'leftShoulderAngle' | 'rightShoulderAngle' | 'leftWristAngle' | 'rightWristAngle' |
  'leftElevation' | 'rightElevation'
> {
  return new AngleSmootherSet([
    'leftShoulderAngle', 'rightShoulderAngle',
    'leftWristAngle', 'rightWristAngle',
    'leftElevation', 'rightElevation',
  ], config)
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
export function getPhaseLabel(phase: OverheadPhase): string {
  switch (phase) {
    case 'start':
      return '시작 자세'
    case 'pressing':
      return '밀어올리는 중'
    case 'lockout':
      return '락아웃'
    case 'lowering':
      return '내리는 중'
  }
}

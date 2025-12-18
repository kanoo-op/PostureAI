/**
 * 정적 자세 분석 모듈
 * 정면(Front) / 측면(Side) 분리 분석기
 * MediaPipe BlazePose 랜드마크 기반
 */

import {
  Point3D,
  calculate3DAngle,
  calculateAngleWithVertical,
  calculateAngleWithHorizontal,
  keypointToPoint3D,
  isValidKeypoint,
  midpoint,
  distance2D,
  distance3D,
} from './pose3DUtils'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'

// ============================================
// 공통 타입 정의
// ============================================

export type PostureLevel = 'good' | 'normal' | 'bad'
export type ViewType = 'front' | 'side'

export interface PostureFeedbackItem {
  value: number
  level: PostureLevel
  message: string
  suggestion: string
  idealRange: { min: number; max: number }
  normalRange: { min: number; max: number }
}

export interface Keypoint {
  x: number
  y: number
  z?: number
  score?: number
}

const MIN_KEYPOINT_SCORE = 0.5

// ============================================
// 정면 분석기 (Front View Analyzer)
// ============================================

export interface FrontPostureResult {
  viewType: 'front'
  score: number
  level: PostureLevel
  feedbacks: {
    shoulderTilt: PostureFeedbackItem      // 어깨 기울기
    pelvicTilt: PostureFeedbackItem        // 골반 기울기
    spineAlignment: PostureFeedbackItem    // 척추 정렬 (측만)
    legAlignment: PostureFeedbackItem      // 다리 정렬 (X/O자)
    shoulderLevelness: PostureFeedbackItem // 어깨 수평도
  }
  rawValues: {
    shoulderTiltDegree: number
    pelvicTiltDegree: number
    spineDeviationDegree: number
    legAlignmentDegree: number
    shoulderHeightDiff: number
    hipHeightDiff: number
    shoulderLevelnessDegree: number        // calculateAngleWithHorizontal 결과
  }
}

const FRONT_THRESHOLDS = {
  shoulderTilt: {
    ideal: { min: 0, max: 3 },
    normal: { min: 0, max: 7 },
  },
  pelvicTilt: {
    ideal: { min: 0, max: 3 },
    normal: { min: 0, max: 7 },
  },
  spineAlignment: {
    ideal: { min: 0, max: 3 },
    normal: { min: 0, max: 7 },
  },
  legAlignment: {
    ideal: { min: 0, max: 5 },
    normal: { min: 0, max: 10 },
  },
  // 어깨 수평도 (수평선과의 각도)
  shoulderLevelness: {
    ideal: { min: 0, max: 3 },   // 0-3° is ideal alignment
    normal: { min: 0, max: 7 },  // 0-7° is acceptable
  },
} as const

/**
 * 정면 자세 분석 함수
 *
 * 분석 항목:
 * 1. 어깨 기울기 - 좌우 어깨 높이 차이
 * 2. 골반 기울기 - 좌우 엉덩이 높이 차이
 * 3. 척추 정렬 - 어깨 중심과 골반 중심의 수직 정렬
 * 4. 다리 정렬 - X자/O자 다리 판별
 */
export function analyzeFrontPosture(keypoints: Keypoint[]): FrontPostureResult {
  // 필요한 키포인트 추출
  const leftShoulder = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]
  const rightShoulder = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]
  const leftHip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP]
  const rightHip = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP]
  const leftKnee = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_KNEE]
  const rightKnee = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]
  const leftAnkle = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]
  const rightAnkle = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]

  const requiredKeypoints = [
    leftShoulder, rightShoulder,
    leftHip, rightHip,
    leftKnee, rightKnee,
    leftAnkle, rightAnkle,
  ]

  const allValid = requiredKeypoints.every(kp => isValidKeypoint(kp, MIN_KEYPOINT_SCORE))

  if (!allValid) {
    return createInvalidFrontResult()
  }

  const points = {
    leftShoulder: keypointToPoint3D(leftShoulder),
    rightShoulder: keypointToPoint3D(rightShoulder),
    leftHip: keypointToPoint3D(leftHip),
    rightHip: keypointToPoint3D(rightHip),
    leftKnee: keypointToPoint3D(leftKnee),
    rightKnee: keypointToPoint3D(rightKnee),
    leftAnkle: keypointToPoint3D(leftAnkle),
    rightAnkle: keypointToPoint3D(rightAnkle),
  }

  // 원시 값 계산
  const rawValues = calculateFrontRawValues(points)

  // 각 항목 분석
  const shoulderTiltFeedback = analyzeFrontShoulderTilt(rawValues.shoulderTiltDegree)
  const pelvicTiltFeedback = analyzeFrontPelvicTilt(rawValues.pelvicTiltDegree)
  const spineFeedback = analyzeFrontSpineAlignment(rawValues.spineDeviationDegree)
  const legFeedback = analyzeFrontLegAlignment(rawValues.legAlignmentDegree)
  const shoulderLevelnessFeedback = analyzeFrontShoulderLevelness(rawValues.shoulderLevelnessDegree)

  // 종합 점수 및 레벨
  const { score, level } = calculateFrontOverallScore({
    shoulderTilt: shoulderTiltFeedback,
    pelvicTilt: pelvicTiltFeedback,
    spineAlignment: spineFeedback,
    legAlignment: legFeedback,
    shoulderLevelness: shoulderLevelnessFeedback,
  })

  return {
    viewType: 'front',
    score,
    level,
    feedbacks: {
      shoulderTilt: shoulderTiltFeedback,
      pelvicTilt: pelvicTiltFeedback,
      spineAlignment: spineFeedback,
      legAlignment: legFeedback,
      shoulderLevelness: shoulderLevelnessFeedback,
    },
    rawValues,
  }
}

interface FrontPoints {
  leftShoulder: Point3D
  rightShoulder: Point3D
  leftHip: Point3D
  rightHip: Point3D
  leftKnee: Point3D
  rightKnee: Point3D
  leftAnkle: Point3D
  rightAnkle: Point3D
}

function calculateFrontRawValues(points: FrontPoints) {
  // 1. 어깨 기울기
  const shoulderHeightDiff = Math.abs(points.leftShoulder.y - points.rightShoulder.y)
  const shoulderWidth = distance2D(points.leftShoulder, points.rightShoulder)
  const shoulderTiltDegree = shoulderWidth > 0
    ? Math.atan(shoulderHeightDiff / shoulderWidth) * (180 / Math.PI)
    : 0

  // 2. 골반 기울기
  const hipHeightDiff = Math.abs(points.leftHip.y - points.rightHip.y)
  const hipWidth = distance2D(points.leftHip, points.rightHip)
  const pelvicTiltDegree = hipWidth > 0
    ? Math.atan(hipHeightDiff / hipWidth) * (180 / Math.PI)
    : 0

  // 3. 척추 정렬 (측만)
  const shoulderCenter = midpoint(points.leftShoulder, points.rightShoulder)
  const hipCenter = midpoint(points.leftHip, points.rightHip)
  const spineDeviationDegree = Math.abs(
    Math.atan2(shoulderCenter.x - hipCenter.x, hipCenter.y - shoulderCenter.y) * (180 / Math.PI)
  )

  // 4. 다리 정렬 (X/O자)
  // 엉덩이-무릎-발목 직선에서 무릎이 얼마나 벗어났는지
  const leftLegDeviation = calculateLegDeviation(points.leftHip, points.leftKnee, points.leftAnkle)
  const rightLegDeviation = calculateLegDeviation(points.rightHip, points.rightKnee, points.rightAnkle)
  const legAlignmentDegree = (leftLegDeviation + rightLegDeviation) / 2

  // 5. 어깨 수평도 (Shoulder Levelness)
  // 왼쪽 어깨에서 오른쪽 어깨로의 선이 수평선과 이루는 각도
  const shoulderLevelnessDegree = Math.abs(
    calculateAngleWithHorizontal(points.leftShoulder, points.rightShoulder)
  )

  return {
    shoulderTiltDegree: round(shoulderTiltDegree),
    pelvicTiltDegree: round(pelvicTiltDegree),
    spineDeviationDegree: round(spineDeviationDegree),
    legAlignmentDegree: round(legAlignmentDegree),
    shoulderHeightDiff: Math.round(shoulderHeightDiff),
    hipHeightDiff: Math.round(hipHeightDiff),
    shoulderLevelnessDegree: round(shoulderLevelnessDegree),
  }
}

function calculateLegDeviation(hip: Point3D, knee: Point3D, ankle: Point3D): number {
  // 엉덩이-발목 직선에서 무릎까지의 수평 거리
  const hipAnkleX = (hip.x + ankle.x) / 2
  const deviation = Math.abs(knee.x - hipAnkleX)
  const legLength = distance2D(hip, ankle)

  // 각도로 변환
  return legLength > 0
    ? Math.atan(deviation / legLength) * (180 / Math.PI)
    : 0
}

function analyzeFrontShoulderTilt(degree: number): PostureFeedbackItem {
  const { ideal, normal } = FRONT_THRESHOLDS.shoulderTilt

  if (degree <= ideal.max) {
    return {
      value: degree,
      level: 'good',
      message: '어깨가 수평으로 잘 정렬되어 있습니다',
      suggestion: '현재 자세를 유지하세요',
      idealRange: ideal,
      normalRange: normal,
    }
  } else if (degree <= normal.max) {
    return {
      value: degree,
      level: 'normal',
      message: `어깨가 ${degree.toFixed(1)}° 기울어져 있습니다`,
      suggestion: '가방을 한쪽으로만 매지 않도록 주의하세요. 거울을 보며 어깨 높이를 맞춰보세요.',
      idealRange: ideal,
      normalRange: normal,
    }
  } else {
    return {
      value: degree,
      level: 'bad',
      message: `어깨 기울기가 ${degree.toFixed(1)}°로 심합니다`,
      suggestion: '척추측만증 가능성이 있습니다. 전문가 상담을 권장합니다.',
      idealRange: ideal,
      normalRange: normal,
    }
  }
}

function analyzeFrontPelvicTilt(degree: number): PostureFeedbackItem {
  const { ideal, normal } = FRONT_THRESHOLDS.pelvicTilt

  if (degree <= ideal.max) {
    return {
      value: degree,
      level: 'good',
      message: '골반이 수평으로 잘 정렬되어 있습니다',
      suggestion: '현재 자세를 유지하세요',
      idealRange: ideal,
      normalRange: normal,
    }
  } else if (degree <= normal.max) {
    return {
      value: degree,
      level: 'normal',
      message: `골반이 ${degree.toFixed(1)}° 기울어져 있습니다`,
      suggestion: '다리를 꼬고 앉는 습관을 피하세요. 균형 잡힌 자세로 서도록 노력하세요.',
      idealRange: ideal,
      normalRange: normal,
    }
  } else {
    return {
      value: degree,
      level: 'bad',
      message: `골반 기울기가 ${degree.toFixed(1)}°로 심합니다`,
      suggestion: '골반 교정 운동이 필요합니다. 전문가 상담을 권장합니다.',
      idealRange: ideal,
      normalRange: normal,
    }
  }
}

function analyzeFrontSpineAlignment(degree: number): PostureFeedbackItem {
  const { ideal, normal } = FRONT_THRESHOLDS.spineAlignment

  if (degree <= ideal.max) {
    return {
      value: degree,
      level: 'good',
      message: '척추가 수직으로 잘 정렬되어 있습니다',
      suggestion: '현재 자세를 유지하세요',
      idealRange: ideal,
      normalRange: normal,
    }
  } else if (degree <= normal.max) {
    return {
      value: degree,
      level: 'normal',
      message: `척추가 ${degree.toFixed(1)}° 측면으로 기울어져 있습니다`,
      suggestion: '코어 근육 강화 운동을 권장합니다. 바른 자세로 앉는 습관을 들이세요.',
      idealRange: ideal,
      normalRange: normal,
    }
  } else {
    return {
      value: degree,
      level: 'bad',
      message: `척추 측만이 ${degree.toFixed(1)}°로 의심됩니다`,
      suggestion: '척추측만증 검사를 받아보시길 권장합니다.',
      idealRange: ideal,
      normalRange: normal,
    }
  }
}

function analyzeFrontLegAlignment(degree: number): PostureFeedbackItem {
  const { ideal, normal } = FRONT_THRESHOLDS.legAlignment

  if (degree <= ideal.max) {
    return {
      value: degree,
      level: 'good',
      message: '다리가 곧게 정렬되어 있습니다',
      suggestion: '현재 상태를 유지하세요',
      idealRange: ideal,
      normalRange: normal,
    }
  } else if (degree <= normal.max) {
    return {
      value: degree,
      level: 'normal',
      message: `다리 정렬이 ${degree.toFixed(1)}° 벗어나 있습니다`,
      suggestion: 'X자/O자 다리 경향이 있습니다. 스트레칭과 근력 운동을 권장합니다.',
      idealRange: ideal,
      normalRange: normal,
    }
  } else {
    return {
      value: degree,
      level: 'bad',
      message: `다리 정렬 이상이 ${degree.toFixed(1)}°로 심합니다`,
      suggestion: '무릎 관절 검사를 권장합니다. 전문 물리치료사 상담이 필요할 수 있습니다.',
      idealRange: ideal,
      normalRange: normal,
    }
  }
}

function analyzeFrontShoulderLevelness(degree: number): PostureFeedbackItem {
  const { ideal, normal } = FRONT_THRESHOLDS.shoulderLevelness

  if (degree <= ideal.max) {
    return {
      value: degree,
      level: 'good',
      message: '어깨가 수평으로 균형 잡혀 있습니다',
      suggestion: '현재 자세를 유지하세요',
      idealRange: ideal,
      normalRange: normal,
    }
  } else if (degree <= normal.max) {
    return {
      value: degree,
      level: 'normal',
      message: `어깨 수평도가 ${degree.toFixed(1)}° 기울어져 있습니다`,
      suggestion: '거울을 보며 양쪽 어깨 높이를 의식적으로 맞춰보세요. 한쪽으로 가방을 메는 습관을 피하세요.',
      idealRange: ideal,
      normalRange: normal,
    }
  } else {
    return {
      value: degree,
      level: 'bad',
      message: `어깨 불균형이 ${degree.toFixed(1)}°로 심각합니다`,
      suggestion: '어깨 불균형이 심합니다. 척추측만증이나 근육 불균형 가능성이 있으니 전문가 상담을 권장합니다.',
      idealRange: ideal,
      normalRange: normal,
    }
  }
}

interface FrontFeedbacks {
  shoulderTilt: PostureFeedbackItem
  pelvicTilt: PostureFeedbackItem
  spineAlignment: PostureFeedbackItem
  legAlignment: PostureFeedbackItem
  shoulderLevelness: PostureFeedbackItem
}

function calculateFrontOverallScore(feedbacks: FrontFeedbacks): { score: number; level: PostureLevel } {
  // Updated weights including shoulderLevelness (total = 1.0)
  const weights = {
    shoulderTilt: 0.15,       // reduced from 0.25
    pelvicTilt: 0.20,         // reduced from 0.25
    spineAlignment: 0.25,     // reduced from 0.30
    legAlignment: 0.20,       // same
    shoulderLevelness: 0.20,  // NEW - important for shoulder assessment
  }

  const scores = {
    shoulderTilt: calculateItemScore(feedbacks.shoulderTilt),
    pelvicTilt: calculateItemScore(feedbacks.pelvicTilt),
    spineAlignment: calculateItemScore(feedbacks.spineAlignment),
    legAlignment: calculateItemScore(feedbacks.legAlignment),
    shoulderLevelness: calculateItemScore(feedbacks.shoulderLevelness),
  }

  const totalScore =
    scores.shoulderTilt * weights.shoulderTilt +
    scores.pelvicTilt * weights.pelvicTilt +
    scores.spineAlignment * weights.spineAlignment +
    scores.legAlignment * weights.legAlignment +
    scores.shoulderLevelness * weights.shoulderLevelness

  const score = Math.round(totalScore)
  const level = determineOverallLevel(score, Object.values(feedbacks))

  return { score, level }
}

function createInvalidFrontResult(): FrontPostureResult {
  const invalidFeedback: PostureFeedbackItem = {
    value: 0,
    level: 'normal',
    message: '자세를 인식할 수 없습니다',
    suggestion: '정면을 바라보고 전신이 보이도록 서주세요',
    idealRange: { min: 0, max: 0 },
    normalRange: { min: 0, max: 0 },
  }

  return {
    viewType: 'front',
    score: 0,
    level: 'normal',
    feedbacks: {
      shoulderTilt: invalidFeedback,
      pelvicTilt: invalidFeedback,
      spineAlignment: invalidFeedback,
      legAlignment: invalidFeedback,
      shoulderLevelness: invalidFeedback,
    },
    rawValues: {
      shoulderTiltDegree: 0,
      pelvicTiltDegree: 0,
      spineDeviationDegree: 0,
      legAlignmentDegree: 0,
      shoulderHeightDiff: 0,
      hipHeightDiff: 0,
      shoulderLevelnessDegree: 0,
    },
  }
}


// ============================================
// 측면 분석기 (Side View Analyzer)
// ============================================

export interface SidePostureResult {
  viewType: 'side'
  score: number
  level: PostureLevel
  feedbacks: {
    forwardHead: PostureFeedbackItem       // 거북목 (머리 전방 변위)
    neckAngle: PostureFeedbackItem         // 목 각도
    kyphosis: PostureFeedbackItem          // 등굽음 (흉추 후만)
    lordosis: PostureFeedbackItem          // 허리굽이 (요추 전만)
    shoulderForwardRoll: PostureFeedbackItem  // 어깨 전방 회전
    scapulaPosition: PostureFeedbackItem      // 견갑골 위치
  }
  rawValues: {
    forwardHeadDistance: number     // 귀-어깨 수평 거리 (정규화 %)
    neckAngleDegree: number         // 목 각도
    kyphosisDegree: number          // 등굽음 각도
    lordosisDegree: number          // 허리굽이 각도
    earShoulderOffset: number       // 귀-어깨 픽셀 거리
    shoulderForwardRollDegree: number  // ear-shoulder-hip 각도
    scapulaProtraction: number         // 견갑골 돌출 비율 (%)
  }
}

const SIDE_THRESHOLDS = {
  forwardHead: {
    // 어깨 너비 대비 거리 비율 (%)
    ideal: { min: 0, max: 5 },
    normal: { min: 0, max: 15 },
  },
  neckAngle: {
    // 목 각도 (수직에서의 편차)
    ideal: { min: 0, max: 10 },
    normal: { min: 0, max: 25 },
  },
  kyphosis: {
    // 흉추 후만 각도 (정상: 20-40°)
    ideal: { min: 20, max: 40 },
    normal: { min: 15, max: 50 },
  },
  lordosis: {
    // 요추 전만 각도 (정상: 40-60°)
    ideal: { min: 40, max: 60 },
    normal: { min: 30, max: 70 },
  },
  // 귀-어깨-엉덩이 각도 (165-180° = 좋음, 더 작으면 라운드숄더)
  shoulderForwardRoll: {
    ideal: { min: 165, max: 180 },
    normal: { min: 150, max: 165 },
  },
  // 견갑골 돌출 비율 (Z-depth 기반, -5~5% = 좋음)
  scapulaPosition: {
    ideal: { min: -5, max: 5 },
    normal: { min: -15, max: 15 },
  },
} as const

/**
 * 측면 자세 분석 함수
 *
 * 분석 항목:
 * 1. 거북목 (Forward Head) - 귀와 어깨의 수평 거리
 * 2. 목 각도 - 귀-어깨 선과 수직선 사이 각도
 * 3. 등굽음 (Kyphosis) - 어깨-엉덩이-척추 곡률
 * 4. 허리굽이 (Lordosis) - 엉덩이-무릎 기준 요추 곡률
 *
 * 주의: 측면 촬영 시 한쪽 면만 보이므로,
 *       가까운 쪽 랜드마크를 사용합니다.
 */
export function analyzeSidePosture(keypoints: Keypoint[]): SidePostureResult {
  // 측면 촬영 시 어느 쪽이 더 잘 보이는지 판단
  const leftEar = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_EAR]
  const rightEar = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_EAR]
  const leftShoulder = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]
  const rightShoulder = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]
  const leftHip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP]
  const rightHip = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP]
  const leftKnee = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_KNEE]
  const rightKnee = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]
  const leftAnkle = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]
  const rightAnkle = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]

  // 더 신뢰도가 높은 쪽 선택
  const useLeft = (leftEar?.score ?? 0) + (leftShoulder?.score ?? 0) >
                  (rightEar?.score ?? 0) + (rightShoulder?.score ?? 0)

  const ear = useLeft ? leftEar : rightEar
  const shoulder = useLeft ? leftShoulder : rightShoulder
  const hip = useLeft ? leftHip : rightHip
  const knee = useLeft ? leftKnee : rightKnee
  const ankle = useLeft ? leftAnkle : rightAnkle

  const requiredKeypoints = [ear, shoulder, hip, knee, ankle]
  const allValid = requiredKeypoints.every(kp => isValidKeypoint(kp, MIN_KEYPOINT_SCORE))

  if (!allValid) {
    return createInvalidSideResult()
  }

  const points = {
    ear: keypointToPoint3D(ear),
    shoulder: keypointToPoint3D(shoulder),
    hip: keypointToPoint3D(hip),
    knee: keypointToPoint3D(knee),
    ankle: keypointToPoint3D(ankle),
  }

  // 정규화를 위한 기준 거리 (어깨-엉덩이 거리)
  const torsoLength = distance2D(points.shoulder, points.hip)

  // 원시 값 계산
  const rawValues = calculateSideRawValues(points, torsoLength)

  // 각 항목 분석
  const forwardHeadFeedback = analyzeSideForwardHead(rawValues.forwardHeadDistance)
  const neckAngleFeedback = analyzeSideNeckAngle(rawValues.neckAngleDegree)
  const kyphosisFeedback = analyzeSideKyphosis(rawValues.kyphosisDegree)
  const lordosisFeedback = analyzeSideLordosis(rawValues.lordosisDegree)
  const shoulderForwardRollFeedback = analyzeSideShoulderForwardRoll(rawValues.shoulderForwardRollDegree)
  const scapulaPositionFeedback = analyzeScapulaPosition(rawValues.scapulaProtraction)

  // 종합 점수 및 레벨
  const { score, level } = calculateSideOverallScore({
    forwardHead: forwardHeadFeedback,
    neckAngle: neckAngleFeedback,
    kyphosis: kyphosisFeedback,
    lordosis: lordosisFeedback,
    shoulderForwardRoll: shoulderForwardRollFeedback,
    scapulaPosition: scapulaPositionFeedback,
  })

  return {
    viewType: 'side',
    score,
    level,
    feedbacks: {
      forwardHead: forwardHeadFeedback,
      neckAngle: neckAngleFeedback,
      kyphosis: kyphosisFeedback,
      lordosis: lordosisFeedback,
      shoulderForwardRoll: shoulderForwardRollFeedback,
      scapulaPosition: scapulaPositionFeedback,
    },
    rawValues,
  }
}

interface SidePoints {
  ear: Point3D
  shoulder: Point3D
  hip: Point3D
  knee: Point3D
  ankle: Point3D
}

function calculateSideRawValues(points: SidePoints, torsoLength: number) {
  // 1. 거북목 (Forward Head)
  // 귀가 어깨보다 앞에 있는 거리 (x좌표 차이)
  // 측면에서 x좌표가 작을수록 앞쪽
  const earShoulderOffset = points.shoulder.x - points.ear.x
  const forwardHeadDistance = torsoLength > 0
    ? (Math.max(0, earShoulderOffset) / torsoLength) * 100
    : 0

  // 2. 목 각도
  // 귀-어깨 선과 수직선 사이의 각도
  const neckAngleDegree = Math.abs(
    Math.atan2(points.ear.x - points.shoulder.x, points.shoulder.y - points.ear.y) * (180 / Math.PI)
  )

  // 3. 등굽음 (Kyphosis) - 흉추 후만
  // 어깨에서 엉덩이로 가는 선과 수직선 사이 각도
  // 정면을 향해 서있을 때 측면에서 보면, 등이 굽으면 어깨가 앞으로 나옴
  const upperBackAngle = calculateAngleWithVertical(points.hip, points.shoulder)
  // 정상 범위(20-40°)에서 벗어난 정도로 변환
  const kyphosisDegree = upperBackAngle

  // 4. 허리굽이 (Lordosis) - 요추 전만
  // 엉덩이에서 무릎으로 가는 선 기준, 허리 곡률 추정
  // 엉덩이가 뒤로 빠져있으면 전만이 심함
  const hipKneeLine = Math.atan2(
    points.knee.x - points.hip.x,
    points.knee.y - points.hip.y
  ) * (180 / Math.PI)

  const shoulderHipLine = Math.atan2(
    points.hip.x - points.shoulder.x,
    points.hip.y - points.shoulder.y
  ) * (180 / Math.PI)

  // 두 선 사이의 각도가 요추 전만도를 나타냄
  const lordosisDegree = Math.abs(hipKneeLine - shoulderHipLine)

  // 5. 어깨 전방 회전 (Shoulder Forward Roll)
  // 귀-어깨-엉덩이 각도 계산 using calculate3DAngle
  const shoulderForwardRollDegree = calculate3DAngle(
    points.ear,
    points.shoulder,
    points.hip
  )

  // 6. 견갑골 위치 추정 (Scapula Position)
  // Z-depth 기반: 어깨의 Z값이 엉덩이 Z값보다 앞(작으면)에 있으면 견갑골 돌출
  // torsoLength 대비 비율로 정규화
  const shoulderHipZDiff = (points.shoulder.z ?? 0) - (points.hip.z ?? 0)
  const scapulaProtraction = torsoLength > 0
    ? (shoulderHipZDiff / torsoLength) * 100
    : 0

  return {
    forwardHeadDistance: round(forwardHeadDistance),
    neckAngleDegree: round(neckAngleDegree),
    kyphosisDegree: round(kyphosisDegree),
    lordosisDegree: round(lordosisDegree),
    earShoulderOffset: Math.round(earShoulderOffset),
    shoulderForwardRollDegree: round(shoulderForwardRollDegree),
    scapulaProtraction: round(scapulaProtraction),
  }
}

function analyzeSideForwardHead(distance: number): PostureFeedbackItem {
  const { ideal, normal } = SIDE_THRESHOLDS.forwardHead

  if (distance <= ideal.max) {
    return {
      value: distance,
      level: 'good',
      message: '머리가 어깨 위에 잘 정렬되어 있습니다',
      suggestion: '좋은 자세입니다. 계속 유지하세요.',
      idealRange: ideal,
      normalRange: normal,
    }
  } else if (distance <= normal.max) {
    return {
      value: distance,
      level: 'normal',
      message: `머리가 어깨보다 ${distance.toFixed(1)}% 앞으로 나와 있습니다`,
      suggestion: '턱을 당기고 귀가 어깨 위에 오도록 의식하세요. 모니터 높이를 눈높이로 조정하세요.',
      idealRange: ideal,
      normalRange: normal,
    }
  } else {
    return {
      value: distance,
      level: 'bad',
      message: `거북목이 심합니다 (${distance.toFixed(1)}% 전방 변위)`,
      suggestion: '목 스트레칭을 자주 해주세요. 스마트폰 사용 시 눈높이로 들어올리세요. 심한 경우 물리치료를 고려하세요.',
      idealRange: ideal,
      normalRange: normal,
    }
  }
}

function analyzeSideNeckAngle(degree: number): PostureFeedbackItem {
  const { ideal, normal } = SIDE_THRESHOLDS.neckAngle

  if (degree <= ideal.max) {
    return {
      value: degree,
      level: 'good',
      message: '목이 바르게 서 있습니다',
      suggestion: '현재 자세를 유지하세요.',
      idealRange: ideal,
      normalRange: normal,
    }
  } else if (degree <= normal.max) {
    return {
      value: degree,
      level: 'normal',
      message: `목이 ${degree.toFixed(1)}° 앞으로 기울어져 있습니다`,
      suggestion: '경추 스트레칭을 권장합니다. 컴퓨터 작업 시 자주 휴식을 취하세요.',
      idealRange: ideal,
      normalRange: normal,
    }
  } else {
    return {
      value: degree,
      level: 'bad',
      message: `목 기울기가 ${degree.toFixed(1)}°로 심각합니다`,
      suggestion: '경추 디스크 위험이 있습니다. 전문가 상담을 권장합니다.',
      idealRange: ideal,
      normalRange: normal,
    }
  }
}

function analyzeSideKyphosis(degree: number): PostureFeedbackItem {
  const { ideal, normal } = SIDE_THRESHOLDS.kyphosis

  if (degree >= ideal.min && degree <= ideal.max) {
    return {
      value: degree,
      level: 'good',
      message: '등이 바르게 펴져 있습니다',
      suggestion: '좋은 자세입니다. 계속 유지하세요.',
      idealRange: ideal,
      normalRange: normal,
    }
  } else if (degree >= normal.min && degree <= normal.max) {
    const isExcessive = degree > ideal.max
    return {
      value: degree,
      level: 'normal',
      message: isExcessive
        ? `등이 ${(degree - ideal.max).toFixed(1)}° 굽어 있습니다 (라운드 숄더)`
        : `등이 ${(ideal.min - degree).toFixed(1)}° 너무 펴져 있습니다 (일자등)`,
      suggestion: isExcessive
        ? '가슴을 펴고 어깨를 뒤로 당기는 스트레칭을 하세요.'
        : '등 근육 이완 스트레칭을 권장합니다.',
      idealRange: ideal,
      normalRange: normal,
    }
  } else {
    const isExcessive = degree > normal.max
    return {
      value: degree,
      level: 'bad',
      message: isExcessive
        ? `등굽음(Kyphosis)이 ${degree.toFixed(1)}°로 심합니다`
        : `일자등이 심합니다 (${degree.toFixed(1)}°)`,
      suggestion: '척추 전문의 상담을 권장합니다. 자세 교정 운동이 필요합니다.',
      idealRange: ideal,
      normalRange: normal,
    }
  }
}

function analyzeSideLordosis(degree: number): PostureFeedbackItem {
  const { ideal, normal } = SIDE_THRESHOLDS.lordosis

  if (degree >= ideal.min && degree <= ideal.max) {
    return {
      value: degree,
      level: 'good',
      message: '허리 곡선이 정상입니다',
      suggestion: '좋은 자세입니다. 계속 유지하세요.',
      idealRange: ideal,
      normalRange: normal,
    }
  } else if (degree >= normal.min && degree <= normal.max) {
    const isExcessive = degree > ideal.max
    return {
      value: degree,
      level: 'normal',
      message: isExcessive
        ? `허리가 ${(degree - ideal.max).toFixed(1)}° 과하게 휘어 있습니다 (과전만)`
        : `허리 곡선이 ${(ideal.min - degree).toFixed(1)}° 부족합니다 (일자허리)`,
      suggestion: isExcessive
        ? '복근 강화와 엉덩이 스트레칭을 권장합니다. 하이힐 착용을 줄이세요.'
        : '허리 스트레칭과 코어 운동을 권장합니다.',
      idealRange: ideal,
      normalRange: normal,
    }
  } else {
    const isExcessive = degree > normal.max
    return {
      value: degree,
      level: 'bad',
      message: isExcessive
        ? `요추 과전만(Lordosis)이 ${degree.toFixed(1)}°로 심합니다`
        : `일자허리가 심합니다 (${degree.toFixed(1)}°)`,
      suggestion: '척추 전문의 상담을 권장합니다. 코어 근력 강화가 필요합니다.',
      idealRange: ideal,
      normalRange: normal,
    }
  }
}

function analyzeSideShoulderForwardRoll(degree: number): PostureFeedbackItem {
  const { ideal, normal } = SIDE_THRESHOLDS.shoulderForwardRoll

  if (degree >= ideal.min && degree <= ideal.max) {
    return {
      value: degree,
      level: 'good',
      message: '어깨가 바르게 정렬되어 있습니다',
      suggestion: '현재 자세를 유지하세요',
      idealRange: ideal,
      normalRange: normal,
    }
  } else if (degree >= normal.min && degree < ideal.min) {
    return {
      value: degree,
      level: 'normal',
      message: `어깨가 ${(ideal.min - degree).toFixed(1)}° 앞으로 말려 있습니다`,
      suggestion: '가슴을 펴고 어깨를 뒤로 젖히는 스트레칭을 하세요. 장시간 컴퓨터 작업 시 자세를 자주 확인하세요.',
      idealRange: ideal,
      normalRange: normal,
    }
  } else if (degree < normal.min) {
    return {
      value: degree,
      level: 'bad',
      message: `라운드 숄더가 심합니다 (${degree.toFixed(1)}°)`,
      suggestion: '어깨가 심하게 앞으로 말려 있습니다. 흉추 스트레칭과 후면 삼각근 강화 운동을 권장합니다. 전문가 상담이 필요할 수 있습니다.',
      idealRange: ideal,
      normalRange: normal,
    }
  } else {
    // degree > ideal.max (과신전)
    return {
      value: degree,
      level: 'normal',
      message: '어깨가 다소 뒤로 젖혀져 있습니다',
      suggestion: '자연스러운 자세를 유지하세요',
      idealRange: ideal,
      normalRange: normal,
    }
  }
}

function analyzeScapulaPosition(protraction: number): PostureFeedbackItem {
  const { ideal, normal } = SIDE_THRESHOLDS.scapulaPosition

  if (protraction >= ideal.min && protraction <= ideal.max) {
    return {
      value: protraction,
      level: 'good',
      message: '견갑골이 정상 위치에 있습니다',
      suggestion: '현재 자세를 유지하세요',
      idealRange: ideal,
      normalRange: normal,
    }
  } else if (protraction >= normal.min && protraction <= normal.max) {
    const isProtracted = protraction < ideal.min
    return {
      value: protraction,
      level: 'normal',
      message: isProtracted
        ? `견갑골이 ${Math.abs(protraction).toFixed(1)}% 앞으로 돌출되어 있습니다`
        : `견갑골이 ${protraction.toFixed(1)}% 뒤로 당겨져 있습니다`,
      suggestion: isProtracted
        ? '능형근과 중하부 승모근 강화 운동을 권장합니다. 어깨를 뒤로 모으는 동작을 자주 하세요.'
        : '어깨 앞쪽 스트레칭을 권장합니다. 과도한 긴장을 풀어주세요.',
      idealRange: ideal,
      normalRange: normal,
    }
  } else {
    const isProtracted = protraction < normal.min
    return {
      value: protraction,
      level: 'bad',
      message: isProtracted
        ? `견갑골 전인(Protraction)이 ${Math.abs(protraction).toFixed(1)}%로 심합니다`
        : `견갑골 후인(Retraction)이 ${protraction.toFixed(1)}%로 과도합니다`,
      suggestion: isProtracted
        ? '익상 견갑(날개 견갑골) 가능성이 있습니다. 전문가 상담과 체계적인 교정 운동이 필요합니다.'
        : '어깨 근육의 과긴장 상태입니다. 이완 운동과 전문가 상담을 권장합니다.',
      idealRange: ideal,
      normalRange: normal,
    }
  }
}

interface SideFeedbacks {
  forwardHead: PostureFeedbackItem
  neckAngle: PostureFeedbackItem
  kyphosis: PostureFeedbackItem
  lordosis: PostureFeedbackItem
  shoulderForwardRoll: PostureFeedbackItem
  scapulaPosition: PostureFeedbackItem
}

function calculateSideOverallScore(feedbacks: SideFeedbacks): { score: number; level: PostureLevel } {
  // Updated weights (total = 1.0)
  const weights = {
    forwardHead: 0.25,         // reduced from 0.35
    neckAngle: 0.15,           // reduced from 0.20
    kyphosis: 0.20,            // reduced from 0.25
    lordosis: 0.15,            // reduced from 0.20
    shoulderForwardRoll: 0.15, // NEW
    scapulaPosition: 0.10,     // NEW
  }

  const scores = {
    forwardHead: calculateItemScore(feedbacks.forwardHead),
    neckAngle: calculateItemScore(feedbacks.neckAngle),
    kyphosis: calculateItemScoreSymmetric(feedbacks.kyphosis),
    lordosis: calculateItemScoreSymmetric(feedbacks.lordosis),
    shoulderForwardRoll: calculateItemScoreSymmetric(feedbacks.shoulderForwardRoll),
    scapulaPosition: calculateItemScoreSymmetric(feedbacks.scapulaPosition),
  }

  const totalScore =
    scores.forwardHead * weights.forwardHead +
    scores.neckAngle * weights.neckAngle +
    scores.kyphosis * weights.kyphosis +
    scores.lordosis * weights.lordosis +
    scores.shoulderForwardRoll * weights.shoulderForwardRoll +
    scores.scapulaPosition * weights.scapulaPosition

  const score = Math.round(totalScore)
  const level = determineOverallLevel(score, Object.values(feedbacks))

  return { score, level }
}

function createInvalidSideResult(): SidePostureResult {
  const invalidFeedback: PostureFeedbackItem = {
    value: 0,
    level: 'normal',
    message: '자세를 인식할 수 없습니다',
    suggestion: '측면을 바라보고 전신이 보이도록 서주세요',
    idealRange: { min: 0, max: 0 },
    normalRange: { min: 0, max: 0 },
  }

  return {
    viewType: 'side',
    score: 0,
    level: 'normal',
    feedbacks: {
      forwardHead: invalidFeedback,
      neckAngle: invalidFeedback,
      kyphosis: invalidFeedback,
      lordosis: invalidFeedback,
      shoulderForwardRoll: invalidFeedback,
      scapulaPosition: invalidFeedback,
    },
    rawValues: {
      forwardHeadDistance: 0,
      neckAngleDegree: 0,
      kyphosisDegree: 0,
      lordosisDegree: 0,
      earShoulderOffset: 0,
      shoulderForwardRollDegree: 0,
      scapulaProtraction: 0,
    },
  }
}


// ============================================
// 공통 유틸리티 함수
// ============================================

function round(value: number): number {
  return Math.round(value * 10) / 10
}

function calculateItemScore(feedback: PostureFeedbackItem): number {
  const { value, idealRange, normalRange } = feedback

  // 이상적 범위 내: 100점
  if (value >= idealRange.min && value <= idealRange.max) {
    return 100
  }

  // 정상 범위 내: 50-90점
  if (value >= normalRange.min && value <= normalRange.max) {
    if (value < idealRange.min) {
      const distance = idealRange.min - value
      const maxDistance = idealRange.min - normalRange.min
      const ratio = maxDistance > 0 ? distance / maxDistance : 0
      return Math.round(90 - ratio * 40)
    } else {
      const distance = value - idealRange.max
      const maxDistance = normalRange.max - idealRange.max
      const ratio = maxDistance > 0 ? distance / maxDistance : 0
      return Math.round(90 - ratio * 40)
    }
  }

  // 정상 범위 밖: 0-50점
  if (value < normalRange.min) {
    const distance = normalRange.min - value
    return Math.round(Math.max(0, 50 - distance * 3))
  } else {
    const distance = value - normalRange.max
    return Math.round(Math.max(0, 50 - distance * 3))
  }
}

// 양방향 범위용 (Kyphosis, Lordosis)
function calculateItemScoreSymmetric(feedback: PostureFeedbackItem): number {
  const { value, idealRange, normalRange } = feedback

  // 이상적 범위 내: 100점
  if (value >= idealRange.min && value <= idealRange.max) {
    return 100
  }

  // 정상 범위 내: 50-90점
  if (value >= normalRange.min && value <= normalRange.max) {
    let distance: number
    let maxDistance: number

    if (value < idealRange.min) {
      distance = idealRange.min - value
      maxDistance = idealRange.min - normalRange.min
    } else {
      distance = value - idealRange.max
      maxDistance = normalRange.max - idealRange.max
    }

    const ratio = maxDistance > 0 ? distance / maxDistance : 0
    return Math.round(90 - ratio * 40)
  }

  // 정상 범위 밖: 0-50점
  let distance: number
  if (value < normalRange.min) {
    distance = normalRange.min - value
  } else {
    distance = value - normalRange.max
  }
  return Math.round(Math.max(0, 50 - distance * 2))
}

function determineOverallLevel(score: number, feedbacks: PostureFeedbackItem[]): PostureLevel {
  // 기본 레벨
  let level: PostureLevel
  if (score >= 80) {
    level = 'good'
  } else if (score >= 50) {
    level = 'normal'
  } else {
    level = 'bad'
  }

  // 하나라도 bad면 전체를 bad로
  const levels = feedbacks.map(f => f.level)
  if (levels.includes('bad')) {
    level = 'bad'
  } else if (levels.includes('normal') && level === 'good') {
    level = 'normal'
  }

  return level
}

/**
 * 촬영 각도 자동 감지
 * 정면인지 측면인지 판단
 */
export function detectViewType(keypoints: Keypoint[]): ViewType {
  const leftShoulder = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]
  const rightShoulder = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]
  const leftHip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP]
  const rightHip = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP]

  if (!isValidKeypoint(leftShoulder) || !isValidKeypoint(rightShoulder) ||
      !isValidKeypoint(leftHip) || !isValidKeypoint(rightHip)) {
    return 'front' // 기본값
  }

  // 어깨 너비와 엉덩이 너비 계산
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x)
  const hipWidth = Math.abs(leftHip.x - rightHip.x)
  const avgWidth = (shoulderWidth + hipWidth) / 2

  // 어깨 높이 차이
  const shoulderHeightDiff = Math.abs(leftShoulder.y - rightShoulder.y)

  // 정면이면 좌우 너비가 크고, 측면이면 좌우 너비가 작음
  // 측면일 때는 한쪽이 가려지므로 너비가 매우 작아짐
  // 신뢰도 점수 차이도 고려

  const leftScore = (leftShoulder.score ?? 0) + (leftHip.score ?? 0)
  const rightScore = (rightShoulder.score ?? 0) + (rightHip.score ?? 0)
  const scoreDiff = Math.abs(leftScore - rightScore)

  // 한쪽 점수가 현저히 낮으면 측면
  if (scoreDiff > 0.5) {
    return 'side'
  }

  // 어깨 너비가 높이 차이의 3배 이상이면 정면
  if (shoulderWidth > shoulderHeightDiff * 3 && avgWidth > 50) {
    return 'front'
  }

  return 'side'
}

/**
 * 레벨을 한국어로 변환
 */
export function getLevelLabel(level: PostureLevel): string {
  switch (level) {
    case 'good':
      return '양호'
    case 'normal':
      return '보통'
    case 'bad':
      return '주의'
  }
}

/**
 * 레벨에 따른 색상 클래스 반환
 */
export function getLevelColorClass(level: PostureLevel): string {
  switch (level) {
    case 'good':
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
    case 'normal':
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30'
    case 'bad':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
  }
}

/**
 * 점수에 따른 색상 클래스 반환
 */
export function getScoreColorClass(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400'
  if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

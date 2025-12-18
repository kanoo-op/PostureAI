'use client'

import { useRef, useEffect, useCallback } from 'react'
import { SKELETON_CONNECTIONS, BLAZEPOSE_KEYPOINTS } from '@/types/pose'

// ============================================
// 타입 정의
// ============================================

export interface Keypoint {
  x: number
  y: number
  z?: number
  score?: number
}

export type FeedbackLevel = 'good' | 'warning' | 'error'
export type CorrectionDirection = 'up' | 'down' | 'left' | 'right' | 'forward' | 'backward' | 'inward' | 'outward' | 'none'

export interface JointFeedback {
  jointIndex: number           // BlazePose 키포인트 인덱스
  level: FeedbackLevel
  angle?: number               // 표시할 각도 값
  angleJoints?: [number, number, number]  // 각도를 표시할 3개 관절 인덱스 [시작, 꼭지점, 끝]
  correction?: CorrectionDirection
  message?: string
}

/**
 * Configuration for ideal angle range per exercise type
 */
export interface KneeIdealRange {
  /** Minimum ideal angle in degrees */
  min: number
  /** Maximum ideal angle in degrees */
  max: number
  /** Warning threshold - degrees outside ideal before showing warning */
  warningThreshold: number
  /** Error threshold - degrees outside ideal before showing error */
  errorThreshold: number
}

/**
 * Preset ideal ranges for common exercises
 */
export const KNEE_IDEAL_RANGES: Record<string, KneeIdealRange> = {
  squat: { min: 70, max: 100, warningThreshold: 15, errorThreshold: 25 },
  lunge: { min: 80, max: 110, warningThreshold: 15, errorThreshold: 25 },
  deadlift: { min: 160, max: 180, warningThreshold: 10, errorThreshold: 20 },
  legPress: { min: 80, max: 100, warningThreshold: 10, errorThreshold: 20 },
}

/**
 * Visualization style options
 */
export type KneeVisualizationStyle = 'compact' | 'expanded'

/**
 * Data for rendering a single knee's angle visualization
 */
export interface KneeAngleVisualizationData {
  currentAngle: number
  idealRange: KneeIdealRange
  correctionNeeded: 'bend_more' | 'straighten' | 'none'
  deviationDegrees: number
}

export interface SkeletonOverlayProps {
  keypoints: Keypoint[]
  feedbacks?: JointFeedback[]
  width: number
  height: number
  mirrored?: boolean
  showSkeleton?: boolean
  showKeypoints?: boolean
  showAngles?: boolean
  showCorrections?: boolean
  showPulse?: boolean
  minKeypointScore?: number
  className?: string
  // Knee deviation visualization
  showKneeDeviation?: boolean
  kneeDeviationData?: {
    leftDegrees: number
    rightDegrees: number
    leftType: 'valgus' | 'varus' | 'neutral'
    rightType: 'valgus' | 'varus' | 'neutral'
    dynamicChange: number
    peakDeviation: number
  }
  /** Enable knee angle arc visualization */
  showKneeAngleVisualization?: boolean
  /** Ideal angle range configuration for knee visualization */
  kneeIdealRange?: KneeIdealRange
  /** Visualization style: compact (minimal) or expanded (full details) */
  kneeVisualizationStyle?: KneeVisualizationStyle
}

// ============================================
// 색상 상수
// ============================================

const COLORS = {
  good: '#00ff88',
  warning: '#ffaa00',
  error: '#ff4444',
  correction: '#00ddff',
  skeleton: '#ffffff',
  angleArc: '#00ddff',
  angleText: '#ffffff',
  pulse: {
    warning: 'rgba(255, 170, 0, 0.3)',
    error: 'rgba(255, 68, 68, 0.4)',
  },
  // Knee deviation colors
  valgusIndicator: '#ff6b6b',
  varusIndicator: '#ffd93d',
  neutralIndicator: '#00ff88',
  hipAnkleLine: '#4ade80',
  // Knee angle visualization colors
  idealZone: '#00F5A0',
  idealZoneFill: 'rgba(0, 245, 160, 0.15)',
  idealZoneBorder: 'rgba(0, 245, 160, 0.6)',
  warningZone: '#FFB800',
  warningZoneFill: 'rgba(255, 184, 0, 0.12)',
  dangerZone: '#FF3D71',
  dangerZoneFill: 'rgba(255, 61, 113, 0.12)',
  angleArcGood: '#00F5A0',
  angleArcWarning: '#FFB800',
  angleArcError: '#FF3D71',
  correctionArrow: '#00ddff',
  correctionArrowPulse: 'rgba(0, 221, 255, 0.6)',
  arcBackground: 'rgba(255, 255, 255, 0.1)',
} as const

// ============================================
// 메인 컴포넌트
// ============================================

export default function SkeletonOverlay({
  keypoints,
  feedbacks = [],
  width,
  height,
  mirrored = false,
  showSkeleton = true,
  showKeypoints = true,
  showAngles = true,
  showCorrections = true,
  showPulse = true,
  minKeypointScore = 0.3,
  className = '',
  showKneeDeviation = false,
  kneeDeviationData,
  showKneeAngleVisualization = false,
  kneeIdealRange = KNEE_IDEAL_RANGES.squat,
  kneeVisualizationStyle = 'compact',
}: SkeletonOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const pulsePhaseRef = useRef<number>(0)

  // 피드백 맵 생성 (빠른 조회용)
  const feedbackMap = new Map<number, JointFeedback>()
  feedbacks.forEach(fb => feedbackMap.set(fb.jointIndex, fb))

  // 관절 색상 결정
  const getJointColor = useCallback((index: number): string => {
    const feedback = feedbackMap.get(index)
    if (!feedback) return COLORS.good
    return COLORS[feedback.level]
  }, [feedbackMap])

  // 관절 레벨 가져오기
  const getJointLevel = useCallback((index: number): FeedbackLevel => {
    const feedback = feedbackMap.get(index)
    return feedback?.level ?? 'good'
  }, [feedbackMap])

  // 미러링 적용된 x 좌표 계산
  const getMirroredX = useCallback((x: number): number => {
    return mirrored ? width - x : x
  }, [mirrored, width])

  // 키포인트 유효성 검사
  const isValidKeypoint = useCallback((kp: Keypoint | undefined): boolean => {
    return kp !== undefined && (kp.score ?? 0) >= minKeypointScore
  }, [minKeypointScore])

  // 그리기 함수
  const draw = useCallback((ctx: CanvasRenderingContext2D, pulsePhase: number) => {
    ctx.clearRect(0, 0, width, height)

    if (!keypoints || keypoints.length === 0) return

    // 1. 펄스 효과 (문제 있는 관절)
    if (showPulse) {
      drawPulseEffects(ctx, keypoints, feedbackMap, pulsePhase, getMirroredX, isValidKeypoint)
    }

    // 2. 스켈레톤 연결선
    if (showSkeleton) {
      drawSkeletonConnections(ctx, keypoints, feedbackMap, getMirroredX, isValidKeypoint)
    }

    // 2.5 Knee deviation overlay (after skeleton, before angles)
    if (showKneeDeviation && kneeDeviationData) {
      drawKneeDeviationOverlay(ctx, keypoints, kneeDeviationData, getMirroredX, isValidKeypoint)
    }

    // 2.6 Knee angle visualization
    if (showKneeAngleVisualization) {
      drawKneeAngleVisualization(
        ctx,
        keypoints,
        kneeIdealRange,
        kneeVisualizationStyle,
        pulsePhase,
        getMirroredX,
        isValidKeypoint
      )
    }

    // 3. 각도 호와 숫자
    if (showAngles) {
      drawAngleArcs(ctx, keypoints, feedbacks, getMirroredX, isValidKeypoint, mirrored)
    }

    // 4. 키포인트
    if (showKeypoints) {
      drawKeypoints(ctx, keypoints, feedbackMap, getMirroredX, isValidKeypoint, getJointColor)
    }

    // 5. 교정 화살표
    if (showCorrections) {
      drawCorrectionArrows(ctx, keypoints, feedbacks, getMirroredX, isValidKeypoint, mirrored)
    }
  }, [keypoints, feedbacks, feedbackMap, width, height, mirrored, showSkeleton, showKeypoints, showAngles, showCorrections, showPulse, showKneeDeviation, kneeDeviationData, showKneeAngleVisualization, kneeIdealRange, kneeVisualizationStyle, getMirroredX, isValidKeypoint, getJointColor])

  // 애니메이션 루프
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let lastTime = 0
    const animate = (time: number) => {
      // 펄스 애니메이션 (1초 주기)
      pulsePhaseRef.current = (time % 1000) / 1000

      // 60fps로 제한
      if (time - lastTime > 16) {
        draw(ctx, pulsePhaseRef.current)
        lastTime = time
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`absolute top-0 left-0 pointer-events-none ${className}`}
    />
  )
}

// ============================================
// 그리기 함수들
// ============================================

/**
 * 펄스 효과 그리기 (문제 있는 관절에 반투명 원)
 */
function drawPulseEffects(
  ctx: CanvasRenderingContext2D,
  keypoints: Keypoint[],
  feedbackMap: Map<number, JointFeedback>,
  pulsePhase: number,
  getMirroredX: (x: number) => number,
  isValidKeypoint: (kp: Keypoint | undefined) => boolean
) {
  feedbackMap.forEach((feedback, index) => {
    if (feedback.level === 'good') return

    const kp = keypoints[index]
    if (!isValidKeypoint(kp)) return

    const x = getMirroredX(kp.x)
    const y = kp.y

    // 사인파로 부드러운 펄스 효과
    const pulseSize = 15 + Math.sin(pulsePhase * Math.PI * 2) * 10
    const pulseOpacity = 0.3 + Math.sin(pulsePhase * Math.PI * 2) * 0.2

    ctx.beginPath()
    ctx.arc(x, y, pulseSize, 0, Math.PI * 2)

    const baseColor = feedback.level === 'error' ? COLORS.error : COLORS.warning
    ctx.fillStyle = hexToRgba(baseColor, pulseOpacity)
    ctx.fill()
  })
}

/**
 * 스켈레톤 연결선 그리기
 */
function drawSkeletonConnections(
  ctx: CanvasRenderingContext2D,
  keypoints: Keypoint[],
  feedbackMap: Map<number, JointFeedback>,
  getMirroredX: (x: number) => number,
  isValidKeypoint: (kp: Keypoint | undefined) => boolean
) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
    const startKp = keypoints[startIdx]
    const endKp = keypoints[endIdx]

    if (!isValidKeypoint(startKp) || !isValidKeypoint(endKp)) continue

    const startX = getMirroredX(startKp.x)
    const endX = getMirroredX(endKp.x)

    // 연결된 관절 중 더 나쁜 상태의 색상 사용
    const startFb = feedbackMap.get(startIdx)
    const endFb = feedbackMap.get(endIdx)
    const color = getWorseColor(startFb?.level, endFb?.level)

    // 신뢰도 기반 투명도
    const avgScore = ((startKp.score ?? 1) + (endKp.score ?? 1)) / 2
    const opacity = Math.max(0.4, avgScore)

    ctx.beginPath()
    ctx.moveTo(startX, startKp.y)
    ctx.lineTo(endX, endKp.y)
    ctx.strokeStyle = hexToRgba(color, opacity)
    ctx.lineWidth = 3
    ctx.stroke()
  }
}

/**
 * Draw knee deviation visualization overlay
 */
function drawKneeDeviationOverlay(
  ctx: CanvasRenderingContext2D,
  keypoints: Keypoint[],
  deviationData: NonNullable<SkeletonOverlayProps['kneeDeviationData']>,
  getMirroredX: (x: number) => number,
  isValidKeypoint: (kp: Keypoint | undefined) => boolean
) {
  const leftHip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP]
  const rightHip = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP]
  const leftKnee = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_KNEE]
  const rightKnee = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]
  const leftAnkle = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]
  const rightAnkle = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]

  if (!isValidKeypoint(leftHip) || !isValidKeypoint(rightHip) ||
      !isValidKeypoint(leftKnee) || !isValidKeypoint(rightKnee) ||
      !isValidKeypoint(leftAnkle) || !isValidKeypoint(rightAnkle)) return

  // Draw hip-ankle reference lines (dashed)
  ctx.setLineDash([5, 5])
  ctx.strokeStyle = COLORS.hipAnkleLine
  ctx.lineWidth = 2

  // Left leg reference line
  ctx.beginPath()
  ctx.moveTo(getMirroredX(leftHip.x), leftHip.y)
  ctx.lineTo(getMirroredX(leftAnkle.x), leftAnkle.y)
  ctx.stroke()

  // Right leg reference line
  ctx.beginPath()
  ctx.moveTo(getMirroredX(rightHip.x), rightHip.y)
  ctx.lineTo(getMirroredX(rightAnkle.x), rightAnkle.y)
  ctx.stroke()

  ctx.setLineDash([])

  // Helper to draw deviation indicator for one knee
  const drawDeviation = (
    knee: Keypoint, hip: Keypoint, ankle: Keypoint,
    type: 'valgus' | 'varus' | 'neutral',
    degrees: number
  ) => {
    const kneeX = getMirroredX(knee.x)
    const hipX = getMirroredX(hip.x)
    const ankleX = getMirroredX(ankle.x)

    // Calculate ideal position on hip-ankle line
    const t = (knee.y - hip.y) / (ankle.y - hip.y)
    const idealX = hipX + t * (ankleX - hipX)

    // Deviation line from ideal to actual
    ctx.beginPath()
    ctx.moveTo(idealX, knee.y)
    ctx.lineTo(kneeX, knee.y)
    ctx.strokeStyle = type === 'valgus' ? COLORS.valgusIndicator :
                      type === 'varus' ? COLORS.varusIndicator :
                      COLORS.neutralIndicator
    ctx.lineWidth = 3
    ctx.stroke()

    // Deviation indicator dot at knee
    if (Math.abs(degrees) > 2) {
      ctx.beginPath()
      ctx.arc(kneeX, knee.y, 6, 0, Math.PI * 2)
      ctx.fillStyle = ctx.strokeStyle
      ctx.fill()
    }
  }

  drawDeviation(leftKnee, leftHip, leftAnkle, deviationData.leftType, deviationData.leftDegrees)
  drawDeviation(rightKnee, rightHip, rightAnkle, deviationData.rightType, deviationData.rightDegrees)
}

/**
 * 키포인트 그리기
 */
function drawKeypoints(
  ctx: CanvasRenderingContext2D,
  keypoints: Keypoint[],
  feedbackMap: Map<number, JointFeedback>,
  getMirroredX: (x: number) => number,
  isValidKeypoint: (kp: Keypoint | undefined) => boolean,
  getJointColor: (index: number) => string
) {
  keypoints.forEach((kp, index) => {
    if (!isValidKeypoint(kp)) return

    const x = getMirroredX(kp.x)
    const y = kp.y
    const color = getJointColor(index)
    const feedback = feedbackMap.get(index)
    const radius = feedback && feedback.level !== 'good' ? 7 : 5

    // 외곽선
    ctx.beginPath()
    ctx.arc(x, y, radius + 1, 0, Math.PI * 2)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.stroke()

    // 채우기
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  })
}

/**
 * 각도 호와 숫자 그리기
 */
function drawAngleArcs(
  ctx: CanvasRenderingContext2D,
  keypoints: Keypoint[],
  feedbacks: JointFeedback[],
  getMirroredX: (x: number) => number,
  isValidKeypoint: (kp: Keypoint | undefined) => boolean,
  mirrored: boolean
) {
  feedbacks.forEach(feedback => {
    if (!feedback.angleJoints || feedback.angle === undefined) return

    const [startIdx, vertexIdx, endIdx] = feedback.angleJoints
    const startKp = keypoints[startIdx]
    const vertexKp = keypoints[vertexIdx]
    const endKp = keypoints[endIdx]

    if (!isValidKeypoint(startKp) || !isValidKeypoint(vertexKp) || !isValidKeypoint(endKp)) return

    const vx = getMirroredX(vertexKp.x)
    const vy = vertexKp.y
    const sx = getMirroredX(startKp.x)
    const sy = startKp.y
    const ex = getMirroredX(endKp.x)
    const ey = endKp.y

    // 각도 계산
    const angle1 = Math.atan2(sy - vy, sx - vx)
    const angle2 = Math.atan2(ey - vy, ex - vx)

    // 시작/끝 각도 정렬
    let startAngle = angle1
    let endAngle = angle2
    if (startAngle > endAngle) {
      [startAngle, endAngle] = [endAngle, startAngle]
    }

    // 호 반지름
    const arcRadius = 25

    // 색상 선택
    const arcColor = COLORS[feedback.level]

    // 호 그리기
    ctx.beginPath()
    ctx.arc(vx, vy, arcRadius, startAngle, endAngle)
    ctx.strokeStyle = arcColor
    ctx.lineWidth = 2
    ctx.stroke()

    // 각도 숫자 표시
    const midAngle = (startAngle + endAngle) / 2
    const textRadius = arcRadius + 15
    const textX = vx + Math.cos(midAngle) * textRadius
    const textY = vy + Math.sin(midAngle) * textRadius

    // 텍스트 배경
    const angleText = `${Math.round(feedback.angle)}°`
    ctx.font = 'bold 12px Arial'
    const textMetrics = ctx.measureText(angleText)
    const textWidth = textMetrics.width
    const textHeight = 14

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(
      textX - textWidth / 2 - 3,
      textY - textHeight / 2 - 2,
      textWidth + 6,
      textHeight + 4
    )

    // 텍스트
    ctx.fillStyle = arcColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(angleText, textX, textY)
  })
}

/**
 * 교정 화살표 그리기
 */
function drawCorrectionArrows(
  ctx: CanvasRenderingContext2D,
  keypoints: Keypoint[],
  feedbacks: JointFeedback[],
  getMirroredX: (x: number) => number,
  isValidKeypoint: (kp: Keypoint | undefined) => boolean,
  mirrored: boolean
) {
  feedbacks.forEach(feedback => {
    if (!feedback.correction || feedback.correction === 'none') return
    if (feedback.level === 'good') return

    const kp = keypoints[feedback.jointIndex]
    if (!isValidKeypoint(kp)) return

    const x = getMirroredX(kp.x)
    const y = kp.y

    // 화살표 방향 결정
    let dx = 0, dy = 0
    const arrowLength = 30
    const arrowOffset = 15 // 관절에서 떨어진 거리

    switch (feedback.correction) {
      case 'up':
        dy = -arrowLength
        break
      case 'down':
        dy = arrowLength
        break
      case 'left':
        dx = mirrored ? arrowLength : -arrowLength
        break
      case 'right':
        dx = mirrored ? -arrowLength : arrowLength
        break
      case 'forward':
        // 화면 기준 위쪽 대각선
        dx = mirrored ? arrowLength * 0.5 : -arrowLength * 0.5
        dy = -arrowLength * 0.5
        break
      case 'backward':
        dx = mirrored ? -arrowLength * 0.5 : arrowLength * 0.5
        dy = arrowLength * 0.5
        break
      case 'inward':
        // 몸 중심 방향
        dx = x > getMirroredX(keypoints[0]?.x ?? x) ? -arrowLength : arrowLength
        break
      case 'outward':
        dx = x > getMirroredX(keypoints[0]?.x ?? x) ? arrowLength : -arrowLength
        break
    }

    // 시작점 (관절에서 약간 떨어진 위치)
    const startX = x + (dx === 0 ? 0 : (dx > 0 ? arrowOffset : -arrowOffset))
    const startY = y + (dy === 0 ? 0 : (dy > 0 ? arrowOffset : -arrowOffset))
    const endX = startX + dx
    const endY = startY + dy

    // 화살표 몸통
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(endX, endY)
    ctx.strokeStyle = COLORS.correction
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.stroke()

    // 화살표 머리
    const headLength = 10
    const headAngle = Math.atan2(dy, dx)

    ctx.beginPath()
    ctx.moveTo(endX, endY)
    ctx.lineTo(
      endX - headLength * Math.cos(headAngle - Math.PI / 6),
      endY - headLength * Math.sin(headAngle - Math.PI / 6)
    )
    ctx.moveTo(endX, endY)
    ctx.lineTo(
      endX - headLength * Math.cos(headAngle + Math.PI / 6),
      endY - headLength * Math.sin(headAngle + Math.PI / 6)
    )
    ctx.strokeStyle = COLORS.correction
    ctx.lineWidth = 3
    ctx.stroke()

    // 화살표 끝에 글로우 효과
    ctx.beginPath()
    ctx.arc(endX, endY, 4, 0, Math.PI * 2)
    ctx.fillStyle = COLORS.correction
    ctx.fill()
  })
}

// ============================================
// 유틸리티 함수
// ============================================

function hexToRgba(hex: string, alpha: number): string {
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function getWorseColor(level1?: FeedbackLevel, level2?: FeedbackLevel): string {
  const levels: FeedbackLevel[] = ['good', 'warning', 'error']
  const idx1 = level1 ? levels.indexOf(level1) : 0
  const idx2 = level2 ? levels.indexOf(level2) : 0
  const worseLevel = levels[Math.max(idx1, idx2)]
  return COLORS[worseLevel]
}

// ============================================
// Knee Angle Visualization Utilities
// ============================================

/**
 * Calculate the geometry for an angle arc visualization
 * @param p1 First point (e.g., hip)
 * @param vertex Vertex point (e.g., knee)
 * @param p2 Second point (e.g., ankle)
 * @returns Arc geometry including angles and radius
 */
function calculateAngleArc(
  p1: { x: number; y: number },
  vertex: { x: number; y: number },
  p2: { x: number; y: number }
): {
  startAngle: number
  endAngle: number
  angleDegrees: number
  midAngle: number
} {
  const angle1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x)
  const angle2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x)

  let startAngle = angle1
  let endAngle = angle2

  // Normalize to ensure proper arc direction
  let diff = endAngle - startAngle
  if (diff > Math.PI) {
    diff -= 2 * Math.PI
  } else if (diff < -Math.PI) {
    diff += 2 * Math.PI
  }

  if (diff < 0) {
    [startAngle, endAngle] = [endAngle, startAngle]
    diff = -diff
  }

  const angleDegrees = (diff * 180) / Math.PI
  const midAngle = startAngle + diff / 2

  return { startAngle, endAngle, angleDegrees, midAngle }
}

/**
 * Calculate color based on deviation from ideal range
 * Returns a color from green (ideal) through yellow (warning) to red (error)
 * @param currentAngle Current knee angle in degrees
 * @param idealRange The ideal range configuration
 * @returns Hex color string and feedback level
 */
function getAngleDeviationColor(
  currentAngle: number,
  idealRange: KneeIdealRange
): { color: string; level: FeedbackLevel } {
  const { min, max, warningThreshold, errorThreshold } = idealRange

  // Check if within ideal range
  if (currentAngle >= min && currentAngle <= max) {
    return { color: COLORS.angleArcGood, level: 'good' }
  }

  // Calculate deviation from nearest ideal boundary
  const deviation = currentAngle < min
    ? min - currentAngle
    : currentAngle - max

  if (deviation <= warningThreshold) {
    // Interpolate between good and warning
    const t = deviation / warningThreshold
    return {
      color: interpolateColor(COLORS.angleArcGood, COLORS.angleArcWarning, t),
      level: 'warning'
    }
  } else if (deviation <= errorThreshold) {
    // Interpolate between warning and error
    const t = (deviation - warningThreshold) / (errorThreshold - warningThreshold)
    return {
      color: interpolateColor(COLORS.angleArcWarning, COLORS.angleArcError, t),
      level: 'error'
    }
  }

  return { color: COLORS.angleArcError, level: 'error' }
}

/**
 * Interpolate between two hex colors
 */
function interpolateColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)

  const r = Math.round(c1.r + (c2.r - c1.r) * t)
  const g = Math.round(c1.g + (c2.g - c1.g) * t)
  const b = Math.round(c1.b + (c2.b - c1.b) * t)

  return `rgb(${r}, ${g}, ${b})`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  hex = hex.replace('#', '')
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  }
}

/**
 * Determine correction direction based on angle deviation
 */
function getKneeCorrectionDirection(
  currentAngle: number,
  idealRange: KneeIdealRange
): 'bend_more' | 'straighten' | 'none' {
  if (currentAngle >= idealRange.min && currentAngle <= idealRange.max) {
    return 'none'
  }
  return currentAngle < idealRange.min ? 'bend_more' : 'straighten'
}

/**
 * Helper to convert rgb() string to hex
 */
function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (!match) return '#ffffff'
  const r = parseInt(match[1]).toString(16).padStart(2, '0')
  const g = parseInt(match[2]).toString(16).padStart(2, '0')
  const b = parseInt(match[3]).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}

// ============================================
// Knee Angle Visualization Drawing Functions
// ============================================

/**
 * Draw knee angle visualization with arc, ideal zone, and correction arrows
 */
function drawKneeAngleVisualization(
  ctx: CanvasRenderingContext2D,
  keypoints: Keypoint[],
  idealRange: KneeIdealRange,
  style: KneeVisualizationStyle,
  pulsePhase: number,
  getMirroredX: (x: number) => number,
  isValidKeypoint: (kp: Keypoint | undefined) => boolean
) {
  // Process both knees
  const kneeConfigs = [
    { hip: BLAZEPOSE_KEYPOINTS.LEFT_HIP, knee: BLAZEPOSE_KEYPOINTS.LEFT_KNEE, ankle: BLAZEPOSE_KEYPOINTS.LEFT_ANKLE },
    { hip: BLAZEPOSE_KEYPOINTS.RIGHT_HIP, knee: BLAZEPOSE_KEYPOINTS.RIGHT_KNEE, ankle: BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE },
  ]

  for (const config of kneeConfigs) {
    const hip = keypoints[config.hip]
    const knee = keypoints[config.knee]
    const ankle = keypoints[config.ankle]

    if (!isValidKeypoint(hip) || !isValidKeypoint(knee) || !isValidKeypoint(ankle)) continue

    const hipPoint = { x: getMirroredX(hip.x), y: hip.y }
    const kneePoint = { x: getMirroredX(knee.x), y: knee.y }
    const anklePoint = { x: getMirroredX(ankle.x), y: ankle.y }

    // Calculate arc geometry
    const arcData = calculateAngleArc(hipPoint, kneePoint, anklePoint)
    const { color, level } = getAngleDeviationColor(arcData.angleDegrees, idealRange)
    const correction = getKneeCorrectionDirection(arcData.angleDegrees, idealRange)

    // Arc radius based on style
    const arcRadius = style === 'expanded' ? 40 : 28
    const idealArcRadius = style === 'expanded' ? 50 : 35

    // 1. Draw ideal range zone (background arc)
    drawIdealRangeZone(ctx, kneePoint, idealRange, arcData, idealArcRadius, style)

    // 2. Draw current angle arc
    drawCurrentAngleArc(ctx, kneePoint, arcData, arcRadius, color, level, pulsePhase)

    // 3. Draw directional correction arrow if needed
    if (correction !== 'none') {
      drawCorrectionArrowVisualization(
        ctx,
        kneePoint,
        anklePoint,
        correction,
        pulsePhase,
        style
      )
    }

    // 4. Draw angle value label
    drawAngleLabel(ctx, kneePoint, arcData, arcRadius + 18, color, style)
  }
}

/**
 * Draw the ideal range zone as a filled arc segment
 */
function drawIdealRangeZone(
  ctx: CanvasRenderingContext2D,
  vertex: { x: number; y: number },
  _idealRange: KneeIdealRange,
  arcData: ReturnType<typeof calculateAngleArc>,
  radius: number,
  style: KneeVisualizationStyle
) {
  // Draw filled ideal zone
  ctx.beginPath()
  ctx.moveTo(vertex.x, vertex.y)
  ctx.arc(vertex.x, vertex.y, radius, arcData.startAngle, arcData.endAngle)
  ctx.closePath()
  ctx.fillStyle = COLORS.idealZoneFill
  ctx.fill()

  // Draw ideal zone border
  ctx.beginPath()
  ctx.arc(vertex.x, vertex.y, radius, arcData.startAngle, arcData.endAngle)
  ctx.strokeStyle = COLORS.idealZoneBorder
  ctx.lineWidth = style === 'expanded' ? 3 : 2
  ctx.setLineDash([4, 4])
  ctx.stroke()
  ctx.setLineDash([])
}

/**
 * Draw the current angle arc with gradient coloring
 */
function drawCurrentAngleArc(
  ctx: CanvasRenderingContext2D,
  vertex: { x: number; y: number },
  arcData: ReturnType<typeof calculateAngleArc>,
  radius: number,
  color: string,
  level: FeedbackLevel,
  pulsePhase: number
) {
  // Background arc
  ctx.beginPath()
  ctx.arc(vertex.x, vertex.y, radius, arcData.startAngle, arcData.endAngle)
  ctx.strokeStyle = COLORS.arcBackground
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.stroke()

  // Colored arc with pulse effect for non-good levels
  const pulseOpacity = level !== 'good'
    ? 0.8 + Math.sin(pulsePhase * Math.PI * 2) * 0.2
    : 1

  ctx.beginPath()
  ctx.arc(vertex.x, vertex.y, radius, arcData.startAngle, arcData.endAngle)
  ctx.strokeStyle = level === 'good' ? color : hexToRgba(color.startsWith('#') ? color : rgbToHex(color), pulseOpacity)
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.stroke()

  // Arc end caps
  const endPoints = [
    { x: vertex.x + Math.cos(arcData.startAngle) * radius, y: vertex.y + Math.sin(arcData.startAngle) * radius },
    { x: vertex.x + Math.cos(arcData.endAngle) * radius, y: vertex.y + Math.sin(arcData.endAngle) * radius },
  ]

  for (const point of endPoints) {
    ctx.beginPath()
    ctx.arc(point.x, point.y, 3, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }
}

/**
 * Draw directional correction arrow with animation
 */
function drawCorrectionArrowVisualization(
  ctx: CanvasRenderingContext2D,
  kneePoint: { x: number; y: number },
  anklePoint: { x: number; y: number },
  correction: 'bend_more' | 'straighten',
  pulsePhase: number,
  style: KneeVisualizationStyle
) {
  const arrowLength = style === 'expanded' ? 35 : 25
  const offset = style === 'expanded' ? 55 : 40

  // Arrow direction based on correction needed
  // bend_more = arrow curves inward, straighten = arrow points outward
  const legAngle = Math.atan2(anklePoint.y - kneePoint.y, anklePoint.x - kneePoint.x)
  const arrowAngle = correction === 'bend_more'
    ? legAngle + Math.PI / 2  // Perpendicular, indicating bend
    : legAngle - Math.PI / 2  // Opposite perpendicular, indicating straighten

  // Pulsing animation offset
  const pulseOffset = Math.sin(pulsePhase * Math.PI * 2) * 5

  const startX = kneePoint.x + Math.cos(arrowAngle) * offset
  const startY = kneePoint.y + Math.sin(arrowAngle) * offset
  const endX = startX + Math.cos(arrowAngle) * (arrowLength + pulseOffset)
  const endY = startY + Math.sin(arrowAngle) * (arrowLength + pulseOffset)

  // Arrow body
  ctx.beginPath()
  ctx.moveTo(startX, startY)
  ctx.lineTo(endX, endY)
  ctx.strokeStyle = COLORS.correctionArrow
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.stroke()

  // Arrow head
  const headLength = 10
  ctx.beginPath()
  ctx.moveTo(endX, endY)
  ctx.lineTo(
    endX - headLength * Math.cos(arrowAngle - Math.PI / 6),
    endY - headLength * Math.sin(arrowAngle - Math.PI / 6)
  )
  ctx.moveTo(endX, endY)
  ctx.lineTo(
    endX - headLength * Math.cos(arrowAngle + Math.PI / 6),
    endY - headLength * Math.sin(arrowAngle + Math.PI / 6)
  )
  ctx.stroke()

  // Glow effect at arrow tip
  const glowSize = 4 + Math.sin(pulsePhase * Math.PI * 2) * 2
  ctx.beginPath()
  ctx.arc(endX, endY, glowSize, 0, Math.PI * 2)
  ctx.fillStyle = COLORS.correctionArrowPulse
  ctx.fill()

  // Correction label in expanded mode
  if (style === 'expanded') {
    const labelX = endX + Math.cos(arrowAngle) * 20
    const labelY = endY + Math.sin(arrowAngle) * 20
    const label = correction === 'bend_more' ? 'Bend' : 'Straighten'

    ctx.font = 'bold 11px Arial'
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    const metrics = ctx.measureText(label)
    ctx.fillRect(labelX - metrics.width / 2 - 4, labelY - 7, metrics.width + 8, 16)

    ctx.fillStyle = COLORS.correctionArrow
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, labelX, labelY)
  }
}

/**
 * Draw angle value label
 */
function drawAngleLabel(
  ctx: CanvasRenderingContext2D,
  vertex: { x: number; y: number },
  arcData: ReturnType<typeof calculateAngleArc>,
  radius: number,
  color: string,
  style: KneeVisualizationStyle
) {
  const textX = vertex.x + Math.cos(arcData.midAngle) * radius
  const textY = vertex.y + Math.sin(arcData.midAngle) * radius

  const angleText = `${Math.round(arcData.angleDegrees)}°`
  ctx.font = style === 'expanded' ? 'bold 14px Arial' : 'bold 12px Arial'
  const metrics = ctx.measureText(angleText)

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
  ctx.fillRect(
    textX - metrics.width / 2 - 5,
    textY - 9,
    metrics.width + 10,
    18
  )

  // Text
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(angleText, textX, textY)
}

// ============================================
// 편의 함수 - 스쿼트 분석용 피드백 생성
// ============================================

export function createSquatFeedbacks(
  kneeLevel: FeedbackLevel,
  kneeAngle: number,
  kneeCorrection: CorrectionDirection,
  hipLevel: FeedbackLevel,
  hipAngle: number,
  backLevel: FeedbackLevel,
  backCorrection: CorrectionDirection
): JointFeedback[] {
  return [
    // 왼쪽 무릎
    {
      jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
      level: kneeLevel,
      angle: kneeAngle,
      angleJoints: [
        BLAZEPOSE_KEYPOINTS.LEFT_HIP,
        BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
        BLAZEPOSE_KEYPOINTS.LEFT_ANKLE,
      ],
      correction: kneeCorrection,
    },
    // 오른쪽 무릎
    {
      jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_KNEE,
      level: kneeLevel,
      angle: kneeAngle,
      angleJoints: [
        BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
        BLAZEPOSE_KEYPOINTS.RIGHT_KNEE,
        BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE,
      ],
      correction: kneeCorrection,
    },
    // 왼쪽 엉덩이
    {
      jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_HIP,
      level: hipLevel,
      angle: hipAngle,
      angleJoints: [
        BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
        BLAZEPOSE_KEYPOINTS.LEFT_HIP,
        BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
      ],
    },
    // 오른쪽 엉덩이
    {
      jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
      level: hipLevel,
      angle: hipAngle,
      angleJoints: [
        BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
        BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
        BLAZEPOSE_KEYPOINTS.RIGHT_KNEE,
      ],
    },
    // 어깨 (등 자세)
    {
      jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
      level: backLevel,
      correction: backCorrection,
    },
    {
      jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
      level: backLevel,
      correction: backCorrection,
    },
  ]
}

// ============================================
// 편의 함수 - 푸시업 분석용 피드백 생성
// ============================================

export function createPushupFeedbacks(
  elbowLevel: FeedbackLevel,
  leftElbowAngle: number,
  rightElbowAngle: number,
  elbowCorrection: CorrectionDirection,
  valgusLevel: FeedbackLevel,
  valgusCorrection: CorrectionDirection,
  bodyLevel: FeedbackLevel,
  bodyCorrection: CorrectionDirection
): JointFeedback[] {
  return [
    // Left elbow
    {
      jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_ELBOW,
      level: elbowLevel,
      angle: leftElbowAngle,
      angleJoints: [
        BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
        BLAZEPOSE_KEYPOINTS.LEFT_ELBOW,
        BLAZEPOSE_KEYPOINTS.LEFT_WRIST,
      ],
      correction: elbowCorrection,
    },
    // Right elbow
    {
      jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW,
      level: elbowLevel,
      angle: rightElbowAngle,
      angleJoints: [
        BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
        BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW,
        BLAZEPOSE_KEYPOINTS.RIGHT_WRIST,
      ],
      correction: elbowCorrection,
    },
    // Left wrist (for valgus indicator)
    {
      jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_WRIST,
      level: valgusLevel,
      correction: valgusCorrection,
    },
    // Right wrist (for valgus indicator)
    {
      jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_WRIST,
      level: valgusLevel,
      correction: valgusCorrection,
    },
    // Shoulders (for body alignment)
    {
      jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
      level: bodyLevel,
      correction: bodyCorrection,
    },
    {
      jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
      level: bodyLevel,
      correction: bodyCorrection,
    },
  ]
}

// ============================================
// 편의 함수 - 정적 자세 분석용 피드백 생성
// ============================================

export function createPostureFeedbacks(
  shoulderLevel: FeedbackLevel,
  hipLevel: FeedbackLevel,
  headLevel: FeedbackLevel,
  headCorrection: CorrectionDirection
): JointFeedback[] {
  return [
    // 어깨
    {
      jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
      level: shoulderLevel,
    },
    {
      jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
      level: shoulderLevel,
    },
    // 엉덩이
    {
      jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_HIP,
      level: hipLevel,
    },
    {
      jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
      level: hipLevel,
    },
    // 귀 (거북목)
    {
      jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_EAR,
      level: headLevel,
      correction: headCorrection,
    },
    {
      jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_EAR,
      level: headLevel,
      correction: headCorrection,
    },
  ]
}

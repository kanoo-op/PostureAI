'use client'

import { useRef, useEffect, useCallback, useMemo } from 'react'

// ============================================
// Type Definitions
// ============================================

export interface Keypoint {
  x: number
  y: number
  z?: number
  score?: number
}

export type FeedbackLevel = 'good' | 'warning' | 'error'

export interface AngleConfig {
  vertexIndex: number      // BlazePose keypoint index for the angle vertex (joint)
  startIndex: number       // BlazePose keypoint index for the start limb
  endIndex: number         // BlazePose keypoint index for the end limb
  label?: string           // Optional display label (e.g., 'Knee', 'Hip')
  idealRange?: { min: number; max: number }  // Optional ideal angle range
}

export interface AngleVisualizationProps {
  keypoints: Keypoint[]                                                    // Array of BlazePose 33 keypoints
  angleConfigs: AngleConfig[]                                              // Which angles to visualize
  feedbackLevels?: Map<number, FeedbackLevel> | Record<number, FeedbackLevel>  // Maps vertexIndex to FeedbackLevel
  width?: number                                                           // Canvas width (default: 640)
  height?: number                                                          // Canvas height (default: 480)
  mirrored?: boolean                                                       // Mirror for front-facing camera (default: true)
  minKeypointScore?: number                                                // Confidence threshold (default: 0.3)
  showAngleValues?: boolean                                                // Show angle text labels (default: true)
  showAngleArcs?: boolean                                                  // Show angle arc lines (default: true)
  showIdealRangeOverlay?: boolean                                          // Toggle ideal range overlay (default: true)
  className?: string                                                       // Additional CSS classes
}

// ============================================
// Color Constants
// ============================================

const COLORS = {
  // Feedback colors
  good: '#00ff88',
  warning: '#ffaa00',
  error: '#ff4444',
  // Angle visualization colors
  angleArcDefault: '#00ddff',
  background: 'rgba(0, 0, 0, 0.7)',
  textPrimary: '#ffffff',

  // Ideal range visualization colors
  idealRangeGhost: 'rgba(100, 180, 255, 0.35)',
  idealRangeGhostStroke: 'rgba(100, 180, 255, 0.6)',

  // Current angle fill colors (within/warning/outside range)
  currentAngleFill: {
    within: 'rgba(76, 217, 100, 0.45)',
    warning: 'rgba(255, 204, 0, 0.45)',
    outside: 'rgba(255, 59, 48, 0.45)',
  },
  currentAngleStroke: {
    within: 'rgba(76, 217, 100, 0.85)',
    warning: 'rgba(255, 204, 0, 0.85)',
    outside: 'rgba(255, 59, 48, 0.85)',
  },

  // Status indicator colors
  statusWithin: '#4CD964',
  statusWarning: '#FFCC00',
  statusOutside: '#FF3B30',

  // Text colors for labels
  textAngleLabel: '#FFFFFF',
  textAngleShadow: 'rgba(0, 0, 0, 0.6)',
} as const

// ============================================
// Utility Functions
// ============================================

/**
 * Calculate angle at vertex between two limbs
 */
function calculateAngle(
  vertex: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number }
): number {
  const angle1 = Math.atan2(start.y - vertex.y, start.x - vertex.x)
  const angle2 = Math.atan2(end.y - vertex.y, end.x - vertex.x)
  let angle = Math.abs(angle1 - angle2) * (180 / Math.PI)
  if (angle > 180) angle = 360 - angle
  return angle
}

/**
 * Apply mirror transformation to x coordinate
 */
const getMirroredX = (x: number, width: number, mirrored: boolean): number => {
  return mirrored ? width - x : x
}

/**
 * Check if keypoint has sufficient confidence score
 */
const isValidKeypoint = (kp: Keypoint | undefined, minScore: number): boolean => {
  return kp !== undefined && (kp.score ?? 0) >= minScore
}

/**
 * Get color based on feedback level
 */
const getColorForLevel = (level: FeedbackLevel | undefined): string => {
  if (!level) return COLORS.angleArcDefault
  return COLORS[level]
}

type RangeStatus = 'within' | 'warning' | 'outside'

/**
 * Determine if angle is within, near (warning), or outside ideal range
 * Warning threshold: within 10 degrees of the boundary
 */
function calculateRangeStatus(
  currentAngle: number,
  idealRange: { min: number; max: number } | undefined
): RangeStatus {
  if (!idealRange) return 'within'  // No range defined = always good

  const WARNING_THRESHOLD = 10  // degrees from boundary for warning

  if (currentAngle >= idealRange.min && currentAngle <= idealRange.max) {
    return 'within'
  }

  // Check if within warning threshold
  const distanceFromMin = Math.abs(currentAngle - idealRange.min)
  const distanceFromMax = Math.abs(currentAngle - idealRange.max)
  const minDistance = Math.min(distanceFromMin, distanceFromMax)

  if (minDistance <= WARNING_THRESHOLD) {
    return 'warning'
  }

  return 'outside'
}

// ============================================
// Drawing Functions
// ============================================

/**
 * Draw arc at joint showing angle
 */
function drawAngleArc(
  ctx: CanvasRenderingContext2D,
  vertex: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
  color: string,
  arcRadius: number = 25
): { startAngle: number; endAngle: number } {
  const angle1 = Math.atan2(start.y - vertex.y, start.x - vertex.x)
  const angle2 = Math.atan2(end.y - vertex.y, end.x - vertex.x)

  // Determine arc direction (always draw the smaller arc)
  let startAngle = angle1
  let endAngle = angle2
  if (startAngle > endAngle) {
    [startAngle, endAngle] = [endAngle, startAngle]
  }

  // Check if we should draw the other arc (the smaller one)
  if (endAngle - startAngle > Math.PI) {
    [startAngle, endAngle] = [endAngle, startAngle + Math.PI * 2]
  }

  ctx.beginPath()
  ctx.arc(vertex.x, vertex.y, arcRadius, startAngle, endAngle)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.stroke()

  return { startAngle, endAngle }
}

/**
 * Draw ghost/outline arc showing ideal angle range
 * Uses dashed line style for visual distinction
 */
function drawIdealRangeArc(
  ctx: CanvasRenderingContext2D,
  vertex: { x: number; y: number },
  start: { x: number; y: number },
  idealRange: { min: number; max: number },
  arcRadius: number = 30
): void {
  // Calculate the reference angle (from vertex to start point)
  const referenceAngle = Math.atan2(start.y - vertex.y, start.x - vertex.x)

  // Convert ideal range from degrees to radians and offset from reference
  const minRad = referenceAngle + (idealRange.min * Math.PI / 180)
  const maxRad = referenceAngle + (idealRange.max * Math.PI / 180)

  // Save context state
  ctx.save()

  // Draw filled ghost area (semi-transparent)
  ctx.beginPath()
  ctx.moveTo(vertex.x, vertex.y)
  ctx.arc(vertex.x, vertex.y, arcRadius, minRad, maxRad)
  ctx.closePath()
  ctx.fillStyle = COLORS.idealRangeGhost
  ctx.fill()

  // Draw dashed outline
  ctx.beginPath()
  ctx.arc(vertex.x, vertex.y, arcRadius, minRad, maxRad)
  ctx.setLineDash([4, 4])  // Dashed line pattern
  ctx.strokeStyle = COLORS.idealRangeGhostStroke
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.setLineDash([])  // Reset to solid line

  // Restore context state
  ctx.restore()
}

/**
 * Draw filled arc representing current measured angle
 * Color indicates range status (within/warning/outside)
 */
function drawCurrentAngleFill(
  ctx: CanvasRenderingContext2D,
  vertex: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
  rangeStatus: RangeStatus,
  arcRadius: number = 25
): { startAngle: number; endAngle: number } {
  const angle1 = Math.atan2(start.y - vertex.y, start.x - vertex.x)
  const angle2 = Math.atan2(end.y - vertex.y, end.x - vertex.x)

  // Determine arc direction (always draw the smaller arc)
  let startAngle = angle1
  let endAngle = angle2
  if (startAngle > endAngle) {
    [startAngle, endAngle] = [endAngle, startAngle]
  }

  // Check if we should draw the other arc (the smaller one)
  if (endAngle - startAngle > Math.PI) {
    [startAngle, endAngle] = [endAngle, startAngle + Math.PI * 2]
  }

  // Get colors based on range status
  const fillColor = COLORS.currentAngleFill[rangeStatus]
  const strokeColor = COLORS.currentAngleStroke[rangeStatus]

  ctx.save()

  // Draw filled arc (pie slice)
  ctx.beginPath()
  ctx.moveTo(vertex.x, vertex.y)
  ctx.arc(vertex.x, vertex.y, arcRadius, startAngle, endAngle)
  ctx.closePath()
  ctx.fillStyle = fillColor
  ctx.fill()

  // Draw stroke outline
  ctx.beginPath()
  ctx.arc(vertex.x, vertex.y, arcRadius, startAngle, endAngle)
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.restore()

  return { startAngle, endAngle }
}

/**
 * Draw visual indicator showing range status (small colored dot)
 */
function drawRangeStatusIndicator(
  ctx: CanvasRenderingContext2D,
  vertex: { x: number; y: number },
  rangeStatus: RangeStatus,
  offsetX: number = 35,
  offsetY: number = -35
): void {
  const indicatorRadius = 5

  const statusColors: Record<RangeStatus, string> = {
    within: COLORS.statusWithin,
    warning: COLORS.statusWarning,
    outside: COLORS.statusOutside,
  }

  ctx.save()

  // Draw outer glow
  ctx.beginPath()
  ctx.arc(vertex.x + offsetX, vertex.y + offsetY, indicatorRadius + 2, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fill()

  // Draw status dot
  ctx.beginPath()
  ctx.arc(vertex.x + offsetX, vertex.y + offsetY, indicatorRadius, 0, Math.PI * 2)
  ctx.fillStyle = statusColors[rangeStatus]
  ctx.fill()

  ctx.restore()
}

/**
 * Draw angle value with background
 */
function drawAngleLabel(
  ctx: CanvasRenderingContext2D,
  vertex: { x: number; y: number },
  angle: number,
  startAngle: number,
  endAngle: number,
  color: string,
  arcRadius: number = 25,
  label?: string
) {
  // Position text at arc midpoint + offset
  const midAngle = (startAngle + endAngle) / 2
  const textRadius = arcRadius + 15
  const textX = vertex.x + Math.cos(midAngle) * textRadius
  const textY = vertex.y + Math.sin(midAngle) * textRadius

  // Prepare text
  const angleText = label ? `${label}: ${Math.round(angle)}°` : `${Math.round(angle)}°`
  ctx.font = 'bold 12px Arial'
  const textMetrics = ctx.measureText(angleText)
  const textWidth = textMetrics.width
  const textHeight = 14
  const padding = 3

  // Draw semi-transparent background
  ctx.fillStyle = COLORS.background
  ctx.fillRect(
    textX - textWidth / 2 - padding,
    textY - textHeight / 2 - padding / 2,
    textWidth + padding * 2,
    textHeight + padding
  )

  // Draw text
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(angleText, textX, textY)
}

// ============================================
// Main Component
// ============================================

export default function AngleVisualization({
  keypoints,
  angleConfigs,
  feedbackLevels,
  width = 640,
  height = 480,
  mirrored = true,
  minKeypointScore = 0.3,
  showAngleValues = true,
  showAngleArcs = true,
  showIdealRangeOverlay = true,
  className = '',
}: AngleVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  // Convert feedbackLevels to Map if it's a Record, memoized to prevent unnecessary recalculations
  const feedbackMap = useMemo(() => {
    if (feedbackLevels instanceof Map) {
      return feedbackLevels
    }
    return new Map(Object.entries(feedbackLevels || {}).map(([k, v]) => [Number(k), v]))
  }, [feedbackLevels])

  // Get feedback level for a vertex
  const getFeedbackLevel = useCallback((vertexIndex: number): FeedbackLevel | undefined => {
    return feedbackMap.get(vertexIndex)
  }, [feedbackMap])

  // Main draw function
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, width, height)

    if (!keypoints || keypoints.length === 0 || angleConfigs.length === 0) return

    angleConfigs.forEach(config => {
      const vertexKp = keypoints[config.vertexIndex]
      const startKp = keypoints[config.startIndex]
      const endKp = keypoints[config.endIndex]

      // Validate all keypoints
      if (!isValidKeypoint(vertexKp, minKeypointScore) ||
          !isValidKeypoint(startKp, minKeypointScore) ||
          !isValidKeypoint(endKp, minKeypointScore)) {
        return
      }

      // Apply mirroring
      const vertex = {
        x: getMirroredX(vertexKp.x, width, mirrored),
        y: vertexKp.y
      }
      const start = {
        x: getMirroredX(startKp.x, width, mirrored),
        y: startKp.y
      }
      const end = {
        x: getMirroredX(endKp.x, width, mirrored),
        y: endKp.y
      }

      // Calculate current angle
      const angle = calculateAngle(vertex, start, end)

      // Calculate range status if ideal range is defined
      const rangeStatus = calculateRangeStatus(angle, config.idealRange)

      // Get color based on feedback level (backward compatibility)
      const level = getFeedbackLevel(config.vertexIndex)
      const color = getColorForLevel(level)

      // Draw ideal range ghost arc (behind current angle)
      if (showIdealRangeOverlay && config.idealRange) {
        drawIdealRangeArc(ctx, vertex, start, config.idealRange, 30)
      }

      // Draw current angle visualization
      let arcAngles = { startAngle: 0, endAngle: 0 }
      if (showAngleArcs) {
        if (showIdealRangeOverlay && config.idealRange) {
          // Use filled arc with range-based coloring
          arcAngles = drawCurrentAngleFill(ctx, vertex, start, end, rangeStatus, 25)
        } else {
          // Fallback: Original arc drawing (backward compatibility)
          arcAngles = drawAngleArc(ctx, vertex, start, end, color)
        }
      }

      // Draw range status indicator
      if (showIdealRangeOverlay && config.idealRange) {
        drawRangeStatusIndicator(ctx, vertex, rangeStatus)
      }

      // Draw label
      if (showAngleValues) {
        const labelColor = showIdealRangeOverlay && config.idealRange
          ? COLORS.currentAngleStroke[rangeStatus]
          : color
        drawAngleLabel(
          ctx,
          vertex,
          angle,
          arcAngles.startAngle,
          arcAngles.endAngle,
          labelColor,
          25,
          config.label
        )
      }
    })
  }, [keypoints, angleConfigs, width, height, mirrored, minKeypointScore, showAngleValues, showAngleArcs, showIdealRangeOverlay, getFeedbackLevel])

  // Animation loop with requestAnimationFrame for smooth 60fps
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let lastTime = 0
    const animate = (time: number) => {
      // Throttle to ~60fps
      if (time - lastTime > 16) {
        draw(ctx)
        lastTime = time
      }
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    // Cleanup on unmount
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


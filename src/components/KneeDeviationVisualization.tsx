'use client'

import { useRef, useEffect } from 'react'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'
import type { KneeDeviationType } from '@/utils/squatAnalyzer'

export interface Keypoint {
  x: number
  y: number
  z?: number
  score?: number
}

export interface KneeDeviationData {
  leftDegrees: number
  rightDegrees: number
  leftType: KneeDeviationType
  rightType: KneeDeviationType
  dynamicChange: number
  peakDeviation: number
}

export interface KneeDeviationVisualizationProps {
  keypoints: Keypoint[]
  deviationData?: KneeDeviationData
  width: number
  height: number
  mirrored?: boolean
  minKeypointScore?: number
  className?: string
}

// Design token colors
const COLORS = {
  valgusIndicator: '#ff6b6b',
  varusIndicator: '#ffd93d',
  neutralIndicator: '#00ff88',
  deviationLineLeft: '#3b82f6',
  deviationLineRight: '#8b5cf6',
  hipAnkleLine: '#4ade80',
  kneePositionDot: '#ffffff',
  baselineReference: '#6b7280',
} as const

export default function KneeDeviationVisualization({
  keypoints,
  deviationData,
  width,
  height,
  mirrored = false,
  minKeypointScore = 0.3,
  className = '',
}: KneeDeviationVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    if (!keypoints || keypoints.length < 33 || !deviationData) return

    const getMirroredX = (x: number) => mirrored ? width - x : x
    const isValid = (kp: Keypoint | undefined) =>
      kp !== undefined && (kp.score ?? 0) >= minKeypointScore

    // Get relevant keypoints
    const leftHip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP]
    const rightHip = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP]
    const leftKnee = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_KNEE]
    const rightKnee = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]
    const leftAnkle = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]
    const rightAnkle = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]

    if (!isValid(leftHip) || !isValid(rightHip) ||
        !isValid(leftKnee) || !isValid(rightKnee) ||
        !isValid(leftAnkle) || !isValid(rightAnkle)) return

    // Draw left leg hip-ankle reference line
    ctx.beginPath()
    ctx.setLineDash([5, 5])
    ctx.moveTo(getMirroredX(leftHip.x), leftHip.y)
    ctx.lineTo(getMirroredX(leftAnkle.x), leftAnkle.y)
    ctx.strokeStyle = COLORS.hipAnkleLine
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw right leg hip-ankle reference line
    ctx.beginPath()
    ctx.moveTo(getMirroredX(rightHip.x), rightHip.y)
    ctx.lineTo(getMirroredX(rightAnkle.x), rightAnkle.y)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw knee deviation indicators
    const drawKneeDeviation = (
      kneeX: number, kneeY: number,
      hipX: number, hipY: number,
      ankleX: number, ankleY: number,
      deviationType: KneeDeviationType,
      deviationDegrees: number,
      lineColor: string
    ) => {
      // Calculate ideal knee position on hip-ankle line
      const t = (kneeY - hipY) / (ankleY - hipY)
      const idealKneeX = hipX + t * (ankleX - hipX)

      // Draw deviation line from ideal position to actual knee
      ctx.beginPath()
      ctx.moveTo(getMirroredX(idealKneeX), kneeY)
      ctx.lineTo(getMirroredX(kneeX), kneeY)
      ctx.strokeStyle = lineColor
      ctx.lineWidth = 3
      ctx.stroke()

      // Draw knee position dot with color based on deviation type
      const dotColor = deviationType === 'valgus' ? COLORS.valgusIndicator :
                       deviationType === 'varus' ? COLORS.varusIndicator :
                       COLORS.neutralIndicator

      ctx.beginPath()
      ctx.arc(getMirroredX(kneeX), kneeY, 8, 0, Math.PI * 2)
      ctx.fillStyle = dotColor
      ctx.fill()
      ctx.strokeStyle = COLORS.kneePositionDot
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw deviation degrees label
      if (Math.abs(deviationDegrees) > 2) {
        const labelX = getMirroredX(kneeX) + (deviationType === 'valgus' ? 15 : -15)
        ctx.font = 'bold 11px Arial'
        ctx.fillStyle = dotColor
        ctx.textAlign = deviationType === 'valgus' ? 'left' : 'right'
        ctx.fillText(`${Math.abs(deviationDegrees).toFixed(1)}`, labelX, kneeY - 12)

        // Type indicator
        const typeLabel = deviationType === 'valgus' ? 'V' : deviationType === 'varus' ? 'R' : ''
        if (typeLabel) {
          ctx.fillText(typeLabel, labelX, kneeY + 2)
        }
      }
    }

    // Draw left knee deviation
    drawKneeDeviation(
      leftKnee.x, leftKnee.y,
      leftHip.x, leftHip.y,
      leftAnkle.x, leftAnkle.y,
      deviationData.leftType,
      deviationData.leftDegrees,
      COLORS.deviationLineLeft
    )

    // Draw right knee deviation
    drawKneeDeviation(
      rightKnee.x, rightKnee.y,
      rightHip.x, rightHip.y,
      rightAnkle.x, rightAnkle.y,
      deviationData.rightType,
      deviationData.rightDegrees,
      COLORS.deviationLineRight
    )

    // Draw dynamic valgus indicator if significant
    if (deviationData.dynamicChange > 3) {
      ctx.font = 'bold 12px Arial'
      ctx.fillStyle = COLORS.valgusIndicator
      ctx.textAlign = 'center'
      ctx.fillText(
        `Dynamic +${deviationData.dynamicChange.toFixed(1)}`,
        width / 2,
        30
      )
    }

  }, [keypoints, deviationData, width, height, mirrored, minKeypointScore])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`absolute top-0 left-0 pointer-events-none ${className}`}
    />
  )
}

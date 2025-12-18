'use client'

import { useMemo } from 'react'
import type { Keypoint } from '@tensorflow-models/pose-detection'
import type { SpineCurvatureAnalysis, FeedbackLevel } from '@/utils/deadliftAnalyzer'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'

export interface SpineVisualizationProps {
  keypoints: Keypoint[]
  spineCurvature?: SpineCurvatureAnalysis
  width: number
  height: number
  mirrored?: boolean
  showNeutralSpineReference?: boolean
  showSpineSegments?: boolean
  minKeypointScore?: number
  className?: string
}

// Design token colors
const SPINE_COLORS = {
  lumbar: {
    good: '#00F5A0',
    warning: '#FFB800',
    error: '#FF3D71',
  },
  thoracic: {
    good: '#22d3ee',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  neutralReference: '#6366f1',
  segmentUpper: '#a78bfa',
  segmentLower: '#c084fc',
} as const

export default function SpineVisualization({
  keypoints,
  spineCurvature,
  width,
  height,
  mirrored = true,
  showNeutralSpineReference = true,
  showSpineSegments = true,
  minKeypointScore = 0.5,
  className = '',
}: SpineVisualizationProps) {
  // Extract relevant keypoints
  const spinePoints = useMemo(() => {
    const leftShoulder = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]
    const rightShoulder = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]
    const leftHip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP]
    const rightHip = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP]

    // Validate keypoints
    const allValid = [leftShoulder, rightShoulder, leftHip, rightHip].every(
      kp => kp && (kp.score ?? 0) >= minKeypointScore
    )

    if (!allValid) return null

    // Calculate centers
    const shoulderCenter = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    }

    const hipCenter = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
    }

    // Estimate mid-spine (40% from shoulders)
    const midSpine = {
      x: shoulderCenter.x + (hipCenter.x - shoulderCenter.x) * 0.4,
      y: shoulderCenter.y + (hipCenter.y - shoulderCenter.y) * 0.4,
    }

    return { shoulderCenter, midSpine, hipCenter }
  }, [keypoints, minKeypointScore])

  if (!spinePoints) return null

  const { shoulderCenter, midSpine, hipCenter } = spinePoints

  // Get colors based on feedback levels
  const getLumbarColor = (level?: FeedbackLevel) =>
    SPINE_COLORS.lumbar[level ?? 'good']
  const getThoracicColor = (level?: FeedbackLevel) =>
    SPINE_COLORS.thoracic[level ?? 'good']

  // Apply mirroring
  const transformX = (x: number) => (mirrored ? width - x : x)

  return (
    <svg
      className={`absolute inset-0 pointer-events-none ${className}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      {/* Neutral spine reference line (ideal vertical alignment) */}
      {showNeutralSpineReference && (
        <line
          x1={transformX(hipCenter.x)}
          y1={hipCenter.y}
          x2={transformX(hipCenter.x)}
          y2={shoulderCenter.y}
          stroke={SPINE_COLORS.neutralReference}
          strokeWidth={2}
          strokeDasharray="8,4"
          opacity={0.6}
        />
      )}

      {/* Current spine segments */}
      {showSpineSegments && (
        <>
          {/* Lower spine segment (lumbar: hip to mid-spine) */}
          <line
            x1={transformX(hipCenter.x)}
            y1={hipCenter.y}
            x2={transformX(midSpine.x)}
            y2={midSpine.y}
            stroke={getLumbarColor(spineCurvature?.lumbar.level)}
            strokeWidth={4}
            strokeLinecap="round"
          />

          {/* Upper spine segment (thoracic: mid-spine to shoulders) */}
          <line
            x1={transformX(midSpine.x)}
            y1={midSpine.y}
            x2={transformX(shoulderCenter.x)}
            y2={shoulderCenter.y}
            stroke={getThoracicColor(spineCurvature?.thoracic.level)}
            strokeWidth={4}
            strokeLinecap="round"
          />

          {/* Mid-spine point indicator */}
          <circle
            cx={transformX(midSpine.x)}
            cy={midSpine.y}
            r={6}
            fill={SPINE_COLORS.segmentLower}
            stroke="white"
            strokeWidth={2}
          />
        </>
      )}

      {/* Spine segment labels */}
      {showSpineSegments && spineCurvature && (
        <>
          {/* Lumbar angle label */}
          <text
            x={transformX(hipCenter.x) + (mirrored ? -40 : 40)}
            y={(hipCenter.y + midSpine.y) / 2}
            fill={getLumbarColor(spineCurvature.lumbar.level)}
            fontSize={12}
            fontWeight="bold"
            textAnchor={mirrored ? 'end' : 'start'}
          >
            L: {spineCurvature.lumbar.angle}°
          </text>

          {/* Thoracic angle label */}
          <text
            x={transformX(shoulderCenter.x) + (mirrored ? -40 : 40)}
            y={(shoulderCenter.y + midSpine.y) / 2}
            fill={getThoracicColor(spineCurvature.thoracic.level)}
            fontSize={12}
            fontWeight="bold"
            textAnchor={mirrored ? 'end' : 'start'}
          >
            T: {spineCurvature.thoracic.angle}°
          </text>
        </>
      )}
    </svg>
  )
}

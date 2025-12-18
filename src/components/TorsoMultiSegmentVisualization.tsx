'use client'

import { useMemo } from 'react'
import type { Keypoint } from '@tensorflow-models/pose-detection'
import type { TorsoSegmentResult } from '@/types/torsoSegment'
import {
  extractVisualizationData,
  MIN_KEYPOINT_SCORE,
} from '@/utils/torsoSegmentAnalyzer'

export interface TorsoMultiSegmentVisualizationProps {
  keypoints: Keypoint[]
  segmentResult?: TorsoSegmentResult
  width: number
  height: number
  mirrored?: boolean
  showNeutralReference?: boolean
  showSegmentLabels?: boolean
  minKeypointScore?: number
  className?: string
}

// Design tokens from tokens.json
const SEGMENT_COLORS = {
  upper: {
    stroke: '#8B5CF6',       // segment-upper
    bg: 'rgba(139, 92, 246, 0.1)',
    glow: 'rgba(139, 92, 246, 0.4)',
  },
  mid: {
    stroke: '#F59E0B',       // segment-mid
    bg: 'rgba(245, 158, 11, 0.1)',
    glow: 'rgba(245, 158, 11, 0.4)',
  },
  lower: {
    stroke: '#10B981',       // segment-lower
    bg: 'rgba(16, 185, 129, 0.1)',
    glow: 'rgba(16, 185, 129, 0.4)',
  },
} as const

const STATUS_COLORS = {
  good: '#00F5A0',           // status-good
  warning: '#FFB800',        // status-warning
  error: '#FF3D71',          // status-error
} as const

const NEUTRAL_REFERENCE_COLOR = '#6366f1'  // neutralReference

export default function TorsoMultiSegmentVisualization({
  keypoints,
  segmentResult,
  width,
  height,
  mirrored = true,
  showNeutralReference = true,
  showSegmentLabels = true,
  minKeypointScore = MIN_KEYPOINT_SCORE,
  className = '',
}: TorsoMultiSegmentVisualizationProps) {
  const vizData = useMemo(
    () => extractVisualizationData(keypoints, minKeypointScore),
    [keypoints, minKeypointScore]
  )

  if (!vizData) return null

  const { upperStart, upperEnd, midEnd, lowerEnd } = vizData

  // Apply mirroring
  const tx = (x: number) => (mirrored ? width - x : x)

  // Get stroke color based on segment level
  const getStrokeColor = (segment: 'upper' | 'mid' | 'lower') => {
    if (!segmentResult?.isValid) return SEGMENT_COLORS[segment].stroke
    const level = segmentResult.levels[segment]
    return STATUS_COLORS[level]
  }

  // Get glow filter for each segment
  const getGlowId = (segment: 'upper' | 'mid' | 'lower') => `glow-${segment}`

  return (
    <svg
      className={`absolute inset-0 pointer-events-none ${className}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <defs>
        {/* Glow filters for each segment */}
        {(['upper', 'mid', 'lower'] as const).map((segment) => (
          <filter key={segment} id={getGlowId(segment)} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}
      </defs>

      {/* Neutral reference line (vertical from hip to neck) */}
      {showNeutralReference && (
        <line
          x1={tx(lowerEnd.x)}
          y1={lowerEnd.y}
          x2={tx(lowerEnd.x)}
          y2={upperStart.y}
          stroke={NEUTRAL_REFERENCE_COLOR}
          strokeWidth={2}
          strokeDasharray="6,4"
          opacity={0.5}
        />
      )}

      {/* Lower segment (hip to mid-spine) */}
      <line
        x1={tx(lowerEnd.x)}
        y1={lowerEnd.y}
        x2={tx(midEnd.x)}
        y2={midEnd.y}
        stroke={getStrokeColor('lower')}
        strokeWidth={5}
        strokeLinecap="round"
        filter={`url(#${getGlowId('lower')})`}
      />

      {/* Mid segment (mid-spine to shoulder) */}
      <line
        x1={tx(midEnd.x)}
        y1={midEnd.y}
        x2={tx(upperEnd.x)}
        y2={upperEnd.y}
        stroke={getStrokeColor('mid')}
        strokeWidth={5}
        strokeLinecap="round"
        filter={`url(#${getGlowId('mid')})`}
      />

      {/* Upper segment (shoulder to neck) */}
      <line
        x1={tx(upperEnd.x)}
        y1={upperEnd.y}
        x2={tx(upperStart.x)}
        y2={upperStart.y}
        stroke={getStrokeColor('upper')}
        strokeWidth={5}
        strokeLinecap="round"
        filter={`url(#${getGlowId('upper')})`}
      />

      {/* Joint indicators */}
      <circle cx={tx(upperStart.x)} cy={upperStart.y} r={5} fill={SEGMENT_COLORS.upper.stroke} stroke="white" strokeWidth={2} />
      <circle cx={tx(upperEnd.x)} cy={upperEnd.y} r={6} fill={SEGMENT_COLORS.mid.stroke} stroke="white" strokeWidth={2} />
      <circle cx={tx(midEnd.x)} cy={midEnd.y} r={6} fill={SEGMENT_COLORS.lower.stroke} stroke="white" strokeWidth={2} />
      <circle cx={tx(lowerEnd.x)} cy={lowerEnd.y} r={5} fill="#00F5A0" stroke="white" strokeWidth={2} />

      {/* Segment labels with angles */}
      {showSegmentLabels && segmentResult?.isValid && (
        <>
          {/* Upper label */}
          <text
            x={tx(upperEnd.x) + (mirrored ? -45 : 45)}
            y={(upperStart.y + upperEnd.y) / 2}
            fill={getStrokeColor('upper')}
            fontSize={11}
            fontWeight="600"
            textAnchor={mirrored ? 'end' : 'start'}
            fontFamily="Inter, system-ui, sans-serif"
          >
            U: {segmentResult.angles.upper}°
          </text>

          {/* Mid label */}
          <text
            x={tx(midEnd.x) + (mirrored ? -45 : 45)}
            y={(upperEnd.y + midEnd.y) / 2}
            fill={getStrokeColor('mid')}
            fontSize={11}
            fontWeight="600"
            textAnchor={mirrored ? 'end' : 'start'}
            fontFamily="Inter, system-ui, sans-serif"
          >
            M: {segmentResult.angles.mid}°
          </text>

          {/* Lower label */}
          <text
            x={tx(lowerEnd.x) + (mirrored ? -45 : 45)}
            y={(midEnd.y + lowerEnd.y) / 2}
            fill={getStrokeColor('lower')}
            fontSize={11}
            fontWeight="600"
            textAnchor={mirrored ? 'end' : 'start'}
            fontFamily="Inter, system-ui, sans-serif"
          >
            L: {segmentResult.angles.lower}°
          </text>
        </>
      )}
    </svg>
  )
}

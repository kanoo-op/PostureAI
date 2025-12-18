'use client'

import type { TorsoSegmentResult, TorsoSegmentFeedback } from '@/types/torsoSegment'
import { createTorsoSegmentFeedback } from '@/utils/torsoSegmentAnalyzer'

interface TorsoSegmentFeedbackCardProps {
  segmentResult?: TorsoSegmentResult
  className?: string
}

// Design tokens
const SEGMENT_STYLES = {
  upper: {
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    labelKo: '상부 (목/어깨)',
    labelEn: 'Upper (Neck)',
  },
  mid: {
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    labelKo: '중부 (등)',
    labelEn: 'Mid (Thoracic)',
  },
  lower: {
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    labelKo: '하부 (허리)',
    labelEn: 'Lower (Lumbar)',
  },
} as const

const LEVEL_COLORS = {
  good: { text: '#00F5A0', bg: 'rgba(0, 245, 160, 0.1)' },
  warning: { text: '#FFB800', bg: 'rgba(255, 184, 0, 0.1)' },
  error: { text: '#FF3D71', bg: 'rgba(255, 61, 113, 0.1)' },
} as const

const ALIGNMENT_COLORS = {
  excellent: '#00F5A0',
  good: '#22d3ee',
  fair: '#FFB800',
  poor: '#FF3D71',
} as const

export default function TorsoSegmentFeedbackCard({
  segmentResult,
  className = '',
}: TorsoSegmentFeedbackCardProps) {
  if (!segmentResult?.isValid) return null

  const feedbackList = createTorsoSegmentFeedback(segmentResult)

  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
      style={{ backgroundColor: 'rgba(17, 24, 39, 0.95)' }}
    >
      {/* Header with alignment score */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">몸통 정렬 분석</h3>
        <div className="flex items-center gap-2">
          <span
            className="text-xl font-bold tabular-nums"
            style={{ color: ALIGNMENT_COLORS[segmentResult.alignmentLevel] }}
          >
            {segmentResult.alignmentScore}
          </span>
          <span className="text-xs text-gray-400">/ 100</span>
        </div>
      </div>

      {/* Alignment score bar */}
      <div
        className="h-2 rounded-full mb-4 overflow-hidden"
        style={{ backgroundColor: 'rgba(75, 85, 99, 0.3)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${segmentResult.alignmentScore}%`,
            backgroundColor: ALIGNMENT_COLORS[segmentResult.alignmentLevel],
          }}
        />
      </div>

      {/* Segment details */}
      <div className="space-y-3">
        {feedbackList.map((feedback) => (
          <SegmentItem key={feedback.segment} feedback={feedback} />
        ))}
      </div>
    </div>
  )
}

function SegmentItem({ feedback }: { feedback: TorsoSegmentFeedback }) {
  const styles = SEGMENT_STYLES[feedback.segment]
  const levelColors = LEVEL_COLORS[feedback.level]

  return (
    <div
      className="p-3 rounded-xl border"
      style={{
        backgroundColor: styles.bgColor,
        borderColor: styles.borderColor,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: styles.color }}
          />
          <span className="text-sm text-gray-300">{styles.labelKo}</span>
        </div>
        <span
          className="text-lg font-bold tabular-nums"
          style={{ color: levelColors.text }}
        >
          {feedback.angle}°
        </span>
      </div>

      {/* Feedback message (show only non-good states) */}
      {feedback.level !== 'good' && (
        <p
          className="text-xs mt-1"
          style={{ color: levelColors.text }}
        >
          {feedback.message.split(' / ')[0]}
        </p>
      )}
    </div>
  )
}

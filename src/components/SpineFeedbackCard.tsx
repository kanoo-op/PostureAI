'use client'

import type { SpineCurvatureAnalysis, FeedbackLevel } from '@/utils/deadliftAnalyzer'

interface SpineFeedbackCardProps {
  spineCurvature?: SpineCurvatureAnalysis
  className?: string
}

const LEVEL_COLORS: Record<FeedbackLevel, { bg: string; text: string; border: string }> = {
  good: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' },
  warning: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50' },
  error: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' },
}

export default function SpineFeedbackCard({ spineCurvature, className = '' }: SpineFeedbackCardProps) {
  if (!spineCurvature) {
    return null
  }

  const { lumbar, thoracic, isNeutral } = spineCurvature

  return (
    <div className={`bg-gray-900 rounded-2xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">척추 분석</h3>
        {isNeutral && (
          <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
            중립 척추
          </span>
        )}
      </div>

      <div className="space-y-3">
        {/* Lumbar (Lower Back) */}
        <SpineSegmentItem
          label="요추 (허리)"
          angle={lumbar.angle}
          level={lumbar.level}
          message={lumbar.message}
          idealMax={lumbar.idealRange.max}
        />

        {/* Thoracic (Upper Back) */}
        <SpineSegmentItem
          label="흉추 (등)"
          angle={thoracic.angle}
          level={thoracic.level}
          message={thoracic.message}
          idealMax={thoracic.idealRange.max}
        />
      </div>
    </div>
  )
}

function SpineSegmentItem({
  label,
  angle,
  level,
  message,
  idealMax,
}: {
  label: string
  angle: number
  level: FeedbackLevel
  message: string
  idealMax: number
}) {
  const colors = LEVEL_COLORS[level]
  const percentage = Math.min((angle / idealMax) * 100, 150)

  return (
    <div className={`p-3 rounded-xl border ${colors.border} ${colors.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-300">{label}</span>
        <span className={`text-lg font-bold tabular-nums ${colors.text}`}>
          {angle}°
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            level === 'good'
              ? 'bg-green-500'
              : level === 'warning'
              ? 'bg-orange-500'
              : 'bg-red-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <p className={`text-xs ${colors.text}`}>{message}</p>
    </div>
  )
}

'use client'

import React from 'react'

export type SymmetryLevel = 'good' | 'warning' | 'error'
export type SymmetryDirection = 'left' | 'right' | 'balanced'

export interface SymmetryData {
  jointName: string
  score: number
  leftAngle: number
  rightAngle: number
  level: SymmetryLevel
  direction: SymmetryDirection
  message: string
}

export interface SymmetryFeedbackCardProps {
  data: SymmetryData
  className?: string
}

const COLORS = {
  ideal: '#00F5A0',
  acceptable: '#FFB800',
  error: '#FF3D71',
  left: '#3b82f6',
  right: '#8b5cf6',
  textPrimary: '#ffffff',
  textSecondary: '#94a3b8',
  surface: 'rgba(17, 24, 39, 0.85)',
  border: 'rgba(75, 85, 99, 0.3)',
}

const getLevelColor = (level: SymmetryLevel): string => {
  switch (level) {
    case 'good': return COLORS.ideal
    case 'warning': return COLORS.acceptable
    case 'error': return COLORS.error
  }
}

export default function SymmetryFeedbackCard({ data, className = '' }: SymmetryFeedbackCardProps) {
  const levelColor = getLevelColor(data.level)
  const maxAngle = Math.max(data.leftAngle, data.rightAngle)
  const leftPercent = maxAngle > 0 ? (data.leftAngle / maxAngle) * 100 : 50
  const rightPercent = maxAngle > 0 ? (data.rightAngle / maxAngle) * 100 : 50

  return (
    <div
      className={`rounded-xl p-4 ${className}`}
      style={{
        backgroundColor: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="font-tech text-sm font-semibold"
          style={{ color: COLORS.textPrimary }}
        >
          {data.jointName} 대칭
        </span>
        <span
          className="font-mono-tech text-lg font-bold"
          style={{ color: levelColor }}
        >
          {data.score}
        </span>
      </div>

      {/* Comparison Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span style={{ color: COLORS.left }}>L: {data.leftAngle.toFixed(1)}°</span>
          <span style={{ color: COLORS.right }}>R: {data.rightAngle.toFixed(1)}°</span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
          <div
            className="rounded-l-full transition-all duration-300"
            style={{
              width: `${leftPercent}%`,
              backgroundColor: COLORS.left,
            }}
          />
          <div
            className="rounded-r-full transition-all duration-300"
            style={{
              width: `${rightPercent}%`,
              backgroundColor: COLORS.right,
            }}
          />
        </div>
      </div>

      {/* Message */}
      <p
        className="font-tech text-xs"
        style={{ color: COLORS.textSecondary }}
      >
        {data.message}
      </p>
    </div>
  )
}

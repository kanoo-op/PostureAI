'use client'

import React from 'react'
import SymmetryFeedbackCard, { SymmetryData } from './SymmetryFeedbackCard'

export interface SymmetryPanelProps {
  symmetryItems: SymmetryData[]
  className?: string
}

const COLORS = {
  textPrimary: '#ffffff',
  surface: 'rgba(17, 24, 39, 0.85)',
  border: 'rgba(75, 85, 99, 0.3)',
}

export default function SymmetryPanel({ symmetryItems, className = '' }: SymmetryPanelProps) {
  if (symmetryItems.length === 0) return null

  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
      style={{
        backgroundColor: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-violet-500" />
        <h3
          className="font-tech font-bold text-sm uppercase tracking-wider"
          style={{ color: COLORS.textPrimary }}
        >
          좌우 균형 분석
        </h3>
      </div>

      {/* Symmetry Cards */}
      <div className="space-y-3">
        {symmetryItems.map((item, index) => (
          <SymmetryFeedbackCard
            key={`${item.jointName}-${index}`}
            data={item}
          />
        ))}
      </div>
    </div>
  )
}

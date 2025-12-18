'use client';

import React from 'react';
import { INTEGRATED_COLORS, QUALITY_LABELS } from './constants';
import type { MovementQuality } from '@/types/integratedAnalysis';

interface MovementQualityIndicatorProps {
  quality: MovementQuality;
  qualityScore?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function MovementQualityIndicator({
  quality,
  qualityScore,
  showLabel = true,
  size = 'md',
  className = '',
}: MovementQualityIndicatorProps) {
  const colorMap = {
    controlled: {
      bg: INTEGRATED_COLORS.quality.controlledBg,
      border: INTEGRATED_COLORS.quality.controlled,
      glow: INTEGRATED_COLORS.quality.controlledGlow,
      text: INTEGRATED_COLORS.quality.controlled,
    },
    moderate: {
      bg: INTEGRATED_COLORS.quality.moderateBg,
      border: INTEGRATED_COLORS.quality.moderate,
      glow: INTEGRATED_COLORS.quality.moderateGlow,
      text: INTEGRATED_COLORS.quality.moderate,
    },
    rushed: {
      bg: INTEGRATED_COLORS.quality.rushedBg,
      border: INTEGRATED_COLORS.quality.rushed,
      glow: INTEGRATED_COLORS.quality.rushedGlow,
      text: INTEGRATED_COLORS.quality.rushed,
    },
  };

  const colors = colorMap[quality];

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        boxShadow: `0 0 12px ${colors.glow}`,
      }}
    >
      <span
        className="w-2 h-2 rounded-full animate-pulse"
        style={{ backgroundColor: colors.border }}
      />
      {showLabel && (
        <span style={{ color: colors.text }} className="font-medium">
          {QUALITY_LABELS[quality]}
        </span>
      )}
      {qualityScore !== undefined && (
        <span style={{ color: INTEGRATED_COLORS.textSecondary }} className="text-xs">
          {qualityScore}%
        </span>
      )}
    </div>
  );
}

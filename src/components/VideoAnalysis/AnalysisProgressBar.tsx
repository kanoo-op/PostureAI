'use client';

import React from 'react';
import { ANALYSIS_COLORS } from './constants';

interface AnalysisProgressBarProps {
  percent: number; // 0-100
  showLabel?: boolean;
}

export default function AnalysisProgressBar({
  percent,
  showLabel = true,
}: AnalysisProgressBarProps) {
  // Clamp percent to 0-100
  const clampedPercent = Math.max(0, Math.min(100, percent));

  return (
    <div className="w-full">
      {showLabel && (
        <div
          className="text-sm mb-1 text-right"
          style={{ color: ANALYSIS_COLORS.textSecondary }}
        >
          {Math.round(clampedPercent)}%
        </div>
      )}
      <div
        className="w-full h-2 rounded overflow-hidden"
        style={{ backgroundColor: ANALYSIS_COLORS.progressTrack }}
      >
        <div
          className="h-full rounded transition-all duration-300 ease-out"
          style={{
            width: `${clampedPercent}%`,
            background: `linear-gradient(90deg, ${ANALYSIS_COLORS.progressFillStart}, ${ANALYSIS_COLORS.progressFillEnd})`,
          }}
        />
      </div>
    </div>
  );
}

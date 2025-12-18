'use client';

import React from 'react';
import { ROM_COLORS, ASSESSMENT_STATUS_MAP } from './constants';
import { ROMProgressBarProps } from './types';

export default function ROMProgressBar({
  percentOfNormal,
  assessment,
  showLabel = true,
}: ROMProgressBarProps) {
  const statusKey = ASSESSMENT_STATUS_MAP[assessment];
  const statusColors = ROM_COLORS.status;

  // Determine fill color based on assessment
  const fillColor = statusKey === 'hypermobile'
    ? statusColors.hypermobile
    : statusKey === 'warning'
      ? statusColors.warning
      : statusColors.good;

  const glowColor = statusKey === 'hypermobile'
    ? statusColors.hypermobileGlow
    : statusKey === 'warning'
      ? statusColors.warningGlow
      : statusColors.goodGlow;

  // Clamp display percentage (can exceed 100 for hypermobile)
  const displayPercent = Math.min(120, Math.max(0, percentOfNormal));
  const barWidth = Math.min(100, displayPercent);

  return (
    <div className="w-full">
      {/* Track */}
      <div
        className="relative h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: ROM_COLORS.progress.track }}
      >
        {/* Normal range marker at 100% */}
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{
            left: '83.33%',  // 100/120 = position for 100%
            backgroundColor: ROM_COLORS.textMuted,
          }}
        />

        {/* Progress fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
          style={{
            width: `${(barWidth / 120) * 100}%`,
            backgroundColor: fillColor,
            boxShadow: `0 0 8px ${glowColor}`,
          }}
        />
      </div>

      {/* Label */}
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span
            className="text-xs font-mono"
            style={{ color: fillColor }}
          >
            {Math.round(percentOfNormal)}%
          </span>
          <span
            className="text-xs"
            style={{ color: ROM_COLORS.textMuted }}
          >
            / 100%
          </span>
        </div>
      )}
    </div>
  );
}

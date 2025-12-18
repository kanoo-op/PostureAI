'use client';

import React from 'react';
import { AngleComparisonBarProps } from './types';
import { BILATERAL_COLORS, SIDE_LABELS } from './constants';

export default function AngleComparisonBar({ leftAngle, rightAngle }: AngleComparisonBarProps) {
  const maxAngle = Math.max(leftAngle, rightAngle, 1);
  const leftPercent = (leftAngle / maxAngle) * 100;
  const rightPercent = (rightAngle / maxAngle) * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span style={{ color: BILATERAL_COLORS.leftSide }}>
          {SIDE_LABELS.left.ko} ({SIDE_LABELS.left.en}): {leftAngle.toFixed(1)}°
        </span>
        <span style={{ color: BILATERAL_COLORS.rightSide }}>
          {SIDE_LABELS.right.ko} ({SIDE_LABELS.right.en}): {rightAngle.toFixed(1)}°
        </span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden gap-1" style={{ backgroundColor: BILATERAL_COLORS.surfaceElevated }}>
        <div
          className="rounded-l-full transition-all duration-300 ease-out"
          style={{
            width: `${leftPercent}%`,
            backgroundColor: BILATERAL_COLORS.leftSide,
          }}
        />
        <div
          className="rounded-r-full transition-all duration-300 ease-out"
          style={{
            width: `${rightPercent}%`,
            backgroundColor: BILATERAL_COLORS.rightSide,
          }}
        />
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { RepCountBadgeProps } from './types';
import { BILATERAL_COLORS } from './constants';

export default function RepCountBadge({ currentRep, totalReps }: RepCountBadgeProps) {
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono"
      style={{ backgroundColor: BILATERAL_COLORS.surfaceElevated, color: BILATERAL_COLORS.textSecondary }}
    >
      <span>Rep</span>
      <span style={{ color: BILATERAL_COLORS.primary }}>{currentRep}</span>
      {totalReps && (
        <>
          <span>/</span>
          <span>{totalReps}</span>
        </>
      )}
    </div>
  );
}

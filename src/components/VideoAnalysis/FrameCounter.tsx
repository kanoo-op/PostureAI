'use client';

import React from 'react';
import { ANALYSIS_COLORS } from './constants';

interface FrameCounterProps {
  current: number;
  total: number;
}

export default function FrameCounter({ current, total }: FrameCounterProps) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: ANALYSIS_COLORS.textSecondary }}>
        프레임:
      </span>
      <span
        className="font-mono"
        style={{ color: ANALYSIS_COLORS.textPrimary }}
      >
        {current.toLocaleString()}
      </span>
      <span style={{ color: ANALYSIS_COLORS.textSecondary }}>/</span>
      <span
        className="font-mono"
        style={{ color: ANALYSIS_COLORS.textSecondary }}
      >
        {total.toLocaleString()}
      </span>
    </div>
  );
}

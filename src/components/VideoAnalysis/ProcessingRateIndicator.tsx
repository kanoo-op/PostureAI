'use client';

import React from 'react';
import { ANALYSIS_COLORS } from './constants';

interface ProcessingRateIndicatorProps {
  rate: number; // Frames per second
}

export default function ProcessingRateIndicator({ rate }: ProcessingRateIndicatorProps) {
  const formattedRate = rate > 0 ? rate.toFixed(1) : '0.0';

  return (
    <div className="flex items-center gap-2 text-sm">
      <span style={{ color: ANALYSIS_COLORS.textSecondary }}>
        처리 속도:
      </span>
      <span
        className="font-mono"
        style={{ color: ANALYSIS_COLORS.primary }}
      >
        {formattedRate} fps
      </span>
    </div>
  );
}

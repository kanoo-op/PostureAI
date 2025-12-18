'use client';

import React from 'react';
import { ANALYSIS_COLORS } from './constants';

interface TimeEstimateDisplayProps {
  remainingMs: number;
}

function formatTime(ms: number): string {
  if (ms <= 0) return '완료';

  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `약 ${minutes}m ${seconds}s`;
  }
  return `약 ${seconds}s`;
}

export default function TimeEstimateDisplay({ remainingMs }: TimeEstimateDisplayProps) {
  const hasData = remainingMs > 0;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span style={{ color: ANALYSIS_COLORS.textSecondary }}>
        예상 남은 시간:
      </span>
      <span style={{ color: ANALYSIS_COLORS.textPrimary }}>
        {hasData ? formatTime(remainingMs) : '계산 중...'}
      </span>
    </div>
  );
}

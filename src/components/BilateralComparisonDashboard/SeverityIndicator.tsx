'use client';

import React from 'react';
import { SeverityIndicatorProps } from './types';
import { BILATERAL_COLORS } from './constants';

export default function SeverityIndicator({ level, difference }: SeverityIndicatorProps) {
  const statusColors = BILATERAL_COLORS.status;
  const color = statusColors[level];
  const bgColor = statusColors[`${level}Bg` as keyof typeof statusColors];

  const labels = {
    good: { en: 'Balanced', ko: '균형' },
    warning: { en: 'Mild Imbalance', ko: '경미한 불균형' },
    error: { en: 'Significant', ko: '주의 필요' },
  };

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: bgColor as string, color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span>{labels[level].ko}</span>
      <span className="opacity-60">Δ{difference.toFixed(1)}°</span>
    </div>
  );
}

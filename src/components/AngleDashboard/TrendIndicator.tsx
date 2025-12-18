// src/components/AngleDashboard/TrendIndicator.tsx

'use client';

import React from 'react';
import { TrendIndicatorProps } from './types';
import { DASHBOARD_COLORS } from './constants';

export default function TrendIndicator({ direction, size = 'sm' }: TrendIndicatorProps) {
  const sizeClass = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const color = DASHBOARD_COLORS.trend[direction];

  if (direction === 'stable') {
    return (
      <span
        className={`inline-block ${sizeClass}`}
        style={{ color }}
        title="Stable"
      >
        <svg viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="7" width="12" height="2" rx="1" />
        </svg>
      </span>
    );
  }

  if (direction === 'improving') {
    return (
      <span
        className={`inline-block ${sizeClass} animate-pulse`}
        style={{ color }}
        title="Improving"
      >
        <svg viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 3l5 6H3l5-6z" />
          <rect x="6" y="9" width="4" height="4" />
        </svg>
      </span>
    );
  }

  // declining
  return (
    <span
      className={`inline-block ${sizeClass} animate-pulse`}
      style={{ color }}
      title="Needs attention"
    >
      <svg viewBox="0 0 16 16" fill="currentColor">
        <rect x="6" y="3" width="4" height="4" />
        <path d="M8 13l-5-6h10l-5 6z" />
      </svg>
    </span>
  );
}

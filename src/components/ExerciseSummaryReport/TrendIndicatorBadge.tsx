'use client';

import React from 'react';
import { TrendIndicatorBadgeProps } from './types';
import { SUMMARY_COLORS } from './constants';

export default function TrendIndicatorBadge({
  trend,
  size = 'sm',
}: TrendIndicatorBadgeProps) {
  const color = SUMMARY_COLORS.trend[trend];
  const sizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  const icons = {
    improving: (
      <svg className={sizeClasses} fill="none" stroke={color} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ),
    declining: (
      <svg className={sizeClasses} fill="none" stroke={color} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
    stable: (
      <svg className={sizeClasses} fill="none" stroke={color} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    ),
  };

  return (
    <div
      className="inline-flex items-center justify-center rounded-full p-1"
      style={{ backgroundColor: `${color}20` }}
    >
      {icons[trend]}
    </div>
  );
}

'use client';

import React from 'react';
import { DASHBOARD_COLORS } from './constants';

interface PerspectiveCorrectionIndicatorProps {
  isActive: boolean;
  factor: number;
  className?: string;
}

/**
 * Small indicator showing when perspective correction is active
 * Displays the correction factor when active
 */
export default function PerspectiveCorrectionIndicator({
  isActive,
  factor,
  className = '',
}: PerspectiveCorrectionIndicatorProps) {
  if (!isActive) return null;

  const isIncreasing = factor > 1.0;
  const isDecreasing = factor < 1.0;

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${className}`}
      style={{
        backgroundColor: DASHBOARD_COLORS.depth.reliableBg,
        border: `1px solid ${DASHBOARD_COLORS.depth.reliable}30`,
      }}
      title={`Perspective correction: ${factor.toFixed(2)}x`}
    >
      <svg
        className="w-3 h-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke={DASHBOARD_COLORS.depth.reliable}
        strokeWidth="2"
      >
        {/* 3D cube icon */}
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
      <span style={{ color: DASHBOARD_COLORS.depth.reliable }}>
        {isIncreasing && '+'}
        {isDecreasing && ''}
        {((factor - 1) * 100).toFixed(0)}%
      </span>
    </div>
  );
}

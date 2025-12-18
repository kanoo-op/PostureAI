// src/components/AngleDashboard/MiniAngleGauge.tsx

'use client';

import React from 'react';
import { MiniAngleGaugeProps } from './types';
import { DASHBOARD_COLORS } from './constants';

const SIZE_CONFIG = {
  sm: { width: 32, strokeWidth: 3, fontSize: 8 },
  md: { width: 44, strokeWidth: 4, fontSize: 10 },
  lg: { width: 56, strokeWidth: 5, fontSize: 12 },
};

export default function MiniAngleGauge({
  value,
  minOptimal,
  maxOptimal,
  status,
  size = 'md',
}: MiniAngleGaugeProps) {
  const config = SIZE_CONFIG[size];
  const { width, strokeWidth, fontSize } = config;
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate the fill percentage based on value within 0-180 range
  const normalizedValue = Math.min(180, Math.max(0, value));
  const fillPercent = normalizedValue / 180;
  const strokeDashoffset = circumference * (1 - fillPercent);

  // Optimal range arc (for visual reference)
  const optimalStart = minOptimal / 180;
  const optimalEnd = maxOptimal / 180;

  const statusColor = DASHBOARD_COLORS.status[status];
  const statusGlow = DASHBOARD_COLORS.status[`${status}Glow` as keyof typeof DASHBOARD_COLORS.status];

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={width}
        height={width}
        className="-rotate-90"
        style={{ filter: `drop-shadow(0 0 4px ${statusGlow})` }}
      >
        {/* Background track */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke={DASHBOARD_COLORS.gauge.track}
          strokeWidth={strokeWidth}
        />

        {/* Optimal range indicator (subtle) */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke="rgba(0, 245, 160, 0.2)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference * (optimalEnd - optimalStart)} ${circumference}`}
          strokeDashoffset={-circumference * optimalStart}
          strokeLinecap="round"
        />

        {/* Value arc */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke={statusColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.2s ease-out' }}
        />
      </svg>

      {/* Center value */}
      <span
        className="absolute font-mono font-bold"
        style={{
          fontSize: `${fontSize}px`,
          color: statusColor,
          textShadow: `0 0 6px ${statusGlow}`,
        }}
      >
        {Math.round(value)}
      </span>
    </div>
  );
}

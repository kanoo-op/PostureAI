'use client';

import React from 'react';
import { DASHBOARD_COLORS } from './constants';

interface ElbowValgusIndicatorProps {
  leftValgus: number;
  rightValgus: number;
  status: 'good' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { width: 60, height: 40, fontSize: 10 },
  md: { width: 80, height: 50, fontSize: 12 },
  lg: { width: 100, height: 60, fontSize: 14 },
};

export default function ElbowValgusIndicator({
  leftValgus,
  rightValgus,
  status,
  size = 'md',
}: ElbowValgusIndicatorProps) {
  const { width, height, fontSize } = SIZES[size];
  const statusColor = DASHBOARD_COLORS.status[status];
  const leftColor = DASHBOARD_COLORS.bodyPart.armLeft || '#3b82f6';
  const rightColor = DASHBOARD_COLORS.bodyPart.armRight || '#8b5cf6';

  // Calculate arm angles for visualization
  // Positive valgus = outward flare, negative = inward collapse
  const leftRotation = Math.max(-30, Math.min(30, leftValgus));
  const rightRotation = Math.max(-30, Math.min(30, -rightValgus));

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width, height }}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 60"
        className="overflow-visible"
      >
        {/* Body center line */}
        <line
          x1="50" y1="10" x2="50" y2="50"
          stroke={DASHBOARD_COLORS.textMuted}
          strokeWidth="2"
          strokeDasharray="4,2"
        />

        {/* Left arm */}
        <g transform={`translate(50, 15) rotate(${leftRotation})`}>
          <line
            x1="0" y1="0" x2="-30" y2="25"
            stroke={leftColor}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="-30" cy="25" r="4" fill={leftColor} />
        </g>

        {/* Right arm */}
        <g transform={`translate(50, 15) rotate(${rightRotation})`}>
          <line
            x1="0" y1="0" x2="30" y2="25"
            stroke={rightColor}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="30" cy="25" r="4" fill={rightColor} />
        </g>

        {/* Status indicator */}
        <circle
          cx="50" cy="15"
          r="6"
          fill={statusColor}
          style={{
            filter: `drop-shadow(0 0 4px ${DASHBOARD_COLORS.status[`${status}Glow` as keyof typeof DASHBOARD_COLORS.status]})`,
          }}
        />
      </svg>

      {/* Value labels */}
      <div
        className="absolute left-0 bottom-0 text-center"
        style={{ fontSize, color: leftColor, width: '40%' }}
      >
        L: {Math.abs(leftValgus).toFixed(0)}deg
      </div>
      <div
        className="absolute right-0 bottom-0 text-center"
        style={{ fontSize, color: rightColor, width: '40%' }}
      >
        R: {Math.abs(rightValgus).toFixed(0)}deg
      </div>
    </div>
  );
}

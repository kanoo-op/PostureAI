'use client';

import React from 'react';
import { DETECTION_COLORS } from './constants';

interface Props {
  confidence: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
}

export default function DetectionConfidenceMeter({ confidence, size = 'md' }: Props) {
  const getColor = () => {
    if (confidence >= 70) return DETECTION_COLORS.confidenceHigh;
    if (confidence >= 50) return DETECTION_COLORS.confidenceMedium;
    return DETECTION_COLORS.confidenceLow;
  };

  const getGlow = () => {
    if (confidence >= 70) return DETECTION_COLORS.confidenceHighGlow;
    if (confidence >= 50) return DETECTION_COLORS.confidenceMediumGlow;
    return DETECTION_COLORS.confidenceLowGlow;
  };

  const sizes = {
    sm: { outer: 48, inner: 40, stroke: 4 },
    md: { outer: 64, inner: 52, stroke: 6 },
    lg: { outer: 80, inner: 64, stroke: 8 },
  };

  const { outer, inner, stroke } = sizes[size];
  const radius = (inner - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: outer, height: outer }}
    >
      <svg
        className="absolute transform -rotate-90"
        width={inner}
        height={inner}
        viewBox={`0 0 ${inner} ${inner}`}
      >
        {/* Background circle */}
        <circle
          cx={inner / 2}
          cy={inner / 2}
          r={radius}
          fill="none"
          stroke="rgba(75, 85, 99, 0.3)"
          strokeWidth={stroke}
        />
        {/* Progress circle */}
        <circle
          cx={inner / 2}
          cy={inner / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            filter: `drop-shadow(0 0 6px ${getGlow()})`,
            transition: 'stroke-dashoffset 0.5s ease-in-out',
          }}
        />
      </svg>
      <span
        className="text-sm font-bold"
        style={{ color: getColor() }}
      >
        {confidence}%
      </span>
    </div>
  );
}

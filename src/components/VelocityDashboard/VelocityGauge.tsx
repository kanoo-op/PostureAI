'use client';

import React from 'react';
import { VELOCITY_COLORS } from './constants';
import type { VelocityCategory } from '@/types/velocity';

interface VelocityGaugeProps {
  velocity: number;
  maxVelocity?: number;
  category: VelocityCategory;
  size?: 'sm' | 'md' | 'lg';
}

const CATEGORY_COLORS: Record<VelocityCategory, string> = {
  too_slow: VELOCITY_COLORS.velocity.slow,
  slow: VELOCITY_COLORS.velocity.slow,
  optimal: VELOCITY_COLORS.velocity.optimal,
  fast: VELOCITY_COLORS.velocity.fast,
  too_fast: VELOCITY_COLORS.velocity.fast,
};

export default function VelocityGauge({
  velocity,
  maxVelocity = 400,
  category,
  size = 'md',
}: VelocityGaugeProps) {
  const sizes = { sm: 60, md: 80, lg: 100 };
  const dim = sizes[size];
  const strokeWidth = size === 'sm' ? 4 : 6;
  const radius = (dim - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(velocity / maxVelocity, 1);
  const offset = circumference * (1 - progress);
  const color = CATEGORY_COLORS[category];

  return (
    <div className="relative" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke={VELOCITY_COLORS.gauge.track}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 8px ${color})`,
            transition: 'stroke-dashoffset 0.1s ease-out',
          }}
        />
      </svg>
      {/* Center value */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-mono font-bold"
          style={{
            color,
            fontSize: size === 'sm' ? '0.75rem' : size === 'md' ? '1rem' : '1.25rem',
          }}
        >
          {Math.round(velocity)}
        </span>
      </div>
    </div>
  );
}

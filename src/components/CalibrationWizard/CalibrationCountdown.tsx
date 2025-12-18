'use client';

import React from 'react';
import { CALIBRATION_COLORS } from './constants';

interface CalibrationCountdownProps {
  countdown: number;
  total?: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function CalibrationCountdown({
  countdown,
  total = 3,
  size = 'md',
}: CalibrationCountdownProps) {
  const progress = ((total - countdown) / total) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const sizeMap = {
    sm: { container: 'w-20 h-20', text: 'text-2xl', viewBox: 100 },
    md: { container: 'w-32 h-32', text: 'text-4xl', viewBox: 100 },
    lg: { container: 'w-48 h-48', text: 'text-6xl', viewBox: 100 },
  };

  const { container, text } = sizeMap[size];

  return (
    <div className={`relative ${container}`}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Background ring */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={CALIBRATION_COLORS.surfaceElevated}
          strokeWidth="6"
        />
        {/* Progress ring */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={CALIBRATION_COLORS.active}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            filter: `drop-shadow(0 0 8px ${CALIBRATION_COLORS.activeGlow})`,
            transition: 'stroke-dashoffset 0.3s ease',
          }}
        />
      </svg>

      {/* Countdown number */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`${text} font-bold`}
          style={{
            color: CALIBRATION_COLORS.active,
            textShadow: `0 0 20px ${CALIBRATION_COLORS.activeGlow}`,
          }}
        >
          {countdown}
        </span>
      </div>
    </div>
  );
}

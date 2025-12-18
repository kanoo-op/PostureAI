'use client';

import React from 'react';
import { CALIBRATION_COLORS } from './constants';

interface ConfidenceMeterProps {
  confidence: number; // 0-1
  threshold?: number; // default 0.7
  size?: 'sm' | 'md' | 'lg';
}

export default function ConfidenceMeter({
  confidence,
  threshold = 0.7,
  size = 'md',
}: ConfidenceMeterProps) {
  const isSufficient = confidence >= threshold;
  const percentage = Math.round(confidence * 100);

  const getColor = () => {
    if (confidence >= 0.7) return CALIBRATION_COLORS.confidenceHigh;
    if (confidence >= 0.5) return CALIBRATION_COLORS.confidenceMedium;
    return CALIBRATION_COLORS.confidenceLow;
  };

  const getGlow = () => {
    if (confidence >= 0.7) return CALIBRATION_COLORS.completeGlow;
    if (confidence >= 0.5) return CALIBRATION_COLORS.inProgressGlow;
    return 'rgba(255, 61, 113, 0.4)';
  };

  const sizeClasses = {
    sm: { height: 'h-2', text: 'text-xs', width: 'w-32' },
    md: { height: 'h-3', text: 'text-sm', width: 'w-48' },
    lg: { height: 'h-4', text: 'text-base', width: 'w-64' },
  };

  const { height, text, width } = sizeClasses[size];
  const color = getColor();

  return (
    <div className={`${width}`}>
      {/* Label */}
      <div className="flex justify-between items-center mb-1">
        <span className={`${text} font-medium`} style={{ color: CALIBRATION_COLORS.textSecondary }}>
          Detection Confidence
        </span>
        <span
          className={`${text} font-bold`}
          style={{ color }}
        >
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative">
        {/* Track */}
        <div
          className={`${height} rounded-full overflow-hidden`}
          style={{ backgroundColor: CALIBRATION_COLORS.surfaceElevated }}
        >
          {/* Fill */}
          <div
            className={`${height} rounded-full transition-all duration-300`}
            style={{
              width: `${percentage}%`,
              backgroundColor: color,
              boxShadow: isSufficient ? `0 0 8px ${getGlow()}` : 'none',
            }}
          />
        </div>

        {/* Threshold marker */}
        <div
          className="absolute top-0 w-0.5 rounded-full"
          style={{
            left: `${threshold * 100}%`,
            height: '100%',
            backgroundColor: CALIBRATION_COLORS.textSecondary,
          }}
        />
      </div>

      {/* Threshold label */}
      <div className="flex justify-end mt-1">
        <span className="text-xs" style={{ color: CALIBRATION_COLORS.textMuted }}>
          Min: {Math.round(threshold * 100)}%
        </span>
      </div>

      {/* Status indicator */}
      {isSufficient && (
        <div
          className="flex items-center gap-1 mt-2 animate-pulse"
          style={{ color: CALIBRATION_COLORS.confidenceHigh }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs font-medium">Ready to capture</span>
        </div>
      )}
    </div>
  );
}

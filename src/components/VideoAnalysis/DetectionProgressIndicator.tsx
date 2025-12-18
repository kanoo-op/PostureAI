'use client';

import React from 'react';
import { ANALYSIS_COLORS, DETECTION_COLORS } from './constants';

interface Props {
  progress: number; // 0-100
  label: string;
}

export default function DetectionProgressIndicator({ progress, label }: Props) {
  return (
    <div className="space-y-4">
      {/* Label and spinner */}
      <div className="flex items-center justify-center gap-3">
        <div className="relative w-6 h-6">
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              border: `2px solid ${ANALYSIS_COLORS.border}`,
              borderTopColor: DETECTION_COLORS.confidenceHigh,
            }}
          />
        </div>
        <span
          className="text-sm font-medium"
          style={{ color: ANALYSIS_COLORS.textPrimary }}
        >
          {label}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: ANALYSIS_COLORS.progressTrack }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${ANALYSIS_COLORS.progressFillStart}, ${ANALYSIS_COLORS.progressFillEnd})`,
            boxShadow: `0 0 10px ${DETECTION_COLORS.confidenceHighGlow}`,
          }}
        />
      </div>

      {/* Progress percentage */}
      <div className="text-center">
        <span
          className="text-xs"
          style={{ color: ANALYSIS_COLORS.textSecondary }}
        >
          {progress}% 완료
        </span>
      </div>
    </div>
  );
}

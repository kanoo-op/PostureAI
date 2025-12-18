'use client';

import React from 'react';
import { BILATERAL_COLORS } from './constants';

interface DashboardHeaderProps {
  overallScore: number;
  onClose?: () => void;
}

export default function DashboardHeader({ overallScore, onClose }: DashboardHeaderProps) {
  const scoreColor = overallScore >= 85
    ? BILATERAL_COLORS.status.good
    : overallScore >= 70
      ? BILATERAL_COLORS.status.warning
      : BILATERAL_COLORS.status.error;

  return (
    <div
      className="px-4 py-3 border-b flex items-center justify-between"
      style={{ borderColor: BILATERAL_COLORS.border }}
    >
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: BILATERAL_COLORS.leftSide }}
          />
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: BILATERAL_COLORS.rightSide }}
          />
        </div>
        <span className="text-sm font-semibold" style={{ color: BILATERAL_COLORS.textPrimary }}>
          양측 비교 / Bilateral Comparison
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="text-xs" style={{ color: BILATERAL_COLORS.textMuted }}>대칭 점수</span>
          <span
            className="ml-2 font-mono font-bold text-lg"
            style={{ color: scoreColor }}
          >
            {overallScore}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-800/50 transition-colors"
          >
            <svg className="w-4 h-4" style={{ color: BILATERAL_COLORS.textMuted }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

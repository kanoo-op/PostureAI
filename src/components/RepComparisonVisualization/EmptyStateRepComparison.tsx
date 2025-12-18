'use client';

import React from 'react';
import { REP_COMPARISON_COLORS } from './constants';

export default function EmptyStateRepComparison() {
  return (
    <div className="text-center py-8 px-4">
      {/* Animated indicators */}
      <div className="flex justify-center gap-2 mb-3">
        <span
          className="w-3 h-3 rounded-full animate-pulse"
          style={{ backgroundColor: REP_COMPARISON_COLORS.primary }}
        />
        <span
          className="w-3 h-3 rounded-full animate-pulse"
          style={{ backgroundColor: REP_COMPARISON_COLORS.secondary, animationDelay: '0.2s' }}
        />
        <span
          className="w-3 h-3 rounded-full animate-pulse"
          style={{ backgroundColor: REP_COMPARISON_COLORS.repLines[2], animationDelay: '0.4s' }}
        />
      </div>

      {/* Chart placeholder lines */}
      <div className="max-w-xs mx-auto mb-4">
        <svg viewBox="0 0 100 40" className="w-full h-12 opacity-30">
          <path
            d="M 0 30 Q 25 15 50 20 T 100 10"
            fill="none"
            stroke={REP_COMPARISON_COLORS.primary}
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <path
            d="M 0 25 Q 25 35 50 25 T 100 20"
            fill="none"
            stroke={REP_COMPARISON_COLORS.secondary}
            strokeWidth="1"
            strokeDasharray="2 2"
          />
        </svg>
      </div>

      <p className="text-sm" style={{ color: REP_COMPARISON_COLORS.textSecondary }}>
        반복 데이터가 기록되면 비교가 표시됩니다
      </p>
      <p className="text-xs mt-1" style={{ color: REP_COMPARISON_COLORS.textMuted }}>
        Rep comparison will appear when data is recorded
      </p>

      {/* Hint */}
      <div
        className="mt-4 mx-auto max-w-[200px] p-2 rounded-lg"
        style={{ backgroundColor: REP_COMPARISON_COLORS.surfaceElevated }}
      >
        <p className="text-[10px]" style={{ color: REP_COMPARISON_COLORS.textMuted }}>
          운동을 완료하면 각 반복의 각도 변화를 비교할 수 있습니다
        </p>
        <p className="text-[10px] mt-1" style={{ color: REP_COMPARISON_COLORS.textMuted }}>
          Complete exercises to compare angle changes across reps
        </p>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { ANALYSIS_COLORS, DETECTION_COLORS } from './constants';

interface Props {
  onRetry: () => void;
  onManualSelect: () => void;
}

export default function DetectionTimeoutOverlay({ onRetry, onManualSelect }: Props) {
  return (
    <div
      className="rounded-xl p-6 text-center space-y-4"
      style={{
        backgroundColor: ANALYSIS_COLORS.surface,
        border: `1px solid ${DETECTION_COLORS.confidenceLow}50`,
      }}
    >
      {/* Timeout icon */}
      <div
        className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
        style={{ backgroundColor: `${DETECTION_COLORS.confidenceLow}20` }}
      >
        <svg
          className="w-8 h-8"
          style={{ color: DETECTION_COLORS.confidenceLow }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      {/* Message */}
      <div>
        <h3
          className="text-lg font-semibold mb-1"
          style={{ color: ANALYSIS_COLORS.textPrimary }}
        >
          운동 감지 시간 초과
        </h3>
        <p
          className="text-sm"
          style={{ color: ANALYSIS_COLORS.textSecondary }}
        >
          자동 감지에 실패했습니다. 다시 시도하거나 운동 유형을 직접 선택해 주세요.
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onRetry}
          className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all hover:scale-[1.02]"
          style={{
            background: `linear-gradient(135deg, ${ANALYSIS_COLORS.primary}, ${ANALYSIS_COLORS.secondary})`,
            color: ANALYSIS_COLORS.backgroundSolid,
            boxShadow: `0 4px 20px ${ANALYSIS_COLORS.primaryGlow}`,
          }}
        >
          다시 시도
        </button>
        <button
          onClick={onManualSelect}
          className="flex-1 py-3 px-4 rounded-xl font-medium transition-all hover:scale-[1.02]"
          style={{
            backgroundColor: ANALYSIS_COLORS.surfaceElevated,
            color: ANALYSIS_COLORS.textSecondary,
            border: `1px solid ${ANALYSIS_COLORS.border}`,
          }}
        >
          직접 선택
        </button>
      </div>
    </div>
  );
}

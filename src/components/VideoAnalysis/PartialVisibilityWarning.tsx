'use client';

import React from 'react';
import { ANALYSIS_COLORS, DETECTION_COLORS } from './constants';

interface Props {
  visibleParts: string[];
  onContinue: () => void;
}

export default function PartialVisibilityWarning({ visibleParts, onContinue }: Props) {
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        backgroundColor: `${DETECTION_COLORS.confidenceMedium}15`,
        border: `1px solid ${DETECTION_COLORS.confidenceMedium}50`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${DETECTION_COLORS.confidenceMedium}20` }}
        >
          <svg
            className="w-4 h-4"
            style={{ color: DETECTION_COLORS.confidenceMedium }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h4
            className="text-sm font-semibold"
            style={{ color: DETECTION_COLORS.confidenceMedium }}
          >
            일부 신체 부위 가려짐
          </h4>
          <p
            className="text-sm mt-1"
            style={{ color: ANALYSIS_COLORS.textSecondary }}
          >
            일부 신체 부위가 가려져 있습니다. 분석 정확도가 떨어질 수 있습니다.
          </p>
          {visibleParts.length > 0 && (
            <p
              className="text-xs mt-2"
              style={{ color: ANALYSIS_COLORS.textMuted }}
            >
              감지된 부위: {visibleParts.join(', ')}
            </p>
          )}
        </div>
      </div>
      <div className="pl-11">
        <button
          onClick={onContinue}
          className="text-sm px-3 py-1.5 rounded-lg transition-colors"
          style={{
            backgroundColor: `${DETECTION_COLORS.confidenceMedium}20`,
            color: DETECTION_COLORS.confidenceMedium,
          }}
        >
          계속 진행
        </button>
      </div>
    </div>
  );
}

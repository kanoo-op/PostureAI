'use client';

import React from 'react';
import { ANALYSIS_COLORS, DETECTION_COLORS } from './constants';

interface Props {
  onContinue: () => void;
  onReselect: () => void;
}

export default function MultiplePersonWarning({ onContinue, onReselect }: Props) {
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h4
            className="text-sm font-semibold"
            style={{ color: DETECTION_COLORS.confidenceMedium }}
          >
            여러 사람이 감지됨
          </h4>
          <p
            className="text-sm mt-1"
            style={{ color: ANALYSIS_COLORS.textSecondary }}
          >
            영상에서 여러 사람이 감지되었습니다. 분석은 가장 뚜렷한 사람을 기준으로 진행됩니다.
          </p>
        </div>
      </div>
      <div className="flex gap-2 pl-11">
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
        <button
          onClick={onReselect}
          className="text-sm px-3 py-1.5 rounded-lg transition-colors"
          style={{
            backgroundColor: ANALYSIS_COLORS.surfaceElevated,
            color: ANALYSIS_COLORS.textSecondary,
          }}
        >
          다른 영상 선택
        </button>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { ANALYSIS_COLORS } from './constants';

interface FailedFramesIndicatorProps {
  count: number;
}

export default function FailedFramesIndicator({ count }: FailedFramesIndicatorProps) {
  if (count <= 0) return null;

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
      style={{
        backgroundColor: ANALYSIS_COLORS.statusWarningBg,
        color: ANALYSIS_COLORS.statusWarning,
      }}
    >
      {/* Warning triangle icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
      <span>{count}개 프레임 감지 실패</span>
    </div>
  );
}

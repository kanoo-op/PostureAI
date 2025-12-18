'use client';

import React from 'react';
import { ANALYSIS_COLORS } from './constants';

interface Props {
  cachedAt: number;
}

export default function CachedResultIndicator({ cachedAt }: Props) {
  const formatCachedTime = () => {
    const now = Date.now();
    const diff = now - cachedAt;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금 전';
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
      style={{
        backgroundColor: ANALYSIS_COLORS.surfaceElevated,
        color: ANALYSIS_COLORS.textMuted,
      }}
    >
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>캐시된 결과 ({formatCachedTime()})</span>
    </div>
  );
}

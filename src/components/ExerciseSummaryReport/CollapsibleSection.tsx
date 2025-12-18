'use client';

import React, { useState } from 'react';
import { CollapsibleSectionProps } from './types';
import { SUMMARY_COLORS } from './constants';

export default function CollapsibleSection({
  title,
  titleEn,
  defaultExpanded = true,
  children,
  language = 'ko',
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const displayTitle = language === 'ko' ? title : (titleEn || title);

  return (
    <div className="border-b" style={{ borderColor: SUMMARY_COLORS.border }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-3 px-4 hover:bg-white/5 transition-colors"
      >
        <span className="text-sm font-semibold" style={{ color: SUMMARY_COLORS.textPrimary }}>
          {displayTitle}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke={SUMMARY_COLORS.textMuted}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

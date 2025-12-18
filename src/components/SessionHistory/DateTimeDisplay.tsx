'use client';

import React from 'react';
import { formatSessionDate, formatSessionTime } from '@/utils/dateFormatter';
import { VIDEO_ANALYSIS_COLORS } from '@/components/VideoAnalysisView/constants';

interface DateTimeDisplayProps {
  timestamp: number;
  language: 'ko' | 'en';
  showTime?: boolean;
  className?: string;
}

export function DateTimeDisplay({
  timestamp,
  language,
  showTime = false,
  className = '',
}: DateTimeDisplayProps) {
  const locale = language === 'ko' ? 'ko-KR' : 'en-US';
  const date = formatSessionDate(timestamp, locale);
  const time = showTime ? formatSessionTime(timestamp, locale) : null;

  return (
    <span
      className={`${className}`}
      style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}
    >
      {date}
      {time && (
        <span
          className="ml-2"
          style={{ color: VIDEO_ANALYSIS_COLORS.textMuted }}
        >
          {time}
        </span>
      )}
    </span>
  );
}

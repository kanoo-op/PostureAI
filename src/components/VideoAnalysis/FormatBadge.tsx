'use client';

import React from 'react';
import { VIDEO_COLORS } from './constants';

interface FormatBadgeProps {
  format: string;
  className?: string;
}

export default function FormatBadge({ format, className = '' }: FormatBadgeProps) {
  // Extract format from mime type (e.g., 'video/mp4' -> 'MP4')
  const displayFormat = format.split('/')[1]?.toUpperCase() || format.toUpperCase();

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}
      style={{
        backgroundColor: VIDEO_COLORS.primaryLight,
        color: VIDEO_COLORS.primaryDark,
      }}
    >
      {displayFormat}
    </span>
  );
}

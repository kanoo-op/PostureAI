'use client';

import React from 'react';
import { VIDEO_COLORS } from './constants';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

const sizeMap = {
  sm: 'h-6 w-6 border-2',
  md: 'h-10 w-10 border-3',
  lg: 'h-14 w-14 border-4',
};

export default function LoadingSpinner({
  size = 'md',
  message,
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={`animate-spin rounded-full ${sizeMap[size]}`}
        style={{
          borderColor: VIDEO_COLORS.border,
          borderTopColor: VIDEO_COLORS.primary,
        }}
        role="status"
        aria-label="로딩 중"
      />
      {message && (
        <p
          className="text-sm"
          style={{ color: VIDEO_COLORS.textSecondary }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

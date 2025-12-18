'use client';

import React from 'react';
import { VIDEO_COLORS, ANIMATIONS } from './constants';

interface UploadProgressBarProps {
  progress?: number; // 0-100, undefined for indeterminate
  status?: string;
  className?: string;
}

export default function UploadProgressBar({
  progress,
  status,
  className = '',
}: UploadProgressBarProps) {
  const isIndeterminate = progress === undefined;

  return (
    <div className={`space-y-2 ${className}`}>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: VIDEO_COLORS.progressTrack }}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={status || '처리 중'}
      >
        <div
          className={`h-full rounded-full transition-all ${isIndeterminate ? 'animate-pulse' : ''}`}
          style={{
            backgroundColor: VIDEO_COLORS.progressFill,
            width: isIndeterminate ? '100%' : `${progress}%`,
            transitionDuration: ANIMATIONS.normal,
          }}
        />
      </div>
      {status && (
        <p
          className="text-xs text-center"
          style={{ color: VIDEO_COLORS.textSecondary }}
        >
          {status}
        </p>
      )}
    </div>
  );
}

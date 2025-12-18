'use client';

import React from 'react';
import { TIMELINE_COLORS } from './constants';

interface TimeStampDisplayProps {
  currentTime: number;  // seconds
  duration: number;     // seconds
  className?: string;
}

export default function TimeStampDisplay({
  currentTime,
  duration,
  className = '',
}: TimeStampDisplayProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`font-mono text-sm ${className}`}
      style={{ color: TIMELINE_COLORS.textSecondary }}
    >
      <span style={{ color: TIMELINE_COLORS.textPrimary }}>
        {formatTime(currentTime)}
      </span>
      <span className="mx-1">/</span>
      <span>{formatTime(duration)}</span>
    </div>
  );
}

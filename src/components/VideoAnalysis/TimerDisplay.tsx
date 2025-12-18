'use client';

import React from 'react';
import { ANALYSIS_COLORS, RECORDING_COLORS } from './constants';

interface TimerDisplayProps {
  durationMs: number;
  maxDurationMs: number;
  isRecording: boolean;
  className?: string;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function TimerDisplay({
  durationMs,
  maxDurationMs,
  isRecording,
  className = '',
}: TimerDisplayProps) {
  const remainingMs = maxDurationMs - durationMs;
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  // Determine color based on remaining time
  let color: string = ANALYSIS_COLORS.textPrimary;
  if (isRecording) {
    if (remainingSeconds <= 10) {
      color = RECORDING_COLORS.countdownCritical;
    } else if (remainingSeconds <= 30) {
      color = RECORDING_COLORS.countdownWarning;
    }
  }

  return (
    <div
      className={`font-mono text-2xl font-bold ${className}`}
      style={{ color }}
      role="timer"
      aria-live="polite"
      aria-label={`녹화 시간 ${formatTime(durationMs)}, 최대 ${formatTime(maxDurationMs)}`}
    >
      <span>{formatTime(durationMs)}</span>
      <span style={{ color: ANALYSIS_COLORS.textMuted }}> / </span>
      <span style={{ color: ANALYSIS_COLORS.textMuted, fontSize: '0.8em' }}>
        {formatTime(maxDurationMs)}
      </span>
    </div>
  );
}

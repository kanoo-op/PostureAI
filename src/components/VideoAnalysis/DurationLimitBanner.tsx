'use client';

import React, { useState, useEffect } from 'react';
import { ANALYSIS_COLORS, RECORDING_COLORS } from './constants';

interface DurationLimitBannerProps {
  durationMs: number;
  maxDurationMs: number;
  isRecording: boolean;
  className?: string;
}

export default function DurationLimitBanner({
  durationMs,
  maxDurationMs,
  isRecording,
  className = '',
}: DurationLimitBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  const remainingMs = maxDurationMs - durationMs;
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  useEffect(() => {
    if (isRecording && (remainingSeconds <= 30)) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isRecording, remainingSeconds]);

  if (!isVisible) return null;

  const isCritical = remainingSeconds <= 10;
  const backgroundColor = isCritical
    ? ANALYSIS_COLORS.statusErrorBg
    : ANALYSIS_COLORS.statusWarningBg;
  const borderColor = isCritical
    ? RECORDING_COLORS.countdownCritical
    : RECORDING_COLORS.countdownWarning;
  const textColor = isCritical
    ? RECORDING_COLORS.countdownCritical
    : RECORDING_COLORS.countdownWarning;

  return (
    <div
      className={`
        px-4 py-2 rounded-lg text-center
        transform transition-all duration-300
        ${className}
      `}
      style={{
        backgroundColor,
        border: `1px solid ${borderColor}`,
        animation: 'slideIn 0.3s ease-out',
      }}
      role="alert"
      aria-live="assertive"
    >
      <p className="text-sm font-medium" style={{ color: textColor }}>
        녹화 종료까지 {remainingSeconds}초 남았습니다
      </p>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

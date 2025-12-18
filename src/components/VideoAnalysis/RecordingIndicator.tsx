'use client';

import React from 'react';
import { RECORDING_COLORS } from './constants';

interface RecordingIndicatorProps {
  isRecording: boolean;
  className?: string;
}

export default function RecordingIndicator({
  isRecording,
  className = '',
}: RecordingIndicatorProps) {
  if (!isRecording) return null;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${className}`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      role="status"
      aria-live="polite"
      aria-label="녹화 중"
    >
      {/* Pulsing red dot */}
      <div
        className="w-2.5 h-2.5 rounded-full"
        style={{
          backgroundColor: RECORDING_COLORS.recording,
          animation: 'indicatorPulse 1.5s ease-in-out infinite',
        }}
      />
      <span
        className="text-xs font-semibold tracking-wider"
        style={{ color: RECORDING_COLORS.recording }}
      >
        REC
      </span>

      <style jsx>{`
        @keyframes indicatorPulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}

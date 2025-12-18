'use client';

import React from 'react';
import { RECORDING_COLORS, ANALYSIS_COLORS } from './constants';
import type { RecordingState } from '@/types/video';

interface RecordButtonProps {
  state: RecordingState;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export default function RecordButton({
  state,
  onClick,
  disabled = false,
  className = '',
}: RecordButtonProps) {
  const isRecording = state === 'recording';
  const isPaused = state === 'paused';
  const isActive = isRecording || isPaused;

  const getAriaLabel = () => {
    if (isRecording) return '녹화 중지';
    if (isPaused) return '녹화 일시 정지됨';
    return '녹화 시작';
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={getAriaLabel()}
      className={`
        relative w-16 h-16 rounded-full flex items-center justify-center
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      style={{
        backgroundColor: isActive ? RECORDING_COLORS.recording : ANALYSIS_COLORS.surfaceElevated,
        boxShadow: isRecording ? `0 0 0 0 ${RECORDING_COLORS.recordingGlow}` : 'none',
        animation: isRecording ? 'recordPulse 2s infinite' : 'none',
      }}
    >
      {/* Inner circle/square */}
      <div
        className={`
          transition-all duration-200
          ${isActive ? 'w-5 h-5 rounded-sm' : 'w-8 h-8 rounded-full'}
        `}
        style={{
          backgroundColor: isActive ? '#ffffff' : RECORDING_COLORS.recording,
        }}
      />

      {/* Pulse animation style */}
      <style jsx>{`
        @keyframes recordPulse {
          0% {
            box-shadow: 0 0 0 0 ${RECORDING_COLORS.recordingGlow};
          }
          70% {
            box-shadow: 0 0 0 10px rgba(255, 61, 113, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 61, 113, 0);
          }
        }
      `}</style>
    </button>
  );
}

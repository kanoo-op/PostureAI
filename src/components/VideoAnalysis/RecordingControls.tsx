'use client';

import React, { useEffect, useCallback } from 'react';
import { RECORDING_COLORS, ANALYSIS_COLORS } from './constants';
import RecordButton from './RecordButton';
import type { RecordingState } from '@/types/video';

interface RecordingControlsProps {
  state: RecordingState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCancel: () => void;
  className?: string;
}

export default function RecordingControls({
  state,
  onStart,
  onPause,
  onResume,
  onStop,
  onCancel,
  className = '',
}: RecordingControlsProps) {
  const isRecording = state === 'recording';
  const isPaused = state === 'paused';
  const isIdle = state === 'idle';
  const isActive = isRecording || isPaused;

  const handleRecordClick = useCallback(() => {
    if (isIdle) {
      onStart();
    } else if (isRecording) {
      onStop();
    } else if (isPaused) {
      onStop();
    }
  }, [isIdle, isRecording, isPaused, onStart, onStop]);

  const handlePauseResume = useCallback(() => {
    if (isRecording) {
      onPause();
    } else if (isPaused) {
      onResume();
    }
  }, [isRecording, isPaused, onPause, onResume]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space' && isActive) {
        e.preventDefault();
        handlePauseResume();
      } else if (e.code === 'Escape' && isActive) {
        e.preventDefault();
        onStop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handlePauseResume, onStop]);

  return (
    <div
      className={`flex items-center justify-center gap-4 px-6 py-4 rounded-xl ${className}`}
      style={{ backgroundColor: RECORDING_COLORS.controlBarBg }}
    >
      {/* Cancel button - left side */}
      {isActive && (
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium transition-colors rounded-lg hover:bg-white/10"
          style={{ color: ANALYSIS_COLORS.textSecondary }}
          aria-label="취소"
        >
          취소
        </button>
      )}

      {/* Pause/Resume button */}
      {isActive && (
        <button
          onClick={handlePauseResume}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
          style={{ backgroundColor: ANALYSIS_COLORS.surfaceElevated }}
          aria-label={isRecording ? '일시 정지' : '계속하기'}
        >
          {isRecording ? (
            // Pause icon
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              style={{ color: ANALYSIS_COLORS.textPrimary }}
            >
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            // Play icon
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              style={{ color: ANALYSIS_COLORS.textPrimary }}
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      )}

      {/* Main record/stop button */}
      <RecordButton
        state={state}
        onClick={handleRecordClick}
        disabled={state === 'initializing' || state === 'error'}
      />

      {/* Stop button - when recording or paused */}
      {isActive && (
        <button
          onClick={onStop}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
          style={{ backgroundColor: ANALYSIS_COLORS.surfaceElevated }}
          aria-label="녹화 중지"
        >
          {/* Stop icon (square) */}
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
            style={{ color: RECORDING_COLORS.recording }}
          >
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        </button>
      )}

      {/* Spacer for cancel button alignment */}
      {isActive && <div className="w-20" />}
    </div>
  );
}

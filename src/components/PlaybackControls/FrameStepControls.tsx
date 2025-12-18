'use client';

import React from 'react';
import { PLAYBACK_CONTROL_COLORS, TRANSLATIONS } from './constants';

interface FrameStepControlsProps {
  onStepBackward: () => void;
  onStepForward: () => void;
  isAtStart: boolean;
  isAtEnd: boolean;
  currentFrame: number;
  totalFrames: number;
  language: 'ko' | 'en';
}

export default function FrameStepControls({
  onStepBackward,
  onStepForward,
  isAtStart,
  isAtEnd,
  currentFrame,
  totalFrames,
  language,
}: FrameStepControlsProps) {
  const t = TRANSLATIONS[language];

  const buttonStyle = (disabled: boolean) => ({
    backgroundColor: disabled
      ? PLAYBACK_CONTROL_COLORS.speedInactive
      : PLAYBACK_CONTROL_COLORS.frameStepBg,
    border: `1px solid ${disabled ? PLAYBACK_CONTROL_COLORS.border : PLAYBACK_CONTROL_COLORS.frameStepBorder}`,
    color: disabled
      ? PLAYBACK_CONTROL_COLORS.textMuted
      : PLAYBACK_CONTROL_COLORS.textPrimary,
  });

  return (
    <div className="flex items-center gap-2">
      {/* Previous Frame Button */}
      <button
        onClick={onStepBackward}
        disabled={isAtStart}
        className="p-2 rounded-lg transition-all hover:scale-105 disabled:hover:scale-100"
        style={buttonStyle(isAtStart)}
        aria-label={`${t.previousFrame} (J)`}
        title={`${t.previousFrame} (J)`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {/* Frame Counter */}
      <div
        className="px-3 py-1 rounded-md text-xs font-mono min-w-[80px] text-center"
        style={{
          backgroundColor: PLAYBACK_CONTROL_COLORS.backgroundElevated,
          color: PLAYBACK_CONTROL_COLORS.textSecondary,
        }}
      >
        {currentFrame + 1} / {totalFrames}
      </div>

      {/* Next Frame Button */}
      <button
        onClick={onStepForward}
        disabled={isAtEnd}
        className="p-2 rounded-lg transition-all hover:scale-105 disabled:hover:scale-100"
        style={buttonStyle(isAtEnd)}
        aria-label={`${t.nextFrame} (L)`}
        title={`${t.nextFrame} (L)`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
}

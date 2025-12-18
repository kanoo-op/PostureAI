'use client';

import React from 'react';
import { PLAYBACK_CONTROL_COLORS, PLAYBACK_SPEEDS } from './constants';
import type { PlaybackSpeed } from './types';

interface PlaybackRateIndicatorProps {
  currentSpeed: PlaybackSpeed;
  isPlaying: boolean;
  showLabel?: boolean;
}

export default function PlaybackRateIndicator({
  currentSpeed,
  isPlaying,
  showLabel = true,
}: PlaybackRateIndicatorProps) {
  const speedOption = PLAYBACK_SPEEDS.find((s) => s.value === currentSpeed);
  const isSlowMo = speedOption?.isSlowMo ?? false;
  const isFast = currentSpeed > 1;

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
      style={{
        backgroundColor: isSlowMo
          ? PLAYBACK_CONTROL_COLORS.frameStepBg
          : isFast
            ? 'rgba(255, 184, 0, 0.1)'
            : PLAYBACK_CONTROL_COLORS.backgroundElevated,
        border: `1px solid ${
          isSlowMo
            ? PLAYBACK_CONTROL_COLORS.frameStepBorder
            : isFast
              ? PLAYBACK_CONTROL_COLORS.accentWarning
              : PLAYBACK_CONTROL_COLORS.border
        }`,
      }}
    >
      {/* Speed icon */}
      {isSlowMo ? (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke={PLAYBACK_CONTROL_COLORS.accentSuccess}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ) : isFast ? (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke={PLAYBACK_CONTROL_COLORS.accentWarning}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ) : null}

      {/* Speed value */}
      {showLabel && (
        <span
          className="text-sm font-semibold"
          style={{
            color: isSlowMo
              ? PLAYBACK_CONTROL_COLORS.accentSuccess
              : isFast
                ? PLAYBACK_CONTROL_COLORS.accentWarning
                : PLAYBACK_CONTROL_COLORS.textPrimary,
          }}
        >
          {currentSpeed}x
        </span>
      )}

      {/* Playing indicator */}
      {isPlaying && (
        <span
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: PLAYBACK_CONTROL_COLORS.accentSuccess }}
        />
      )}
    </div>
  );
}

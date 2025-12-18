'use client';

import React from 'react';
import { PLAYBACK_SPEEDS, PLAYBACK_CONTROL_COLORS, TRANSLATIONS } from './constants';
import type { PlaybackSpeed } from './types';

interface PlaybackSpeedSelectorProps {
  currentSpeed: PlaybackSpeed;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  language: 'ko' | 'en';
  variant?: 'dropdown' | 'buttons';
}

export default function PlaybackSpeedSelector({
  currentSpeed,
  onSpeedChange,
  language,
  variant = 'buttons',
}: PlaybackSpeedSelectorProps) {
  const t = TRANSLATIONS[language];

  if (variant === 'dropdown') {
    return (
      <div className="flex items-center gap-2">
        <span
          className="text-sm"
          style={{ color: PLAYBACK_CONTROL_COLORS.textMuted }}
        >
          {t.speed}
        </span>
        <select
          value={currentSpeed}
          onChange={(e) => onSpeedChange(Number(e.target.value) as PlaybackSpeed)}
          className="px-3 py-1.5 rounded-lg text-sm cursor-pointer focus:outline-none focus:ring-2"
          style={{
            backgroundColor: PLAYBACK_CONTROL_COLORS.backgroundElevated,
            color: PLAYBACK_CONTROL_COLORS.textPrimary,
            border: `1px solid ${PLAYBACK_CONTROL_COLORS.border}`,
          }}
          aria-label={t.playbackRate}
        >
          {PLAYBACK_SPEEDS.map((speed) => (
            <option key={speed.value} value={speed.value}>
              {speed.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Button variant with segmented control style
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={t.playbackRate}>
      {PLAYBACK_SPEEDS.map((speed) => {
        const isActive = speed.value === currentSpeed;
        return (
          <button
            key={speed.value}
            onClick={() => onSpeedChange(speed.value)}
            className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
            style={{
              backgroundColor: isActive
                ? PLAYBACK_CONTROL_COLORS.speedActive
                : 'transparent',
              color: isActive
                ? PLAYBACK_CONTROL_COLORS.background
                : PLAYBACK_CONTROL_COLORS.textSecondary,
              border: `1px solid ${isActive ? PLAYBACK_CONTROL_COLORS.speedActive : PLAYBACK_CONTROL_COLORS.border}`,
            }}
            role="radio"
            aria-checked={isActive}
            aria-label={`${speed.label} ${speed.isSlowMo ? t.slowMotion : ''}`}
          >
            {speed.label}
          </button>
        );
      })}
    </div>
  );
}

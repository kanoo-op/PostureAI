'use client';

import React from 'react';

// Design tokens
const COLORS = {
  primary: '#0284c7',
  timelineTrack: 'rgba(75, 85, 99, 0.5)',
  voiceActive: '#00F5A0',
  borderActive: 'rgba(0, 245, 160, 0.5)',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
};

interface VoiceVolumeSliderProps {
  volume: number; // 0-1
  onVolumeChange: (volume: number) => void;
  disabled?: boolean;
  isActive?: boolean;
}

export function VoiceVolumeSlider({
  volume,
  onVolumeChange,
  disabled = false,
  isActive = false,
}: VoiceVolumeSliderProps) {
  const percentage = volume * 100;

  const getVolumeIcon = () => {
    if (volume === 0) {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M11 5L6 9H2v6h4l5 4V5z"
            stroke={COLORS.textSecondary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="23"
            y1="9"
            x2="17"
            y2="15"
            stroke={COLORS.textSecondary}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="17"
            y1="9"
            x2="23"
            y2="15"
            stroke={COLORS.textSecondary}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    }
    if (volume < 0.5) {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M11 5L6 9H2v6h4l5 4V5z"
            stroke={isActive ? COLORS.voiceActive : COLORS.textSecondary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15.54 8.46a5 5 0 010 7.07"
            stroke={isActive ? COLORS.voiceActive : COLORS.textSecondary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M11 5L6 9H2v6h4l5 4V5z"
          stroke={isActive ? COLORS.voiceActive : COLORS.textSecondary}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"
          stroke={isActive ? COLORS.voiceActive : COLORS.textSecondary}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      {getVolumeIcon()}

      <div style={{ flex: 1, position: 'relative' }}>
        {/* Track background */}
        <div
          style={{
            height: '6px',
            backgroundColor: COLORS.timelineTrack,
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          {/* Fill */}
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              backgroundColor: COLORS.primary,
              borderRadius: '3px',
              transition: 'width 0.1s ease',
            }}
          />
        </div>

        {/* Range input overlay */}
        <input
          type="range"
          min="0"
          max="100"
          value={percentage}
          onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
          disabled={disabled}
          aria-label="Voice volume"
          style={{
            position: 'absolute',
            top: '-6px',
            left: 0,
            width: '100%',
            height: '18px',
            opacity: 0,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        />

        {/* Thumb indicator */}
        <div
          style={{
            position: 'absolute',
            top: '-3px',
            left: `calc(${percentage}% - 6px)`,
            width: '12px',
            height: '12px',
            backgroundColor: COLORS.textPrimary,
            border: `2px solid ${isActive ? COLORS.voiceActive : COLORS.primary}`,
            borderRadius: '50%',
            transition: 'left 0.1s ease',
            pointerEvents: 'none',
          }}
        />
      </div>

      <span
        style={{
          fontSize: '12px',
          color: COLORS.textSecondary,
          minWidth: '36px',
          textAlign: 'right',
        }}
      >
        {Math.round(percentage)}%
      </span>
    </div>
  );
}

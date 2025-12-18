'use client';

import React from 'react';

// Design tokens
const COLORS = {
  primary: '#0284c7',
  voiceActive: '#00F5A0',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  borderDefault: 'rgba(75, 85, 99, 0.3)',
  surface: 'rgba(30, 41, 59, 0.95)',
};

interface PlaybackRateSyncProps {
  enabled: boolean;
  onToggle: () => void;
  currentSpeechRate?: number;
  minRate: number;
  maxRate: number;
  disabled?: boolean;
}

export function PlaybackRateSync({
  enabled,
  onToggle,
  currentSpeechRate = 1.0,
  minRate,
  maxRate,
  disabled = false,
}: PlaybackRateSyncProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        backgroundColor: COLORS.surface,
        border: `1px solid ${COLORS.borderDefault}`,
        borderRadius: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Sync icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M21 2v6h-6M3 22v-6h6"
              stroke={enabled ? COLORS.voiceActive : COLORS.textMuted}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3 12a9 9 0 0115.5-6.4L21 8M21 12a9 9 0 01-15.5 6.4L3 16"
              stroke={enabled ? COLORS.voiceActive : COLORS.textMuted}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontSize: '13px',
              color: COLORS.textPrimary,
            }}
          >
            Sync to Playback
          </span>
        </div>

        <button
          onClick={onToggle}
          disabled={disabled}
          aria-pressed={enabled}
          style={{
            width: '36px',
            height: '20px',
            backgroundColor: enabled ? COLORS.voiceActive : COLORS.textMuted,
            border: 'none',
            borderRadius: '10px',
            position: 'relative',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s ease',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              backgroundColor: COLORS.textPrimary,
              borderRadius: '50%',
              position: 'absolute',
              top: '2px',
              left: enabled ? '18px' : '2px',
              transition: 'left 0.2s ease',
            }}
          />
        </button>
      </div>

      {/* Rate display */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px',
          backgroundColor: 'rgba(17, 24, 39, 0.5)',
          borderRadius: '6px',
        }}
      >
        <span style={{ fontSize: '11px', color: COLORS.textMuted }}>
          {minRate}x
        </span>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: enabled ? COLORS.voiceActive : COLORS.textSecondary,
          }}
        >
          {currentSpeechRate.toFixed(1)}x
        </span>
        <span style={{ fontSize: '11px', color: COLORS.textMuted }}>
          {maxRate}x
        </span>
      </div>
    </div>
  );
}

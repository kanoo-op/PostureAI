'use client';

import React from 'react';

// Design tokens
const COLORS = {
  voiceActive: '#00F5A0',
  voiceActiveGlow: 'rgba(0, 245, 160, 0.4)',
  textMuted: '#64748B',
  borderDefault: 'rgba(75, 85, 99, 0.3)',
  borderActive: 'rgba(0, 245, 160, 0.5)',
  surface: 'rgba(30, 41, 59, 0.95)',
  textPrimary: '#FFFFFF',
};

interface VoiceFeedbackToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function VoiceFeedbackToggle({ isEnabled, onToggle, disabled = false }: VoiceFeedbackToggleProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-label={isEnabled ? 'Disable voice feedback' : 'Enable voice feedback'}
      aria-pressed={isEnabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        backgroundColor: isEnabled ? 'rgba(0, 245, 160, 0.1)' : COLORS.surface,
        border: `1px solid ${isEnabled ? COLORS.borderActive : COLORS.borderDefault}`,
        borderRadius: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.5 : 1,
        boxShadow: isEnabled ? `0 0 12px ${COLORS.voiceActiveGlow}` : 'none',
      }}
    >
      {/* Voice icon */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
          stroke={isEnabled ? COLORS.voiceActive : COLORS.textMuted}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19 10v2a7 7 0 01-14 0v-2"
          stroke={isEnabled ? COLORS.voiceActive : COLORS.textMuted}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="12"
          y1="19"
          x2="12"
          y2="23"
          stroke={isEnabled ? COLORS.voiceActive : COLORS.textMuted}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="8"
          y1="23"
          x2="16"
          y2="23"
          stroke={isEnabled ? COLORS.voiceActive : COLORS.textMuted}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      <span
        style={{
          color: isEnabled ? COLORS.voiceActive : COLORS.textMuted,
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        {isEnabled ? 'Voice On' : 'Voice Off'}
      </span>

      {/* Toggle indicator */}
      <div
        style={{
          width: '36px',
          height: '20px',
          backgroundColor: isEnabled ? COLORS.voiceActive : COLORS.textMuted,
          borderRadius: '10px',
          position: 'relative',
          transition: 'background-color 0.2s ease',
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
            left: isEnabled ? '18px' : '2px',
            transition: 'left 0.2s ease',
          }}
        />
      </div>
    </button>
  );
}

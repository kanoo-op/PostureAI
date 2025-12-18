'use client';

import React from 'react';

// Design tokens
const COLORS = {
  voiceActive: '#00F5A0',
  voiceActiveGlow: 'rgba(0, 245, 160, 0.4)',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  surface: 'rgba(30, 41, 59, 0.95)',
  borderActive: 'rgba(0, 245, 160, 0.5)',
};

interface CurrentlySpeakingIndicatorProps {
  isSpeaking: boolean;
  currentMessage: string | null;
  repNumber?: number | null;
  onSkip?: () => void;
}

export function CurrentlySpeakingIndicator({
  isSpeaking,
  currentMessage,
  repNumber,
  onSkip,
}: CurrentlySpeakingIndicatorProps) {
  if (!isSpeaking || !currentMessage) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: COLORS.surface,
        border: `1px solid ${COLORS.borderActive}`,
        borderRadius: '10px',
        boxShadow: `0 0 16px ${COLORS.voiceActiveGlow}`,
        animation: 'pulse 2s infinite',
      }}
    >
      {/* Sound wave animation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          minWidth: '24px',
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              width: '3px',
              backgroundColor: COLORS.voiceActive,
              borderRadius: '2px',
              animation: `soundWave 0.5s ease-in-out infinite`,
              animationDelay: `${i * 0.1}s`,
              height: '16px',
            }}
          />
        ))}
      </div>

      {/* Message content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {repNumber && (
          <span
            style={{
              fontSize: '11px',
              color: COLORS.voiceActive,
              fontWeight: 600,
              marginRight: '8px',
            }}
          >
            Rep {repNumber}
          </span>
        )}
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: COLORS.textPrimary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {currentMessage}
        </p>
      </div>

      {/* Skip button */}
      {onSkip && (
        <button
          onClick={onSkip}
          aria-label="Skip current feedback"
          style={{
            padding: '6px 10px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '6px',
            color: COLORS.textSecondary,
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
          }}
        >
          Skip
        </button>
      )}

      <style>{`
        @keyframes soundWave {
          0%, 100% {
            height: 8px;
          }
          50% {
            height: 16px;
          }
        }
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 16px ${COLORS.voiceActiveGlow};
          }
          50% {
            box-shadow: 0 0 24px ${COLORS.voiceActiveGlow};
          }
        }
      `}</style>
    </div>
  );
}

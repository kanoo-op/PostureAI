'use client';

import React from 'react';
import type { AudioLanguage } from '@/types/audioFeedback';

// Design tokens
const COLORS = {
  voiceActive: '#00F5A0',
  voiceActiveGlow: 'rgba(0, 245, 160, 0.4)',
  voicePaused: '#FFB800',
  voicePausedGlow: 'rgba(255, 184, 0, 0.4)',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  surface: 'rgba(30, 41, 59, 0.95)',
  borderDefault: 'rgba(75, 85, 99, 0.3)',
  primary: '#0284c7',
};

interface VoiceFeedbackStatusBarProps {
  isInitialized: boolean;
  isEnabled: boolean;
  isSpeaking: boolean;
  queueCount: number;
  language: AudioLanguage;
  isAutoPaused?: boolean;
}

export function VoiceFeedbackStatusBar({
  isInitialized,
  isEnabled,
  isSpeaking,
  queueCount,
  language,
  isAutoPaused = false,
}: VoiceFeedbackStatusBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 12px',
        backgroundColor: COLORS.surface,
        border: `1px solid ${COLORS.borderDefault}`,
        borderRadius: '8px',
      }}
    >
      {/* Initialization status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isInitialized
              ? isAutoPaused
                ? COLORS.voicePaused
                : COLORS.voiceActive
              : COLORS.textMuted,
            boxShadow: isInitialized && !isAutoPaused
              ? `0 0 6px ${COLORS.voiceActiveGlow}`
              : isAutoPaused
                ? `0 0 6px ${COLORS.voicePausedGlow}`
                : 'none',
          }}
        />
        <span
          style={{
            fontSize: '12px',
            color: COLORS.textSecondary,
          }}
        >
          {isInitialized ? (isAutoPaused ? 'Paused' : 'Ready') : 'Not initialized'}
        </span>
      </div>

      {/* Divider */}
      <div
        style={{
          width: '1px',
          height: '16px',
          backgroundColor: COLORS.borderDefault,
        }}
      />

      {/* Speaking indicator */}
      {isEnabled && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isSpeaking ? (
              <>
                {/* Animated sound bars */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: '2px',
                        backgroundColor: COLORS.voiceActive,
                        borderRadius: '1px',
                        animation: `soundBar 0.4s ease-in-out infinite`,
                        animationDelay: `${i * 0.1}s`,
                        height: '10px',
                      }}
                    />
                  ))}
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    color: COLORS.voiceActive,
                  }}
                >
                  Speaking
                </span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
                    stroke={COLORS.textMuted}
                    strokeWidth="2"
                  />
                  <path
                    d="M19 10v2a7 7 0 01-14 0v-2"
                    stroke={COLORS.textMuted}
                    strokeWidth="2"
                  />
                </svg>
                <span
                  style={{
                    fontSize: '12px',
                    color: COLORS.textMuted,
                  }}
                >
                  Idle
                </span>
              </>
            )}
          </div>

          {/* Divider */}
          <div
            style={{
              width: '1px',
              height: '16px',
              backgroundColor: COLORS.borderDefault,
            }}
          />
        </>
      )}

      {/* Queue count badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="4" width="18" height="4" rx="1" stroke={COLORS.textMuted} strokeWidth="2" />
          <rect x="3" y="10" width="18" height="4" rx="1" stroke={COLORS.textMuted} strokeWidth="2" />
          <rect x="3" y="16" width="18" height="4" rx="1" stroke={COLORS.textMuted} strokeWidth="2" />
        </svg>
        <span
          style={{
            fontSize: '12px',
            color: queueCount > 0 ? COLORS.textSecondary : COLORS.textMuted,
          }}
        >
          {queueCount}
        </span>
      </div>

      {/* Divider */}
      <div
        style={{
          width: '1px',
          height: '16px',
          backgroundColor: COLORS.borderDefault,
        }}
      />

      {/* Language indicator */}
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          padding: '2px 6px',
          backgroundColor: `${COLORS.primary}30`,
          color: COLORS.primary,
          borderRadius: '4px',
        }}
      >
        {language.toUpperCase()}
      </span>

      <style>{`
        @keyframes soundBar {
          0%, 100% {
            height: 4px;
          }
          50% {
            height: 10px;
          }
        }
      `}</style>
    </div>
  );
}

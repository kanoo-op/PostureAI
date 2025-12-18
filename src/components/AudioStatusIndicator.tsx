/**
 * AudioStatusIndicator Component
 * Compact indicator showing audio system status
 */

'use client';

import React from 'react';
import type { AudioFeedbackConfig, AudioFeedbackState } from '@/types/audioFeedback';

interface AudioStatusIndicatorProps {
  state: AudioFeedbackState;
  config: AudioFeedbackConfig;
  compact?: boolean;
}

// Design token colors
const COLORS = {
  statusGood: '#00F5A0',
  audioMuted: '#6B7280',
  audioSpeaking: '#00ddff',
  textPrimary: '#ffffff',
  textSecondary: '#9CA3AF',
};

export function AudioStatusIndicator({
  state,
  config,
  compact = false,
}: AudioStatusIndicatorProps) {
  // Determine status
  const getStatus = () => {
    if (!state.isInitialized) return 'uninitialized';
    if (!config.enabled) return 'disabled';
    if (state.isSpeaking) return 'speaking';
    return 'idle';
  };

  const status = getStatus();

  // Get color based on status
  const getColor = () => {
    switch (status) {
      case 'uninitialized':
      case 'disabled':
        return COLORS.audioMuted;
      case 'speaking':
        return COLORS.audioSpeaking;
      case 'idle':
        return COLORS.statusGood;
    }
  };

  const color = getColor();

  // Get label based on status
  const getLabel = () => {
    switch (status) {
      case 'uninitialized':
        return 'Audio Off';
      case 'disabled':
        return 'Muted';
      case 'speaking':
        return 'Speaking';
      case 'idle':
        return 'Audio On';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5" title={getLabel()}>
        {/* Icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            animation: status === 'speaking' ? 'pulse 1s infinite' : 'none',
          }}
        >
          {status === 'disabled' ? (
            // Muted icon
            <>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </>
          ) : (
            // Speaker icon with waves
            <>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              {(status === 'idle' || status === 'speaking') && (
                <>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  {status === 'speaking' && (
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  )}
                </>
              )}
            </>
          )}
        </svg>
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Indicator dot */}
      <div
        className="w-2.5 h-2.5 rounded-full transition-all"
        style={{
          backgroundColor: color,
          boxShadow: status === 'speaking' ? `0 0 8px ${color}` : 'none',
          animation: status === 'speaking' ? 'pulse 1s infinite' : 'none',
        }}
      />

      {/* Label */}
      <span
        style={{ color: COLORS.textSecondary }}
        className="text-xs font-medium"
      >
        {getLabel()}
      </span>

      {/* Queue indicator */}
      {state.queueLength > 0 && (
        <span
          className="text-xs px-1.5 py-0.5 rounded-full"
          style={{
            backgroundColor: COLORS.audioSpeaking,
            color: '#000000',
          }}
        >
          {state.queueLength}
        </span>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

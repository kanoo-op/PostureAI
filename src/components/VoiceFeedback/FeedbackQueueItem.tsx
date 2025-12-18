'use client';

import React from 'react';
import { FeedbackTypeIcon } from './FeedbackTypeIcon';
import type { AudioPriority } from '@/types/audioFeedback';

// Design tokens
const COLORS = {
  voicePending: '#38BDF8',
  voicePendingGlow: 'rgba(56, 189, 248, 0.3)',
  priorityCritical: '#FF3D71',
  priorityHigh: '#FFB800',
  priorityMedium: '#38BDF8',
  priorityLow: '#94A3B8',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  surface: 'rgba(30, 41, 59, 0.95)',
  borderDefault: 'rgba(75, 85, 99, 0.3)',
  repBoundary: '#7C3AED',
};

interface FeedbackQueueItemProps {
  id: string;
  type: 'correction' | 'rep_summary' | 'worst_moment' | 'critical_pause' | 'analysis_start' | 'analysis_end';
  priority: AudioPriority;
  content: string;
  videoTimestamp: number;
  repNumber?: number;
  isRepSummary: boolean;
  feedbackLevel: 'good' | 'warning' | 'error' | 'info';
  isNext?: boolean;
  videoDuration?: number;
}

function getPriorityColor(priority: AudioPriority): string {
  switch (priority) {
    case 'critical':
      return COLORS.priorityCritical;
    case 'high':
      return COLORS.priorityHigh;
    case 'medium':
      return COLORS.priorityMedium;
    case 'low':
    default:
      return COLORS.priorityLow;
  }
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function FeedbackQueueItem({
  type,
  priority,
  content,
  videoTimestamp,
  repNumber,
  isRepSummary,
  isNext = false,
}: FeedbackQueueItemProps) {
  const borderColor = isRepSummary ? COLORS.repBoundary : COLORS.voicePending;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '10px 12px',
        backgroundColor: isNext ? 'rgba(56, 189, 248, 0.1)' : COLORS.surface,
        border: `1px solid ${isNext ? borderColor : COLORS.borderDefault}`,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: '8px',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Icon */}
      <FeedbackTypeIcon type={type} priority={priority} size={16} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '4px',
          }}
        >
          {/* Timestamp and rep */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                color: COLORS.textSecondary,
              }}
            >
              {formatTime(videoTimestamp)}
            </span>
            {repNumber && (
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  backgroundColor: 'rgba(124, 58, 237, 0.2)',
                  color: COLORS.repBoundary,
                  borderRadius: '4px',
                  fontWeight: 600,
                }}
              >
                Rep {repNumber}
              </span>
            )}
          </div>

          {/* Priority badge */}
          <span
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              backgroundColor: `${getPriorityColor(priority)}20`,
              color: getPriorityColor(priority),
              borderRadius: '4px',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            {priority}
          </span>
        </div>

        {/* Message preview */}
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: COLORS.textPrimary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: '1.4',
          }}
        >
          {content}
        </p>
      </div>

      {/* Next indicator */}
      {isNext && (
        <div
          style={{
            width: '8px',
            height: '8px',
            backgroundColor: COLORS.voicePending,
            borderRadius: '50%',
            boxShadow: `0 0 8px ${COLORS.voicePendingGlow}`,
            animation: 'pulse 1.5s infinite',
          }}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}

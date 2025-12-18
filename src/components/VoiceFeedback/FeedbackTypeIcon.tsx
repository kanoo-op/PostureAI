'use client';

import React from 'react';
import type { AudioPriority } from '@/types/audioFeedback';

// Design tokens
const COLORS = {
  priorityCritical: '#FF3D71',
  priorityHigh: '#FFB800',
  priorityMedium: '#38BDF8',
  priorityLow: '#94A3B8',
  voiceActive: '#00F5A0',
  repBoundary: '#7C3AED',
};

interface FeedbackTypeIconProps {
  type: 'correction' | 'rep_summary' | 'worst_moment' | 'critical_pause' | 'analysis_start' | 'analysis_end';
  priority?: AudioPriority;
  size?: number;
  className?: string;
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

export function FeedbackTypeIcon({ type, priority = 'medium', size = 16, className }: FeedbackTypeIconProps) {
  const color = type === 'rep_summary' ? COLORS.repBoundary : getPriorityColor(priority);

  const renderIcon = () => {
    switch (type) {
      case 'correction':
        // Warning triangle
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );

      case 'rep_summary':
        // Checkmark circle
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M22 11.08V12a10 10 0 11-5.93-9.14"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M22 4L12 14.01l-3-3"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );

      case 'worst_moment':
        // Exclamation mark
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
            <line x1="12" y1="8" x2="12" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1" fill={color} />
          </svg>
        );

      case 'critical_pause':
        // Alert octagon
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line x1="12" y1="8" x2="12" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1" fill={color} />
          </svg>
        );

      case 'analysis_start':
        // Play icon
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
            <polygon points="10,8 16,12 10,16" fill={color} />
          </svg>
        );

      case 'analysis_end':
        // Stop/complete icon
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
            <rect x="9" y="9" width="6" height="6" fill={color} rx="1" />
          </svg>
        );

      default:
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
          </svg>
        );
    }
  };

  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {renderIcon()}
    </span>
  );
}

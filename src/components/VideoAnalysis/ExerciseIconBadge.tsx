'use client';

import React from 'react';
import type { VideoExerciseType } from '@/types/video';
import { DETECTION_COLORS } from './constants';

interface Props {
  exerciseType: VideoExerciseType;
  size?: 'sm' | 'md' | 'lg';
}

export default function ExerciseIconBadge({ exerciseType, size = 'md' }: Props) {
  const getColor = () => {
    switch (exerciseType) {
      case 'squat':
        return DETECTION_COLORS.exerciseSquat;
      case 'pushup':
        return DETECTION_COLORS.exercisePushup;
      case 'lunge':
        return DETECTION_COLORS.exerciseLunge;
      case 'deadlift':
        return DETECTION_COLORS.exerciseDeadlift;
      case 'plank':
        return DETECTION_COLORS.exercisePlank;
      default:
        return '#6b7280';
    }
  };

  const getIcon = () => {
    switch (exerciseType) {
      case 'squat':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="5" r="2" />
            <path d="M12 7v4" />
            <path d="M8 17l4-6 4 6" />
            <path d="M6 21h4" />
            <path d="M14 21h4" />
          </svg>
        );
      case 'pushup':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="4" cy="12" r="2" />
            <path d="M6 12h14" />
            <path d="M8 16l-2-4" />
            <path d="M16 16l2-4" />
            <path d="M10 8l2 4" />
            <path d="M14 8l-2 4" />
          </svg>
        );
      case 'lunge':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="4" r="2" />
            <path d="M12 6v5" />
            <path d="M8 11l4 4 4-4" />
            <path d="M6 19l6-4" />
            <path d="M18 19l-6-4" />
          </svg>
        );
      case 'deadlift':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="4" r="2" />
            <path d="M12 6v4" />
            <path d="M8 10h8" />
            <path d="M8 10l-2 8" />
            <path d="M16 10l2 8" />
            <rect x="6" y="18" width="12" height="2" rx="1" />
          </svg>
        );
      case 'plank':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="4" cy="12" r="2" />
            <path d="M6 12h16" />
            <path d="M8 16l-2-4" />
            <path d="M20 16l-2-4" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 8v4" />
            <circle cx="12" cy="16" r="1" fill="currentColor" />
          </svg>
        );
    }
  };

  const sizes = {
    sm: 'w-6 h-6 p-1',
    md: 'w-10 h-10 p-2',
    lg: 'w-12 h-12 p-2.5',
  };

  const color = getColor();

  return (
    <div
      className={`${sizes[size]} rounded-lg flex items-center justify-center`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
      }}
    >
      {getIcon()}
    </div>
  );
}

'use client';

import React from 'react';
import { VIDEO_ANALYSIS_COLORS } from '@/components/VideoAnalysisView/constants';
import { SESSION_HISTORY_TRANSLATIONS } from './translations';
import type { VideoExerciseType } from '@/types/video';

interface ExerciseTypeFilterProps {
  value: VideoExerciseType | 'all';
  onChange: (value: VideoExerciseType | 'all') => void;
  language: 'ko' | 'en';
}

const EXERCISE_TYPES: (VideoExerciseType | 'all')[] = [
  'all',
  'squat',
  'lunge',
  'deadlift',
  'pushup',
  'plank',
];

export function ExerciseTypeFilter({
  value,
  onChange,
  language,
}: ExerciseTypeFilterProps) {
  const t = SESSION_HISTORY_TRANSLATIONS[language];

  const getLabel = (type: VideoExerciseType | 'all'): string => {
    if (type === 'all') return t.filterAll;
    return t[type] || type;
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {EXERCISE_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
          style={{
            backgroundColor:
              value === type
                ? VIDEO_ANALYSIS_COLORS.primary
                : VIDEO_ANALYSIS_COLORS.surface,
            color:
              value === type
                ? VIDEO_ANALYSIS_COLORS.background
                : VIDEO_ANALYSIS_COLORS.textSecondary,
            border: `1px solid ${value === type ? VIDEO_ANALYSIS_COLORS.primary : VIDEO_ANALYSIS_COLORS.border}`,
          }}
        >
          {getLabel(type)}
        </button>
      ))}
    </div>
  );
}

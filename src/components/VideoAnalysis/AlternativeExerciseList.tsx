'use client';

import React from 'react';
import type { AlternativeExercise } from '@/types/exerciseDetection';
import type { VideoExerciseType } from '@/types/video';
import ExerciseIconBadge from './ExerciseIconBadge';
import { ANALYSIS_COLORS, DETECTION_COLORS } from './constants';

const EXERCISE_NAMES: Record<string, string> = {
  squat: '스쿼트',
  pushup: '푸시업',
  lunge: '런지',
  deadlift: '데드리프트',
  plank: '플랭크',
  unknown: '알 수 없음'
};

interface Props {
  alternatives: AlternativeExercise[];
  onSelect: (type: VideoExerciseType) => void;
}

export default function AlternativeExerciseList({ alternatives, onSelect }: Props) {
  if (alternatives.length === 0) return null;

  return (
    <div className="space-y-2">
      <p
        className="text-sm"
        style={{ color: ANALYSIS_COLORS.textSecondary }}
      >
        다른 가능한 운동:
      </p>
      <div className="flex flex-wrap gap-2">
        {alternatives.map((alt) => {
          const confidencePercent = Math.round(alt.confidence * 100);
          return (
            <button
              key={alt.type}
              onClick={() => onSelect(alt.type)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-105"
              style={{
                backgroundColor: ANALYSIS_COLORS.surfaceElevated,
                border: `1px solid ${ANALYSIS_COLORS.border}`,
              }}
            >
              <ExerciseIconBadge exerciseType={alt.type} size="sm" />
              <span
                className="text-sm"
                style={{ color: ANALYSIS_COLORS.textPrimary }}
              >
                {EXERCISE_NAMES[alt.type]}
              </span>
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${DETECTION_COLORS.confidenceMedium}20`,
                  color: DETECTION_COLORS.confidenceMedium,
                }}
              >
                {confidencePercent}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

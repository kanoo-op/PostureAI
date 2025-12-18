'use client';

import React from 'react';
import type { DetectionState } from '@/types/exerciseDetection';
import type { VideoExerciseType } from '@/types/video';
import DetectionProgressIndicator from './DetectionProgressIndicator';
import ExerciseConfidenceCard from './ExerciseConfidenceCard';
import DetectionStatusBanner from './DetectionStatusBanner';
import DetectionTimeoutOverlay from './DetectionTimeoutOverlay';
import { ANALYSIS_COLORS } from './constants';

interface Props {
  state: DetectionState;
  onConfirm: (exerciseType: VideoExerciseType) => void;
  onChangeExercise: () => void;
  onRetry: () => void;
}

export default function ExerciseDetectionContainer({
  state,
  onConfirm,
  onChangeExercise,
  onRetry
}: Props) {
  if (state.status === 'analyzing') {
    return (
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: ANALYSIS_COLORS.surface,
          border: `1px solid ${ANALYSIS_COLORS.border}`,
        }}
      >
        <DetectionProgressIndicator
          progress={state.progress}
          label="운동 유형 감지 중..."
        />
      </div>
    );
  }

  if (state.status === 'timeout') {
    return (
      <DetectionTimeoutOverlay
        onRetry={onRetry}
        onManualSelect={onChangeExercise}
      />
    );
  }

  if (state.status === 'error') {
    return (
      <DetectionStatusBanner
        status="error"
        error={state.error}
      />
    );
  }

  if (state.status === 'completed' && state.result) {
    return (
      <ExerciseConfidenceCard
        result={state.result}
        onConfirm={() => onConfirm(state.result!.detectedType)}
        onChangeExercise={onChangeExercise}
      />
    );
  }

  return null;
}

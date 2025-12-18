'use client';

import React from 'react';
import type { ExerciseDetectionResult } from '@/types/exerciseDetection';
import DetectionConfidenceMeter from './DetectionConfidenceMeter';
import ExerciseIconBadge from './ExerciseIconBadge';
import AlternativeExerciseList from './AlternativeExerciseList';
import ConfirmDetectionButton from './ConfirmDetectionButton';
import ChangeExerciseButton from './ChangeExerciseButton';
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
  result: ExerciseDetectionResult;
  onConfirm: () => void;
  onChangeExercise: () => void;
}

export default function ExerciseConfidenceCard({ result, onConfirm, onChangeExercise }: Props) {
  const confidencePercent = Math.round(result.confidence * 100);
  const isHighConfidence = confidencePercent >= 70;

  const getConfidenceColor = () => {
    if (confidencePercent >= 70) return DETECTION_COLORS.confidenceHigh;
    if (confidencePercent >= 50) return DETECTION_COLORS.confidenceMedium;
    return DETECTION_COLORS.confidenceLow;
  };

  return (
    <div
      className="rounded-xl p-6 space-y-4"
      style={{
        backgroundColor: ANALYSIS_COLORS.surface,
        border: `1px solid ${ANALYSIS_COLORS.border}`,
      }}
    >
      {/* Detected exercise header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ExerciseIconBadge exerciseType={result.detectedType} size="lg" />
          <div>
            <p style={{ color: ANALYSIS_COLORS.textSecondary }} className="text-sm">
              감지된 운동
            </p>
            <h3 style={{ color: ANALYSIS_COLORS.textPrimary }} className="text-xl font-bold">
              {EXERCISE_NAMES[result.detectedType]}
            </h3>
          </div>
        </div>
        <DetectionConfidenceMeter confidence={confidencePercent} />
      </div>

      {/* Confidence label */}
      <div
        className="text-center py-2 rounded-lg"
        style={{
          backgroundColor: `${getConfidenceColor()}20`,
          color: getConfidenceColor()
        }}
      >
        {isHighConfidence ? '높은 신뢰도' : confidencePercent >= 50 ? '중간 신뢰도' : '낮은 신뢰도'}
        {' - '}{confidencePercent}%
      </div>

      {/* Alternative exercises if low confidence */}
      {!isHighConfidence && result.alternatives.length > 0 && (
        <AlternativeExerciseList
          alternatives={result.alternatives}
          onSelect={() => onChangeExercise()}
        />
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <ConfirmDetectionButton
          onClick={onConfirm}
          isHighConfidence={isHighConfidence}
        />
        <ChangeExerciseButton onClick={onChangeExercise} />
      </div>
    </div>
  );
}

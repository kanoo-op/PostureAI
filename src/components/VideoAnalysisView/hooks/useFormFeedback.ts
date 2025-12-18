'use client';

import { useMemo } from 'react';
import type { VideoRepAnalysisResult } from '@/types/video';
import type { AngleMeasurement } from '../types';

interface FormIssue {
  type: string;
  severity: 'good' | 'warning' | 'error';
  message: string;
}

export function useFormFeedback(
  currentTimestamp: number, // in milliseconds
  repAnalysisResult: VideoRepAnalysisResult | null,
  currentRepIndex: number | null
) {
  const issues = useMemo<FormIssue[]>(() => {
    if (!repAnalysisResult || currentRepIndex === null) return [];

    const currentRep = repAnalysisResult.reps[currentRepIndex];
    if (!currentRep) return [];

    // Get issues from the worst moment if current time is near it
    const worstMomentThreshold = 500; // 500ms window
    const isNearWorstMoment =
      Math.abs(currentTimestamp - currentRep.worstMoment.timestamp) <
      worstMomentThreshold;

    if (isNearWorstMoment) {
      return currentRep.worstMoment.feedbacks.map((msg) => ({
        type: 'form_issue',
        severity: currentRep.worstMoment.score < 60 ? 'error' : 'warning',
        message: msg,
      }));
    }

    // Return primary issues for the rep
    return currentRep.primaryIssues.map((msg) => ({
      type: 'form_issue',
      severity: 'warning',
      message: msg,
    }));
  }, [currentTimestamp, repAnalysisResult, currentRepIndex]);

  // Placeholder for angle measurements (would need pose data integration)
  const angleMeasurements = useMemo<AngleMeasurement[]>(() => {
    // This would be populated from actual pose analysis
    return [];
  }, []);

  return { issues, angleMeasurements };
}

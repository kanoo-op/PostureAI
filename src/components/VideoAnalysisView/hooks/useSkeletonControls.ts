'use client';

import { useState, useCallback, useMemo } from 'react';
import type { SkeletonControlState, SkeletonViewMode, ProblematicJoint } from '../types';
import type { VideoRepAnalysisResult } from '@/types/video';

const DEFAULT_STATE: SkeletonControlState = {
  viewMode: 'side-by-side',
  opacity: 1.0,
  showJointAngles: false,
  focusModeEnabled: false,
};

export function useSkeletonControls(
  repAnalysisResult: VideoRepAnalysisResult | null,
  currentRepIndex: number | null,
  currentTimestamp: number
) {
  const [state, setState] = useState<SkeletonControlState>(DEFAULT_STATE);

  const setViewMode = useCallback((mode: SkeletonViewMode) => {
    setState(prev => ({ ...prev, viewMode: mode }));
  }, []);

  const setOpacity = useCallback((opacity: number) => {
    // Clamp between 0.25 and 1.0
    const clamped = Math.max(0.25, Math.min(1.0, opacity));
    setState(prev => ({ ...prev, opacity: clamped }));
  }, []);

  const toggleJointAngles = useCallback(() => {
    setState(prev => ({ ...prev, showJointAngles: !prev.showJointAngles }));
  }, []);

  const toggleFocusMode = useCallback(() => {
    setState(prev => ({ ...prev, focusModeEnabled: !prev.focusModeEnabled }));
  }, []);

  // Derive problematic joints from current rep analysis
  const problematicJoints = useMemo<ProblematicJoint[]>(() => {
    if (!repAnalysisResult || currentRepIndex === null) return [];

    const currentRep = repAnalysisResult.reps[currentRepIndex];
    if (!currentRep) return [];

    const joints: ProblematicJoint[] = [];

    // Parse feedback messages to identify problematic joints
    const jointKeywords: Record<string, { index: number; name: string }> = {
      'knee': { index: 25, name: 'left_knee' },
      'knees': { index: 25, name: 'left_knee' },
      '무릎': { index: 25, name: 'left_knee' },
      'hip': { index: 23, name: 'left_hip' },
      'hips': { index: 23, name: 'left_hip' },
      '엉덩이': { index: 23, name: 'left_hip' },
      '골반': { index: 23, name: 'left_hip' },
      'shoulder': { index: 11, name: 'left_shoulder' },
      'shoulders': { index: 11, name: 'left_shoulder' },
      '어깨': { index: 11, name: 'left_shoulder' },
      'ankle': { index: 27, name: 'left_ankle' },
      '발목': { index: 27, name: 'left_ankle' },
      'back': { index: 11, name: 'left_shoulder' },
      '등': { index: 11, name: 'left_shoulder' },
      '허리': { index: 23, name: 'left_hip' },
      'elbow': { index: 13, name: 'left_elbow' },
      '팔꿈치': { index: 13, name: 'left_elbow' },
    };

    const feedbacks = currentRep.worstMoment.feedbacks;
    const severity = currentRep.worstMoment.score < 60 ? 'error' : 'warning';

    feedbacks.forEach(feedback => {
      const lowerFeedback = feedback.toLowerCase();
      Object.entries(jointKeywords).forEach(([keyword, jointInfo]) => {
        if (lowerFeedback.includes(keyword)) {
          // Avoid duplicates
          if (!joints.find(j => j.jointIndex === jointInfo.index)) {
            joints.push({
              jointIndex: jointInfo.index,
              jointName: jointInfo.name,
              severity,
              message: feedback,
            });
          }
        }
      });
    });

    return joints;
  }, [repAnalysisResult, currentRepIndex]);

  return {
    ...state,
    setViewMode,
    setOpacity,
    toggleJointAngles,
    toggleFocusMode,
    problematicJoints,
    hasProblems: problematicJoints.length > 0,
  };
}

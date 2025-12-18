/**
 * React Hook for Integrated Velocity-Angle Analysis
 * Orchestrates velocity tracking and angle analysis for movement quality
 */

import { useState, useCallback, useRef } from 'react';
import type { Keypoint } from '@tensorflow-models/pose-detection';
import { useVelocityTracking } from './useVelocityTracking';
import {
  createIntegratedAnalyzerState,
  analyzeIntegrated,
} from '@/utils/integratedVelocityAngleAnalyzer';
import type {
  IntegratedAnalysisResult,
  IntegratedAnalyzerState,
  MovementQuality,
} from '@/types/integratedAnalysis';
import type { VelocityAnalysisResult } from '@/types/velocity';

interface UseIntegratedAnalysisOptions {
  exerciseType: 'squat' | 'deadlift' | 'pushup' | 'lunge' | 'plank';
  enabled?: boolean;
}

interface UseIntegratedAnalysisReturn {
  integratedResult: IntegratedAnalysisResult | null;
  velocityResult: VelocityAnalysisResult | null;
  movementQuality: MovementQuality;
  updateAnalysis: (keypoints: Keypoint[], currentAngles: Record<string, number>) => void;
  completeRep: () => void;
  reset: () => void;
}

export function useIntegratedAnalysis({
  exerciseType,
  enabled = true,
}: UseIntegratedAnalysisOptions): UseIntegratedAnalysisReturn {
  const [integratedResult, setIntegratedResult] = useState<IntegratedAnalysisResult | null>(null);
  const [movementQuality, setMovementQuality] = useState<MovementQuality>('controlled');

  const integratedStateRef = useRef<IntegratedAnalyzerState>(createIntegratedAnalyzerState());

  // Use existing velocity tracking hook
  const {
    result: velocityResult,
    updateVelocity,
    completeRep: completeVelocityRep,
    reset: resetVelocity,
  } = useVelocityTracking({ exerciseType, enabled });

  const updateAnalysis = useCallback(
    (keypoints: Keypoint[], currentAngles: Record<string, number>) => {
      if (!enabled) return;

      // Update velocity tracking first
      const velResult = updateVelocity(keypoints);

      if (!velResult) return;

      // Run integrated analysis
      const { result, newState } = analyzeIntegrated(
        currentAngles,
        velResult.joints,
        velResult.timestamp,
        velResult.currentPhase,
        integratedStateRef.current
      );

      integratedStateRef.current = newState;
      setIntegratedResult(result);
      setMovementQuality(result.movementQuality);
    },
    [enabled, updateVelocity]
  );

  const completeRep = useCallback(() => {
    completeVelocityRep();
  }, [completeVelocityRep]);

  const reset = useCallback(() => {
    resetVelocity();
    integratedStateRef.current = createIntegratedAnalyzerState();
    setIntegratedResult(null);
    setMovementQuality('controlled');
  }, [resetVelocity]);

  return {
    integratedResult,
    velocityResult,
    movementQuality,
    updateAnalysis,
    completeRep,
    reset,
  };
}

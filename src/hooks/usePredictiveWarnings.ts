/**
 * React Hook for Predictive Warnings
 * Combines angle data with prediction engine for real-time form breakdown prevention
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { AnglePredictionEngine } from '@/utils/anglePredictionEngine';
import type {
  PredictionConfig,
  PredictedAngle,
  AnglePredictionResult,
  PredictiveWarning,
} from '@/types/prediction';
import type { SquatAnalysisResult } from '@/utils/squatAnalyzer';

interface UsePredictiveWarningsOptions {
  enabled?: boolean;
  config?: Partial<PredictionConfig>;
}

interface UsePredictiveWarningsReturn {
  result: AnglePredictionResult | null;
  warnings: PredictiveWarning[];
  isReliable: boolean;
  updatePrediction: (analysisResult: SquatAnalysisResult, timestamp?: number) => AnglePredictionResult | null;
  reset: () => void;
}

export function usePredictiveWarnings({
  enabled = true,
  config = {},
}: UsePredictiveWarningsOptions = {}): UsePredictiveWarningsReturn {
  const [result, setResult] = useState<AnglePredictionResult | null>(null);

  const engineRef = useRef<AnglePredictionEngine | null>(null);

  // Initialize engine lazily
  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new AnglePredictionEngine(config);
    }
    return engineRef.current;
  }, [config]);

  /**
   * Update prediction from squat analysis result
   */
  const updatePrediction = useCallback(
    (analysisResult: SquatAnalysisResult, timestamp?: number): AnglePredictionResult | null => {
      if (!enabled) return null;

      const engine = getEngine();
      const ts = timestamp ?? performance.now();

      // Extract angles from analysis result
      const angles: Partial<Record<PredictedAngle, number>> = {
        leftKnee: analysisResult.rawAngles.leftKneeAngle,
        rightKnee: analysisResult.rawAngles.rightKneeAngle,
        leftHip: analysisResult.rawAngles.leftHipAngle,
        rightHip: analysisResult.rawAngles.rightHipAngle,
        torso: analysisResult.rawAngles.torsoAngle,
        leftAnkle: analysisResult.rawAngles.leftAnkleAngle,
        rightAnkle: analysisResult.rawAngles.rightAnkleAngle,
      };

      const predictionResult = engine.predict(angles, ts);
      setResult(predictionResult);
      return predictionResult;
    },
    [enabled, getEngine]
  );

  /**
   * Reset prediction state
   */
  const reset = useCallback(() => {
    engineRef.current?.reset();
    setResult(null);
  }, []);

  // Memoize warnings array
  const warnings = useMemo(() => result?.warnings ?? [], [result]);
  const isReliable = result?.isReliable ?? false;

  return {
    result,
    warnings,
    isReliable,
    updatePrediction,
    reset,
  };
}

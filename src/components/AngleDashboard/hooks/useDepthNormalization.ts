'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { Keypoint } from '@tensorflow-models/pose-detection';
import {
  DepthSmoother,
  DepthNormalizationConfig,
  DepthConfidenceResult,
  CalibrationState,
  AngleType,
  calculateDepthConfidence,
  calculatePerspectiveFactor,
  applyPerspectiveCorrection,
  detectTPose,
  performCalibration,
  createInitialCalibrationState,
  createConfigFromCalibration,
  DEFAULT_DEPTH_CONFIG,
} from '@/utils/depthNormalization';

export interface UseDepthNormalizationOptions {
  enabled?: boolean;
  config?: Partial<DepthNormalizationConfig>;
}

export interface UseDepthNormalizationResult {
  // State
  calibrationState: CalibrationState;
  depthConfidence: DepthConfidenceResult;
  perspectiveFactor: number;
  tPoseDetected: boolean;
  isCalibrating: boolean;

  // Actions
  startCalibration: () => void;
  cancelCalibration: () => void;
  resetCalibration: () => void;

  // Angle correction
  correctAngle: (rawAngle: number, angleType: AngleType) => number;

  // Update with new keypoints
  updateWithKeypoints: (keypoints: Keypoint[]) => void;
}

export function useDepthNormalization(
  options: UseDepthNormalizationOptions = {}
): UseDepthNormalizationResult {
  const { enabled = true, config: configOverrides } = options;

  // State
  const [calibrationState, setCalibrationState] = useState<CalibrationState>(
    createInitialCalibrationState()
  );
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [tPoseDetected, setTPoseDetected] = useState(false);
  const [depthConfidence, setDepthConfidence] = useState<DepthConfidenceResult>({
    score: 0,
    isReliable: false,
    fallbackMode: '2d',
    variance: 1,
    averageKeypointScore: 0,
  });
  const [perspectiveFactor, setPerspectiveFactor] = useState(1.0);

  // Refs
  const depthSmootherRef = useRef<DepthSmoother>(new DepthSmoother(0.3));
  const keypointsRef = useRef<Keypoint[]>([]);

  // Memoized config
  const config = useMemo(() => {
    return createConfigFromCalibration(calibrationState, {
      ...configOverrides,
      enabled,
    });
  }, [calibrationState, configOverrides, enabled]);

  // Update with new keypoints
  const updateWithKeypoints = useCallback((keypoints: Keypoint[]) => {
    keypointsRef.current = keypoints;

    if (!enabled || keypoints.length === 0) {
      return;
    }

    // Calculate depth confidence
    const confidence = calculateDepthConfidence(keypoints, config);
    setDepthConfidence(confidence);

    // Calculate perspective factor
    const perspective = calculatePerspectiveFactor(keypoints, config);
    setPerspectiveFactor(perspective.factor);

    // Check for T-pose during calibration
    if (isCalibrating) {
      const detected = detectTPose(keypoints);
      setTPoseDetected(detected);
    }
  }, [enabled, config, isCalibrating]);

  // Start calibration
  const startCalibration = useCallback(() => {
    setIsCalibrating(true);
    setTPoseDetected(false);
  }, []);

  // Cancel calibration
  const cancelCalibration = useCallback(() => {
    setIsCalibrating(false);
    setTPoseDetected(false);
  }, []);

  // Reset calibration
  const resetCalibration = useCallback(() => {
    setCalibrationState(createInitialCalibrationState());
    setIsCalibrating(false);
    setTPoseDetected(false);
    depthSmootherRef.current.reset();
  }, []);

  // Complete calibration (called when countdown finishes)
  const completeCalibration = useCallback(() => {
    if (keypointsRef.current.length > 0) {
      const newState = performCalibration(keypointsRef.current, calibrationState);
      setCalibrationState(newState);
    }
    setIsCalibrating(false);
    setTPoseDetected(false);
  }, [calibrationState]);

  // Correct angle based on perspective
  const correctAngle = useCallback((rawAngle: number, angleType: AngleType): number => {
    if (!enabled || !depthConfidence.isReliable) {
      return rawAngle;
    }
    return applyPerspectiveCorrection(rawAngle, perspectiveFactor, angleType);
  }, [enabled, depthConfidence.isReliable, perspectiveFactor]);

  return {
    calibrationState,
    depthConfidence,
    perspectiveFactor,
    tPoseDetected,
    isCalibrating,
    startCalibration,
    cancelCalibration,
    resetCalibration,
    correctAngle,
    updateWithKeypoints,
  };
}

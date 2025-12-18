/**
 * React Hook for Velocity Tracking
 * Integrates velocity tracker, acceleration analyzer, and feedback generator
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import type { Keypoint } from '@tensorflow-models/pose-detection';
import { VelocityTracker } from '@/utils/velocityTracker';
import { AccelerationAnalyzer } from '@/utils/accelerationAnalyzer';
import {
  TempoFeedbackGenerator,
  DEFAULT_VELOCITY_THRESHOLDS,
} from '@/utils/tempoFeedbackGenerator';
import { keypointToPoint3D } from '@/utils/pose3DUtils';
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose';
import type {
  TrackedJoint,
  VelocityAnalysisResult,
  JointVelocityData,
  TempoAnalysis,
} from '@/types/velocity';

// Map TrackedJoint to BlazePose keypoint index
const JOINT_TO_KEYPOINT: Record<TrackedJoint, number> = {
  leftKnee: BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
  rightKnee: BLAZEPOSE_KEYPOINTS.RIGHT_KNEE,
  leftHip: BLAZEPOSE_KEYPOINTS.LEFT_HIP,
  rightHip: BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
  leftShoulder: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
  rightShoulder: BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
  leftAnkle: BLAZEPOSE_KEYPOINTS.LEFT_ANKLE,
  rightAnkle: BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE,
};

interface UseVelocityTrackingOptions {
  exerciseType: string;
  enabled?: boolean;
}

interface UseVelocityTrackingReturn {
  result: VelocityAnalysisResult | null;
  updateVelocity: (keypoints: Keypoint[]) => VelocityAnalysisResult | null;
  completeRep: () => TempoAnalysis | null;
  reset: () => void;
}

export function useVelocityTracking({
  exerciseType,
  enabled = true,
}: UseVelocityTrackingOptions): UseVelocityTrackingReturn {
  const [result, setResult] = useState<VelocityAnalysisResult | null>(null);

  const config = useMemo(
    () => DEFAULT_VELOCITY_THRESHOLDS[exerciseType] ?? DEFAULT_VELOCITY_THRESHOLDS.squat,
    [exerciseType]
  );

  const trackerRef = useRef<VelocityTracker | null>(null);
  const analyzerRef = useRef<AccelerationAnalyzer | null>(null);
  const feedbackGenRef = useRef<TempoFeedbackGenerator | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const previousYRef = useRef<number>(0);

  // Initialize on first use or exercise change
  const getTracker = useCallback(() => {
    if (!trackerRef.current) {
      trackerRef.current = new VelocityTracker(config.trackedJoints);
    }
    return trackerRef.current;
  }, [config.trackedJoints]);

  const getAnalyzer = useCallback(() => {
    if (!analyzerRef.current) {
      analyzerRef.current = new AccelerationAnalyzer();
    }
    return analyzerRef.current;
  }, []);

  const getFeedbackGen = useCallback(() => {
    if (!feedbackGenRef.current) {
      feedbackGenRef.current = new TempoFeedbackGenerator(exerciseType);
    }
    return feedbackGenRef.current;
  }, [exerciseType]);

  /**
   * Process keypoints and update velocity analysis
   */
  const updateVelocity = useCallback(
    (keypoints: Keypoint[]): VelocityAnalysisResult | null => {
      if (!enabled) return null;

      const timestamp = performance.now();
      const deltaTime =
        lastTimestampRef.current > 0 ? timestamp - lastTimestampRef.current : 33; // Default to ~30fps
      lastTimestampRef.current = timestamp;

      const tracker = getTracker();
      const analyzer = getAnalyzer();
      const feedbackGen = getFeedbackGen();

      // Update positions for all tracked joints
      const jointResults: Partial<Record<TrackedJoint, JointVelocityData>> = {};

      for (const joint of config.trackedJoints) {
        const keypointIndex = JOINT_TO_KEYPOINT[joint];
        const keypoint = keypoints[keypointIndex];

        if (keypoint && (keypoint.score ?? 0) >= 0.5) {
          const position = keypointToPoint3D(keypoint);
          jointResults[joint] = tracker.updatePosition(
            joint,
            position,
            timestamp,
            keypoint.score ?? 0
          );
        } else {
          // Create invalid result for missing keypoints
          jointResults[joint] = {
            joint,
            currentVelocity: 0,
            smoothedVelocity: 0,
            acceleration: 0,
            category: 'optimal',
            isValid: false,
          };
        }
      }

      // Get primary joint for phase detection
      const primaryJointData = jointResults[config.primaryJoint];
      const primaryKeypoint = keypoints[JOINT_TO_KEYPOINT[config.primaryJoint]];
      const currentY = primaryKeypoint?.y ?? 0;

      // Analyze phase
      const phaseResult = analyzer.analyzePhase(
        primaryJointData!,
        previousYRef.current,
        currentY
      );
      previousYRef.current = currentY;

      // Classify velocity and generate feedback
      const category = feedbackGen.classifyVelocity(
        primaryJointData?.smoothedVelocity ?? 0,
        phaseResult.phase
      );

      // Update category in primary joint result
      if (primaryJointData) {
        primaryJointData.category = category;
      }

      const feedbackMessage = feedbackGen.generateFeedback(
        primaryJointData?.smoothedVelocity ?? 0,
        category,
        phaseResult.phase
      );

      // Record for tempo analysis
      if (primaryJointData?.isValid) {
        feedbackGen.recordPhaseVelocity(primaryJointData.smoothedVelocity, phaseResult.phase);
      }

      // Determine overall quality
      let overallQuality: 'good' | 'warning' | 'error' = 'good';
      if (category === 'too_fast' || category === 'too_slow') {
        overallQuality = 'error';
      } else if (category === 'fast' || category === 'slow') {
        overallQuality = 'warning';
      }

      const analysisResult: VelocityAnalysisResult = {
        timestamp,
        fps: deltaTime > 0 ? 1000 / deltaTime : 0,
        deltaTime,
        joints: jointResults as Record<TrackedJoint, JointVelocityData>,
        currentPhase: phaseResult.phase,
        phaseProgress: phaseResult.phaseProgress,
        tempo: null, // Set after rep completion
        overallQuality,
        feedbackMessage,
      };

      setResult(analysisResult);
      return analysisResult;
    },
    [enabled, config, getTracker, getAnalyzer, getFeedbackGen]
  );

  /**
   * Call when rep is completed to get tempo analysis
   */
  const completeRep = useCallback((): TempoAnalysis | null => {
    const feedbackGen = getFeedbackGen();
    const tempo = feedbackGen.analyzeRepTempo();
    feedbackGen.resetRep();
    return tempo;
  }, [getFeedbackGen]);

  /**
   * Reset all tracking state
   */
  const reset = useCallback(() => {
    trackerRef.current?.reset();
    analyzerRef.current?.reset();
    feedbackGenRef.current?.resetRep();
    lastTimestampRef.current = 0;
    previousYRef.current = 0;
    setResult(null);
  }, []);

  return {
    result,
    updateVelocity,
    completeRep,
    reset,
  };
}

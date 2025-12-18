// src/components/AngleDashboard/hooks/useAngleCalculations.ts

'use client';

import { useMemo, useRef, useCallback } from 'react';
import { Keypoint } from '@tensorflow-models/pose-detection';
import { JointAngleType, ExerciseType } from '@/types/angleHistory';
import { AngleSmoother } from '@/utils/angleSmoother';
import { calculate2DAngle } from '@/utils/pose3DUtils';
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose';
import { AngleDisplayData, AngleStatus, BodyPartCategory, BodyPartGroup } from '../types';
import { CalibrationProfile } from '@/types/calibration';
import {
  EXERCISE_ANGLE_MAPPING,
  getAngleThresholds,
  ANGLE_LABELS,
  BODY_PART_LABELS
} from '../constants';
import {
  calculateDepthConfidence,
  calculatePerspectiveFactor,
  applyPerspectiveCorrection,
  DepthNormalizationConfig,
  DepthConfidenceResult,
  PerspectiveResult,
  AngleType,
  DEFAULT_DEPTH_CONFIG,
} from '@/utils/depthNormalization';

// Map JointAngleType to AngleType for perspective correction
const JOINT_TO_ANGLE_TYPE: Partial<Record<JointAngleType, AngleType>> = {
  kneeFlexion: 'kneeFlexion',
  hipFlexion: 'hipFlexion',
  torsoAngle: 'torsoInclination',
  ankleAngle: 'ankleAngle',
};

// Keypoint indices for angle calculations
const ANGLE_KEYPOINT_MAPPING: Record<JointAngleType, { vertex: number; start: number; end: number } | null> = {
  kneeFlexion: { vertex: BLAZEPOSE_KEYPOINTS.LEFT_KNEE, start: BLAZEPOSE_KEYPOINTS.LEFT_HIP, end: BLAZEPOSE_KEYPOINTS.LEFT_ANKLE },
  hipFlexion: { vertex: BLAZEPOSE_KEYPOINTS.LEFT_HIP, start: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER, end: BLAZEPOSE_KEYPOINTS.LEFT_KNEE },
  torsoAngle: { vertex: BLAZEPOSE_KEYPOINTS.LEFT_HIP, start: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER, end: BLAZEPOSE_KEYPOINTS.LEFT_KNEE },
  ankleAngle: { vertex: BLAZEPOSE_KEYPOINTS.LEFT_ANKLE, start: BLAZEPOSE_KEYPOINTS.LEFT_KNEE, end: BLAZEPOSE_KEYPOINTS.LEFT_HEEL },
  elbowAngle: { vertex: BLAZEPOSE_KEYPOINTS.LEFT_ELBOW, start: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER, end: BLAZEPOSE_KEYPOINTS.LEFT_WRIST },
  shoulderAngle: { vertex: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER, start: BLAZEPOSE_KEYPOINTS.LEFT_HIP, end: BLAZEPOSE_KEYPOINTS.LEFT_ELBOW },
  spineAlignment: null, // Calculated differently
  kneeValgus: null, // Calculated as percentage
  elbowValgus: null, // Calculated separately via elbowValgusAnalyzer
  armSymmetry: null, // Calculated as percentage
};

function getAngleStatusWithThresholds(
  value: number,
  jointType: JointAngleType,
  thresholds: Record<JointAngleType, { min: number; max: number; warningBuffer: number }>
): AngleStatus {
  const threshold = thresholds[jointType];
  const { min, max, warningBuffer } = threshold;

  if (value >= min && value <= max) {
    return 'good';
  }

  const warningMin = min - warningBuffer;
  const warningMax = max + warningBuffer;

  if (value >= warningMin && value <= warningMax) {
    return 'warning';
  }

  return 'error';
}

export interface AngleCalculationsResult {
  bodyParts: BodyPartGroup[];
  depthConfidence: DepthConfidenceResult;
  perspectiveResult: PerspectiveResult | null;
}

export function useAngleCalculations(
  keypoints: Keypoint[],
  exerciseType: ExerciseType,
  depthConfig: DepthNormalizationConfig = DEFAULT_DEPTH_CONFIG,
  calibrationProfile?: CalibrationProfile | null
): AngleCalculationsResult {
  // Create smoothers for each angle type
  const smoothersRef = useRef<Map<JointAngleType, AngleSmoother>>(new Map());

  // Initialize smoothers
  const getSmoother = useCallback((jointType: JointAngleType): AngleSmoother => {
    if (!smoothersRef.current.has(jointType)) {
      smoothersRef.current.set(jointType, new AngleSmoother({ alpha: 0.3 }));
    }
    return smoothersRef.current.get(jointType)!;
  }, []);

  return useMemo(() => {
    // Get dynamic thresholds based on calibration profile
    const thresholds = getAngleThresholds(calibrationProfile);

    // Calculate depth confidence first
    const depthConfidence = calculateDepthConfidence(keypoints, depthConfig);

    // Calculate perspective factor
    const perspectiveResult = depthConfig.enabled
      ? calculatePerspectiveFactor(keypoints, depthConfig)
      : null;

    const isPerspectiveCorrected = depthConfig.enabled && depthConfidence.isReliable;

    if (!keypoints || keypoints.length === 0) {
      return {
        bodyParts: [],
        depthConfidence,
        perspectiveResult: null,
      };
    }

    const angleMapping = EXERCISE_ANGLE_MAPPING[exerciseType];
    const bodyParts: BodyPartGroup[] = [];

    (['upper', 'core', 'lower'] as BodyPartCategory[]).forEach((category) => {
      const jointTypes = angleMapping[category] || [];
      const angles: AngleDisplayData[] = [];

      jointTypes.forEach((jointType) => {
        const keypointMapping = ANGLE_KEYPOINT_MAPPING[jointType];
        let rawValue = 0;

        if (keypointMapping) {
          const { vertex, start, end } = keypointMapping;
          const vertexPoint = keypoints[vertex];
          const startPoint = keypoints[start];
          const endPoint = keypoints[end];

          if (vertexPoint && startPoint && endPoint &&
            vertexPoint.score && vertexPoint.score > 0.3 &&
            startPoint.score && startPoint.score > 0.3 &&
            endPoint.score && endPoint.score > 0.3) {
            rawValue = calculate2DAngle(
              { x: startPoint.x, y: startPoint.y, z: 0 },
              { x: vertexPoint.x, y: vertexPoint.y, z: 0 },
              { x: endPoint.x, y: endPoint.y, z: 0 }
            );
          }
        }

        // Apply smoothing
        const smoother = getSmoother(jointType);
        const smoothResult = smoother.smooth(rawValue);
        const smoothedValue = smoothResult.smoothedValue;

        // Apply perspective correction if available
        const angleType = JOINT_TO_ANGLE_TYPE[jointType];
        let correctedValue = smoothedValue;

        if (perspectiveResult && perspectiveResult.depthConfidence.isReliable && angleType) {
          correctedValue = applyPerspectiveCorrection(
            smoothedValue,
            perspectiveResult.factor,
            angleType
          );
        }

        const threshold = thresholds[jointType];
        const labels = ANGLE_LABELS[jointType];

        angles.push({
          jointType,
          label: labels.ko,
          value: Math.round(correctedValue * 10) / 10,
          rawValue: Math.round(rawValue * 10) / 10,
          status: getAngleStatusWithThresholds(correctedValue, jointType, thresholds),
          trend: 'stable', // Will be updated by useTrendTracking
          minOptimal: threshold.min,
          maxOptimal: threshold.max,
          unit: jointType === 'kneeValgus' ? '%' : '°',
          isPerspectiveCorrected: perspectiveResult?.depthConfidence.isReliable && !!angleType,
        });
      });

      if (angles.length > 0) {
        // Calculate overall status for body part
        const hasError = angles.some(a => a.status === 'error');
        const hasWarning = angles.some(a => a.status === 'warning');
        const overallStatus: AngleStatus = hasError ? 'error' : hasWarning ? 'warning' : 'good';

        const partLabels = BODY_PART_LABELS[category];
        bodyParts.push({
          id: category,
          label: partLabels.en,
          labelKo: partLabels.ko,
          icon: partLabels.icon,
          angles,
          overallStatus,
        });
      }
    });

    return {
      bodyParts,
      depthConfidence,
      perspectiveResult,
    };
  }, [keypoints, exerciseType, getSmoother, depthConfig, calibrationProfile]);
}

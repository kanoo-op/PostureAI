'use client';

import { useMemo, useCallback, useRef } from 'react';
import { Keypoint } from '@tensorflow-models/pose-detection';
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose';
import { symmetryScore, calculate3DAngle, keypointToPoint3D, isValidKeypoint } from '@/utils/pose3DUtils';
import { BilateralAngleData, JointType, RepHistoryEntry, ImbalanceTrend, TrendType } from '../types';
import { SEVERITY_THRESHOLDS, TREND_WINDOW_SIZE } from '../constants';
import { SymmetryLevel, SymmetryDirection } from '../../SymmetryFeedbackCard';

interface JointKeypoints {
  upper: number;
  joint: number;
  lower: number;
}

const JOINT_KEYPOINT_MAPPING: Record<JointType, { left: JointKeypoints; right: JointKeypoints }> = {
  knee: {
    left: {
      upper: BLAZEPOSE_KEYPOINTS.LEFT_HIP,
      joint: BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
      lower: BLAZEPOSE_KEYPOINTS.LEFT_ANKLE,
    },
    right: {
      upper: BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
      joint: BLAZEPOSE_KEYPOINTS.RIGHT_KNEE,
      lower: BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE,
    },
  },
  hip: {
    left: {
      upper: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
      joint: BLAZEPOSE_KEYPOINTS.LEFT_HIP,
      lower: BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
    },
    right: {
      upper: BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
      joint: BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
      lower: BLAZEPOSE_KEYPOINTS.RIGHT_KNEE,
    },
  },
  ankle: {
    left: {
      upper: BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
      joint: BLAZEPOSE_KEYPOINTS.LEFT_ANKLE,
      lower: BLAZEPOSE_KEYPOINTS.LEFT_FOOT_INDEX,
    },
    right: {
      upper: BLAZEPOSE_KEYPOINTS.RIGHT_KNEE,
      joint: BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE,
      lower: BLAZEPOSE_KEYPOINTS.RIGHT_FOOT_INDEX,
    },
  },
};

function getSeverityLevel(difference: number): SymmetryLevel {
  if (difference <= SEVERITY_THRESHOLDS.good) return 'good';
  if (difference <= SEVERITY_THRESHOLDS.warning) return 'warning';
  return 'error';
}

function getDominantSide(leftAngle: number, rightAngle: number, difference: number): SymmetryDirection {
  if (difference <= SEVERITY_THRESHOLDS.good) return 'balanced';
  return leftAngle < rightAngle ? 'left' : 'right';
}

export function useBilateralAnalysis(keypoints: Keypoint[]) {
  const historyRef = useRef<RepHistoryEntry[]>([]);

  const calculateJointAngle = useCallback(
    (jointType: JointType, side: 'left' | 'right'): number | null => {
      const mapping = JOINT_KEYPOINT_MAPPING[jointType][side];

      const upperKp = keypoints[mapping.upper];
      const jointKp = keypoints[mapping.joint];
      const lowerKp = keypoints[mapping.lower];

      if (!isValidKeypoint(upperKp) || !isValidKeypoint(jointKp) || !isValidKeypoint(lowerKp)) {
        return null;
      }

      const upper = keypointToPoint3D(upperKp);
      const joint = keypointToPoint3D(jointKp);
      const lower = keypointToPoint3D(lowerKp);

      return Math.round(calculate3DAngle(upper, joint, lower) * 10) / 10;
    },
    [keypoints]
  );

  const bilateralData = useMemo((): BilateralAngleData[] => {
    const joints: JointType[] = ['knee', 'hip', 'ankle'];

    return joints.map((jointType) => {
      const leftAngle = calculateJointAngle(jointType, 'left') ?? 0;
      const rightAngle = calculateJointAngle(jointType, 'right') ?? 0;
      const difference = Math.abs(leftAngle - rightAngle);
      const score = symmetryScore(leftAngle, rightAngle);
      const level = getSeverityLevel(difference);
      const dominantSide = getDominantSide(leftAngle, rightAngle, difference);

      return {
        jointType,
        leftAngle,
        rightAngle,
        difference: Math.round(difference * 10) / 10,
        symmetryScore: score,
        level,
        dominantSide,
      };
    });
  }, [calculateJointAngle]);

  const addRepToHistory = useCallback((repNumber: number, angles: BilateralAngleData[]) => {
    historyRef.current.push({
      repNumber,
      timestamp: Date.now(),
      angles,
    });
    // Keep only last 20 reps
    if (historyRef.current.length > 20) {
      historyRef.current.shift();
    }
  }, []);

  const calculateTrends = useCallback((): ImbalanceTrend[] => {
    const history = historyRef.current;
    if (history.length < TREND_WINDOW_SIZE) {
      return [];
    }

    const recentHistory = history.slice(-TREND_WINDOW_SIZE);
    const joints: JointType[] = ['knee', 'hip', 'ankle'];

    return joints.map((jointType) => {
      const jointHistory = recentHistory.map(
        (rep) => rep.angles.find((a) => a.jointType === jointType)!
      );

      const firstHalf = jointHistory.slice(0, Math.floor(jointHistory.length / 2));
      const secondHalf = jointHistory.slice(Math.floor(jointHistory.length / 2));

      const firstAvgDiff = firstHalf.reduce((sum, a) => sum + a.difference, 0) / firstHalf.length;
      const secondAvgDiff = secondHalf.reduce((sum, a) => sum + a.difference, 0) / secondHalf.length;

      const avgDifference = jointHistory.reduce((sum, a) => sum + a.difference, 0) / jointHistory.length;

      // Determine trend
      let trend: TrendType = 'stable';
      const trendThreshold = 2;
      if (secondAvgDiff < firstAvgDiff - trendThreshold) {
        trend = 'improving';
      } else if (secondAvgDiff > firstAvgDiff + trendThreshold) {
        trend = 'declining';
      }

      // Find consistent limitation side
      const sideCounts = { left: 0, right: 0, balanced: 0 };
      jointHistory.forEach((a) => {
        sideCounts[a.dominantSide]++;
      });

      let consistentLimitationSide: SymmetryDirection | null = null;
      if (sideCounts.left > jointHistory.length * 0.7) {
        consistentLimitationSide = 'left';
      } else if (sideCounts.right > jointHistory.length * 0.7) {
        consistentLimitationSide = 'right';
      }

      const improvementPercent = firstAvgDiff > 0
        ? Math.round(((firstAvgDiff - secondAvgDiff) / firstAvgDiff) * 100)
        : 0;

      return {
        jointType,
        trend,
        averageDifference: Math.round(avgDifference * 10) / 10,
        consistentLimitationSide,
        improvementPercent,
      };
    });
  }, []);

  const overallSymmetryScore = useMemo(() => {
    if (bilateralData.length === 0) return 0;
    return Math.round(
      bilateralData.reduce((sum, d) => sum + d.symmetryScore, 0) / bilateralData.length
    );
  }, [bilateralData]);

  const resetHistory = useCallback(() => {
    historyRef.current = [];
  }, []);

  return {
    bilateralData,
    overallSymmetryScore,
    addRepToHistory,
    calculateTrends,
    getHistory: () => historyRef.current,
    resetHistory,
  };
}

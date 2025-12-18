/**
 * Elbow Valgus/Varus Analyzer
 * Detects improper elbow alignment during upper body exercises
 */

import {
  Point3D,
  keypointToPoint3D,
  isValidKeypoint,
  symmetryScore,
  projectToXYPlane,
  createVector,
} from './pose3DUtils';
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose';

// ============================================
// Type Definitions
// ============================================

export type ValgusLevel = 'good' | 'warning' | 'error';

export interface ElbowValgusResult {
  leftValgusAngle: number;      // Degrees from neutral (0 = neutral)
  rightValgusAngle: number;
  avgValgusAngle: number;
  level: ValgusLevel;
  message: string;
  symmetryScore: number;        // 0-100, higher = more symmetric
}

export interface Keypoint {
  x: number;
  y: number;
  z?: number;
  score?: number;
}

// ============================================
// Threshold Constants
// ============================================

export const ELBOW_VALGUS_THRESHOLDS = {
  ideal: { min: 0, max: 8 },       // Ideal: 0-8 degrees from neutral
  acceptable: { min: 0, max: 15 }, // Acceptable: 0-15 degrees
  // Error: >15 degrees
} as const;

const MIN_KEYPOINT_SCORE = 0.5;

// ============================================
// Main Analysis Functions
// ============================================

/**
 * Calculate elbow valgus angle using frontal plane projection
 * Valgus: elbows flare outward
 * Varus: elbows collapse inward
 *
 * @param keypoints - MediaPipe BlazePose 33 keypoints
 * @returns ElbowValgusResult with angles and feedback
 */
export function analyzeElbowValgus(keypoints: Keypoint[]): ElbowValgusResult | null {
  // Extract required keypoints
  const leftShoulder = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER];
  const rightShoulder = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER];
  const leftElbow = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ELBOW];
  const rightElbow = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW];
  const leftWrist = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_WRIST];
  const rightWrist = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_WRIST];

  // Validate keypoints
  const requiredKeypoints = [
    leftShoulder, rightShoulder,
    leftElbow, rightElbow,
    leftWrist, rightWrist,
  ];

  if (!requiredKeypoints.every(kp => isValidKeypoint(kp, MIN_KEYPOINT_SCORE))) {
    return null;
  }

  // Convert to Point3D
  const points = {
    leftShoulder: keypointToPoint3D(leftShoulder),
    rightShoulder: keypointToPoint3D(rightShoulder),
    leftElbow: keypointToPoint3D(leftElbow),
    rightElbow: keypointToPoint3D(rightElbow),
    leftWrist: keypointToPoint3D(leftWrist),
    rightWrist: keypointToPoint3D(rightWrist),
  };

  // Calculate valgus angles
  const leftValgusAngle = calculateSingleElbowValgus(
    points.leftShoulder,
    points.leftElbow,
    points.leftWrist,
    'left'
  );

  const rightValgusAngle = calculateSingleElbowValgus(
    points.rightShoulder,
    points.rightElbow,
    points.rightWrist,
    'right'
  );

  const avgValgusAngle = (Math.abs(leftValgusAngle) + Math.abs(rightValgusAngle)) / 2;

  // Calculate symmetry
  const armSymmetry = symmetryScore(leftValgusAngle, rightValgusAngle);

  // Determine feedback level and message
  const { level, message } = getValgusLevelAndMessage(avgValgusAngle);

  return {
    leftValgusAngle: Math.round(leftValgusAngle * 10) / 10,
    rightValgusAngle: Math.round(rightValgusAngle * 10) / 10,
    avgValgusAngle: Math.round(avgValgusAngle * 10) / 10,
    level,
    message,
    symmetryScore: armSymmetry,
  };
}

/**
 * Calculate valgus angle for a single elbow
 * Uses frontal plane (XY) projection to measure elbow flare
 *
 * @returns Positive angle = valgus (flare out), Negative = varus (collapse in)
 */
function calculateSingleElbowValgus(
  shoulder: Point3D,
  elbow: Point3D,
  wrist: Point3D,
  side: 'left' | 'right'
): number {
  // Project to frontal plane (XY)
  const shoulderXY = projectToXYPlane(shoulder);
  const elbowXY = projectToXYPlane(elbow);
  const wristXY = projectToXYPlane(wrist);

  // Calculate deviation from the shoulder-elbow line extension
  const expectedWristX = elbowXY.x + (elbowXY.x - shoulderXY.x);
  const actualDeviationX = wristXY.x - expectedWristX;

  // Convert deviation to angle (approximate)
  const forearmLength = Math.sqrt(
    Math.pow(wristXY.x - elbowXY.x, 2) +
    Math.pow(wristXY.y - elbowXY.y, 2)
  );

  if (forearmLength === 0) return 0;

  // Calculate valgus angle using arcsin
  const valgusRatio = Math.abs(actualDeviationX) / forearmLength;
  const clampedRatio = Math.min(1, valgusRatio);
  let valgusAngle = Math.asin(clampedRatio) * (180 / Math.PI);

  // Determine direction (valgus vs varus)
  // For left arm: deviation to left (negative X) = valgus (flare out)
  // For right arm: deviation to right (positive X) = valgus (flare out)
  if (side === 'left') {
    if (actualDeviationX < 0) {
      valgusAngle = valgusAngle; // Valgus (positive)
    } else {
      valgusAngle = -valgusAngle; // Varus (negative)
    }
  } else {
    if (actualDeviationX > 0) {
      valgusAngle = valgusAngle; // Valgus (positive)
    } else {
      valgusAngle = -valgusAngle; // Varus (negative)
    }
  }

  return valgusAngle;
}

/**
 * Determine feedback level and Korean message based on valgus angle
 */
function getValgusLevelAndMessage(avgValgusAngle: number): { level: ValgusLevel; message: string } {
  const absAngle = Math.abs(avgValgusAngle);
  const { ideal, acceptable } = ELBOW_VALGUS_THRESHOLDS;

  if (absAngle >= ideal.min && absAngle <= ideal.max) {
    return {
      level: 'good',
      message: '팔꿈치 정렬이 좋습니다',
    };
  }

  if (absAngle >= acceptable.min && absAngle <= acceptable.max) {
    if (avgValgusAngle > 0) {
      return {
        level: 'warning',
        message: '팔꿈치가 약간 바깥으로 벌어졌습니다',
      };
    } else {
      return {
        level: 'warning',
        message: '팔꿈치가 약간 안으로 모였습니다',
      };
    }
  }

  // Error level
  if (avgValgusAngle > 0) {
    return {
      level: 'error',
      message: '팔꿈치가 너무 바깥으로 벌어졌습니다. 몸 옆에 붙여주세요',
    };
  } else {
    return {
      level: 'error',
      message: '팔꿈치가 너무 안으로 모였습니다. 어깨너비로 유지하세요',
    };
  }
}

/**
 * Calculate arm symmetry score and feedback
 */
export function analyzeArmSymmetry(
  leftElbowAngle: number,
  rightElbowAngle: number
): { score: number; level: ValgusLevel; message: string } {
  const score = symmetryScore(leftElbowAngle, rightElbowAngle);

  if (score >= 90) {
    return {
      score,
      level: 'good',
      message: '좌우 팔 균형이 좋습니다',
    };
  }

  if (score >= 70) {
    return {
      score,
      level: 'warning',
      message: '좌우 팔 균형을 맞춰주세요',
    };
  }

  return {
    score,
    level: 'error',
    message: '좌우 팔 높이가 많이 다릅니다',
  };
}

import type { Keypoint } from '@/components/SkeletonOverlay';
import type { IdealPoseData, JointDeviation, DeviationAnalysis, ReferenceKeypoint } from '@/types/referencePose';

// Thresholds for deviation severity (normalized distance)
const DEVIATION_THRESHOLDS = {
  aligned: 0.03,   // < 3% = aligned
  minor: 0.08,     // 3-8% = minor
  major: 0.08      // > 8% = major
};

// Key joints for overall score calculation (weighted)
const JOINT_WEIGHTS: Record<number, number> = {
  11: 1.0, 12: 1.0,  // Shoulders
  23: 1.5, 24: 1.5,  // Hips (critical)
  25: 2.0, 26: 2.0,  // Knees (most critical)
  27: 1.0, 28: 1.0,  // Ankles
};

export function calculateJointDeviation(
  userKeypoint: Keypoint,
  referenceKeypoint: ReferenceKeypoint,
  canvasWidth: number,
  canvasHeight: number,
  jointIndex: number
): JointDeviation {
  // Normalize user keypoint to 0-1 range
  const userNormX = userKeypoint.x / canvasWidth;
  const userNormY = userKeypoint.y / canvasHeight;

  // Calculate normalized distance
  const dx = userNormX - referenceKeypoint.x;
  const dy = userNormY - referenceKeypoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Calculate direction toward ideal
  const direction = {
    x: -dx / (distance || 1),
    y: -dy / (distance || 1)
  };

  // Determine severity
  let severity: 'aligned' | 'minor' | 'major';
  if (distance < DEVIATION_THRESHOLDS.aligned) {
    severity = 'aligned';
  } else if (distance < DEVIATION_THRESHOLDS.minor) {
    severity = 'minor';
  } else {
    severity = 'major';
  }

  return {
    jointIndex,
    deviationDistance: distance,
    deviationAngle: Math.atan2(dy, dx) * (180 / Math.PI),
    severity,
    direction
  };
}

export function analyzeDeviations(
  userKeypoints: Keypoint[],
  referenceData: IdealPoseData,
  canvasWidth: number,
  canvasHeight: number,
  minScore: number = 0.3
): DeviationAnalysis {
  const jointDeviations: JointDeviation[] = [];
  let weightedScore = 0;
  let totalWeight = 0;

  for (let i = 0; i < Math.min(userKeypoints.length, 33); i++) {
    const userKp = userKeypoints[i];
    const refKp = referenceData.keypoints[i];

    if (!userKp || !refKp || (userKp.score ?? 0) < minScore) continue;

    const deviation = calculateJointDeviation(userKp, refKp, canvasWidth, canvasHeight, i);
    jointDeviations.push(deviation);

    // Calculate weighted score
    const weight = JOINT_WEIGHTS[i] ?? 0.5;
    const jointScore = Math.max(0, 1 - deviation.deviationDistance * 10);
    weightedScore += jointScore * weight;
    totalWeight += weight;
  }

  // Find worst joints
  const sortedDeviations = [...jointDeviations]
    .filter(d => JOINT_WEIGHTS[d.jointIndex])
    .sort((a, b) => b.deviationDistance - a.deviationDistance);
  const worstJoints = sortedDeviations.slice(0, 3).map(d => d.jointIndex);

  return {
    overallScore: totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0,
    jointDeviations,
    worstJoints,
    phaseAlignment: 1.0  // Placeholder for phase detection
  };
}

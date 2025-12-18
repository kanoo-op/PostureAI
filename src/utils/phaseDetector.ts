import type { Keypoint } from '@/components/SkeletonOverlay';
import type { ExercisePhase, IdealPoseData, ExerciseReferenceData } from '@/types/referencePose';
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose';

export interface PhaseDetectionResult {
  currentPhase: ExercisePhase;
  confidence: number;  // 0-1
  closestPoseData: IdealPoseData | null;
}

// Calculate knee angle for squat phase detection
function calculateKneeAngle(keypoints: Keypoint[]): number {
  const hip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP];
  const knee = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_KNEE];
  const ankle = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE];

  if (!hip || !knee || !ankle) return 180;
  if ((hip.score ?? 0) < 0.3 || (knee.score ?? 0) < 0.3 || (ankle.score ?? 0) < 0.3) return 180;

  const v1 = { x: hip.x - knee.x, y: hip.y - knee.y };
  const v2 = { x: ankle.x - knee.x, y: ankle.y - knee.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (mag1 === 0 || mag2 === 0) return 180;

  return Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * (180 / Math.PI);
}

export function detectSquatPhase(
  keypoints: Keypoint[],
  referenceData: ExerciseReferenceData
): PhaseDetectionResult {
  const kneeAngle = calculateKneeAngle(keypoints);

  let phase: ExercisePhase;
  let confidence: number;

  if (kneeAngle > 150) {
    phase = 'standing';
    confidence = Math.min(1, (kneeAngle - 150) / 30);
  } else if (kneeAngle > 100) {
    phase = 'half-depth';
    confidence = 1 - Math.abs(kneeAngle - 125) / 25;
  } else {
    phase = 'full-depth';
    confidence = Math.min(1, (100 - kneeAngle) / 30);
  }

  const closestPoseData = referenceData.phases.find(p => p.phase === phase) ?? null;

  return { currentPhase: phase, confidence, closestPoseData };
}

export function detectPhase(
  exerciseType: string,
  keypoints: Keypoint[],
  referenceData: ExerciseReferenceData
): PhaseDetectionResult {
  switch (exerciseType) {
    case 'squat':
      return detectSquatPhase(keypoints, referenceData);
    default:
      return {
        currentPhase: 'standing',
        confidence: 0,
        closestPoseData: referenceData.phases[0] ?? null
      };
  }
}

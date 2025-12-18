import type { FramePoseData, VideoExerciseType } from '@/types/video';
import type {
  ExerciseDetectionResult,
  DetectionMetrics,
  DetectionConfig
} from '@/types/exerciseDetection';
import { EXERCISE_PROFILES, DEFAULT_DETECTION_CONFIG } from './exerciseProfiles';
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose';

/**
 * Main exercise detection function
 * Analyzes first N frames to detect exercise type
 */
export async function detectExerciseFromFrames(
  frames: FramePoseData[],
  config: Partial<DetectionConfig> = {}
): Promise<ExerciseDetectionResult> {
  const fullConfig = { ...DEFAULT_DETECTION_CONFIG, ...config };
  const framesToAnalyze = Math.min(frames.length, fullConfig.framesToAnalyze);
  const validFrames = frames.slice(0, framesToAnalyze).filter(f => f.pose !== null);

  if (validFrames.length < fullConfig.minFramesForDetection) {
    return createUnknownResult(validFrames.length, 'Insufficient valid frames');
  }

  // Calculate detection metrics
  const metrics = calculateDetectionMetrics(validFrames);

  // Score each exercise profile
  const scores = calculateProfileScores(metrics);

  // Sort by score descending
  const ranked = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([type, score]) => ({ type: type as VideoExerciseType, confidence: score }));

  const topMatch = ranked[0];
  const alternatives = ranked.slice(1, 4).filter(alt => alt.confidence > 0.3);

  return {
    detectedType: topMatch.confidence >= fullConfig.confidenceThreshold ? topMatch.type : 'unknown',
    confidence: topMatch.confidence,
    alternatives,
    analysisMetrics: metrics,
    timestamp: Date.now()
  };
}

/**
 * Calculate movement metrics from frames
 */
function calculateDetectionMetrics(frames: FramePoseData[]): DetectionMetrics {
  const validFrames = frames.filter(f => f.pose !== null);

  // Track joint positions across frames
  let minKneeAngle = 180, maxKneeAngle = 0;
  let minHipAngle = 180, maxHipAngle = 0;
  let minElbowAngle = 180, maxElbowAngle = 0;
  let totalHipY = 0, totalShoulderY = 0;
  const hipYValues: number[] = [];
  const hipXValues: number[] = [];

  validFrames.forEach(frame => {
    const kp = frame.pose!.keypoints;

    // Calculate knee angle (hip-knee-ankle)
    const leftKneeAngle = calculateAngle(
      kp[BLAZEPOSE_KEYPOINTS.LEFT_HIP],
      kp[BLAZEPOSE_KEYPOINTS.LEFT_KNEE],
      kp[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]
    );
    const rightKneeAngle = calculateAngle(
      kp[BLAZEPOSE_KEYPOINTS.RIGHT_HIP],
      kp[BLAZEPOSE_KEYPOINTS.RIGHT_KNEE],
      kp[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]
    );
    const avgKnee = (leftKneeAngle + rightKneeAngle) / 2;
    minKneeAngle = Math.min(minKneeAngle, avgKnee);
    maxKneeAngle = Math.max(maxKneeAngle, avgKnee);

    // Calculate hip angle (shoulder-hip-knee)
    const leftHipAngle = calculateAngle(
      kp[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER],
      kp[BLAZEPOSE_KEYPOINTS.LEFT_HIP],
      kp[BLAZEPOSE_KEYPOINTS.LEFT_KNEE]
    );
    const rightHipAngle = calculateAngle(
      kp[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER],
      kp[BLAZEPOSE_KEYPOINTS.RIGHT_HIP],
      kp[BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]
    );
    const avgHip = (leftHipAngle + rightHipAngle) / 2;
    minHipAngle = Math.min(minHipAngle, avgHip);
    maxHipAngle = Math.max(maxHipAngle, avgHip);

    // Calculate elbow angle (shoulder-elbow-wrist)
    const leftElbowAngle = calculateAngle(
      kp[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER],
      kp[BLAZEPOSE_KEYPOINTS.LEFT_ELBOW],
      kp[BLAZEPOSE_KEYPOINTS.LEFT_WRIST]
    );
    const rightElbowAngle = calculateAngle(
      kp[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER],
      kp[BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW],
      kp[BLAZEPOSE_KEYPOINTS.RIGHT_WRIST]
    );
    const avgElbow = (leftElbowAngle + rightElbowAngle) / 2;
    minElbowAngle = Math.min(minElbowAngle, avgElbow);
    maxElbowAngle = Math.max(maxElbowAngle, avgElbow);

    // Track hip position for displacement
    const hipY = (kp[BLAZEPOSE_KEYPOINTS.LEFT_HIP].y + kp[BLAZEPOSE_KEYPOINTS.RIGHT_HIP].y) / 2;
    const hipX = (kp[BLAZEPOSE_KEYPOINTS.LEFT_HIP].x + kp[BLAZEPOSE_KEYPOINTS.RIGHT_HIP].x) / 2;
    const shoulderY = (kp[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER].y + kp[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER].y) / 2;

    totalHipY += hipY;
    totalShoulderY += shoulderY;
    hipYValues.push(hipY);
    hipXValues.push(hipX);
  });

  const n = validFrames.length;
  const avgHipY = totalHipY / n;
  const avgShoulderY = totalShoulderY / n;

  // Calculate displacement
  const verticalDisplacement = Math.max(...hipYValues) - Math.min(...hipYValues);
  const horizontalDisplacement = Math.max(...hipXValues) - Math.min(...hipXValues);

  // Determine body orientation
  const orientationDiff = Math.abs(avgShoulderY - avgHipY);
  const bodyOrientation: 'vertical' | 'horizontal' | 'unknown' =
    orientationDiff > 0.15 ? 'vertical' : orientationDiff < 0.08 ? 'horizontal' : 'unknown';

  // Detect movement cycles (simplified)
  const movementCycleDetected = (maxKneeAngle - minKneeAngle) > 30 || (maxHipAngle - minHipAngle) > 30;

  return {
    framesAnalyzed: n,
    verticalDisplacement,
    horizontalDisplacement,
    kneeAngleRange: [minKneeAngle, maxKneeAngle],
    hipAngleRange: [minHipAngle, maxHipAngle],
    elbowAngleRange: [minElbowAngle, maxElbowAngle],
    bodyOrientation,
    movementCycleDetected,
    cycleFrequency: null  // Would need timing analysis
  };
}

/**
 * Calculate angle between three points in degrees
 */
function calculateAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };

  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
  const magCB = Math.sqrt(cb.x * cb.x + cb.y * cb.y);

  if (magAB === 0 || magCB === 0) return 180;

  const cosAngle = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

/**
 * Score each exercise profile against calculated metrics
 */
function calculateProfileScores(metrics: DetectionMetrics): Record<VideoExerciseType, number> {
  const scores: Record<VideoExerciseType, number> = {
    squat: 0, pushup: 0, lunge: 0, deadlift: 0, plank: 0, unknown: 0.3
  };

  Object.entries(EXERCISE_PROFILES).forEach(([type, profile]) => {
    let score = 0;
    let factors = 0;

    // Orientation match (30% weight)
    if (metrics.bodyOrientation === profile.bodyOrientation) {
      score += 0.3;
    } else if (metrics.bodyOrientation !== 'unknown') {
      score -= 0.1;
    }
    factors += 0.3;

    // Knee angle range match (25% weight)
    const kneeRange = metrics.kneeAngleRange[1] - metrics.kneeAngleRange[0];
    const expectedKneeRange = profile.kneeAngleRange.max - profile.kneeAngleRange.min;
    const kneeRangeMatch = 1 - Math.abs(kneeRange - expectedKneeRange) / 100;
    score += Math.max(0, kneeRangeMatch * 0.25);
    factors += 0.25;

    // Hip angle range match (25% weight)
    const hipRange = metrics.hipAngleRange[1] - metrics.hipAngleRange[0];
    const expectedHipRange = profile.hipAngleRange.max - profile.hipAngleRange.min;
    const hipRangeMatch = 1 - Math.abs(hipRange - expectedHipRange) / 100;
    score += Math.max(0, hipRangeMatch * 0.25);
    factors += 0.25;

    // Movement displacement match (20% weight)
    const verticalMatch = metrics.verticalDisplacement >= profile.verticalMovementThreshold ? 1 :
                         metrics.verticalDisplacement / profile.verticalMovementThreshold;
    score += verticalMatch * 0.2;
    factors += 0.2;

    scores[type as VideoExerciseType] = Math.min(1, Math.max(0, score / factors));
  });

  return scores;
}

/**
 * Helper to create unknown result
 */
function createUnknownResult(framesAnalyzed: number, _reason: string): ExerciseDetectionResult {
  return {
    detectedType: 'unknown',
    confidence: 0.3,
    alternatives: [],
    analysisMetrics: {
      framesAnalyzed,
      verticalDisplacement: 0,
      horizontalDisplacement: 0,
      kneeAngleRange: [0, 0],
      hipAngleRange: [0, 0],
      elbowAngleRange: [0, 0],
      bodyOrientation: 'unknown',
      movementCycleDetected: false,
      cycleFrequency: null
    },
    timestamp: Date.now()
  };
}

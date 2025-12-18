import { Keypoint } from '@tensorflow-models/pose-detection';
import { AngleComparisonResult, IdealAngleConfig } from '../types';
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose';
import { JointAngleType } from '@/types/angleHistory';

interface Point3D {
  x: number;
  y: number;
  z?: number;
}

// Calculate angle from 3 keypoints
export function calculate3DAngle(
  p1: Point3D,
  vertex: Point3D,
  p2: Point3D
): number {
  const v1 = {
    x: p1.x - vertex.x,
    y: p1.y - vertex.y,
    z: (p1.z ?? 0) - (vertex.z ?? 0),
  };
  const v2 = {
    x: p2.x - vertex.x,
    y: p2.y - vertex.y,
    z: (p2.z ?? 0) - (vertex.z ?? 0),
  };

  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2 + v1.z ** 2);
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2 + v2.z ** 2);

  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }

  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

// Joint type to keypoint indices mapping
interface JointMapping {
  p1Index: number;
  vertexIndex: number;
  p2Index: number;
}

export function getJointMapping(jointType: JointAngleType): JointMapping | null {
  const mappings: Record<string, JointMapping> = {
    kneeFlexion: {
      p1Index: BLAZEPOSE_KEYPOINTS.LEFT_HIP,
      vertexIndex: BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
      p2Index: BLAZEPOSE_KEYPOINTS.LEFT_ANKLE,
    },
    hipFlexion: {
      p1Index: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
      vertexIndex: BLAZEPOSE_KEYPOINTS.LEFT_HIP,
      p2Index: BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
    },
    torsoAngle: {
      p1Index: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
      vertexIndex: BLAZEPOSE_KEYPOINTS.LEFT_HIP,
      p2Index: BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
    },
    ankleAngle: {
      p1Index: BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
      vertexIndex: BLAZEPOSE_KEYPOINTS.LEFT_ANKLE,
      p2Index: BLAZEPOSE_KEYPOINTS.LEFT_FOOT_INDEX,
    },
    elbowAngle: {
      p1Index: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
      vertexIndex: BLAZEPOSE_KEYPOINTS.LEFT_ELBOW,
      p2Index: BLAZEPOSE_KEYPOINTS.LEFT_WRIST,
    },
    shoulderAngle: {
      p1Index: BLAZEPOSE_KEYPOINTS.LEFT_ELBOW,
      vertexIndex: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
      p2Index: BLAZEPOSE_KEYPOINTS.LEFT_HIP,
    },
    spineAlignment: {
      p1Index: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
      vertexIndex: BLAZEPOSE_KEYPOINTS.LEFT_HIP,
      p2Index: BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
    },
    kneeValgus: {
      p1Index: BLAZEPOSE_KEYPOINTS.LEFT_HIP,
      vertexIndex: BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
      p2Index: BLAZEPOSE_KEYPOINTS.LEFT_ANKLE,
    },
    elbowValgus: {
      p1Index: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
      vertexIndex: BLAZEPOSE_KEYPOINTS.LEFT_ELBOW,
      p2Index: BLAZEPOSE_KEYPOINTS.LEFT_WRIST,
    },
    armSymmetry: {
      p1Index: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
      vertexIndex: BLAZEPOSE_KEYPOINTS.LEFT_ELBOW,
      p2Index: BLAZEPOSE_KEYPOINTS.LEFT_WRIST,
    },
  };
  return mappings[jointType] || null;
}

function createEmptyResult(config: IdealAngleConfig): AngleComparisonResult {
  return {
    jointType: config.jointType,
    userAngle: 0,
    idealAngle: config.idealValue,
    deviation: 0,
    status: 'warning',
    correctionHint: 'Unable to detect joint position',
    correctionHintKo: '관절 위치를 감지할 수 없습니다',
  };
}

function generateCorrectionHint(
  config: IdealAngleConfig,
  userAngle: number,
  status: 'optimal' | 'acceptable' | 'warning'
): { en: string; ko: string } {
  if (status === 'optimal') {
    return {
      en: 'Good form!',
      ko: '좋은 자세입니다!',
    };
  }

  const diff = userAngle - config.idealValue;
  const isOver = diff > 0;

  // Generate specific hints based on joint type and deviation direction
  const hints: Record<string, { over: { en: string; ko: string }; under: { en: string; ko: string } }> = {
    kneeFlexion: {
      over: { en: 'Bend knees less', ko: '무릎을 덜 구부리세요' },
      under: { en: 'Bend knees more', ko: '무릎을 더 구부리세요' },
    },
    hipFlexion: {
      over: { en: 'Straighten hips slightly', ko: '엉덩이를 약간 펴세요' },
      under: { en: 'Hinge more at hips', ko: '엉덩이를 더 굽히세요' },
    },
    torsoAngle: {
      over: { en: 'Keep torso more upright', ko: '상체를 더 세우세요' },
      under: { en: 'Lean forward slightly', ko: '약간 앞으로 기울이세요' },
    },
    ankleAngle: {
      over: { en: 'Reduce ankle flexion', ko: '발목 굽힘을 줄이세요' },
      under: { en: 'Increase ankle flexion', ko: '발목 굽힘을 늘리세요' },
    },
    elbowAngle: {
      over: { en: 'Straighten elbows more', ko: '팔꿈치를 더 펴세요' },
      under: { en: 'Bend elbows more', ko: '팔꿈치를 더 구부리세요' },
    },
    shoulderAngle: {
      over: { en: 'Bring arms closer to body', ko: '팔을 몸에 더 가깝게' },
      under: { en: 'Extend arms away from body', ko: '팔을 몸에서 더 멀리' },
    },
    spineAlignment: {
      over: { en: 'Straighten your back', ko: '등을 펴세요' },
      under: { en: 'Maintain neutral spine', ko: '척추 중립을 유지하세요' },
    },
    kneeValgus: {
      over: { en: 'Push knees outward', ko: '무릎을 바깥으로 밀어내세요' },
      under: { en: 'Keep knees aligned', ko: '무릎을 정렬하세요' },
    },
    elbowValgus: {
      over: { en: 'Keep elbows closer to body', ko: '팔꿈치를 몸에 가깝게' },
      under: { en: 'Keep elbows aligned', ko: '팔꿈치를 정렬하세요' },
    },
    armSymmetry: {
      over: { en: 'Balance both arms evenly', ko: '양팔을 균등하게' },
      under: { en: 'Check arm symmetry', ko: '팔 대칭을 확인하세요' },
    },
  };

  const hint = hints[config.jointType];
  if (!hint) {
    return {
      en: `Adjust ${config.description}`,
      ko: `${config.descriptionKo} 조정`,
    };
  }

  return isOver ? hint.over : hint.under;
}

// Compare user angle with ideal configuration
export function compareAngle(
  userKeypoints: Keypoint[],
  config: IdealAngleConfig
): AngleComparisonResult {
  // Map joint type to keypoint indices
  const jointMapping = getJointMapping(config.jointType);
  if (!jointMapping) {
    return createEmptyResult(config);
  }

  const { p1Index, vertexIndex, p2Index } = jointMapping;
  const p1 = userKeypoints[p1Index];
  const vertex = userKeypoints[vertexIndex];
  const p2 = userKeypoints[p2Index];

  if (!p1 || !vertex || !p2) {
    return createEmptyResult(config);
  }

  // Check confidence scores
  const minScore = Math.min(
    p1.score ?? 0,
    vertex.score ?? 0,
    p2.score ?? 0
  );
  if (minScore < 0.3) {
    return createEmptyResult(config);
  }

  const userAngle = calculate3DAngle(p1, vertex, p2);
  const deviation = Math.abs(userAngle - config.idealValue);

  let status: 'optimal' | 'acceptable' | 'warning' = 'warning';
  if (
    userAngle >= config.acceptableRange.min &&
    userAngle <= config.acceptableRange.max
  ) {
    status = 'optimal';
  } else if (deviation <= config.warningThreshold) {
    status = 'acceptable';
  }

  const correctionHint = generateCorrectionHint(config, userAngle, status);

  return {
    jointType: config.jointType,
    userAngle,
    idealAngle: config.idealValue,
    deviation,
    status,
    correctionHint: correctionHint.en,
    correctionHintKo: correctionHint.ko,
  };
}

// Compare all angles for an exercise
export function compareAllAngles(
  userKeypoints: Keypoint[],
  angleConfigs: IdealAngleConfig[]
): AngleComparisonResult[] {
  return angleConfigs.map((config) => compareAngle(userKeypoints, config));
}

// Calculate overall form score (0-100)
export function calculateFormScore(
  comparisons: AngleComparisonResult[]
): number {
  if (comparisons.length === 0) return 0;

  let totalScore = 0;
  for (const comparison of comparisons) {
    if (comparison.status === 'optimal') {
      totalScore += 100;
    } else if (comparison.status === 'acceptable') {
      // Scale based on how close to optimal
      const normalizedDeviation = comparison.deviation / 30; // Normalize to ~30 degree max
      totalScore += Math.max(60, 100 - normalizedDeviation * 40);
    } else {
      // Warning status gets lower score based on deviation
      const normalizedDeviation = comparison.deviation / 45;
      totalScore += Math.max(20, 60 - normalizedDeviation * 40);
    }
  }

  return Math.round(totalScore / comparisons.length);
}

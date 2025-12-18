import { ExerciseIdealForm, KeypointPosition } from './types';
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose';

export { ANGLE_GUIDE_COLORS } from './colors';

// Helper function to generate normalized keypoint positions for a standing pose
function generateStandingKeypoints(): KeypointPosition[] {
  return [
    // Head and face (indices 0-10)
    { index: 0, x: 0.5, y: 0.1, z: 0 },       // NOSE
    { index: 1, x: 0.48, y: 0.08, z: 0.01 },  // LEFT_EYE_INNER
    { index: 2, x: 0.46, y: 0.08, z: 0.02 },  // LEFT_EYE
    { index: 3, x: 0.44, y: 0.08, z: 0.01 },  // LEFT_EYE_OUTER
    { index: 4, x: 0.52, y: 0.08, z: 0.01 },  // RIGHT_EYE_INNER
    { index: 5, x: 0.54, y: 0.08, z: 0.02 },  // RIGHT_EYE
    { index: 6, x: 0.56, y: 0.08, z: 0.01 },  // RIGHT_EYE_OUTER
    { index: 7, x: 0.4, y: 0.09, z: -0.02 },  // LEFT_EAR
    { index: 8, x: 0.6, y: 0.09, z: -0.02 },  // RIGHT_EAR
    { index: 9, x: 0.48, y: 0.12, z: 0.01 },  // MOUTH_LEFT
    { index: 10, x: 0.52, y: 0.12, z: 0.01 }, // MOUTH_RIGHT
    // Torso (indices 11-12, 23-24)
    { index: 11, x: 0.38, y: 0.22, z: 0 },    // LEFT_SHOULDER
    { index: 12, x: 0.62, y: 0.22, z: 0 },    // RIGHT_SHOULDER
    // Arms (indices 13-22)
    { index: 13, x: 0.32, y: 0.35, z: 0 },    // LEFT_ELBOW
    { index: 14, x: 0.68, y: 0.35, z: 0 },    // RIGHT_ELBOW
    { index: 15, x: 0.28, y: 0.48, z: 0.02 }, // LEFT_WRIST
    { index: 16, x: 0.72, y: 0.48, z: 0.02 }, // RIGHT_WRIST
    { index: 17, x: 0.26, y: 0.5, z: 0.02 },  // LEFT_PINKY
    { index: 18, x: 0.74, y: 0.5, z: 0.02 },  // RIGHT_PINKY
    { index: 19, x: 0.27, y: 0.5, z: 0.03 },  // LEFT_INDEX
    { index: 20, x: 0.73, y: 0.5, z: 0.03 },  // RIGHT_INDEX
    { index: 21, x: 0.28, y: 0.49, z: 0.04 }, // LEFT_THUMB
    { index: 22, x: 0.72, y: 0.49, z: 0.04 }, // RIGHT_THUMB
    // Hips (indices 23-24)
    { index: 23, x: 0.42, y: 0.48, z: 0 },    // LEFT_HIP
    { index: 24, x: 0.58, y: 0.48, z: 0 },    // RIGHT_HIP
    // Legs (indices 25-32)
    { index: 25, x: 0.42, y: 0.65, z: 0 },    // LEFT_KNEE
    { index: 26, x: 0.58, y: 0.65, z: 0 },    // RIGHT_KNEE
    { index: 27, x: 0.42, y: 0.85, z: 0.02 }, // LEFT_ANKLE
    { index: 28, x: 0.58, y: 0.85, z: 0.02 }, // RIGHT_ANKLE
    { index: 29, x: 0.42, y: 0.88, z: -0.02 }, // LEFT_HEEL
    { index: 30, x: 0.58, y: 0.88, z: -0.02 }, // RIGHT_HEEL
    { index: 31, x: 0.42, y: 0.88, z: 0.05 }, // LEFT_FOOT_INDEX
    { index: 32, x: 0.58, y: 0.88, z: 0.05 }, // RIGHT_FOOT_INDEX
  ];
}

// Helper function to generate squat bottom position
function generateSquatBottomKeypoints(): KeypointPosition[] {
  return [
    // Head and face (indices 0-10) - slightly forward lean
    { index: 0, x: 0.5, y: 0.25, z: 0.08 },
    { index: 1, x: 0.48, y: 0.23, z: 0.09 },
    { index: 2, x: 0.46, y: 0.23, z: 0.1 },
    { index: 3, x: 0.44, y: 0.23, z: 0.09 },
    { index: 4, x: 0.52, y: 0.23, z: 0.09 },
    { index: 5, x: 0.54, y: 0.23, z: 0.1 },
    { index: 6, x: 0.56, y: 0.23, z: 0.09 },
    { index: 7, x: 0.4, y: 0.24, z: 0.06 },
    { index: 8, x: 0.6, y: 0.24, z: 0.06 },
    { index: 9, x: 0.48, y: 0.27, z: 0.09 },
    { index: 10, x: 0.52, y: 0.27, z: 0.09 },
    // Torso - forward lean
    { index: 11, x: 0.38, y: 0.35, z: 0.06 },
    { index: 12, x: 0.62, y: 0.35, z: 0.06 },
    // Arms - extended forward for balance
    { index: 13, x: 0.32, y: 0.42, z: 0.12 },
    { index: 14, x: 0.68, y: 0.42, z: 0.12 },
    { index: 15, x: 0.28, y: 0.4, z: 0.2 },
    { index: 16, x: 0.72, y: 0.4, z: 0.2 },
    { index: 17, x: 0.26, y: 0.4, z: 0.22 },
    { index: 18, x: 0.74, y: 0.4, z: 0.22 },
    { index: 19, x: 0.27, y: 0.4, z: 0.23 },
    { index: 20, x: 0.73, y: 0.4, z: 0.23 },
    { index: 21, x: 0.28, y: 0.4, z: 0.24 },
    { index: 22, x: 0.72, y: 0.4, z: 0.24 },
    // Hips - lowered
    { index: 23, x: 0.42, y: 0.55, z: -0.05 },
    { index: 24, x: 0.58, y: 0.55, z: -0.05 },
    // Knees - bent forward
    { index: 25, x: 0.38, y: 0.7, z: 0.15 },
    { index: 26, x: 0.62, y: 0.7, z: 0.15 },
    // Ankles
    { index: 27, x: 0.4, y: 0.85, z: 0.02 },
    { index: 28, x: 0.6, y: 0.85, z: 0.02 },
    { index: 29, x: 0.4, y: 0.88, z: -0.02 },
    { index: 30, x: 0.6, y: 0.88, z: -0.02 },
    { index: 31, x: 0.4, y: 0.88, z: 0.05 },
    { index: 32, x: 0.6, y: 0.88, z: 0.05 },
  ];
}

// Helper function to interpolate between two pose positions
function interpolatePositions(
  from: KeypointPosition[],
  to: KeypointPosition[],
  t: number
): KeypointPosition[] {
  return from.map((fromPoint, index) => {
    const toPoint = to[index];
    return {
      index: fromPoint.index,
      x: fromPoint.x + (toPoint.x - fromPoint.x) * t,
      y: fromPoint.y + (toPoint.y - fromPoint.y) * t,
      z: fromPoint.z + (toPoint.z - fromPoint.z) * t,
    };
  });
}

// Squat ideal form data
export const SQUAT_IDEAL_FORM: ExerciseIdealForm = {
  exerciseType: 'squat',
  name: 'Squat',
  nameKo: '스쿼트',
  phases: [
    {
      id: 'standing',
      name: 'Standing',
      nameKo: '서있음',
      duration: 500,
      keypointPositions: generateStandingKeypoints(),
    },
    {
      id: 'descending',
      name: 'Descending',
      nameKo: '내려가는 중',
      duration: 1000,
      keypointPositions: interpolatePositions(
        generateStandingKeypoints(),
        generateSquatBottomKeypoints(),
        0.5
      ),
    },
    {
      id: 'bottom',
      name: 'Bottom Position',
      nameKo: '최저점',
      duration: 500,
      keypointPositions: generateSquatBottomKeypoints(),
    },
    {
      id: 'ascending',
      name: 'Ascending',
      nameKo: '올라오는 중',
      duration: 1000,
      keypointPositions: interpolatePositions(
        generateSquatBottomKeypoints(),
        generateStandingKeypoints(),
        0.5
      ),
    },
  ],
  angles: [
    {
      jointType: 'kneeFlexion',
      idealValue: 90,
      acceptableRange: { min: 80, max: 100 },
      warningThreshold: 15,
      description: 'Knee bend at bottom position',
      descriptionKo: '최저점에서 무릎 굽힘',
    },
    {
      jointType: 'hipFlexion',
      idealValue: 85,
      acceptableRange: { min: 75, max: 95 },
      warningThreshold: 15,
      description: 'Hip angle at bottom position',
      descriptionKo: '최저점에서 엉덩이 각도',
    },
    {
      jointType: 'torsoAngle',
      idealValue: 25,
      acceptableRange: { min: 15, max: 35 },
      warningThreshold: 10,
      description: 'Torso forward lean',
      descriptionKo: '상체 기울기',
    },
    {
      jointType: 'ankleAngle',
      idealValue: 75,
      acceptableRange: { min: 65, max: 85 },
      warningThreshold: 10,
      description: 'Ankle dorsiflexion',
      descriptionKo: '발목 굽힘',
    },
  ],
};

// Pushup ideal form data
function generatePushupUpKeypoints(): KeypointPosition[] {
  return [
    // Head - looking slightly forward
    { index: 0, x: 0.15, y: 0.35, z: 0.1 },
    { index: 1, x: 0.14, y: 0.33, z: 0.11 },
    { index: 2, x: 0.13, y: 0.33, z: 0.12 },
    { index: 3, x: 0.12, y: 0.33, z: 0.11 },
    { index: 4, x: 0.16, y: 0.33, z: 0.11 },
    { index: 5, x: 0.17, y: 0.33, z: 0.12 },
    { index: 6, x: 0.18, y: 0.33, z: 0.11 },
    { index: 7, x: 0.11, y: 0.35, z: 0.08 },
    { index: 8, x: 0.19, y: 0.35, z: 0.08 },
    { index: 9, x: 0.14, y: 0.37, z: 0.11 },
    { index: 10, x: 0.16, y: 0.37, z: 0.11 },
    // Shoulders - horizontal plank
    { index: 11, x: 0.25, y: 0.4, z: 0.05 },
    { index: 12, x: 0.25, y: 0.4, z: -0.05 },
    // Arms - straight in up position
    { index: 13, x: 0.25, y: 0.6, z: 0.05 },
    { index: 14, x: 0.25, y: 0.6, z: -0.05 },
    { index: 15, x: 0.25, y: 0.8, z: 0.05 },
    { index: 16, x: 0.25, y: 0.8, z: -0.05 },
    { index: 17, x: 0.25, y: 0.82, z: 0.06 },
    { index: 18, x: 0.25, y: 0.82, z: -0.06 },
    { index: 19, x: 0.25, y: 0.82, z: 0.05 },
    { index: 20, x: 0.25, y: 0.82, z: -0.05 },
    { index: 21, x: 0.25, y: 0.81, z: 0.04 },
    { index: 22, x: 0.25, y: 0.81, z: -0.04 },
    // Hips - inline with shoulders
    { index: 23, x: 0.55, y: 0.4, z: 0.04 },
    { index: 24, x: 0.55, y: 0.4, z: -0.04 },
    // Knees - straight
    { index: 25, x: 0.72, y: 0.4, z: 0.04 },
    { index: 26, x: 0.72, y: 0.4, z: -0.04 },
    // Ankles/feet
    { index: 27, x: 0.88, y: 0.4, z: 0.04 },
    { index: 28, x: 0.88, y: 0.4, z: -0.04 },
    { index: 29, x: 0.9, y: 0.42, z: 0.04 },
    { index: 30, x: 0.9, y: 0.42, z: -0.04 },
    { index: 31, x: 0.86, y: 0.38, z: 0.04 },
    { index: 32, x: 0.86, y: 0.38, z: -0.04 },
  ];
}

function generatePushupDownKeypoints(): KeypointPosition[] {
  return [
    // Head - closer to ground
    { index: 0, x: 0.15, y: 0.55, z: 0.1 },
    { index: 1, x: 0.14, y: 0.53, z: 0.11 },
    { index: 2, x: 0.13, y: 0.53, z: 0.12 },
    { index: 3, x: 0.12, y: 0.53, z: 0.11 },
    { index: 4, x: 0.16, y: 0.53, z: 0.11 },
    { index: 5, x: 0.17, y: 0.53, z: 0.12 },
    { index: 6, x: 0.18, y: 0.53, z: 0.11 },
    { index: 7, x: 0.11, y: 0.55, z: 0.08 },
    { index: 8, x: 0.19, y: 0.55, z: 0.08 },
    { index: 9, x: 0.14, y: 0.57, z: 0.11 },
    { index: 10, x: 0.16, y: 0.57, z: 0.11 },
    // Shoulders - lowered
    { index: 11, x: 0.25, y: 0.6, z: 0.05 },
    { index: 12, x: 0.25, y: 0.6, z: -0.05 },
    // Elbows - bent at 90 degrees
    { index: 13, x: 0.32, y: 0.7, z: 0.12 },
    { index: 14, x: 0.32, y: 0.7, z: -0.12 },
    { index: 15, x: 0.25, y: 0.8, z: 0.05 },
    { index: 16, x: 0.25, y: 0.8, z: -0.05 },
    { index: 17, x: 0.25, y: 0.82, z: 0.06 },
    { index: 18, x: 0.25, y: 0.82, z: -0.06 },
    { index: 19, x: 0.25, y: 0.82, z: 0.05 },
    { index: 20, x: 0.25, y: 0.82, z: -0.05 },
    { index: 21, x: 0.25, y: 0.81, z: 0.04 },
    { index: 22, x: 0.25, y: 0.81, z: -0.04 },
    // Hips - inline with shoulders
    { index: 23, x: 0.55, y: 0.6, z: 0.04 },
    { index: 24, x: 0.55, y: 0.6, z: -0.04 },
    // Knees
    { index: 25, x: 0.72, y: 0.58, z: 0.04 },
    { index: 26, x: 0.72, y: 0.58, z: -0.04 },
    // Ankles/feet
    { index: 27, x: 0.88, y: 0.56, z: 0.04 },
    { index: 28, x: 0.88, y: 0.56, z: -0.04 },
    { index: 29, x: 0.9, y: 0.58, z: 0.04 },
    { index: 30, x: 0.9, y: 0.58, z: -0.04 },
    { index: 31, x: 0.86, y: 0.54, z: 0.04 },
    { index: 32, x: 0.86, y: 0.54, z: -0.04 },
  ];
}

export const PUSHUP_IDEAL_FORM: ExerciseIdealForm = {
  exerciseType: 'pushup',
  name: 'Push-up',
  nameKo: '푸시업',
  phases: [
    {
      id: 'up',
      name: 'Up Position',
      nameKo: '위 자세',
      duration: 500,
      keypointPositions: generatePushupUpKeypoints(),
    },
    {
      id: 'descending',
      name: 'Descending',
      nameKo: '내려가는 중',
      duration: 1000,
      keypointPositions: interpolatePositions(
        generatePushupUpKeypoints(),
        generatePushupDownKeypoints(),
        0.5
      ),
    },
    {
      id: 'down',
      name: 'Down Position',
      nameKo: '아래 자세',
      duration: 500,
      keypointPositions: generatePushupDownKeypoints(),
    },
    {
      id: 'ascending',
      name: 'Ascending',
      nameKo: '올라오는 중',
      duration: 1000,
      keypointPositions: interpolatePositions(
        generatePushupDownKeypoints(),
        generatePushupUpKeypoints(),
        0.5
      ),
    },
  ],
  angles: [
    {
      jointType: 'elbowAngle',
      idealValue: 90,
      acceptableRange: { min: 80, max: 100 },
      warningThreshold: 15,
      description: 'Elbow bend at bottom position',
      descriptionKo: '아래 자세에서 팔꿈치 굽힘',
    },
    {
      jointType: 'shoulderAngle',
      idealValue: 45,
      acceptableRange: { min: 35, max: 55 },
      warningThreshold: 10,
      description: 'Upper arm angle relative to torso',
      descriptionKo: '상체 대비 팔 각도',
    },
    {
      jointType: 'torsoAngle',
      idealValue: 0,
      acceptableRange: { min: -5, max: 5 },
      warningThreshold: 10,
      description: 'Body should be straight',
      descriptionKo: '몸이 일직선이어야 함',
    },
    {
      jointType: 'hipFlexion',
      idealValue: 180,
      acceptableRange: { min: 170, max: 190 },
      warningThreshold: 10,
      description: 'Hips should be inline with body',
      descriptionKo: '엉덩이가 몸과 일직선이어야 함',
    },
  ],
};

// Lunge ideal form data
function generateLungeStandingKeypoints(): KeypointPosition[] {
  return generateStandingKeypoints();
}

function generateLungeBottomKeypoints(): KeypointPosition[] {
  return [
    // Head
    { index: 0, x: 0.5, y: 0.15, z: 0.02 },
    { index: 1, x: 0.48, y: 0.13, z: 0.03 },
    { index: 2, x: 0.46, y: 0.13, z: 0.04 },
    { index: 3, x: 0.44, y: 0.13, z: 0.03 },
    { index: 4, x: 0.52, y: 0.13, z: 0.03 },
    { index: 5, x: 0.54, y: 0.13, z: 0.04 },
    { index: 6, x: 0.56, y: 0.13, z: 0.03 },
    { index: 7, x: 0.4, y: 0.14, z: 0 },
    { index: 8, x: 0.6, y: 0.14, z: 0 },
    { index: 9, x: 0.48, y: 0.17, z: 0.03 },
    { index: 10, x: 0.52, y: 0.17, z: 0.03 },
    // Shoulders - upright torso
    { index: 11, x: 0.4, y: 0.27, z: 0 },
    { index: 12, x: 0.6, y: 0.27, z: 0 },
    // Arms at sides
    { index: 13, x: 0.35, y: 0.4, z: 0 },
    { index: 14, x: 0.65, y: 0.4, z: 0 },
    { index: 15, x: 0.33, y: 0.52, z: 0 },
    { index: 16, x: 0.67, y: 0.52, z: 0 },
    { index: 17, x: 0.32, y: 0.54, z: 0 },
    { index: 18, x: 0.68, y: 0.54, z: 0 },
    { index: 19, x: 0.32, y: 0.54, z: 0.01 },
    { index: 20, x: 0.68, y: 0.54, z: 0.01 },
    { index: 21, x: 0.33, y: 0.53, z: 0.02 },
    { index: 22, x: 0.67, y: 0.53, z: 0.02 },
    // Hips - lowered
    { index: 23, x: 0.45, y: 0.5, z: 0 },
    { index: 24, x: 0.55, y: 0.5, z: 0 },
    // Front leg bent at 90 degrees
    { index: 25, x: 0.35, y: 0.65, z: 0.15 },
    { index: 26, x: 0.65, y: 0.75, z: -0.1 },
    // Ankles
    { index: 27, x: 0.35, y: 0.85, z: 0.15 },
    { index: 28, x: 0.75, y: 0.85, z: -0.15 },
    { index: 29, x: 0.35, y: 0.88, z: 0.12 },
    { index: 30, x: 0.78, y: 0.88, z: -0.18 },
    { index: 31, x: 0.35, y: 0.88, z: 0.18 },
    { index: 32, x: 0.72, y: 0.88, z: -0.12 },
  ];
}

export const LUNGE_IDEAL_FORM: ExerciseIdealForm = {
  exerciseType: 'lunge',
  name: 'Lunge',
  nameKo: '런지',
  phases: [
    {
      id: 'standing',
      name: 'Standing',
      nameKo: '서있음',
      duration: 500,
      keypointPositions: generateLungeStandingKeypoints(),
    },
    {
      id: 'descending',
      name: 'Descending',
      nameKo: '내려가는 중',
      duration: 1000,
      keypointPositions: interpolatePositions(
        generateLungeStandingKeypoints(),
        generateLungeBottomKeypoints(),
        0.5
      ),
    },
    {
      id: 'bottom',
      name: 'Bottom Position',
      nameKo: '최저점',
      duration: 500,
      keypointPositions: generateLungeBottomKeypoints(),
    },
    {
      id: 'ascending',
      name: 'Ascending',
      nameKo: '올라오는 중',
      duration: 1000,
      keypointPositions: interpolatePositions(
        generateLungeBottomKeypoints(),
        generateLungeStandingKeypoints(),
        0.5
      ),
    },
  ],
  angles: [
    {
      jointType: 'kneeFlexion',
      idealValue: 90,
      acceptableRange: { min: 80, max: 100 },
      warningThreshold: 15,
      description: 'Front knee bend at bottom',
      descriptionKo: '앞 무릎 굽힘 (최저점)',
    },
    {
      jointType: 'hipFlexion',
      idealValue: 90,
      acceptableRange: { min: 80, max: 100 },
      warningThreshold: 15,
      description: 'Hip angle at bottom',
      descriptionKo: '엉덩이 각도 (최저점)',
    },
    {
      jointType: 'torsoAngle',
      idealValue: 0,
      acceptableRange: { min: -5, max: 10 },
      warningThreshold: 10,
      description: 'Keep torso upright',
      descriptionKo: '상체 수직 유지',
    },
  ],
};

// Plank ideal form data
function generatePlankKeypoints(): KeypointPosition[] {
  return [
    // Head - neutral position
    { index: 0, x: 0.15, y: 0.4, z: 0.1 },
    { index: 1, x: 0.14, y: 0.38, z: 0.11 },
    { index: 2, x: 0.13, y: 0.38, z: 0.12 },
    { index: 3, x: 0.12, y: 0.38, z: 0.11 },
    { index: 4, x: 0.16, y: 0.38, z: 0.11 },
    { index: 5, x: 0.17, y: 0.38, z: 0.12 },
    { index: 6, x: 0.18, y: 0.38, z: 0.11 },
    { index: 7, x: 0.11, y: 0.4, z: 0.08 },
    { index: 8, x: 0.19, y: 0.4, z: 0.08 },
    { index: 9, x: 0.14, y: 0.42, z: 0.11 },
    { index: 10, x: 0.16, y: 0.42, z: 0.11 },
    // Shoulders
    { index: 11, x: 0.25, y: 0.45, z: 0.05 },
    { index: 12, x: 0.25, y: 0.45, z: -0.05 },
    // Elbows - under shoulders for forearm plank
    { index: 13, x: 0.25, y: 0.65, z: 0.05 },
    { index: 14, x: 0.25, y: 0.65, z: -0.05 },
    // Wrists - forward of elbows
    { index: 15, x: 0.15, y: 0.7, z: 0.05 },
    { index: 16, x: 0.15, y: 0.7, z: -0.05 },
    { index: 17, x: 0.13, y: 0.7, z: 0.06 },
    { index: 18, x: 0.13, y: 0.7, z: -0.06 },
    { index: 19, x: 0.14, y: 0.7, z: 0.05 },
    { index: 20, x: 0.14, y: 0.7, z: -0.05 },
    { index: 21, x: 0.14, y: 0.69, z: 0.04 },
    { index: 22, x: 0.14, y: 0.69, z: -0.04 },
    // Hips - inline
    { index: 23, x: 0.55, y: 0.45, z: 0.04 },
    { index: 24, x: 0.55, y: 0.45, z: -0.04 },
    // Knees
    { index: 25, x: 0.72, y: 0.45, z: 0.04 },
    { index: 26, x: 0.72, y: 0.45, z: -0.04 },
    // Feet
    { index: 27, x: 0.88, y: 0.45, z: 0.04 },
    { index: 28, x: 0.88, y: 0.45, z: -0.04 },
    { index: 29, x: 0.9, y: 0.47, z: 0.04 },
    { index: 30, x: 0.9, y: 0.47, z: -0.04 },
    { index: 31, x: 0.86, y: 0.43, z: 0.04 },
    { index: 32, x: 0.86, y: 0.43, z: -0.04 },
  ];
}

export const PLANK_IDEAL_FORM: ExerciseIdealForm = {
  exerciseType: 'plank',
  name: 'Plank',
  nameKo: '플랭크',
  phases: [
    {
      id: 'hold',
      name: 'Hold Position',
      nameKo: '유지 자세',
      duration: 2000,
      keypointPositions: generatePlankKeypoints(),
    },
  ],
  angles: [
    {
      jointType: 'torsoAngle',
      idealValue: 0,
      acceptableRange: { min: -5, max: 5 },
      warningThreshold: 10,
      description: 'Body should be straight',
      descriptionKo: '몸이 일직선이어야 함',
    },
    {
      jointType: 'hipFlexion',
      idealValue: 180,
      acceptableRange: { min: 170, max: 190 },
      warningThreshold: 10,
      description: 'No hip sag or pike',
      descriptionKo: '엉덩이가 처지거나 올라가지 않아야 함',
    },
    {
      jointType: 'shoulderAngle',
      idealValue: 90,
      acceptableRange: { min: 80, max: 100 },
      warningThreshold: 10,
      description: 'Arms perpendicular to floor',
      descriptionKo: '팔이 바닥에 수직이어야 함',
    },
  ],
};

// Deadlift ideal form data
function generateDeadliftStandingKeypoints(): KeypointPosition[] {
  return generateStandingKeypoints();
}

function generateDeadliftBottomKeypoints(): KeypointPosition[] {
  return [
    // Head - looking forward
    { index: 0, x: 0.5, y: 0.35, z: 0.15 },
    { index: 1, x: 0.48, y: 0.33, z: 0.16 },
    { index: 2, x: 0.46, y: 0.33, z: 0.17 },
    { index: 3, x: 0.44, y: 0.33, z: 0.16 },
    { index: 4, x: 0.52, y: 0.33, z: 0.16 },
    { index: 5, x: 0.54, y: 0.33, z: 0.17 },
    { index: 6, x: 0.56, y: 0.33, z: 0.16 },
    { index: 7, x: 0.4, y: 0.35, z: 0.13 },
    { index: 8, x: 0.6, y: 0.35, z: 0.13 },
    { index: 9, x: 0.48, y: 0.37, z: 0.16 },
    { index: 10, x: 0.52, y: 0.37, z: 0.16 },
    // Shoulders - forward lean
    { index: 11, x: 0.4, y: 0.45, z: 0.12 },
    { index: 12, x: 0.6, y: 0.45, z: 0.12 },
    // Arms hanging straight
    { index: 13, x: 0.4, y: 0.6, z: 0.08 },
    { index: 14, x: 0.6, y: 0.6, z: 0.08 },
    { index: 15, x: 0.42, y: 0.78, z: 0.05 },
    { index: 16, x: 0.58, y: 0.78, z: 0.05 },
    { index: 17, x: 0.42, y: 0.8, z: 0.05 },
    { index: 18, x: 0.58, y: 0.8, z: 0.05 },
    { index: 19, x: 0.42, y: 0.8, z: 0.06 },
    { index: 20, x: 0.58, y: 0.8, z: 0.06 },
    { index: 21, x: 0.43, y: 0.79, z: 0.07 },
    { index: 22, x: 0.57, y: 0.79, z: 0.07 },
    // Hips - back
    { index: 23, x: 0.45, y: 0.55, z: -0.08 },
    { index: 24, x: 0.55, y: 0.55, z: -0.08 },
    // Knees - slightly bent
    { index: 25, x: 0.42, y: 0.7, z: 0.05 },
    { index: 26, x: 0.58, y: 0.7, z: 0.05 },
    // Ankles
    { index: 27, x: 0.42, y: 0.85, z: 0.02 },
    { index: 28, x: 0.58, y: 0.85, z: 0.02 },
    { index: 29, x: 0.42, y: 0.88, z: -0.02 },
    { index: 30, x: 0.58, y: 0.88, z: -0.02 },
    { index: 31, x: 0.42, y: 0.88, z: 0.05 },
    { index: 32, x: 0.58, y: 0.88, z: 0.05 },
  ];
}

export const DEADLIFT_IDEAL_FORM: ExerciseIdealForm = {
  exerciseType: 'deadlift',
  name: 'Deadlift',
  nameKo: '데드리프트',
  phases: [
    {
      id: 'standing',
      name: 'Standing',
      nameKo: '서있음',
      duration: 500,
      keypointPositions: generateDeadliftStandingKeypoints(),
    },
    {
      id: 'descending',
      name: 'Descending',
      nameKo: '내려가는 중',
      duration: 1000,
      keypointPositions: interpolatePositions(
        generateDeadliftStandingKeypoints(),
        generateDeadliftBottomKeypoints(),
        0.5
      ),
    },
    {
      id: 'bottom',
      name: 'Bottom Position',
      nameKo: '최저점',
      duration: 500,
      keypointPositions: generateDeadliftBottomKeypoints(),
    },
    {
      id: 'ascending',
      name: 'Ascending',
      nameKo: '올라오는 중',
      duration: 1000,
      keypointPositions: interpolatePositions(
        generateDeadliftBottomKeypoints(),
        generateDeadliftStandingKeypoints(),
        0.5
      ),
    },
  ],
  angles: [
    {
      jointType: 'hipFlexion',
      idealValue: 45,
      acceptableRange: { min: 35, max: 55 },
      warningThreshold: 10,
      description: 'Hip hinge angle',
      descriptionKo: '엉덩이 힌지 각도',
    },
    {
      jointType: 'kneeFlexion',
      idealValue: 30,
      acceptableRange: { min: 20, max: 40 },
      warningThreshold: 10,
      description: 'Slight knee bend',
      descriptionKo: '약간의 무릎 굽힘',
    },
    {
      jointType: 'torsoAngle',
      idealValue: 45,
      acceptableRange: { min: 35, max: 55 },
      warningThreshold: 10,
      description: 'Back angle (maintain flat back)',
      descriptionKo: '등 각도 (평평하게 유지)',
    },
    {
      jointType: 'spineAlignment',
      idealValue: 180,
      acceptableRange: { min: 170, max: 190 },
      warningThreshold: 10,
      description: 'Keep spine neutral',
      descriptionKo: '척추 중립 유지',
    },
  ],
};

// Exercise form lookup
export const EXERCISE_IDEAL_FORMS: Record<string, ExerciseIdealForm> = {
  squat: SQUAT_IDEAL_FORM,
  pushup: PUSHUP_IDEAL_FORM,
  lunge: LUNGE_IDEAL_FORM,
  plank: PLANK_IDEAL_FORM,
  deadlift: DEADLIFT_IDEAL_FORM,
};

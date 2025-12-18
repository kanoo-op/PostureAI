/**
 * Mock Keypoint Factory for Exercise Analyzer Tests
 * Provides consistent mock keypoints for testing 3D angle calculations,
 * phase detection, and feedback generation.
 */

import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'

export interface MockKeypoint {
  x: number
  y: number
  z: number
  score: number
}

/**
 * Creates an array of 33 mock BlazePose keypoints with default high confidence
 * @param overrides - Partial keypoint overrides by index or name
 */
export function createMockKeypoints(
  overrides?: Partial<Record<number | keyof typeof BLAZEPOSE_KEYPOINTS, Partial<MockKeypoint>>>
): MockKeypoint[] {
  // Initialize all 33 keypoints with default valid positions
  const keypoints: MockKeypoint[] = Array(33).fill(null).map(() => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    score: 0.9,
  }))

  // Apply overrides
  if (overrides) {
    Object.entries(overrides).forEach(([key, value]) => {
      const index = isNaN(Number(key))
        ? BLAZEPOSE_KEYPOINTS[key as keyof typeof BLAZEPOSE_KEYPOINTS]
        : Number(key)
      if (index !== undefined && value) {
        keypoints[index] = { ...keypoints[index], ...value }
      }
    })
  }

  return keypoints
}

/**
 * Creates keypoints for a standing person (default anatomical position)
 */
export function createStandingPoseKeypoints(): MockKeypoint[] {
  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.5, y: 0.1, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EYE_INNER]: { x: 0.48, y: 0.09, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EYE]: { x: 0.47, y: 0.09, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EYE_OUTER]: { x: 0.46, y: 0.09, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EYE_INNER]: { x: 0.52, y: 0.09, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EYE]: { x: 0.53, y: 0.09, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EYE_OUTER]: { x: 0.54, y: 0.09, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.45, y: 0.08, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.55, y: 0.08, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.MOUTH_LEFT]: { x: 0.48, y: 0.12, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.MOUTH_RIGHT]: { x: 0.52, y: 0.12, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.4, y: 0.2, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.6, y: 0.2, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ELBOW]: { x: 0.38, y: 0.35, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW]: { x: 0.62, y: 0.35, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_WRIST]: { x: 0.36, y: 0.5, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_WRIST]: { x: 0.64, y: 0.5, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_PINKY]: { x: 0.35, y: 0.52, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_PINKY]: { x: 0.65, y: 0.52, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_INDEX]: { x: 0.36, y: 0.53, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_INDEX]: { x: 0.64, y: 0.53, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_THUMB]: { x: 0.37, y: 0.51, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_THUMB]: { x: 0.63, y: 0.51, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.42, y: 0.5, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.58, y: 0.5, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.42, y: 0.7, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.58, y: 0.7, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.42, y: 0.9, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.58, y: 0.9, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HEEL]: { x: 0.40, y: 0.92, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HEEL]: { x: 0.60, y: 0.92, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_FOOT_INDEX]: { x: 0.44, y: 0.93, z: 0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_FOOT_INDEX]: { x: 0.56, y: 0.93, z: 0.05, score: 0.9 },
  })
}

/**
 * Creates keypoints for squat bottom position
 */
export function createSquatBottomKeypoints(): MockKeypoint[] {
  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.5, y: 0.25, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.45, y: 0.23, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.55, y: 0.23, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.4, y: 0.35, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.6, y: 0.35, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ELBOW]: { x: 0.38, y: 0.45, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW]: { x: 0.62, y: 0.45, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_WRIST]: { x: 0.36, y: 0.55, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_WRIST]: { x: 0.64, y: 0.55, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.42, y: 0.6, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.58, y: 0.6, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.38, y: 0.65, z: 0.1, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.62, y: 0.65, z: 0.1, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.42, y: 0.9, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.58, y: 0.9, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HEEL]: { x: 0.40, y: 0.92, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HEEL]: { x: 0.60, y: 0.92, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_FOOT_INDEX]: { x: 0.44, y: 0.93, z: 0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_FOOT_INDEX]: { x: 0.56, y: 0.93, z: 0.05, score: 0.9 },
  })
}

/**
 * Creates keypoints for lunge position (left leg forward)
 */
export function createLungeKeypoints(frontLeg: 'left' | 'right' = 'left'): MockKeypoint[] {
  const isLeftFront = frontLeg === 'left'
  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.5, y: 0.15, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.45, y: 0.13, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.55, y: 0.13, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.4, y: 0.25, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.6, y: 0.25, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.42, y: 0.5, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.58, y: 0.5, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: isLeftFront ? 0.3 : 0.42, y: isLeftFront ? 0.6 : 0.75, z: isLeftFront ? -0.1 : 0.1, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: isLeftFront ? 0.58 : 0.7, y: isLeftFront ? 0.75 : 0.6, z: isLeftFront ? 0.1 : -0.1, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: isLeftFront ? 0.25 : 0.42, y: 0.9, z: isLeftFront ? -0.15 : 0.15, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: isLeftFront ? 0.58 : 0.75, y: 0.9, z: isLeftFront ? 0.15 : -0.15, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_FOOT_INDEX]: { x: isLeftFront ? 0.23 : 0.44, y: 0.92, z: isLeftFront ? -0.18 : 0.12, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_FOOT_INDEX]: { x: isLeftFront ? 0.56 : 0.77, y: 0.92, z: isLeftFront ? 0.12 : -0.18, score: 0.9 },
  })
}

/**
 * Creates keypoints for deadlift setup position
 */
export function createDeadliftSetupKeypoints(): MockKeypoint[] {
  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.5, y: 0.35, z: -0.1, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.45, y: 0.33, z: -0.1, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.55, y: 0.33, z: -0.1, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.4, y: 0.4, z: -0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.6, y: 0.4, z: -0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.42, y: 0.55, z: 0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.58, y: 0.55, z: 0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.42, y: 0.7, z: 0.02, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.58, y: 0.7, z: 0.02, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.42, y: 0.9, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.58, y: 0.9, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_WRIST]: { x: 0.42, y: 0.75, z: -0.1, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_WRIST]: { x: 0.58, y: 0.75, z: -0.1, score: 0.9 },
  })
}

/**
 * Creates keypoints for deadlift lockout position (standing tall)
 */
export function createDeadliftLockoutKeypoints(): MockKeypoint[] {
  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.5, y: 0.1, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.45, y: 0.08, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.55, y: 0.08, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.4, y: 0.2, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.6, y: 0.2, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.42, y: 0.5, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.58, y: 0.5, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.42, y: 0.7, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.58, y: 0.7, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.42, y: 0.9, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.58, y: 0.9, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_WRIST]: { x: 0.35, y: 0.55, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_WRIST]: { x: 0.65, y: 0.55, z: 0, score: 0.9 },
  })
}

/**
 * Creates keypoints for pushup top position (arms extended)
 */
export function createPushupTopKeypoints(): MockKeypoint[] {
  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.2, y: 0.4, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.18, y: 0.38, z: -0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.18, y: 0.38, z: 0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.25, y: 0.45, z: -0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.25, y: 0.45, z: 0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ELBOW]: { x: 0.25, y: 0.48, z: -0.1, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW]: { x: 0.25, y: 0.48, z: 0.1, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_WRIST]: { x: 0.25, y: 0.55, z: -0.12, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_WRIST]: { x: 0.25, y: 0.55, z: 0.12, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.55, y: 0.45, z: -0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.55, y: 0.45, z: 0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.70, y: 0.45, z: -0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.70, y: 0.45, z: 0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.85, y: 0.45, z: -0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.85, y: 0.45, z: 0.03, score: 0.9 },
  })
}

/**
 * Creates keypoints for pushup bottom position
 */
export function createPushupBottomKeypoints(): MockKeypoint[] {
  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.2, y: 0.55, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.18, y: 0.53, z: -0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.18, y: 0.53, z: 0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.25, y: 0.5, z: -0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.25, y: 0.5, z: 0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ELBOW]: { x: 0.28, y: 0.52, z: -0.1, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW]: { x: 0.28, y: 0.52, z: 0.1, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_WRIST]: { x: 0.25, y: 0.55, z: -0.12, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_WRIST]: { x: 0.25, y: 0.55, z: 0.12, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.55, y: 0.5, z: -0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.55, y: 0.5, z: 0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.70, y: 0.5, z: -0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.70, y: 0.5, z: 0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.85, y: 0.5, z: -0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.85, y: 0.5, z: 0.03, score: 0.9 },
  })
}

/**
 * Creates keypoints for plank position
 */
export function createPlankKeypoints(): MockKeypoint[] {
  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.15, y: 0.45, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.13, y: 0.43, z: -0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.13, y: 0.43, z: 0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.2, y: 0.48, z: -0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.2, y: 0.48, z: 0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ELBOW]: { x: 0.18, y: 0.55, z: -0.08, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW]: { x: 0.18, y: 0.55, z: 0.08, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_WRIST]: { x: 0.15, y: 0.55, z: -0.1, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_WRIST]: { x: 0.15, y: 0.55, z: 0.1, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.55, y: 0.48, z: -0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.55, y: 0.48, z: 0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.70, y: 0.49, z: -0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.70, y: 0.49, z: 0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.85, y: 0.5, z: -0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.85, y: 0.5, z: 0.03, score: 0.9 },
  })
}

/**
 * Creates keypoints with hip sag (for plank error testing)
 */
export function createPlankHipSagKeypoints(): MockKeypoint[] {
  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.15, y: 0.45, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.13, y: 0.43, z: -0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.13, y: 0.43, z: 0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.2, y: 0.48, z: -0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.2, y: 0.48, z: 0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ELBOW]: { x: 0.18, y: 0.55, z: -0.08, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW]: { x: 0.18, y: 0.55, z: 0.08, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_WRIST]: { x: 0.15, y: 0.55, z: -0.1, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_WRIST]: { x: 0.15, y: 0.55, z: 0.1, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.55, y: 0.65, z: -0.03, score: 0.9 },  // Sagging hips
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.55, y: 0.65, z: 0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.70, y: 0.55, z: -0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.70, y: 0.55, z: 0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.85, y: 0.5, z: -0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.85, y: 0.5, z: 0.03, score: 0.9 },
  })
}

/**
 * Creates keypoints with low confidence (for edge case testing)
 */
export function createLowConfidenceKeypoints(indices: number[]): MockKeypoint[] {
  const keypoints = createStandingPoseKeypoints()
  indices.forEach(i => {
    if (keypoints[i]) {
      keypoints[i].score = 0.2
    }
  })
  return keypoints
}

/**
 * Creates keypoints with missing Z coordinates (2D only)
 */
export function createKeypoints2DOnly(): MockKeypoint[] {
  const keypoints = createStandingPoseKeypoints()
  return keypoints.map(kp => ({ ...kp, z: 0 }))
}

/**
 * Creates asymmetric keypoints for testing bilateral analysis
 */
export function createAsymmetricSquatKeypoints(): MockKeypoint[] {
  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.5, y: 0.25, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.45, y: 0.23, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.55, y: 0.23, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.4, y: 0.35, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.6, y: 0.35, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.42, y: 0.6, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.58, y: 0.6, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.35, y: 0.68, z: 0.15, score: 0.9 },  // More bent, wider stance
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.60, y: 0.62, z: 0.05, score: 0.9 }, // Less bent
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.40, y: 0.9, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.60, y: 0.9, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HEEL]: { x: 0.38, y: 0.92, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HEEL]: { x: 0.62, y: 0.92, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_FOOT_INDEX]: { x: 0.42, y: 0.93, z: 0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_FOOT_INDEX]: { x: 0.58, y: 0.93, z: 0.05, score: 0.9 },
  })
}

/**
 * Creates keypoints for a mid-squat descending position
 */
export function createSquatDescendingKeypoints(): MockKeypoint[] {
  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.5, y: 0.18, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.45, y: 0.16, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.55, y: 0.16, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.4, y: 0.28, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.6, y: 0.28, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.42, y: 0.55, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.58, y: 0.55, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.40, y: 0.68, z: 0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.60, y: 0.68, z: 0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.42, y: 0.9, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.58, y: 0.9, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HEEL]: { x: 0.40, y: 0.92, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HEEL]: { x: 0.60, y: 0.92, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_FOOT_INDEX]: { x: 0.44, y: 0.93, z: 0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_FOOT_INDEX]: { x: 0.56, y: 0.93, z: 0.05, score: 0.9 },
  })
}

/**
 * Creates keypoints for lunge standing position
 */
export function createLungeStandingKeypoints(): MockKeypoint[] {
  return createStandingPoseKeypoints()
}

/**
 * Creates keypoints for lunge bottom position with front knee at ~90 degrees
 */
export function createLungeBottomKeypoints(frontLeg: 'left' | 'right' = 'left'): MockKeypoint[] {
  const isLeftFront = frontLeg === 'left'
  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.5, y: 0.2, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.45, y: 0.18, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.55, y: 0.18, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.4, y: 0.3, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.6, y: 0.3, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.42, y: 0.55, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.58, y: 0.55, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: {
      x: isLeftFront ? 0.35 : 0.45,
      y: isLeftFront ? 0.65 : 0.80,
      z: isLeftFront ? -0.15 : 0.15,
      score: 0.9
    },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: {
      x: isLeftFront ? 0.55 : 0.65,
      y: isLeftFront ? 0.80 : 0.65,
      z: isLeftFront ? 0.15 : -0.15,
      score: 0.9
    },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: {
      x: isLeftFront ? 0.30 : 0.45,
      y: 0.9,
      z: isLeftFront ? -0.2 : 0.2,
      score: 0.9
    },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: {
      x: isLeftFront ? 0.55 : 0.70,
      y: 0.9,
      z: isLeftFront ? 0.2 : -0.2,
      score: 0.9
    },
    [BLAZEPOSE_KEYPOINTS.LEFT_FOOT_INDEX]: {
      x: isLeftFront ? 0.28 : 0.47,
      y: 0.92,
      z: isLeftFront ? -0.22 : 0.18,
      score: 0.9
    },
    [BLAZEPOSE_KEYPOINTS.RIGHT_FOOT_INDEX]: {
      x: isLeftFront ? 0.53 : 0.72,
      y: 0.92,
      z: isLeftFront ? 0.18 : -0.22,
      score: 0.9
    },
  })
}

/**
 * Creates keypoints for deadlift mid-lift position
 */
export function createDeadliftMidLiftKeypoints(): MockKeypoint[] {
  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.5, y: 0.22, z: -0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.45, y: 0.20, z: -0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.55, y: 0.20, z: -0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.4, y: 0.3, z: -0.02, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.6, y: 0.3, z: -0.02, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.42, y: 0.52, z: 0.02, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.58, y: 0.52, z: 0.02, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.42, y: 0.7, z: 0.01, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.58, y: 0.7, z: 0.01, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.42, y: 0.9, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.58, y: 0.9, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_WRIST]: { x: 0.40, y: 0.65, z: -0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_WRIST]: { x: 0.60, y: 0.65, z: -0.05, score: 0.9 },
  })
}

/**
 * Creates keypoints with spine rounding for deadlift error testing
 */
export function createDeadliftSpineRoundingKeypoints(): MockKeypoint[] {
  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.5, y: 0.40, z: -0.15, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.45, y: 0.38, z: -0.15, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.55, y: 0.38, z: -0.15, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.4, y: 0.45, z: -0.1, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.6, y: 0.45, z: -0.1, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.42, y: 0.55, z: 0.08, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.58, y: 0.55, z: 0.08, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.42, y: 0.7, z: 0.02, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.58, y: 0.7, z: 0.02, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.42, y: 0.9, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.58, y: 0.9, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_WRIST]: { x: 0.42, y: 0.80, z: -0.15, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_WRIST]: { x: 0.58, y: 0.80, z: -0.15, score: 0.9 },
  })
}

/**
 * Creates keypoints with pike position for plank error testing
 */
export function createPlankPikeKeypoints(): MockKeypoint[] {
  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.15, y: 0.45, z: 0, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.13, y: 0.43, z: -0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.13, y: 0.43, z: 0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.2, y: 0.48, z: -0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.2, y: 0.48, z: 0.05, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ELBOW]: { x: 0.18, y: 0.55, z: -0.08, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW]: { x: 0.18, y: 0.55, z: 0.08, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_WRIST]: { x: 0.15, y: 0.55, z: -0.1, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_WRIST]: { x: 0.15, y: 0.55, z: 0.1, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.55, y: 0.35, z: -0.03, score: 0.9 },  // Hips raised (pike)
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.55, y: 0.35, z: 0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.70, y: 0.42, z: -0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.70, y: 0.42, z: 0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.85, y: 0.5, z: -0.03, score: 0.9 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.85, y: 0.5, z: 0.03, score: 0.9 },
  })
}

// ============================================
// Precise Geometry Generators for 3D Angle Verification
// ============================================

/**
 * Creates keypoints with PRECISE 90-degree knee angle for verification
 * Mathematical setup: hip at (0.5, 0.4), knee at (0.5, 0.6), ankle at (0.7, 0.6)
 * This creates an exact 90-degree angle at the knee joint
 *
 * Expected calculate3DAngle(hip, knee, ankle) = 90 degrees
 */
export function createPrecise90DegreeKneeKeypoints(): MockKeypoint[] {
  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.5, y: 0.4, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.5, y: 0.6, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.7, y: 0.6, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.5, y: 0.4, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.5, y: 0.6, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.7, y: 0.6, z: 0, score: 0.95 },
    // Include other required keypoints with valid positions
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.45, y: 0.2, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.55, y: 0.2, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HEEL]: { x: 0.68, y: 0.62, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HEEL]: { x: 0.68, y: 0.62, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_FOOT_INDEX]: { x: 0.72, y: 0.6, z: 0.05, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_FOOT_INDEX]: { x: 0.72, y: 0.6, z: 0.05, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.5, y: 0.1, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.45, y: 0.08, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.55, y: 0.08, z: 0, score: 0.95 },
  })
}

/**
 * Creates keypoints with PRECISE 45-degree torso angle from vertical
 * Shoulder at (0.5 + d*sin(45), 0.3) where d is torso length
 * Hip at (0.5, 0.5)
 *
 * Expected calculateAngleWithVertical(hipCenter, shoulderCenter) = 45 degrees
 */
export function createPrecise45DegreeTorsoKeypoints(): MockKeypoint[] {
  const torsoLength = 0.2
  const angle45Rad = Math.PI / 4
  const shoulderOffset = torsoLength * Math.sin(angle45Rad) // ~0.1414
  const shoulderY = 0.5 - torsoLength * Math.cos(angle45Rad) // ~0.3586

  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.45, y: 0.5, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.55, y: 0.5, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.45 + shoulderOffset, y: shoulderY, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.55 + shoulderOffset, y: shoulderY, z: 0, score: 0.95 },
    // Include other required keypoints
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.42, y: 0.7, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.58, y: 0.7, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.42, y: 0.9, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.58, y: 0.9, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HEEL]: { x: 0.40, y: 0.92, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HEEL]: { x: 0.60, y: 0.92, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_FOOT_INDEX]: { x: 0.44, y: 0.93, z: 0.05, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_FOOT_INDEX]: { x: 0.56, y: 0.93, z: 0.05, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.5 + shoulderOffset + 0.05, y: shoulderY - 0.1, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.45 + shoulderOffset + 0.05, y: shoulderY - 0.1, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.55 + shoulderOffset + 0.05, y: shoulderY - 0.1, z: 0, score: 0.95 },
  })
}

/**
 * Creates keypoints with 3D depth variation for testing z-coordinate handling
 * Same XY positions as standing but with significant Z offsets
 */
export function create3DDepthVariationKeypoints(): MockKeypoint[] {
  const base = createStandingPoseKeypoints()
  // Add z-depth: left side forward (negative z), right side backward (positive z)
  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { ...base[BLAZEPOSE_KEYPOINTS.LEFT_HIP], z: -0.1 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { ...base[BLAZEPOSE_KEYPOINTS.RIGHT_HIP], z: 0.1 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { ...base[BLAZEPOSE_KEYPOINTS.LEFT_KNEE], z: -0.15 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { ...base[BLAZEPOSE_KEYPOINTS.RIGHT_KNEE], z: 0.15 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { ...base[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE], z: -0.12 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { ...base[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE], z: 0.12 },
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { ...base[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER], z: -0.08 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { ...base[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER], z: 0.08 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HEEL]: { ...base[BLAZEPOSE_KEYPOINTS.LEFT_HEEL], z: -0.12 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HEEL]: { ...base[BLAZEPOSE_KEYPOINTS.RIGHT_HEEL], z: 0.12 },
    [BLAZEPOSE_KEYPOINTS.LEFT_FOOT_INDEX]: { ...base[BLAZEPOSE_KEYPOINTS.LEFT_FOOT_INDEX], z: -0.1 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_FOOT_INDEX]: { ...base[BLAZEPOSE_KEYPOINTS.RIGHT_FOOT_INDEX], z: 0.15 },
  })
}

/**
 * Creates keypoints at phase boundary (knee angle exactly at threshold)
 * For testing hysteresis behavior
 */
export function createPhaseBoundaryKeypoints(kneeAngle: number): MockKeypoint[] {
  // Convert desired knee angle to keypoint positions
  // knee angle = angle at knee vertex between hip-knee and knee-ankle vectors
  const angleRad = kneeAngle * Math.PI / 180
  const legSegmentLength = 0.2

  // Fixed hip position
  const hipY = 0.5
  const kneeY = hipY + legSegmentLength

  // Ankle position depends on knee angle
  // For 180 degrees (straight), ankle is directly below knee
  // For smaller angles, ankle moves forward
  const ankleY = kneeY + legSegmentLength * Math.cos(Math.PI - angleRad)
  const ankleX = 0.5 + legSegmentLength * Math.sin(Math.PI - angleRad)

  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.5, y: hipY, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.5, y: kneeY, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: ankleX, y: ankleY, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.5, y: hipY, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.5, y: kneeY, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: ankleX, y: ankleY, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.45, y: 0.2, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.55, y: 0.2, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HEEL]: { x: ankleX - 0.02, y: ankleY + 0.02, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HEEL]: { x: ankleX - 0.02, y: ankleY + 0.02, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_FOOT_INDEX]: { x: ankleX + 0.02, y: ankleY + 0.01, z: 0.05, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_FOOT_INDEX]: { x: ankleX + 0.02, y: ankleY + 0.01, z: 0.05, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.5, y: 0.1, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.45, y: 0.08, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.55, y: 0.08, z: 0, score: 0.95 },
  })
}

/**
 * Creates degenerate geometry keypoints where points are collinear
 * Tests edge case handling when angle calculation would be 0 or 180
 */
export function createCollinearPointsKeypoints(): MockKeypoint[] {
  // Hip, knee, ankle all on same vertical line = 180 degree angle
  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.5, y: 0.4, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.5, y: 0.6, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.5, y: 0.8, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.5, y: 0.4, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.5, y: 0.6, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.5, y: 0.8, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.45, y: 0.2, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.55, y: 0.2, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HEEL]: { x: 0.48, y: 0.82, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HEEL]: { x: 0.52, y: 0.82, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_FOOT_INDEX]: { x: 0.5, y: 0.83, z: 0.05, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_FOOT_INDEX]: { x: 0.5, y: 0.83, z: 0.05, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.5, y: 0.1, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.45, y: 0.08, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.55, y: 0.08, z: 0, score: 0.95 },
  })
}

/**
 * Creates keypoints with asymmetric angles for symmetry testing
 * Left knee: ~90 degrees, Right knee: ~120 degrees
 */
export function createKneeAsymmetryKeypoints(leftAngle: number, rightAngle: number): MockKeypoint[] {
  const leftAngleRad = leftAngle * Math.PI / 180
  const rightAngleRad = rightAngle * Math.PI / 180
  const legLength = 0.2

  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.42, y: 0.5, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.42, y: 0.7, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: {
      x: 0.42 + legLength * Math.sin(Math.PI - leftAngleRad),
      y: 0.7 + legLength * Math.cos(Math.PI - leftAngleRad),
      z: 0,
      score: 0.95
    },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.58, y: 0.5, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.58, y: 0.7, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: {
      x: 0.58 + legLength * Math.sin(Math.PI - rightAngleRad),
      y: 0.7 + legLength * Math.cos(Math.PI - rightAngleRad),
      z: 0,
      score: 0.95
    },
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.4, y: 0.2, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.6, y: 0.2, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HEEL]: { x: 0.40, y: 0.92, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HEEL]: { x: 0.60, y: 0.92, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_FOOT_INDEX]: { x: 0.44, y: 0.93, z: 0.05, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_FOOT_INDEX]: { x: 0.56, y: 0.93, z: 0.05, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.5, y: 0.1, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.45, y: 0.08, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.55, y: 0.08, z: 0, score: 0.95 },
  })
}

/**
 * Creates keypoints for precise elbow angle testing (pushup)
 * Shoulder-elbow-wrist at exactly 90 degrees
 *
 * Expected calculate3DAngle(shoulder, elbow, wrist) = 90 degrees
 */
export function createPrecise90DegreeElbowKeypoints(): MockKeypoint[] {
  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.25, y: 0.45, z: -0.05, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ELBOW]: { x: 0.25, y: 0.55, z: -0.1, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_WRIST]: { x: 0.35, y: 0.55, z: -0.1, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.25, y: 0.45, z: 0.05, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW]: { x: 0.25, y: 0.55, z: 0.1, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_WRIST]: { x: 0.35, y: 0.55, z: 0.1, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.2, y: 0.4, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.18, y: 0.38, z: -0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.18, y: 0.38, z: 0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.55, y: 0.45, z: -0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.55, y: 0.45, z: 0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.70, y: 0.45, z: -0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.70, y: 0.45, z: 0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.85, y: 0.45, z: -0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.85, y: 0.45, z: 0.03, score: 0.95 },
  })
}

/**
 * Creates keypoints at elbow phase boundary for pushup testing
 */
export function createElbowPhaseBoundaryKeypoints(elbowAngle: number): MockKeypoint[] {
  const angleRad = elbowAngle * Math.PI / 180
  const armSegmentLength = 0.1

  // Fixed shoulder position (horizontal pushup position)
  const shoulderY = 0.45
  const elbowY = shoulderY + armSegmentLength

  // Wrist position depends on elbow angle
  const wristY = elbowY + armSegmentLength * Math.cos(Math.PI - angleRad)
  const wristX = 0.25 + armSegmentLength * Math.sin(Math.PI - angleRad)

  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.25, y: shoulderY, z: -0.05, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ELBOW]: { x: 0.25, y: elbowY, z: -0.1, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_WRIST]: { x: wristX, y: wristY, z: -0.12, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.25, y: shoulderY, z: 0.05, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW]: { x: 0.25, y: elbowY, z: 0.1, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_WRIST]: { x: wristX, y: wristY, z: 0.12, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.2, y: 0.4, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.18, y: 0.38, z: -0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.18, y: 0.38, z: 0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.55, y: 0.45, z: -0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.55, y: 0.45, z: 0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.70, y: 0.45, z: -0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.70, y: 0.45, z: 0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.85, y: 0.45, z: -0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.85, y: 0.45, z: 0.03, score: 0.95 },
  })
}

/**
 * Creates keypoints for precise hip hinge angle testing (deadlift)
 * Shoulder-hip-knee at specified angle
 */
export function createPreciseHipHingeKeypoints(hipAngle: number): MockKeypoint[] {
  const angleRad = hipAngle * Math.PI / 180
  const torsoLength = 0.25

  // Fixed hip and knee positions
  const hipY = 0.55
  const kneeY = 0.7

  // Shoulder position depends on hip angle (angle at hip between shoulder-hip and hip-knee)
  // When angle = 180, torso is fully extended (standing)
  // When angle < 180, torso is bent forward
  const shoulderY = hipY - torsoLength * Math.cos(Math.PI - angleRad)
  const shoulderX = 0.5 - torsoLength * Math.sin(Math.PI - angleRad)

  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: shoulderX - 0.1, y: shoulderY, z: -0.02, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: shoulderX + 0.1, y: shoulderY, z: 0.02, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.42, y: hipY, z: 0.05, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.58, y: hipY, z: 0.05, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.42, y: kneeY, z: 0.02, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.58, y: kneeY, z: 0.02, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.42, y: 0.9, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.58, y: 0.9, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_WRIST]: { x: 0.42, y: 0.75, z: -0.1, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_WRIST]: { x: 0.58, y: 0.75, z: -0.1, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: shoulderX, y: shoulderY - 0.15, z: -0.1, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: shoulderX - 0.05, y: shoulderY - 0.13, z: -0.1, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: shoulderX + 0.05, y: shoulderY - 0.13, z: -0.1, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HEEL]: { x: 0.40, y: 0.92, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HEEL]: { x: 0.60, y: 0.92, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_FOOT_INDEX]: { x: 0.44, y: 0.93, z: 0.05, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_FOOT_INDEX]: { x: 0.56, y: 0.93, z: 0.05, score: 0.95 },
  })
}

/**
 * Creates keypoints for precise body alignment testing (plank)
 * Shoulder-hip-ankle angle deviation from 180
 */
export function createPreciseBodyAlignmentKeypoints(deviation: number): MockKeypoint[] {
  // For plank, body should be a straight line from shoulder to ankle
  // deviation = how many degrees off from 180 (straight line)
  const deviationRad = deviation * Math.PI / 180

  // Fixed positions for horizontal plank
  const shoulderX = 0.2
  const shoulderY = 0.48
  const ankleX = 0.85
  const ankleY = 0.5

  // Hip position deviates from the straight line
  // Midpoint between shoulder and ankle
  const midX = (shoulderX + ankleX) / 2
  const midY = (shoulderY + ankleY) / 2

  // Calculate hip offset based on deviation
  const hipOffset = 0.1 * Math.sin(deviationRad)
  const hipX = midX
  const hipY = midY + hipOffset // Positive = sag, negative = pike

  return createMockKeypoints({
    [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: shoulderX, y: shoulderY, z: -0.05, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: shoulderX, y: shoulderY, z: 0.05, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: hipX, y: hipY, z: -0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: hipX, y: hipY, z: 0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: ankleX, y: ankleY, z: -0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: ankleX, y: ankleY, z: 0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: (hipX + ankleX) / 2, y: (hipY + ankleY) / 2, z: -0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: (hipX + ankleX) / 2, y: (hipY + ankleY) / 2, z: 0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.NOSE]: { x: 0.15, y: 0.45, z: 0, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_EAR]: { x: 0.13, y: 0.43, z: -0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_EAR]: { x: 0.13, y: 0.43, z: 0.03, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_ELBOW]: { x: 0.18, y: 0.55, z: -0.08, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW]: { x: 0.18, y: 0.55, z: 0.08, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.LEFT_WRIST]: { x: 0.15, y: 0.55, z: -0.1, score: 0.95 },
    [BLAZEPOSE_KEYPOINTS.RIGHT_WRIST]: { x: 0.15, y: 0.55, z: 0.1, score: 0.95 },
  })
}

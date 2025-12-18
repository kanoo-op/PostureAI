/**
 * Unit Tests for Depth Normalization Module
 *
 * Run with: npx jest src/utils/__tests__/depthNormalization.test.ts
 * (Requires Jest to be installed)
 */

import {
  calculateDepthConfidence,
  calculatePerspectiveFactor,
  applyPerspectiveCorrection,
  detectTPose,
  DepthSmoother,
  DEFAULT_DEPTH_CONFIG,
  ANGLE_SENSITIVITY_WEIGHTS,
  Keypoint,
  DepthNormalizationConfig,
} from '../depthNormalization';
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose';

// ============================================
// Test Helpers
// ============================================

/**
 * Create mock keypoints array with specified Z values and scores
 */
function createMockKeypoints(
  zValues: Partial<Record<number, number>>,
  scores: Partial<Record<number, number>> = {}
): Keypoint[] {
  const keypoints: Keypoint[] = [];
  for (let i = 0; i < 33; i++) {
    keypoints.push({
      x: 0.5,
      y: 0.5,
      z: zValues[i] ?? 0.5,
      score: scores[i] ?? 0.9,
    });
  }
  return keypoints;
}

/**
 * Create mock T-pose keypoints
 */
function createTPoseKeypoints(): Keypoint[] {
  const keypoints: Keypoint[] = [];
  for (let i = 0; i < 33; i++) {
    keypoints.push({ x: 0.5, y: 0.5, z: 0.5, score: 0.9 });
  }

  // Set T-pose positions
  // Shoulders at y=0.3
  keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER] = { x: 0.4, y: 0.3, z: 0.5, score: 0.9 };
  keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER] = { x: 0.6, y: 0.3, z: 0.5, score: 0.9 };

  // Elbows extended horizontally
  keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ELBOW] = { x: 0.2, y: 0.3, z: 0.5, score: 0.9 };
  keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW] = { x: 0.8, y: 0.3, z: 0.5, score: 0.9 };

  // Wrists extended horizontally
  keypoints[BLAZEPOSE_KEYPOINTS.LEFT_WRIST] = { x: 0.0, y: 0.3, z: 0.5, score: 0.9 };
  keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_WRIST] = { x: 1.0, y: 0.3, z: 0.5, score: 0.9 };

  // Hips at y=0.5
  keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP] = { x: 0.45, y: 0.5, z: 0.5, score: 0.9 };
  keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP] = { x: 0.55, y: 0.5, z: 0.5, score: 0.9 };

  // Knees at y=0.7
  keypoints[BLAZEPOSE_KEYPOINTS.LEFT_KNEE] = { x: 0.45, y: 0.7, z: 0.5, score: 0.9 };
  keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_KNEE] = { x: 0.55, y: 0.7, z: 0.5, score: 0.9 };

  // Ankles at y=0.9
  keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE] = { x: 0.45, y: 0.9, z: 0.5, score: 0.9 };
  keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE] = { x: 0.55, y: 0.9, z: 0.5, score: 0.9 };

  return keypoints;
}

/**
 * Create squat position keypoints
 */
function createSquatKeypoints(): Keypoint[] {
  const keypoints: Keypoint[] = [];
  for (let i = 0; i < 33; i++) {
    keypoints.push({ x: 0.5, y: 0.5, z: 0.5, score: 0.9 });
  }

  // Shoulders
  keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER] = { x: 0.4, y: 0.3, z: 0.5, score: 0.9 };
  keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER] = { x: 0.6, y: 0.3, z: 0.5, score: 0.9 };

  // Arms down (not horizontal)
  keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ELBOW] = { x: 0.35, y: 0.45, z: 0.5, score: 0.9 };
  keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW] = { x: 0.65, y: 0.45, z: 0.5, score: 0.9 };

  keypoints[BLAZEPOSE_KEYPOINTS.LEFT_WRIST] = { x: 0.3, y: 0.55, z: 0.5, score: 0.9 };
  keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_WRIST] = { x: 0.7, y: 0.55, z: 0.5, score: 0.9 };

  // Hips lower in squat
  keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP] = { x: 0.45, y: 0.55, z: 0.4, score: 0.9 };
  keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP] = { x: 0.55, y: 0.55, z: 0.4, score: 0.9 };

  // Knees bent
  keypoints[BLAZEPOSE_KEYPOINTS.LEFT_KNEE] = { x: 0.42, y: 0.7, z: 0.3, score: 0.9 };
  keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_KNEE] = { x: 0.58, y: 0.7, z: 0.3, score: 0.9 };

  // Ankles
  keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE] = { x: 0.45, y: 0.9, z: 0.5, score: 0.9 };
  keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE] = { x: 0.55, y: 0.9, z: 0.5, score: 0.9 };

  return keypoints;
}

// ============================================
// calculateDepthConfidence Tests
// ============================================

describe('calculateDepthConfidence', () => {
  test('returns high confidence (>0.8) for consistent Z values with high keypoint scores', () => {
    const zValues: Partial<Record<number, number>> = {
      [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: 0.5,
      [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: 0.5,
      [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: 0.5,
      [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: 0.5,
      [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: 0.5,
      [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: 0.5,
    };
    const scores: Partial<Record<number, number>> = {
      [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: 0.95,
      [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: 0.95,
      [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: 0.95,
      [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: 0.95,
      [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: 0.95,
      [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: 0.95,
    };

    const keypoints = createMockKeypoints(zValues, scores);
    const result = calculateDepthConfidence(keypoints, DEFAULT_DEPTH_CONFIG);

    expect(result.score).toBeGreaterThan(0.8);
    expect(result.isReliable).toBe(true);
    expect(result.fallbackMode).toBe('3d');
    expect(result.variance).toBeLessThan(0.01);
  });

  test('returns low confidence (<0.5) for high variance Z values', () => {
    const zValues: Partial<Record<number, number>> = {
      [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: 0.1,
      [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: 0.9,
      [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: 0.2,
      [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: 0.8,
      [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: 0.3,
      [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: 0.7,
    };

    const keypoints = createMockKeypoints(zValues);
    const result = calculateDepthConfidence(keypoints, DEFAULT_DEPTH_CONFIG);

    expect(result.score).toBeLessThan(0.5);
    expect(result.variance).toBeGreaterThan(0.01);
  });

  test('returns isReliable=false when below threshold', () => {
    const config: DepthNormalizationConfig = {
      ...DEFAULT_DEPTH_CONFIG,
      minConfidenceThreshold: 0.9,
    };

    const zValues: Partial<Record<number, number>> = {
      [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: 0.5,
      [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: 0.55,
      [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: 0.48,
      [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: 0.52,
      [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: 0.5,
      [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: 0.51,
    };

    const keypoints = createMockKeypoints(zValues);
    const result = calculateDepthConfidence(keypoints, config);

    expect(result.isReliable).toBe(false);
    expect(result.fallbackMode).toBe('2d');
  });

  test('correctly sets fallbackMode based on confidence', () => {
    // Low confidence case
    const lowZValues: Partial<Record<number, number>> = {
      [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: 0.1,
      [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: 0.9,
      [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: 0.2,
      [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: 0.8,
      [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: 0.15,
      [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: 0.85,
    };

    const lowKeypoints = createMockKeypoints(lowZValues);
    const lowResult = calculateDepthConfidence(lowKeypoints, DEFAULT_DEPTH_CONFIG);
    expect(lowResult.fallbackMode).toBe('2d');

    // High confidence case
    const highZValues: Partial<Record<number, number>> = {
      [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: 0.5,
      [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: 0.5,
      [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: 0.5,
      [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: 0.5,
      [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: 0.5,
      [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: 0.5,
    };

    const highKeypoints = createMockKeypoints(highZValues);
    const highResult = calculateDepthConfidence(highKeypoints, DEFAULT_DEPTH_CONFIG);
    expect(highResult.fallbackMode).toBe('3d');
  });
});

// ============================================
// calculatePerspectiveFactor Tests
// ============================================

describe('calculatePerspectiveFactor', () => {
  test('returns 1.0 when at baseline depth', () => {
    const zValues: Partial<Record<number, number>> = {
      [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: 0.5,
      [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: 0.5,
      [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: 0.5,
      [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: 0.5,
      [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: 0.5,
      [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: 0.5,
    };

    const keypoints = createMockKeypoints(zValues);
    const result = calculatePerspectiveFactor(keypoints, DEFAULT_DEPTH_CONFIG);

    expect(result.factor).toBeCloseTo(1.0, 1);
    expect(result.averageDepth).toBeCloseTo(0.5, 2);
  });

  test('returns >1.0 when user is closer than baseline', () => {
    const zValues: Partial<Record<number, number>> = {
      [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: 0.3,
      [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: 0.3,
      [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: 0.3,
      [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: 0.3,
      [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: 0.3,
      [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: 0.3,
    };

    const keypoints = createMockKeypoints(zValues);
    const result = calculatePerspectiveFactor(keypoints, DEFAULT_DEPTH_CONFIG);

    expect(result.factor).toBeGreaterThan(1.0);
    expect(result.averageDepth).toBeLessThan(0.5);
  });

  test('returns <1.0 when user is farther than baseline', () => {
    const zValues: Partial<Record<number, number>> = {
      [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: 0.7,
      [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: 0.7,
      [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: 0.7,
      [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: 0.7,
      [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: 0.7,
      [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: 0.7,
    };

    const keypoints = createMockKeypoints(zValues);
    const result = calculatePerspectiveFactor(keypoints, DEFAULT_DEPTH_CONFIG);

    expect(result.factor).toBeLessThan(1.0);
    expect(result.averageDepth).toBeGreaterThan(0.5);
  });

  test('clamps to min/max correction factors', () => {
    // Very close (should be clamped to maxCorrectionFactor)
    const veryCloseZValues: Partial<Record<number, number>> = {
      [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: 0.1,
      [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: 0.1,
      [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: 0.1,
      [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: 0.1,
      [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: 0.1,
      [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: 0.1,
    };

    const closeKeypoints = createMockKeypoints(veryCloseZValues);
    const closeResult = calculatePerspectiveFactor(closeKeypoints, DEFAULT_DEPTH_CONFIG);
    expect(closeResult.factor).toBeLessThanOrEqual(DEFAULT_DEPTH_CONFIG.maxCorrectionFactor);

    // Very far (should be clamped to minCorrectionFactor)
    const veryFarZValues: Partial<Record<number, number>> = {
      [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: 2.0,
      [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: 2.0,
      [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: 2.0,
      [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: 2.0,
      [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: 2.0,
      [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: 2.0,
    };

    const farKeypoints = createMockKeypoints(veryFarZValues);
    const farResult = calculatePerspectiveFactor(farKeypoints, DEFAULT_DEPTH_CONFIG);
    expect(farResult.factor).toBeGreaterThanOrEqual(DEFAULT_DEPTH_CONFIG.minCorrectionFactor);
  });
});

// ============================================
// applyPerspectiveCorrection Tests
// ============================================

describe('applyPerspectiveCorrection', () => {
  test('applies correct sensitivity weight per angle type', () => {
    const rawAngle = 90;
    const factor = 1.1;

    const kneeResult = applyPerspectiveCorrection(rawAngle, factor, 'kneeFlexion');
    const hipResult = applyPerspectiveCorrection(rawAngle, factor, 'hipFlexion');
    const torsoResult = applyPerspectiveCorrection(rawAngle, factor, 'torsoInclination');
    const ankleResult = applyPerspectiveCorrection(rawAngle, factor, 'ankleAngle');

    // Knee has highest sensitivity (0.85), should have largest adjustment
    expect(Math.abs(kneeResult - rawAngle)).toBeGreaterThan(Math.abs(torsoResult - rawAngle));

    // Torso has lowest sensitivity (0.60), should have smallest adjustment
    expect(Math.abs(torsoResult - rawAngle)).toBeLessThan(Math.abs(hipResult - rawAngle));
  });

  test('returns raw angle when factor is 1.0', () => {
    const rawAngle = 90;
    const factor = 1.0;

    const kneeResult = applyPerspectiveCorrection(rawAngle, factor, 'kneeFlexion');
    const hipResult = applyPerspectiveCorrection(rawAngle, factor, 'hipFlexion');

    expect(kneeResult).toBeCloseTo(rawAngle, 1);
    expect(hipResult).toBeCloseTo(rawAngle, 1);
  });

  test('correctly increases angle when factor > 1.0', () => {
    const rawAngle = 90;
    const factor = 1.1;

    const result = applyPerspectiveCorrection(rawAngle, factor, 'kneeFlexion');

    expect(result).toBeGreaterThan(rawAngle);
  });

  test('correctly decreases angle when factor < 1.0', () => {
    const rawAngle = 90;
    const factor = 0.9;

    const result = applyPerspectiveCorrection(rawAngle, factor, 'kneeFlexion');

    expect(result).toBeLessThan(rawAngle);
  });
});

// ============================================
// detectTPose Tests
// ============================================

describe('detectTPose', () => {
  test('returns true for valid T-pose keypoints', () => {
    const keypoints = createTPoseKeypoints();
    const result = detectTPose(keypoints);

    expect(result).toBe(true);
  });

  test('returns false for squat position', () => {
    const keypoints = createSquatKeypoints();
    const result = detectTPose(keypoints);

    expect(result).toBe(false);
  });

  test('returns false for arms down position', () => {
    const keypoints = createTPoseKeypoints();

    // Move arms down
    keypoints[BLAZEPOSE_KEYPOINTS.LEFT_WRIST] = { x: 0.4, y: 0.6, z: 0.5, score: 0.9 };
    keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_WRIST] = { x: 0.6, y: 0.6, z: 0.5, score: 0.9 };
    keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ELBOW] = { x: 0.4, y: 0.45, z: 0.5, score: 0.9 };
    keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW] = { x: 0.6, y: 0.45, z: 0.5, score: 0.9 };

    const result = detectTPose(keypoints);

    expect(result).toBe(false);
  });

  test('returns false when keypoint scores are too low', () => {
    const keypoints = createTPoseKeypoints();

    // Set low scores for some keypoints
    keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER] = { x: 0.4, y: 0.3, z: 0.5, score: 0.3 };
    keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER] = { x: 0.6, y: 0.3, z: 0.5, score: 0.3 };

    const result = detectTPose(keypoints);

    expect(result).toBe(false);
  });
});

// ============================================
// DepthSmoother Tests
// ============================================

describe('DepthSmoother', () => {
  test('first value returns unchanged', () => {
    const smoother = new DepthSmoother(0.3);
    const result = smoother.smooth(0.5);

    expect(result).toBe(0.5);
  });

  test('subsequent values are smoothed', () => {
    const smoother = new DepthSmoother(0.3);

    smoother.smooth(0.5);
    const result = smoother.smooth(0.8);

    // With alpha=0.3: smoothed = 0.3 * 0.8 + 0.7 * 0.5 = 0.24 + 0.35 = 0.59
    expect(result).toBeCloseTo(0.59, 2);
  });

  test('reset clears state', () => {
    const smoother = new DepthSmoother(0.3);

    smoother.smooth(0.5);
    smoother.smooth(0.8);
    smoother.reset();

    // After reset, first value should return unchanged
    const result = smoother.smooth(0.3);
    expect(result).toBe(0.3);
  });

  test('uses correct alpha value', () => {
    const smoother = new DepthSmoother(0.5);

    smoother.smooth(0.0);
    const result = smoother.smooth(1.0);

    // With alpha=0.5: smoothed = 0.5 * 1.0 + 0.5 * 0.0 = 0.5
    expect(result).toBeCloseTo(0.5, 2);
  });
});

// ============================================
// Integration Tests
// ============================================

describe('Integration: Full Depth Normalization Pipeline', () => {
  test('applies perspective correction to angles based on depth', () => {
    const keypoints = createMockKeypoints({
      [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: 0.3,
      [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: 0.3,
      [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: 0.3,
      [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: 0.3,
      [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: 0.3,
      [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: 0.3,
    });

    const depthConfidence = calculateDepthConfidence(keypoints, DEFAULT_DEPTH_CONFIG);
    const perspectiveResult = calculatePerspectiveFactor(keypoints, DEFAULT_DEPTH_CONFIG);

    expect(depthConfidence.isReliable).toBe(true);
    expect(perspectiveResult.factor).toBeGreaterThan(1.0);

    const rawKneeAngle = 90;
    const correctedKneeAngle = applyPerspectiveCorrection(
      rawKneeAngle,
      perspectiveResult.factor,
      'kneeFlexion'
    );

    expect(correctedKneeAngle).toBeGreaterThan(rawKneeAngle);
  });

  test('falls back gracefully when depth is unreliable', () => {
    const keypoints = createMockKeypoints({
      [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: 0.1,
      [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: 0.9,
      [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: 0.2,
      [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: 0.8,
      [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: 0.15,
      [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: 0.85,
    });

    const depthConfidence = calculateDepthConfidence(keypoints, DEFAULT_DEPTH_CONFIG);
    const perspectiveResult = calculatePerspectiveFactor(keypoints, DEFAULT_DEPTH_CONFIG);

    expect(depthConfidence.isReliable).toBe(false);
    expect(depthConfidence.fallbackMode).toBe('2d');
    expect(perspectiveResult.factor).toBe(1.0); // Should return neutral factor
  });
});

// ============================================
// Edge Cases Tests
// ============================================

describe('Edge Cases', () => {
  test('handles empty keypoints array', () => {
    const result = calculateDepthConfidence([]);
    expect(result.score).toBe(0);
    expect(result.isReliable).toBe(false);
    expect(result.fallbackMode).toBe('2d');
  });

  test('handles keypoints with missing Z values', () => {
    const keypoints: Keypoint[] = [];
    for (let i = 0; i < 33; i++) {
      keypoints.push({ x: 0.5, y: 0.5, score: 0.9 }); // No z property
    }
    const result = calculateDepthConfidence(keypoints);
    expect(result.isReliable).toBe(false);
  });

  test('handles zero depth values gracefully', () => {
    const zValues: Partial<Record<number, number>> = {
      [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: 0,
      [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: 0,
      [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: 0,
      [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: 0,
      [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: 0,
      [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: 0,
    };
    const keypoints = createMockKeypoints(zValues);

    // Should not throw and should handle division by zero
    expect(() => calculatePerspectiveFactor(keypoints)).not.toThrow();
  });

  test('maintains performance under 16ms for depth calculations', () => {
    const keypoints = createTPoseKeypoints();

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      calculateDepthConfidence(keypoints);
      calculatePerspectiveFactor(keypoints);
    }
    const elapsed = performance.now() - start;

    // 100 iterations should complete in under 1600ms (16ms each)
    expect(elapsed).toBeLessThan(1600);
  });

  test('handles keypoints with very small Z values', () => {
    const zValues: Partial<Record<number, number>> = {
      [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: 0.001,
      [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: 0.001,
      [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: 0.001,
      [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: 0.001,
      [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: 0.001,
      [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: 0.001,
    };
    const keypoints = createMockKeypoints(zValues);

    const result = calculatePerspectiveFactor(keypoints);
    // Factor should be clamped to maxCorrectionFactor
    expect(result.factor).toBeLessThanOrEqual(DEFAULT_DEPTH_CONFIG.maxCorrectionFactor);
  });

  test('handles keypoints with negative Z values', () => {
    const zValues: Partial<Record<number, number>> = {
      [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: -0.3,
      [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: -0.3,
      [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: -0.3,
      [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: -0.3,
      [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: -0.3,
      [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: -0.3,
    };
    const keypoints = createMockKeypoints(zValues);

    // Should not throw
    expect(() => calculatePerspectiveFactor(keypoints)).not.toThrow();
    expect(() => calculateDepthConfidence(keypoints)).not.toThrow();
  });

  test('handles partial keypoints array (less than 33)', () => {
    const keypoints: Keypoint[] = [];
    // Only add 10 keypoints
    for (let i = 0; i < 10; i++) {
      keypoints.push({ x: 0.5, y: 0.5, z: 0.5, score: 0.9 });
    }

    const result = calculateDepthConfidence(keypoints);
    // Should not crash and should return low confidence
    expect(result).toBeDefined();
    expect(result.isReliable).toBe(false);
  });
});

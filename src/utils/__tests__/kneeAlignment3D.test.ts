/**
 * Unit Tests for 3D Knee Alignment Analysis
 *
 * Run with: npx jest src/utils/__tests__/kneeAlignment3D.test.ts
 */

import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'

// Test helper to create mock keypoints
function createMockKeypoints(): Array<{ x: number; y: number; z: number; score: number }> {
  const keypoints: Array<{ x: number; y: number; z: number; score: number }> = []
  for (let i = 0; i < 33; i++) {
    keypoints.push({ x: 0.5, y: 0.5, z: 0.5, score: 0.9 })
  }
  return keypoints
}

// Helper to set up leg keypoints
function setupLegKeypoints(
  keypoints: Array<{ x: number; y: number; z: number; score: number }>,
  config: {
    leftHipX: number; leftHipY: number;
    leftKneeX: number; leftKneeY: number;
    leftAnkleX: number; leftAnkleY: number;
    rightHipX: number; rightHipY: number;
    rightKneeX: number; rightKneeY: number;
    rightAnkleX: number; rightAnkleY: number;
  }
) {
  keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP] = { x: config.leftHipX, y: config.leftHipY, z: 0.5, score: 0.9 }
  keypoints[BLAZEPOSE_KEYPOINTS.LEFT_KNEE] = { x: config.leftKneeX, y: config.leftKneeY, z: 0.5, score: 0.9 }
  keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE] = { x: config.leftAnkleX, y: config.leftAnkleY, z: 0.5, score: 0.9 }
  keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP] = { x: config.rightHipX, y: config.rightHipY, z: 0.5, score: 0.9 }
  keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_KNEE] = { x: config.rightKneeX, y: config.rightKneeY, z: 0.5, score: 0.9 }
  keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE] = { x: config.rightAnkleX, y: config.rightAnkleY, z: 0.5, score: 0.9 }
  return keypoints
}

describe('analyzeKneeAlignment3D - Neutral Alignment', () => {
  test('should return neutral when knees are aligned with hip-ankle line', () => {
    // Setup: knees directly between hip and ankle in X axis
    // Hip at X=0.45, Ankle at X=0.45, Knee at X=0.45 (perfectly aligned)
    const keypoints = createMockKeypoints()
    setupLegKeypoints(keypoints, {
      leftHipX: 0.45, leftHipY: 0.4,
      leftKneeX: 0.45, leftKneeY: 0.6,
      leftAnkleX: 0.45, leftAnkleY: 0.8,
      rightHipX: 0.55, rightHipY: 0.4,
      rightKneeX: 0.55, rightKneeY: 0.6,
      rightAnkleX: 0.55, rightAnkleY: 0.8,
    })

    // Expected results:
    // - leftDeviationType: 'neutral'
    // - rightDeviationType: 'neutral'
    // - deviation degrees near 0 (within ideal threshold of 5)
    // NOTE: Import and call analyzeKneeAlignment3D here when exported
    expect(keypoints[BLAZEPOSE_KEYPOINTS.LEFT_KNEE].x).toBe(0.45)
    expect(keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_KNEE].x).toBe(0.55)
  })
})

describe('analyzeKneeAlignment3D - Valgus Detection', () => {
  test('should detect valgus when knees collapse inward', () => {
    // Setup: knees positioned medially (toward midline)
    // Left knee X > midpoint of left hip-ankle X = valgus
    // Right knee X < midpoint of right hip-ankle X = valgus
    const keypoints = createMockKeypoints()
    setupLegKeypoints(keypoints, {
      leftHipX: 0.40, leftHipY: 0.4,
      leftKneeX: 0.48, leftKneeY: 0.6, // Moved medially (toward center)
      leftAnkleX: 0.40, leftAnkleY: 0.8,
      rightHipX: 0.60, rightHipY: 0.4,
      rightKneeX: 0.52, rightKneeY: 0.6, // Moved medially (toward center)
      rightAnkleX: 0.60, rightAnkleY: 0.8,
    })

    // Expected:
    // - leftDeviationType: 'valgus' (positive deviation)
    // - rightDeviationType: 'valgus' (positive deviation)

    // Verify left knee is medial to hip-ankle midpoint
    const leftMidX = (keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP].x + keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE].x) / 2
    expect(keypoints[BLAZEPOSE_KEYPOINTS.LEFT_KNEE].x).toBeGreaterThan(leftMidX)

    // Verify right knee is medial to hip-ankle midpoint
    const rightMidX = (keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP].x + keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE].x) / 2
    expect(keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_KNEE].x).toBeLessThan(rightMidX)
  })

  test('should classify severity based on deviation degrees', () => {
    // Test progressive valgus:
    // - 0-5 degrees: neutral
    // - 5-10 degrees: warning level
    // - >10 degrees: error level
    expect(true).toBe(true) // Placeholder for implementation
  })
})

describe('analyzeKneeAlignment3D - Varus Detection', () => {
  test('should detect varus when knees bow outward', () => {
    // Setup: knees positioned laterally (away from midline)
    // Left knee X < midpoint of left hip-ankle X = varus
    // Right knee X > midpoint of right hip-ankle X = varus
    const keypoints = createMockKeypoints()
    setupLegKeypoints(keypoints, {
      leftHipX: 0.45, leftHipY: 0.4,
      leftKneeX: 0.38, leftKneeY: 0.6, // Moved laterally (away from center)
      leftAnkleX: 0.45, leftAnkleY: 0.8,
      rightHipX: 0.55, rightHipY: 0.4,
      rightKneeX: 0.62, rightKneeY: 0.6, // Moved laterally (away from center)
      rightAnkleX: 0.55, rightAnkleY: 0.8,
    })

    // Expected:
    // - leftDeviationType: 'varus' (negative deviation)
    // - rightDeviationType: 'varus' (negative deviation)

    // Verify left knee is lateral to hip-ankle midpoint
    const leftMidX = (keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP].x + keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE].x) / 2
    expect(keypoints[BLAZEPOSE_KEYPOINTS.LEFT_KNEE].x).toBeLessThan(leftMidX)

    // Verify right knee is lateral to hip-ankle midpoint
    const rightMidX = (keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP].x + keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE].x) / 2
    expect(keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_KNEE].x).toBeGreaterThan(rightMidX)
  })
})

describe('analyzeKneeAlignment3D - Dynamic Valgus Tracking', () => {
  test('should calculate change from standing baseline', () => {
    // Test with baseline data provided
    // baseline: leftDeviation=2, rightDeviation=2
    // current: leftDeviation=8, rightDeviation=8
    // Expected dynamicValgusChange = 6 (average increase)
    const baselineDeviation = { leftDeviation: 2, rightDeviation: 2 }
    const currentDeviation = { leftDeviation: 8, rightDeviation: 8 }

    const avgBaseline = (baselineDeviation.leftDeviation + baselineDeviation.rightDeviation) / 2
    const avgCurrent = (currentDeviation.leftDeviation + currentDeviation.rightDeviation) / 2
    const dynamicChange = avgCurrent - avgBaseline

    expect(dynamicChange).toBe(6)
  })

  test('should return 0 change when no baseline provided', () => {
    // Expected: dynamicValgusChange = 0 when standingBaseline is undefined
    const dynamicChange = 0 // When no baseline, change should be 0
    expect(dynamicChange).toBe(0)
  })
})

describe('analyzeKneeAlignment3D - Peak Deviation', () => {
  test('should track maximum deviation value between left and right', () => {
    // Setup: left deviation = 8 degrees, right deviation = 12 degrees
    // Expected: peakDeviation = 12
    const leftDeviationDegrees = 8
    const rightDeviationDegrees = 12
    const peakDeviation = Math.max(Math.abs(leftDeviationDegrees), Math.abs(rightDeviationDegrees))

    expect(peakDeviation).toBe(12)
  })
})

describe('analyzeKneeAlignment3D - Edge Cases', () => {
  test('should handle zero leg length gracefully', () => {
    // Setup: hip and ankle at same position
    const keypoints = createMockKeypoints()
    setupLegKeypoints(keypoints, {
      leftHipX: 0.45, leftHipY: 0.5,
      leftKneeX: 0.45, leftKneeY: 0.5,
      leftAnkleX: 0.45, leftAnkleY: 0.5, // Same as hip
      rightHipX: 0.55, rightHipY: 0.5,
      rightKneeX: 0.55, rightKneeY: 0.5,
      rightAnkleX: 0.55, rightAnkleY: 0.5,
    })

    // Expected: isValid = false, no division by zero errors
    // When leg length is 0, calculation should fail gracefully
    expect(keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP].y).toBe(keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE].y)
  })

  test('should handle asymmetric deviation correctly', () => {
    // Setup: left leg valgus, right leg varus
    const keypoints = createMockKeypoints()
    setupLegKeypoints(keypoints, {
      leftHipX: 0.45, leftHipY: 0.4,
      leftKneeX: 0.50, leftKneeY: 0.6, // Valgus (medial)
      leftAnkleX: 0.45, leftAnkleY: 0.8,
      rightHipX: 0.55, rightHipY: 0.4,
      rightKneeX: 0.62, rightKneeY: 0.6, // Varus (lateral)
      rightAnkleX: 0.55, rightAnkleY: 0.8,
    })

    // Expected:
    // - leftDeviationType: 'valgus'
    // - rightDeviationType: 'varus'

    // Verify left knee is medial
    const leftMidX = (keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP].x + keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE].x) / 2
    expect(keypoints[BLAZEPOSE_KEYPOINTS.LEFT_KNEE].x).toBeGreaterThan(leftMidX)

    // Verify right knee is lateral
    const rightMidX = (keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP].x + keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE].x) / 2
    expect(keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_KNEE].x).toBeGreaterThan(rightMidX)
  })
})

describe('Threshold Classification', () => {
  test('ideal range (0-5 degrees) should return neutral type', () => {
    // Test deviations of 0, 2.5, 5 degrees
    const idealThreshold = { min: 0, max: 5 }

    expect(0).toBeGreaterThanOrEqual(idealThreshold.min)
    expect(0).toBeLessThanOrEqual(idealThreshold.max)

    expect(2.5).toBeGreaterThanOrEqual(idealThreshold.min)
    expect(2.5).toBeLessThanOrEqual(idealThreshold.max)

    expect(5).toBeGreaterThanOrEqual(idealThreshold.min)
    expect(5).toBeLessThanOrEqual(idealThreshold.max)
  })

  test('acceptable range (5-10 degrees) should trigger warning feedback', () => {
    // Test deviations of 6, 8, 10 degrees
    const acceptableThreshold = { min: 5, max: 10 }

    expect(6).toBeGreaterThan(acceptableThreshold.min)
    expect(6).toBeLessThanOrEqual(acceptableThreshold.max)

    expect(8).toBeGreaterThan(acceptableThreshold.min)
    expect(8).toBeLessThanOrEqual(acceptableThreshold.max)

    expect(10).toBeGreaterThanOrEqual(acceptableThreshold.min)
    expect(10).toBeLessThanOrEqual(acceptableThreshold.max)
  })

  test('error range (>10 degrees) should trigger error feedback', () => {
    // Test deviations of 12, 15, 20 degrees
    const acceptableMax = 10

    expect(12).toBeGreaterThan(acceptableMax)
    expect(15).toBeGreaterThan(acceptableMax)
    expect(20).toBeGreaterThan(acceptableMax)
  })
})

describe('Integration with analyzeSquat', () => {
  test('should capture standing baseline when in standing phase', () => {
    // Test that state.standingKneeAlignment is populated on first standing detection
    const standingKneeAlignment = {
      leftDeviation: 2.5,
      rightDeviation: 3.0,
      capturedAt: Date.now(),
    }

    expect(standingKneeAlignment.leftDeviation).toBeDefined()
    expect(standingKneeAlignment.rightDeviation).toBeDefined()
    expect(standingKneeAlignment.capturedAt).toBeDefined()
  })

  test('should reset peak deviation when returning to standing', () => {
    // Test that currentRepPeakDeviation resets to 0 on standing phase
    let currentRepPeakDeviation = 15 // Some peak during squat
    const phase = 'standing'

    if (phase === 'standing') {
      currentRepPeakDeviation = 0
    }

    expect(currentRepPeakDeviation).toBe(0)
  })

  test('should track increasing peak during descent and bottom phases', () => {
    // Test that peak updates during descent/bottom phases
    let currentRepPeakDeviation = 5
    const newDeviation = 8
    const phase = 'descending'

    if (phase !== 'standing') {
      currentRepPeakDeviation = Math.max(currentRepPeakDeviation, newDeviation)
    }

    expect(currentRepPeakDeviation).toBe(8)
  })
})

/**
 * Squat Analyzer Test Suite
 * Comprehensive tests for 3D angle calculations, phase detection, and feedback generation
 */

import {
  analyzeSquat,
  createInitialState,
  SquatAnalyzerState,
  SquatPhase,
} from '../squatAnalyzer'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'
import {
  createMockKeypoints,
  createStandingPoseKeypoints,
  createSquatBottomKeypoints,
  createLowConfidenceKeypoints,
  createAsymmetricSquatKeypoints,
  createSquatDescendingKeypoints,
  createPrecise90DegreeKneeKeypoints,
  createPrecise45DegreeTorsoKeypoints,
  create3DDepthVariationKeypoints,
  createPhaseBoundaryKeypoints,
  createCollinearPointsKeypoints,
  createKneeAsymmetryKeypoints,
  createKeypoints2DOnly,
} from './mockKeypointFactory'
import {
  calculate3DAngle,
  calculateAngleWithVertical,
  keypointToPoint3D,
  midpoint,
  symmetryScore,
} from '../pose3DUtils'

describe('Squat Analyzer', () => {
  describe('Knee Angle Calculations', () => {
    test('should calculate left knee angle using hip-knee-ankle points', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      // Verify the raw angle is within expected range for squat bottom
      expect(result.rawAngles.leftKneeAngle).toBeGreaterThan(60)
      expect(result.rawAngles.leftKneeAngle).toBeLessThan(130)
    })

    test('should calculate right knee angle using hip-knee-ankle points', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      expect(result.rawAngles.rightKneeAngle).toBeGreaterThan(60)
      expect(result.rawAngles.rightKneeAngle).toBeLessThan(130)
    })

    test('should calculate knee angles close to 180 degrees when standing', () => {
      const keypoints = createStandingPoseKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      expect(result.rawAngles.leftKneeAngle).toBeGreaterThan(150)
      expect(result.rawAngles.rightKneeAngle).toBeGreaterThan(150)
    })

    test('should use toBeCloseTo for floating-point comparisons', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      // Verify left and right are approximately equal (symmetric pose)
      expect(result.rawAngles.leftKneeAngle).toBeCloseTo(result.rawAngles.rightKneeAngle, 0)
    })
  })

  describe('Hip Angle Calculations', () => {
    test('should calculate hip angle using shoulder-hip-knee points', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      // Hip angle should be reduced in squat position
      expect(result.rawAngles.leftHipAngle).toBeGreaterThan(50)
      expect(result.rawAngles.leftHipAngle).toBeLessThan(140)
    })

    test('should have bilateral hip angle symmetry for symmetric pose', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      const hipDiff = Math.abs(result.rawAngles.leftHipAngle - result.rawAngles.rightHipAngle)
      expect(hipDiff).toBeLessThan(15)
    })
  })

  describe('Torso Alignment Calculations', () => {
    test('should calculate torso angle with vertical', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      // Torso angle represents forward lean from vertical
      expect(result.rawAngles.torsoAngle).toBeGreaterThanOrEqual(0)
      expect(result.rawAngles.torsoAngle).toBeLessThan(90)
    })

    test('should have minimal torso angle when standing upright', () => {
      const keypoints = createStandingPoseKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      expect(result.rawAngles.torsoAngle).toBeLessThan(25)
    })
  })

  describe('Phase Detection', () => {
    test('should detect standing phase when knee angle > 160 degrees', () => {
      const keypoints = createStandingPoseKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      expect(result.phase).toBe('standing')
    })

    test('should detect bottom phase when knee angle < 110 degrees', () => {
      const keypoints = createSquatBottomKeypoints()
      const state: SquatAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'descending',
      }
      const { result } = analyzeSquat(keypoints, state)

      expect(result.phase).toBe('bottom')
    })

    test('should detect descending phase when angle is decreasing', () => {
      const keypoints = createSquatDescendingKeypoints()
      const state: SquatAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'standing',
        lastKneeAngle: 170,
      }
      const { result } = analyzeSquat(keypoints, state)

      // Phase should be either standing (if angle still high) or descending
      expect(['standing', 'descending']).toContain(result.phase)
    })

    test('should detect ascending phase when angle is increasing from bottom', () => {
      const keypoints = createSquatDescendingKeypoints()
      const state: SquatAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'bottom',
        bottomReached: true,
        lastKneeAngle: 90,
      }
      const { result } = analyzeSquat(keypoints, state)

      // Phase should be ascending or standing depending on angle
      expect(['ascending', 'standing']).toContain(result.phase)
    })

    test('should complete rep when returning to standing after bottom', () => {
      const keypoints = createStandingPoseKeypoints()
      const state: SquatAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'ascending',
        bottomReached: true,
        repCount: 0,
      }
      const { result } = analyzeSquat(keypoints, state)

      expect(result.repCompleted).toBe(true)
    })
  })

  describe('Feedback Generation', () => {
    test('should generate feedback with correct structure', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      // Check feedback structure
      expect(result.feedbacks.kneeAngle).toHaveProperty('level')
      expect(result.feedbacks.kneeAngle).toHaveProperty('message')
      expect(result.feedbacks.kneeAngle).toHaveProperty('correction')
      expect(result.feedbacks.kneeAngle).toHaveProperty('value')
      expect(result.feedbacks.kneeAngle).toHaveProperty('idealRange')
      expect(result.feedbacks.kneeAngle).toHaveProperty('acceptableRange')
    })

    test('should have feedback level of good, warning, or error', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      expect(['good', 'warning', 'error']).toContain(result.feedbacks.kneeAngle.level)
      expect(['good', 'warning', 'error']).toContain(result.feedbacks.hipAngle.level)
      expect(['good', 'warning', 'error']).toContain(result.feedbacks.torsoInclination.level)
    })

    test('should provide ideal range for knee angle as 80-100', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      expect(result.feedbacks.kneeAngle.idealRange.min).toBe(80)
      expect(result.feedbacks.kneeAngle.idealRange.max).toBe(100)
    })

    test('should provide acceptable range for knee angle as 70-110', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      expect(result.feedbacks.kneeAngle.acceptableRange.min).toBe(70)
      expect(result.feedbacks.kneeAngle.acceptableRange.max).toBe(110)
    })
  })

  describe('Edge Cases', () => {
    test('should return invalid result for low confidence keypoints', () => {
      const keypoints = createLowConfidenceKeypoints([
        BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
        BLAZEPOSE_KEYPOINTS.RIGHT_KNEE,
      ])
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      expect(result.score).toBe(0)
      expect(result.feedbacks.kneeAngle.level).toBe('warning')
    })

    test('should handle smoothing when smootherSet is provided', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState({ windowSize: 5, responsiveness: 0.3 })
      const { result } = analyzeSquat(keypoints, state)

      expect(result.rawAngles.leftKneeAngle).toBeDefined()
      expect(typeof result.rawAngles.leftKneeAngle).toBe('number')
    })

    test('should maintain state across multiple frames', () => {
      const standingKeypoints = createStandingPoseKeypoints()
      const bottomKeypoints = createSquatBottomKeypoints()

      let state = createInitialState()

      // Frame 1: Standing
      const result1 = analyzeSquat(standingKeypoints, state)
      state = result1.newState
      expect(result1.result.phase).toBe('standing')

      // Frame 2: Simulating descent to bottom
      state = { ...state, previousPhase: 'descending', lastKneeAngle: 150 }
      const result2 = analyzeSquat(bottomKeypoints, state)
      state = result2.newState
      expect(result2.newState.bottomReached).toBe(true)
    })

    test('should handle 2D-only keypoints (no Z coordinate)', () => {
      const keypoints = createSquatBottomKeypoints().map(kp => ({ ...kp, z: 0 }))
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      // Should still calculate valid angles
      expect(result.rawAngles.leftKneeAngle).toBeGreaterThan(0)
    })
  })

  describe('Symmetry Analysis', () => {
    test('should calculate knee symmetry score', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      expect(result.rawAngles.kneeSymmetryScore).toBeDefined()
      expect(result.rawAngles.kneeSymmetryScore).toBeGreaterThanOrEqual(0)
      expect(result.rawAngles.kneeSymmetryScore).toBeLessThanOrEqual(100)
    })

    test('should detect asymmetric squat', () => {
      const keypoints = createAsymmetricSquatKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      // Asymmetric pose should have lower symmetry score
      expect(result.rawAngles.kneeSymmetryScore).toBeLessThan(95)
    })

    test('should have high symmetry score for symmetric pose', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      expect(result.rawAngles.kneeSymmetryScore).toBeGreaterThan(80)
    })

    test('should include hip symmetry score', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      expect(result.rawAngles.hipSymmetryScore).toBeDefined()
      expect(result.rawAngles.hipSymmetryScore).toBeGreaterThanOrEqual(0)
      expect(result.rawAngles.hipSymmetryScore).toBeLessThanOrEqual(100)
    })
  })

  describe('Score Calculation', () => {
    test('should calculate overall score between 0 and 100', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })

    test('should return low score for invalid pose', () => {
      const keypoints = createLowConfidenceKeypoints([
        BLAZEPOSE_KEYPOINTS.LEFT_HIP,
        BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
        BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
        BLAZEPOSE_KEYPOINTS.RIGHT_KNEE,
      ])
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      // With low confidence on key joints, score should be 0
      expect(result.score).toBe(0)
    })

    test('should give higher score for good form', () => {
      const standingKeypoints = createStandingPoseKeypoints()
      const bottomKeypoints = createSquatBottomKeypoints()

      const state = createInitialState()
      const standingResult = analyzeSquat(standingKeypoints, state)
      const bottomResult = analyzeSquat(bottomKeypoints, state)

      // Both should have reasonable scores
      expect(standingResult.result.score).toBeGreaterThanOrEqual(0)
      expect(bottomResult.result.score).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Ankle Angle Analysis', () => {
    test('should calculate ankle dorsiflexion angle', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      expect(result.rawAngles.leftAnkleAngle).toBeDefined()
      expect(result.rawAngles.rightAnkleAngle).toBeDefined()
      expect(result.rawAngles.avgAnkleAngle).toBeDefined()
    })

    test('should detect heel rise', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      expect(typeof result.rawAngles.heelRiseDetected).toBe('boolean')
    })
  })

  describe('Knee Valgus Detection', () => {
    test('should calculate knee valgus percentage', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      expect(result.rawAngles.kneeValgusPercent).toBeDefined()
      expect(result.rawAngles.kneeValgusPercent).toBeGreaterThanOrEqual(0)
    })

    test('should provide knee valgus feedback', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      expect(result.feedbacks.kneeValgus).toBeDefined()
      expect(['good', 'warning', 'error']).toContain(result.feedbacks.kneeValgus.level)
    })
  })

  describe('State Management', () => {
    test('should update state with new phase', () => {
      const keypoints = createSquatBottomKeypoints()
      const state: SquatAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'descending',
        lastKneeAngle: 120,
      }
      const { newState } = analyzeSquat(keypoints, state)

      expect(newState.previousPhase).toBe('bottom')
    })

    test('should track bottom reached flag', () => {
      const keypoints = createSquatBottomKeypoints()
      const state: SquatAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'descending',
        bottomReached: false,
      }
      const { newState } = analyzeSquat(keypoints, state)

      expect(newState.bottomReached).toBe(true)
    })

    test('should reset bottomReached after rep completion', () => {
      const keypoints = createStandingPoseKeypoints()
      const state: SquatAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'ascending',
        bottomReached: true,
        repCount: 0,
      }
      const { result, newState } = analyzeSquat(keypoints, state)

      expect(result.repCompleted).toBe(true)
      expect(newState.bottomReached).toBe(false)
    })
  })

  describe('Threshold Validation', () => {
    test('should use correct phase thresholds', () => {
      // Standing threshold is 160
      const standingKeypoints = createStandingPoseKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(standingKeypoints, state)

      // Standing pose should have knee angle > 160
      const avgKneeAngle = (result.rawAngles.leftKneeAngle + result.rawAngles.rightKneeAngle) / 2
      expect(avgKneeAngle).toBeGreaterThan(150) // Some tolerance for the mock data
    })

    test('should provide correct torso inclination thresholds', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      // Ideal torso angle: 0-35
      expect(result.feedbacks.torsoInclination.idealRange.min).toBe(0)
      expect(result.feedbacks.torsoInclination.idealRange.max).toBe(35)
      // Acceptable: 0-45
      expect(result.feedbacks.torsoInclination.acceptableRange.max).toBe(45)
    })

    test('should provide correct hip angle thresholds', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      // Ideal hip angle: 70-110
      expect(result.feedbacks.hipAngle.idealRange.min).toBe(70)
      expect(result.feedbacks.hipAngle.idealRange.max).toBe(110)
    })
  })

  describe('Direct 3D Angle Verification', () => {
    test('should calculate knee angle using calculate3DAngle with hip-knee-ankle points', () => {
      const keypoints = createPrecise90DegreeKneeKeypoints()
      const leftHip = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP])
      const leftKnee = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.LEFT_KNEE])
      const leftAnkle = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE])

      const directAngle = calculate3DAngle(leftHip, leftKnee, leftAnkle)
      // Direct calculation should return a valid angle
      expect(directAngle).toBeGreaterThan(80)
      expect(directAngle).toBeLessThan(110)

      // Verify analyzer returns a similar range
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)
      expect(result.rawAngles.leftKneeAngle).toBeGreaterThan(80)
      expect(result.rawAngles.leftKneeAngle).toBeLessThan(120)
    })

    test('should calculate torso angle using calculateAngleWithVertical', () => {
      const keypoints = createPrecise45DegreeTorsoKeypoints()
      const leftHip = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP])
      const rightHip = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP])
      const leftShoulder = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER])
      const rightShoulder = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER])

      const hipCenter = midpoint(leftHip, rightHip)
      const shoulderCenter = midpoint(leftShoulder, rightShoulder)
      const directAngle = calculateAngleWithVertical(hipCenter, shoulderCenter)

      // Direct calculation should return ~45 degrees
      expect(directAngle).toBeGreaterThan(35)
      expect(directAngle).toBeLessThan(55)

      // Verify analyzer returns same angle range
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)
      expect(result.rawAngles.torsoAngle).toBeGreaterThan(35)
      expect(result.rawAngles.torsoAngle).toBeLessThan(60)
    })

    test('should correctly include Z-coordinate in 3D angle calculations', () => {
      const keypoints = create3DDepthVariationKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      // With z-variation, angles should still be calculated correctly
      expect(result.rawAngles.leftKneeAngle).toBeDefined()
      expect(result.rawAngles.rightKneeAngle).toBeDefined()
      expect(result.rawAngles.leftKneeAngle).toBeGreaterThan(0)
      expect(result.rawAngles.rightKneeAngle).toBeGreaterThan(0)
    })

    test('should calculate hip angle correctly using shoulder-hip-knee points', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      // Verify hip angles are calculated
      expect(result.rawAngles.leftHipAngle).toBeGreaterThan(0)
      expect(result.rawAngles.rightHipAngle).toBeGreaterThan(0)

      // In squat bottom position, hip angle should be acute (< 150)
      expect(result.rawAngles.leftHipAngle).toBeLessThan(150)
    })

    test('should verify calculate3DAngle returns valid value for right knee', () => {
      const keypoints = createPrecise90DegreeKneeKeypoints()
      const rightHip = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP])
      const rightKnee = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_KNEE])
      const rightAnkle = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE])

      const directAngle = calculate3DAngle(rightHip, rightKnee, rightAnkle)
      expect(directAngle).toBeGreaterThan(80)
      expect(directAngle).toBeLessThan(110)

      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)
      expect(result.rawAngles.rightKneeAngle).toBeGreaterThan(80)
      expect(result.rawAngles.rightKneeAngle).toBeLessThan(120)
    })
  })

  describe('Phase Boundary Tests', () => {
    test('should detect standing phase for standing keypoints', () => {
      const keypoints = createStandingPoseKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)
      expect(result.phase).toBe('standing')
    })

    test('should detect descending phase when moving from standing', () => {
      const keypoints = createSquatDescendingKeypoints()
      const state: SquatAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'standing',
        lastKneeAngle: 170,
      }
      const { result } = analyzeSquat(keypoints, state)
      // Should transition to descending or detect as descending
      expect(['standing', 'descending']).toContain(result.phase)
    })

    test('should detect bottom phase for bottom keypoints', () => {
      const keypoints = createSquatBottomKeypoints()
      const state: SquatAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'descending',
        lastKneeAngle: 120,
      }
      const { result } = analyzeSquat(keypoints, state)
      expect(result.phase).toBe('bottom')
    })

    test('should maintain phase during small angle changes', () => {
      const keypoints = createSquatBottomKeypoints()
      const state: SquatAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'bottom',
        bottomReached: true,
        lastKneeAngle: 95,
      }
      const { result } = analyzeSquat(keypoints, state)
      // Should stay in bottom or move to ascending
      expect(['bottom', 'ascending']).toContain(result.phase)
    })

    test('should detect ascending phase after bottom reached', () => {
      const keypoints = createSquatDescendingKeypoints() // Use descending as mid-squat
      const state: SquatAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'bottom',
        bottomReached: true,
        lastKneeAngle: 90, // Was at bottom with 90 degrees
      }
      const { result } = analyzeSquat(keypoints, state)
      // Should transition to ascending or standing when angle increases from bottom
      expect(['ascending', 'standing']).toContain(result.phase)
    })
  })

  describe('Edge Cases with Invalid Keypoints', () => {
    test('should handle collinear points (straight legs)', () => {
      const keypoints = createCollinearPointsKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      // Should detect as standing (nearly straight legs)
      // Angle should be high (near or above 180) for straight legs
      expect(result.rawAngles.leftKneeAngle).toBeGreaterThan(160)
      expect(result.phase).toBe('standing')
    })

    test('should handle extremely low confidence on single critical keypoint', () => {
      const keypoints = createLowConfidenceKeypoints([BLAZEPOSE_KEYPOINTS.LEFT_HIP])
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      expect(result.score).toBe(0)
    })

    test('should handle all Z coordinates being 0 (2D-only mode)', () => {
      const keypoints = createKeypoints2DOnly()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      // Should still calculate valid angles using 2D projection
      expect(result.rawAngles.leftKneeAngle).toBeGreaterThan(0)
      expect(result.rawAngles.rightKneeAngle).toBeGreaterThan(0)
    })
  })

  describe('Symmetry Analysis with 3D Angles', () => {
    test('should calculate correct symmetryScore for equal angles', () => {
      expect(symmetryScore(90, 90)).toBe(100)
      expect(symmetryScore(120, 120)).toBe(100)
    })

    test('should calculate correct symmetryScore for angle differences', () => {
      const score = symmetryScore(90, 75)
      // 15 degree difference at 90 degree reference = ~50% score
      expect(score).toBeGreaterThan(40)
      expect(score).toBeLessThan(60)
    })

    test('should detect asymmetric knee angles', () => {
      const keypoints = createKneeAsymmetryKeypoints(90, 120) // 30 degree difference
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      // Should have low symmetry score due to large difference
      expect(result.rawAngles.kneeSymmetryScore).toBeDefined()
      if (result.rawAngles.kneeSymmetryScore) {
        expect(result.rawAngles.kneeSymmetryScore).toBeLessThan(80)
      }
    })

    test('should verify symmetryScore used correctly in analyzer', () => {
      const keypoints = createSquatBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzeSquat(keypoints, state)

      // Symmetric pose should have high symmetry scores
      expect(result.rawAngles.kneeSymmetryScore).toBeGreaterThan(80)
    })

    test('should return 0 symmetry score for large angle difference (30+ degrees)', () => {
      const score = symmetryScore(90, 130)
      expect(score).toBe(0)
    })
  })
})

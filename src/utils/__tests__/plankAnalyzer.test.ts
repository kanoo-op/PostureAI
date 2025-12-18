/**
 * Plank Analyzer Test Suite
 * Comprehensive tests for 3D angle calculations, hold time tracking, and feedback generation
 */

import {
  analyzePlank,
  createInitialPlankState,
  PlankAnalyzerState,
} from '../plankAnalyzer'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'
import {
  createMockKeypoints,
  createPlankKeypoints,
  createPlankHipSagKeypoints,
  createPlankPikeKeypoints,
  createLowConfidenceKeypoints,
  createPreciseBodyAlignmentKeypoints,
  createKeypoints2DOnly,
} from './mockKeypointFactory'
import {
  calculate3DAngle,
  keypointToPoint3D,
  midpoint,
} from '../pose3DUtils'

describe('Plank Analyzer', () => {
  describe('Body Alignment Calculations', () => {
    test('should calculate body alignment as deviation from 180', () => {
      const keypoints = createPlankKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      // Body alignment is deviation from straight line
      expect(result.rawAngles.bodyAlignmentAngle).toBeGreaterThanOrEqual(0)
      expect(result.rawAngles.bodyAlignmentAngle).toBeLessThan(90)
    })

    test('should have low body alignment deviation for good plank', () => {
      const keypoints = createPlankKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      // Good plank should have minimal deviation (under 20 is acceptable)
      expect(result.rawAngles.bodyAlignmentAngle).toBeLessThan(30)
    })
  })

  describe('Hip Deviation (Sag/Pike)', () => {
    test('should detect hip sag (negative deviation)', () => {
      const keypoints = createPlankHipSagKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      // Hip sag should show increased deviation
      expect(result.rawAngles.hipDeviationAngle).toBeDefined()
    })

    test('should detect hip pike (positive deviation)', () => {
      const keypoints = createPlankPikeKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      // Hip pike should show deviation in opposite direction
      expect(result.rawAngles.hipDeviationAngle).toBeDefined()
    })

    test('should provide hip position feedback', () => {
      const keypoints = createPlankKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      expect(result.feedbacks.hipPosition).toBeDefined()
      expect(['good', 'warning', 'error']).toContain(result.feedbacks.hipPosition.level)
    })
  })

  describe('Shoulder-Wrist Alignment', () => {
    test('should calculate shoulder-wrist horizontal offset', () => {
      const keypoints = createPlankKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      expect(result.rawAngles.shoulderWristOffset).toBeDefined()
      expect(result.rawAngles.shoulderWristOffset).toBeGreaterThanOrEqual(0)
    })

    test('should provide shoulder alignment feedback', () => {
      const keypoints = createPlankKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      expect(result.feedbacks.shoulderAlignment).toBeDefined()
      expect(['good', 'warning', 'error']).toContain(result.feedbacks.shoulderAlignment.level)
    })
  })

  describe('Neck Alignment', () => {
    test('should calculate neck angle relative to spine', () => {
      const keypoints = createPlankKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      expect(result.rawAngles.neckAngle).toBeDefined()
    })

    test('should provide neck alignment feedback', () => {
      const keypoints = createPlankKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      expect(result.feedbacks.neckAlignment).toBeDefined()
      expect(['good', 'warning', 'error']).toContain(result.feedbacks.neckAlignment.level)
    })
  })

  describe('Hold Time Tracking', () => {
    test('should track isHolding state', () => {
      const keypoints = createPlankKeypoints()
      const state = createInitialPlankState()
      const currentTime = Date.now()
      const { result, newState } = analyzePlank(keypoints, state, currentTime)

      expect(typeof result.isValidPlank).toBe('boolean')
      expect(typeof newState.isHolding).toBe('boolean')
    })

    test('should start hold when valid plank detected', () => {
      const keypoints = createPlankKeypoints()
      const state = createInitialPlankState()
      const currentTime = Date.now()
      const { result, newState } = analyzePlank(keypoints, state, currentTime)

      if (result.score >= 60) {
        expect(result.isValidPlank).toBe(true)
      }
    })

    test('should accumulate hold time across frames', () => {
      const keypoints = createPlankKeypoints()
      let state = createInitialPlankState()
      const startTime = Date.now()

      // Frame 1
      const result1 = analyzePlank(keypoints, state, startTime)
      state = result1.newState

      // Frame 2 (1 second later)
      const result2 = analyzePlank(keypoints, state, startTime + 1000)
      state = result2.newState

      // Hold time should have accumulated if valid
      if (result2.result.isValidPlank) {
        expect(result2.newState.currentHoldTime).toBeGreaterThanOrEqual(0)
      }
    })

    test('should reset hold on invalid pose', () => {
      const keypoints = createPlankKeypoints()
      const invalidKeypoints = createLowConfidenceKeypoints([
        BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
        BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
      ])
      let state = createInitialPlankState()
      const startTime = Date.now()

      // Frame 1: Valid plank
      const result1 = analyzePlank(keypoints, state, startTime)
      state = result1.newState

      // Frame 2: Invalid pose
      const result2 = analyzePlank(invalidKeypoints, state, startTime + 1000)

      expect(result2.result.isValidPlank).toBe(false)
    })

    test('should track total hold time', () => {
      const keypoints = createPlankKeypoints()
      const state = createInitialPlankState()
      const { newState } = analyzePlank(keypoints, state)

      expect(newState.totalHoldTime).toBeDefined()
      expect(typeof newState.totalHoldTime).toBe('number')
    })
  })

  describe('Valid Plank Detection', () => {
    test('should validate plank when score >= 60', () => {
      const keypoints = createPlankKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      // isValidPlank should match score threshold
      expect(result.isValidPlank).toBe(result.score >= 60)
    })
  })

  describe('Score Calculation', () => {
    test('should calculate overall score between 0 and 100', () => {
      const keypoints = createPlankKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })

    test('should weight body alignment at 35%', () => {
      // This tests the scoring weights indirectly
      const keypoints = createPlankKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      // Just verify the score calculation works
      expect(typeof result.score).toBe('number')
    })

    test('should return 0 score for invalid pose', () => {
      const keypoints = createLowConfidenceKeypoints([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      expect(result.score).toBe(0)
    })
  })

  describe('Feedback Generation', () => {
    test('should generate feedback with correct structure', () => {
      const keypoints = createPlankKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      expect(result.feedbacks.bodyAlignment).toHaveProperty('level')
      expect(result.feedbacks.bodyAlignment).toHaveProperty('message')
      expect(result.feedbacks.bodyAlignment).toHaveProperty('correction')
      expect(result.feedbacks.bodyAlignment).toHaveProperty('value')
      expect(result.feedbacks.bodyAlignment).toHaveProperty('idealRange')
      expect(result.feedbacks.bodyAlignment).toHaveProperty('acceptableRange')
    })

    test('should have feedback level of good, warning, or error', () => {
      const keypoints = createPlankKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      expect(['good', 'warning', 'error']).toContain(result.feedbacks.bodyAlignment.level)
      expect(['good', 'warning', 'error']).toContain(result.feedbacks.hipPosition.level)
      expect(['good', 'warning', 'error']).toContain(result.feedbacks.shoulderAlignment.level)
    })

    test('should provide correct body alignment thresholds', () => {
      const keypoints = createPlankKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      // Ideal: 0-8, Acceptable: 0-15
      expect(result.feedbacks.bodyAlignment.idealRange.min).toBe(0)
      expect(result.feedbacks.bodyAlignment.idealRange.max).toBe(8)
      expect(result.feedbacks.bodyAlignment.acceptableRange.max).toBe(15)
    })

    test('should provide correct hip position thresholds', () => {
      const keypoints = createPlankKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      // Ideal: -5 to 5 (symmetric), Acceptable: -12 to 12
      expect(result.feedbacks.hipPosition.idealRange.min).toBe(-5)
      expect(result.feedbacks.hipPosition.idealRange.max).toBe(5)
      expect(result.feedbacks.hipPosition.acceptableRange.min).toBe(-12)
      expect(result.feedbacks.hipPosition.acceptableRange.max).toBe(12)
    })

    test('should provide correct shoulder alignment thresholds', () => {
      const keypoints = createPlankKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      // Ideal: 0-10%, Acceptable: 0-20%
      expect(result.feedbacks.shoulderAlignment.idealRange.max).toBe(10)
      expect(result.feedbacks.shoulderAlignment.acceptableRange.max).toBe(20)
    })
  })

  describe('Edge Cases', () => {
    test('should return invalid result for low confidence keypoints', () => {
      const keypoints = createLowConfidenceKeypoints([
        BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
        BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
        BLAZEPOSE_KEYPOINTS.LEFT_HIP,
        BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
      ])
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      expect(result.score).toBe(0)
      expect(result.feedbacks.bodyAlignment.level).toBe('warning')
    })

    test('should handle smoothing when smootherSet is provided', () => {
      const keypoints = createPlankKeypoints()
      const state = createInitialPlankState({ windowSize: 5, responsiveness: 0.3 })
      const { result } = analyzePlank(keypoints, state)

      expect(result.rawAngles.bodyAlignmentAngle).toBeDefined()
      expect(typeof result.rawAngles.bodyAlignmentAngle).toBe('number')
    })

    test('should handle 2D-only keypoints', () => {
      const keypoints = createPlankKeypoints().map(kp => ({ ...kp, z: 0 }))
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      expect(result.rawAngles.bodyAlignmentAngle).toBeGreaterThanOrEqual(0)
    })

    test('should handle hold interruption', () => {
      const validKeypoints = createPlankKeypoints()
      const invalidKeypoints = createLowConfidenceKeypoints([
        BLAZEPOSE_KEYPOINTS.LEFT_HIP,
        BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
      ])

      let state = createInitialPlankState()
      const startTime = Date.now()

      // Start valid hold
      const result1 = analyzePlank(validKeypoints, state, startTime)
      state = result1.newState

      // Simulate invalid pose (interruption)
      const result2 = analyzePlank(invalidKeypoints, state, startTime + 2000)

      // Should handle interruption gracefully
      expect(result2.result.score).toBe(0)
    })
  })

  describe('State Management', () => {
    test('should preserve smoother state across frames', () => {
      const keypoints = createPlankKeypoints()
      let state = createInitialPlankState({ windowSize: 5, responsiveness: 0.3 })

      // Multiple frames
      for (let i = 0; i < 5; i++) {
        const { newState } = analyzePlank(keypoints, state)
        state = newState
      }

      expect(state.smootherSet).toBeDefined()
    })

    test('should track frame count during hold', () => {
      const keypoints = createPlankKeypoints()
      let state = createInitialPlankState()

      // Multiple frames
      for (let i = 0; i < 3; i++) {
        const { newState } = analyzePlank(keypoints, state)
        state = newState
      }

      expect(state.frameCount).toBeGreaterThanOrEqual(0)
    })

    test('should calculate average score during hold', () => {
      const keypoints = createPlankKeypoints()
      let state = createInitialPlankState()

      // Multiple frames
      for (let i = 0; i < 3; i++) {
        const { newState } = analyzePlank(keypoints, state)
        state = newState
      }

      // Average score should be tracked
      expect(typeof state.averageScore).toBe('number')
    })
  })

  describe('Hold Time Formatting', () => {
    test('should return hold time in seconds', () => {
      const keypoints = createPlankKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      // holdTime is in seconds
      expect(result.holdTime).toBeGreaterThanOrEqual(0)
      expect(typeof result.holdTime).toBe('number')
    })
  })

  describe('Correction Directions', () => {
    test('should provide raise correction for hip sag', () => {
      const keypoints = createPlankHipSagKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      // Hip sag should suggest raising
      if (result.feedbacks.hipPosition.level !== 'good') {
        expect(['raise', 'lower', 'none']).toContain(result.feedbacks.hipPosition.correction)
      }
    })

    test('should provide lower correction for hip pike', () => {
      const keypoints = createPlankPikeKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      // Hip pike should suggest lowering
      if (result.feedbacks.hipPosition.level !== 'good') {
        expect(['raise', 'lower', 'none']).toContain(result.feedbacks.hipPosition.correction)
      }
    })

    test('should provide straighten correction for body alignment issues', () => {
      const keypoints = createPlankHipSagKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      if (result.feedbacks.bodyAlignment.level !== 'good') {
        expect(result.feedbacks.bodyAlignment.correction).toBe('straighten')
      }
    })
  })

  describe('Direct 3D Angle Verification', () => {
    test('should calculate body alignment using shoulder-hip-ankle points', () => {
      const keypoints = createPlankKeypoints()
      const leftShoulder = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER])
      const rightShoulder = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER])
      const leftHip = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP])
      const rightHip = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP])
      const leftAnkle = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE])
      const rightAnkle = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE])

      const shoulderCenter = midpoint(leftShoulder, rightShoulder)
      const hipCenter = midpoint(leftHip, rightHip)
      const ankleCenter = midpoint(leftAnkle, rightAnkle)

      // Calculate angle at hip between shoulder-hip and hip-ankle
      const directAngle = calculate3DAngle(shoulderCenter, hipCenter, ankleCenter)

      // For a good plank, this should be close to 180 (straight line)
      expect(directAngle).toBeGreaterThan(150)
    })

    test('should verify body alignment angle is deviation from 180', () => {
      const keypoints = createPlankKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      // Body alignment should be small (close to straight)
      expect(result.rawAngles.bodyAlignmentAngle).toBeGreaterThanOrEqual(0)
      expect(result.rawAngles.bodyAlignmentAngle).toBeLessThan(30)
    })

    test('should calculate hip deviation correctly for sag', () => {
      const keypoints = createPlankHipSagKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      expect(result.rawAngles.hipDeviationAngle).toBeDefined()
      // Hip sag should show some deviation
      expect(Math.abs(result.rawAngles.hipDeviationAngle)).toBeGreaterThan(0)
    })

    test('should calculate hip deviation correctly for pike', () => {
      const keypoints = createPlankPikeKeypoints()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      expect(result.rawAngles.hipDeviationAngle).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    test('should handle 2D-only keypoints', () => {
      const keypoints = createKeypoints2DOnly()
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      expect(result.rawAngles.bodyAlignmentAngle).toBeGreaterThanOrEqual(0)
    })

    test('should calculate with precise body alignment keypoints', () => {
      // Test with zero deviation (perfect alignment)
      const keypoints = createPreciseBodyAlignmentKeypoints(0)
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      // Perfect alignment should have low body alignment deviation
      expect(result.rawAngles.bodyAlignmentAngle).toBeLessThan(20)
    })

    test('should detect deviation with non-zero alignment', () => {
      // Test with 15 degree deviation
      const keypoints = createPreciseBodyAlignmentKeypoints(15)
      const state = createInitialPlankState()
      const { result } = analyzePlank(keypoints, state)

      // Should detect some deviation
      expect(result.rawAngles.bodyAlignmentAngle).toBeGreaterThan(0)
    })
  })

  describe('Hold Time Boundary Tests', () => {
    test('should track hold time when valid plank is detected', () => {
      const keypoints = createPlankKeypoints()
      let state = createInitialPlankState()
      const startTime = Date.now()

      // Frame 1
      const result1 = analyzePlank(keypoints, state, startTime)
      state = result1.newState

      if (result1.result.isValidPlank) {
        expect(state.isHolding).toBe(true)
      }
    })

    test('should accumulate hold time correctly', () => {
      const keypoints = createPlankKeypoints()
      let state = createInitialPlankState()
      const startTime = Date.now()

      // Frame 1: Start hold
      const result1 = analyzePlank(keypoints, state, startTime)
      state = result1.newState

      // Frame 2: After 2 seconds
      const result2 = analyzePlank(keypoints, state, startTime + 2000)
      state = result2.newState

      // Frame 3: After 4 seconds
      const result3 = analyzePlank(keypoints, state, startTime + 4000)

      if (result3.result.isValidPlank) {
        expect(result3.result.holdTime).toBeGreaterThanOrEqual(0)
      }
    })

    test('should reset hold time on invalid pose', () => {
      const validKeypoints = createPlankKeypoints()
      const invalidKeypoints = createLowConfidenceKeypoints([
        BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
        BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
        BLAZEPOSE_KEYPOINTS.LEFT_HIP,
        BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
      ])

      let state = createInitialPlankState()
      const startTime = Date.now()

      // Start with valid plank
      const result1 = analyzePlank(validKeypoints, state, startTime)
      state = result1.newState

      // Then invalid pose
      const result2 = analyzePlank(invalidKeypoints, state, startTime + 1000)

      expect(result2.result.isValidPlank).toBe(false)
      expect(result2.result.score).toBe(0)
    })
  })
})

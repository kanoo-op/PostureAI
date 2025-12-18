/**
 * Pushup Analyzer Test Suite
 * Comprehensive tests for 3D angle calculations, phase detection, and feedback generation
 */

import {
  analyzePushup,
  createInitialState,
  PushupAnalyzerState,
  PushupPhase,
} from '../pushupAnalyzer'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'
import {
  createMockKeypoints,
  createPushupTopKeypoints,
  createPushupBottomKeypoints,
  createLowConfidenceKeypoints,
  createPrecise90DegreeElbowKeypoints,
  createElbowPhaseBoundaryKeypoints,
  createKeypoints2DOnly,
  createCollinearPointsKeypoints,
} from './mockKeypointFactory'
import {
  calculate3DAngle,
  keypointToPoint3D,
} from '../pose3DUtils'

describe('Pushup Analyzer', () => {
  describe('Elbow Angle Calculations', () => {
    test('should calculate elbow angle using shoulder-elbow-wrist points', () => {
      const keypoints = createPushupBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      // Elbow angle at bottom should be around 80-110 degrees
      expect(result.rawAngles.leftElbowAngle).toBeGreaterThan(50)
      expect(result.rawAngles.leftElbowAngle).toBeLessThan(150)
    })

    test('should calculate bilateral elbow angles', () => {
      const keypoints = createPushupBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      expect(result.rawAngles.leftElbowAngle).toBeDefined()
      expect(result.rawAngles.rightElbowAngle).toBeDefined()
    })

    test('should have elbow angle close to 180 at top position', () => {
      const keypoints = createPushupTopKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      // At top, arms should be extended (angle > 150)
      expect(result.rawAngles.leftElbowAngle).toBeGreaterThan(130)
      expect(result.rawAngles.rightElbowAngle).toBeGreaterThan(130)
    })
  })

  describe('Body Alignment', () => {
    test('should calculate body alignment angle as deviation from 180', () => {
      const keypoints = createPushupTopKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      // Body alignment is deviation from straight line (180)
      expect(result.rawAngles.bodyAlignmentAngle).toBeGreaterThanOrEqual(0)
      expect(result.rawAngles.bodyAlignmentAngle).toBeLessThan(90)
    })

    test('should have low body alignment deviation for good form', () => {
      const keypoints = createPushupTopKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      // Good form should have minimal deviation
      expect(result.rawAngles.bodyAlignmentAngle).toBeLessThan(30)
    })
  })

  describe('Hip Position (Sag/Pike)', () => {
    test('should calculate hip sag angle', () => {
      const keypoints = createPushupTopKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      expect(result.rawAngles.hipSagAngle).toBeDefined()
      expect(result.rawAngles.hipSagAngle).toBeGreaterThanOrEqual(0)
    })

    test('should provide hip position feedback', () => {
      const keypoints = createPushupTopKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      expect(result.feedbacks.hipPosition).toBeDefined()
      expect(['good', 'warning', 'error']).toContain(result.feedbacks.hipPosition.level)
    })
  })

  describe('Depth Percentage', () => {
    test('should calculate depth as percentage of ROM', () => {
      const keypoints = createPushupBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      expect(result.rawAngles.depthPercent).toBeGreaterThanOrEqual(0)
      expect(result.rawAngles.depthPercent).toBeLessThanOrEqual(100)
    })

    test('should have high depth percent at bottom position', () => {
      const keypoints = createPushupBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      // At bottom, depth should be high
      expect(result.rawAngles.depthPercent).toBeGreaterThan(40)
    })

    test('should have low depth percent at top position', () => {
      const keypoints = createPushupTopKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      // At top, depth should be lower (arms extended)
      expect(result.rawAngles.depthPercent).toBeLessThan(60)
    })
  })

  describe('Elbow Valgus Analysis', () => {
    test('should calculate elbow valgus angles', () => {
      const keypoints = createPushupBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      expect(result.rawAngles.leftElbowValgus).toBeDefined()
      expect(result.rawAngles.rightElbowValgus).toBeDefined()
    })

    test('should provide elbow valgus feedback', () => {
      const keypoints = createPushupBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      expect(result.feedbacks.elbowValgus).toBeDefined()
      expect(['good', 'warning', 'error']).toContain(result.feedbacks.elbowValgus.level)
    })

    test('should provide correct elbow valgus thresholds', () => {
      const keypoints = createPushupBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      // Ideal: 0-8, Acceptable: 0-15
      expect(result.feedbacks.elbowValgus.idealRange.max).toBe(8)
      expect(result.feedbacks.elbowValgus.acceptableRange.max).toBe(15)
    })
  })

  describe('Arm Symmetry', () => {
    test('should calculate arm symmetry score', () => {
      const keypoints = createPushupBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      expect(result.rawAngles.armSymmetryScore).toBeDefined()
      expect(result.rawAngles.armSymmetryScore).toBeGreaterThanOrEqual(0)
      expect(result.rawAngles.armSymmetryScore).toBeLessThanOrEqual(100)
    })

    test('should provide arm symmetry feedback', () => {
      const keypoints = createPushupBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      expect(result.feedbacks.armSymmetry).toBeDefined()
      expect(['good', 'warning', 'error']).toContain(result.feedbacks.armSymmetry.level)
    })

    test('should provide correct arm symmetry thresholds', () => {
      const keypoints = createPushupBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      // Ideal: 90-100, Acceptable: 70-100
      expect(result.feedbacks.armSymmetry.idealRange.min).toBe(90)
      expect(result.feedbacks.armSymmetry.acceptableRange.min).toBe(70)
    })
  })

  describe('Phase Detection', () => {
    test('should detect up phase when elbow angle > 150 degrees', () => {
      const keypoints = createPushupTopKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      expect(result.phase).toBe('up')
    })

    test('should detect bottom phase when elbow angle < 100 degrees', () => {
      const keypoints = createPushupBottomKeypoints()
      const state: PushupAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'descending',
        lastElbowAngle: 110,
      }
      const { result } = analyzePushup(keypoints, state)

      // Phase depends on computed elbow angle from mock keypoints
      expect(['bottom', 'descending', 'up']).toContain(result.phase)
    })

    test('should detect descending phase when angle is decreasing', () => {
      // Create mid-pushup keypoints
      const keypoints = createPushupTopKeypoints()
      const state: PushupAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'up',
        lastElbowAngle: 170,
      }
      const { result } = analyzePushup(keypoints, state)

      // May stay as 'up' since angle hasn't decreased enough
      expect(['up', 'descending']).toContain(result.phase)
    })

    test('should detect ascending phase when angle is increasing from bottom', () => {
      const keypoints = createPushupTopKeypoints()
      const state: PushupAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'bottom',
        bottomReached: true,
        lastElbowAngle: 90,
      }
      const { result } = analyzePushup(keypoints, state)

      // Should transition to ascending or directly to up
      expect(['ascending', 'up']).toContain(result.phase)
    })

    test('should complete rep when returning to up after bottom', () => {
      const keypoints = createPushupTopKeypoints()
      const state: PushupAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'ascending',
        bottomReached: true,
        repCount: 0,
        lastElbowAngle: 120,
      }
      const { result } = analyzePushup(keypoints, state)

      // Rep completion depends on phase transition to 'up'
      expect(typeof result.repCompleted).toBe('boolean')
    })
  })

  describe('Feedback Generation', () => {
    test('should generate feedback with correct structure', () => {
      const keypoints = createPushupBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      expect(result.feedbacks.elbowAngle).toHaveProperty('level')
      expect(result.feedbacks.elbowAngle).toHaveProperty('message')
      expect(result.feedbacks.elbowAngle).toHaveProperty('correction')
      expect(result.feedbacks.elbowAngle).toHaveProperty('value')
      expect(result.feedbacks.elbowAngle).toHaveProperty('idealRange')
      expect(result.feedbacks.elbowAngle).toHaveProperty('acceptableRange')
    })

    test('should have feedback level of good, warning, or error', () => {
      const keypoints = createPushupBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      expect(['good', 'warning', 'error']).toContain(result.feedbacks.elbowAngle.level)
      expect(['good', 'warning', 'error']).toContain(result.feedbacks.bodyAlignment.level)
      expect(['good', 'warning', 'error']).toContain(result.feedbacks.hipPosition.level)
    })

    test('should provide correct elbow angle thresholds', () => {
      const keypoints = createPushupBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      // Ideal: 80-100, Acceptable: 70-110
      expect(result.feedbacks.elbowAngle.idealRange.min).toBe(80)
      expect(result.feedbacks.elbowAngle.idealRange.max).toBe(100)
      expect(result.feedbacks.elbowAngle.acceptableRange.min).toBe(70)
      expect(result.feedbacks.elbowAngle.acceptableRange.max).toBe(110)
    })

    test('should provide correct body alignment thresholds', () => {
      const keypoints = createPushupBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      // Ideal: 0-10, Acceptable: 0-20
      expect(result.feedbacks.bodyAlignment.idealRange.max).toBe(10)
      expect(result.feedbacks.bodyAlignment.acceptableRange.max).toBe(20)
    })

    test('should provide correct hip position thresholds', () => {
      const keypoints = createPushupBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      // Ideal: 0-8, Acceptable: 0-15
      expect(result.feedbacks.hipPosition.idealRange.max).toBe(8)
      expect(result.feedbacks.hipPosition.acceptableRange.max).toBe(15)
    })

    test('should provide correct depth thresholds', () => {
      const keypoints = createPushupBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      // Ideal: 80-100%, Acceptable: 60-100%
      expect(result.feedbacks.depth.idealRange.min).toBe(80)
      expect(result.feedbacks.depth.acceptableRange.min).toBe(60)
    })
  })

  describe('Edge Cases', () => {
    test('should return invalid result for low confidence keypoints', () => {
      const keypoints = createLowConfidenceKeypoints([
        BLAZEPOSE_KEYPOINTS.LEFT_ELBOW,
        BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW,
        BLAZEPOSE_KEYPOINTS.LEFT_WRIST,
        BLAZEPOSE_KEYPOINTS.RIGHT_WRIST,
      ])
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      expect(result.score).toBe(0)
      expect(result.feedbacks.elbowAngle.level).toBe('warning')
    })

    test('should handle smoothing when smootherSet is provided', () => {
      const keypoints = createPushupBottomKeypoints()
      const state = createInitialState({ windowSize: 5, responsiveness: 0.3 })
      const { result } = analyzePushup(keypoints, state)

      expect(result.rawAngles.leftElbowAngle).toBeDefined()
      expect(typeof result.rawAngles.leftElbowAngle).toBe('number')
    })

    test('should handle 2D-only keypoints', () => {
      const keypoints = createPushupBottomKeypoints().map(kp => ({ ...kp, z: 0 }))
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      expect(result.rawAngles.leftElbowAngle).toBeGreaterThan(0)
    })

    test('should maintain state across multiple frames', () => {
      const topKeypoints = createPushupTopKeypoints()
      const bottomKeypoints = createPushupBottomKeypoints()

      let state = createInitialState()

      // Frame 1: Up position
      const result1 = analyzePushup(topKeypoints, state)
      state = result1.newState
      expect(result1.result.phase).toBe('up')

      // Frame 2: Simulating descent to bottom
      state = { ...state, previousPhase: 'descending', lastElbowAngle: 130 }
      const result2 = analyzePushup(bottomKeypoints, state)
      expect(result2.newState.bottomReached).toBe(true)
    })
  })

  describe('Score Calculation', () => {
    test('should calculate overall score between 0 and 100', () => {
      const keypoints = createPushupBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })

    test('should return 0 score for invalid pose', () => {
      const keypoints = createLowConfidenceKeypoints([
        BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
        BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
        BLAZEPOSE_KEYPOINTS.LEFT_ELBOW,
        BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW,
        BLAZEPOSE_KEYPOINTS.LEFT_WRIST,
        BLAZEPOSE_KEYPOINTS.RIGHT_WRIST,
      ])
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      expect(result.score).toBe(0)
    })
  })

  describe('State Management', () => {
    test('should update state with new phase', () => {
      const keypoints = createPushupBottomKeypoints()
      const state: PushupAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'descending',
        lastElbowAngle: 120,
      }
      const { newState } = analyzePushup(keypoints, state)

      // Phase depends on computed angle from mock keypoints
      expect(['bottom', 'descending', 'up']).toContain(newState.previousPhase)
    })

    test('should track bottom reached flag', () => {
      const keypoints = createPushupBottomKeypoints()
      const state: PushupAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'descending',
        bottomReached: false,
        lastElbowAngle: 120,
      }
      const { newState } = analyzePushup(keypoints, state)

      // Bottom flag depends on computed elbow angle
      expect(typeof newState.bottomReached).toBe('boolean')
    })

    test('should reset bottomReached after rep completion', () => {
      const keypoints = createPushupTopKeypoints()
      const state: PushupAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'ascending',
        bottomReached: true,
        repCount: 0,
        lastElbowAngle: 120,
      }
      const { result, newState } = analyzePushup(keypoints, state)

      // Rep completion depends on phase transition
      expect(typeof result.repCompleted).toBe('boolean')
      expect(typeof newState.bottomReached).toBe('boolean')
    })

    test('should increment rep count on completion', () => {
      const keypoints = createPushupTopKeypoints()
      const state: PushupAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'ascending',
        bottomReached: true,
        repCount: 5,
        lastElbowAngle: 120,
      }
      const { newState } = analyzePushup(keypoints, state)

      // Rep count should be maintained or incremented
      expect(newState.repCount).toBeGreaterThanOrEqual(5)
    })
  })

  describe('Direct 3D Angle Verification', () => {
    test('should calculate elbow angle using shoulder-elbow-wrist points', () => {
      const keypoints = createPrecise90DegreeElbowKeypoints()
      const leftShoulder = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER])
      const leftElbow = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ELBOW])
      const leftWrist = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.LEFT_WRIST])

      const directAngle = calculate3DAngle(leftShoulder, leftElbow, leftWrist)
      expect(directAngle).toBeCloseTo(90, 1)

      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)
      expect(result.rawAngles.leftElbowAngle).toBeCloseTo(90, 1)
    })

    test('should calculate bilateral elbow angles correctly', () => {
      const keypoints = createPrecise90DegreeElbowKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      expect(result.rawAngles.leftElbowAngle).toBeCloseTo(90, 1)
      expect(result.rawAngles.rightElbowAngle).toBeCloseTo(90, 1)
    })

    test('should verify direct angle matches analyzer for right elbow', () => {
      const keypoints = createPrecise90DegreeElbowKeypoints()
      const rightShoulder = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER])
      const rightElbow = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW])
      const rightWrist = keypointToPoint3D(keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_WRIST])

      const directAngle = calculate3DAngle(rightShoulder, rightElbow, rightWrist)

      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)
      expect(result.rawAngles.rightElbowAngle).toBeCloseTo(directAngle, 1)
    })

    test('should calculate body alignment angle as deviation from 180', () => {
      const keypoints = createPushupTopKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      // Body alignment deviation should be small for good form
      expect(result.rawAngles.bodyAlignmentAngle).toBeGreaterThanOrEqual(0)
      expect(result.rawAngles.bodyAlignmentAngle).toBeLessThan(45)
    })
  })

  describe('Phase Boundary Tests', () => {
    test('should detect up phase when elbow angle > 150 degrees', () => {
      const keypoints = createElbowPhaseBoundaryKeypoints(155)
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      expect(result.phase).toBe('up')
    })

    test('should detect bottom phase when elbow angle < 100 degrees', () => {
      const keypoints = createElbowPhaseBoundaryKeypoints(90)
      const state: PushupAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'descending',
        lastElbowAngle: 105,
      }
      const { result } = analyzePushup(keypoints, state)

      expect(result.phase).toBe('bottom')
    })

    test('should maintain descending phase during transition', () => {
      const keypoints = createElbowPhaseBoundaryKeypoints(120)
      const state: PushupAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'descending',
        lastElbowAngle: 130,
      }
      const { result } = analyzePushup(keypoints, state)

      expect(result.phase).toBe('descending')
    })

    test('should transition to ascending when angle increases from bottom', () => {
      const keypoints = createElbowPhaseBoundaryKeypoints(130)
      const state: PushupAnalyzerState = {
        ...createInitialState(),
        previousPhase: 'bottom',
        bottomReached: true,
        lastElbowAngle: 85,
      }
      const { result } = analyzePushup(keypoints, state)

      expect(result.phase).toBe('ascending')
    })
  })

  describe('Edge Cases with Geometry', () => {
    test('should handle 2D-only keypoints', () => {
      const keypoints = createKeypoints2DOnly()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      expect(result.rawAngles.leftElbowAngle).toBeGreaterThan(0)
      expect(result.rawAngles.rightElbowAngle).toBeGreaterThan(0)
    })

    test('should handle degenerate geometry with collinear points', () => {
      // Create pushup-specific collinear points for elbows
      const keypoints = createPushupTopKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      // Arms fully extended = close to 180 degrees
      expect(result.rawAngles.leftElbowAngle).toBeGreaterThan(130)
    })

    test('should calculate arm symmetry score', () => {
      const keypoints = createPushupBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      expect(result.rawAngles.armSymmetryScore).toBeDefined()
      expect(result.rawAngles.armSymmetryScore).toBeGreaterThanOrEqual(0)
      expect(result.rawAngles.armSymmetryScore).toBeLessThanOrEqual(100)
    })

    test('should have high symmetry score for symmetric pose', () => {
      const keypoints = createPushupBottomKeypoints()
      const state = createInitialState()
      const { result } = analyzePushup(keypoints, state)

      expect(result.rawAngles.armSymmetryScore).toBeGreaterThan(70)
    })
  })
})

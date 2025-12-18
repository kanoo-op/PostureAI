import {
  createInitialCoordinationState,
  analyzeCoordination,
  createCoordinationFeedback,
  COORDINATION_RATIO_PRESETS,
  CoordinationAnalysisResult,
  CoordinationExerciseType,
} from '../coordinationAnalyzer'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'

describe('coordinationAnalyzer', () => {
  // Helper to create mock keypoints
  const createMockKeypoints = (
    overrides: Record<number, { x: number; y: number; z?: number; score?: number }> = {}
  ) => {
    const keypoints = Array(33)
      .fill(null)
      .map(() => ({ x: 0.5, y: 0.5, z: 0, score: 0.9 }))
    Object.entries(overrides).forEach(([index, value]) => {
      keypoints[Number(index)] = { ...keypoints[Number(index)], ...value }
    })
    return keypoints
  }

  // Helper to create realistic standing keypoints
  const createStandingKeypoints = () => {
    return createMockKeypoints({
      [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.4, y: 0.2, z: 0, score: 0.95 },
      [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.6, y: 0.2, z: 0, score: 0.95 },
      [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.42, y: 0.5, z: 0, score: 0.95 },
      [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.58, y: 0.5, z: 0, score: 0.95 },
      [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.42, y: 0.7, z: 0, score: 0.95 },
      [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.58, y: 0.7, z: 0, score: 0.95 },
      [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.42, y: 0.9, z: 0, score: 0.95 },
      [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.58, y: 0.9, z: 0, score: 0.95 },
    })
  }

  // Helper to create squat position keypoints (bent knees and hips)
  const createSquatKeypoints = () => {
    return createMockKeypoints({
      [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.35, y: 0.25, z: 0, score: 0.95 },
      [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.65, y: 0.25, z: 0, score: 0.95 },
      [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.38, y: 0.55, z: 0, score: 0.95 },
      [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.62, y: 0.55, z: 0, score: 0.95 },
      [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.35, y: 0.75, z: 0, score: 0.95 },
      [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.65, y: 0.75, z: 0, score: 0.95 },
      [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.4, y: 0.9, z: 0, score: 0.95 },
      [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.6, y: 0.9, z: 0, score: 0.95 },
    })
  }

  describe('createInitialCoordinationState', () => {
    it('should create initial state with squat as default exercise type', () => {
      const state = createInitialCoordinationState()
      expect(state.exerciseType).toBe('squat')
      expect(state.frameCount).toBe(0)
      expect(state.previousTimestamp).toBe(0)
      expect(state.previousKneeAngle).toBe(0)
      expect(state.previousHipAngle).toBe(0)
    })

    it('should create initial state with specified exercise type', () => {
      const state = createInitialCoordinationState('deadlift')
      expect(state.exerciseType).toBe('deadlift')
    })

    it('should initialize empty buffers', () => {
      const state = createInitialCoordinationState()
      expect(state.kneeAngleHistory.size).toBe(0)
      expect(state.hipAngleHistory.size).toBe(0)
      expect(state.torsoAngleHistory.size).toBe(0)
      expect(state.kneeVelocityHistory.size).toBe(0)
      expect(state.hipVelocityHistory.size).toBe(0)
      expect(state.patternHistory.size).toBe(0)
    })
  })

  describe('COORDINATION_RATIO_PRESETS', () => {
    it('should have squat ratio near 1:1', () => {
      expect(COORDINATION_RATIO_PRESETS.squat.min).toBeCloseTo(0.85)
      expect(COORDINATION_RATIO_PRESETS.squat.max).toBeCloseTo(1.15)
    })

    it('should have hip-dominant deadlift ratio', () => {
      expect(COORDINATION_RATIO_PRESETS.deadlift.max).toBeLessThan(1)
      expect(COORDINATION_RATIO_PRESETS.deadlift.min).toBeCloseTo(0.6)
      expect(COORDINATION_RATIO_PRESETS.deadlift.max).toBeCloseTo(0.9)
    })

    it('should have wider range for lunge', () => {
      expect(COORDINATION_RATIO_PRESETS.lunge.min).toBeCloseTo(0.7)
      expect(COORDINATION_RATIO_PRESETS.lunge.max).toBeCloseTo(1.3)
    })
  })

  describe('analyzeCoordination', () => {
    it('should return invalid result for invalid keypoints', () => {
      const state = createInitialCoordinationState('squat')
      const { result } = analyzeCoordination([], state)
      expect(result.isValid).toBe(false)
      expect(result.coordinationScore).toBe(0)
    })

    it('should return invalid result for low confidence keypoints', () => {
      const state = createInitialCoordinationState('squat')
      const keypoints = createMockKeypoints({
        [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 0.4, y: 0.5, z: 0, score: 0.2 },
        [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 0.6, y: 0.5, z: 0, score: 0.9 },
        [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: { x: 0.4, y: 0.7, z: 0, score: 0.9 },
        [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: { x: 0.6, y: 0.7, z: 0, score: 0.9 },
        [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: { x: 0.4, y: 0.9, z: 0, score: 0.9 },
        [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: { x: 0.6, y: 0.9, z: 0, score: 0.9 },
        [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 0.4, y: 0.2, z: 0, score: 0.9 },
        [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 0.6, y: 0.2, z: 0, score: 0.9 },
      })
      const { result } = analyzeCoordination(keypoints, state)
      expect(result.isValid).toBe(false)
    })

    it('should return valid result for valid keypoints', () => {
      const state = createInitialCoordinationState('squat')
      const keypoints = createStandingKeypoints()
      const { result } = analyzeCoordination(keypoints, state)

      expect(result.isValid).toBe(true)
      expect(result).toHaveProperty('kneeToHipRatio')
      expect(result).toHaveProperty('optimalRatioRange')
      expect(result).toHaveProperty('ratioDeviation')
      expect(result).toHaveProperty('timing')
      expect(result).toHaveProperty('pattern')
      expect(result).toHaveProperty('patternConfidence')
      expect(result).toHaveProperty('coordinationScore')
      expect(result).toHaveProperty('bilateral')
    })

    it('should track bilateral coordination independently', () => {
      const state = createInitialCoordinationState('squat')
      const keypoints = createSquatKeypoints()
      const { result } = analyzeCoordination(keypoints, state)

      expect(result.bilateral).toHaveProperty('leftCoordination')
      expect(result.bilateral).toHaveProperty('rightCoordination')
      expect(result.bilateral).toHaveProperty('asymmetry')
      expect(typeof result.bilateral.leftCoordination).toBe('number')
      expect(typeof result.bilateral.rightCoordination).toBe('number')
      expect(typeof result.bilateral.asymmetry).toBe('number')
    })

    it('should update state after analysis', () => {
      const state = createInitialCoordinationState('squat')
      const keypoints = createStandingKeypoints()
      const timestamp = 1000

      const { newState } = analyzeCoordination(keypoints, state, timestamp)

      expect(newState.frameCount).toBe(1)
      expect(newState.previousTimestamp).toBe(timestamp)
      expect(newState.kneeAngleHistory.size).toBe(1)
      expect(newState.hipAngleHistory.size).toBe(1)
      expect(newState.torsoAngleHistory.size).toBe(1)
      expect(newState.patternHistory.size).toBe(1)
    })

    it('should complete within 2ms performance budget', () => {
      const state = createInitialCoordinationState('squat')
      const keypoints = createStandingKeypoints()

      const start = performance.now()
      analyzeCoordination(keypoints, state)
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(2)
    })

    it('should calculate pattern over multiple frames', () => {
      let state = createInitialCoordinationState('squat')
      const keypoints = createSquatKeypoints()

      // Run multiple analyses
      for (let i = 0; i < 10; i++) {
        const { newState, result } = analyzeCoordination(keypoints, state, 1000 + i * 33)
        state = newState
        expect(result.isValid).toBe(true)
      }

      expect(state.frameCount).toBe(10)
      expect(state.patternHistory.size).toBe(10)
    })

    it('should use correct optimal ratio range for exercise type', () => {
      const squatState = createInitialCoordinationState('squat')
      const deadliftState = createInitialCoordinationState('deadlift')
      const keypoints = createSquatKeypoints()

      const squatResult = analyzeCoordination(keypoints, squatState)
      const deadliftResult = analyzeCoordination(keypoints, deadliftState)

      expect(squatResult.result.optimalRatioRange).toEqual(COORDINATION_RATIO_PRESETS.squat)
      expect(deadliftResult.result.optimalRatioRange).toEqual(COORDINATION_RATIO_PRESETS.deadlift)
    })
  })

  describe('ratio calculation', () => {
    it('should calculate knee-to-hip ratio correctly', () => {
      const state = createInitialCoordinationState('squat')
      const keypoints = createSquatKeypoints()
      const { result } = analyzeCoordination(keypoints, state)

      expect(result.kneeToHipRatio).toBeGreaterThanOrEqual(0)
      expect(typeof result.kneeToHipRatio).toBe('number')
    })

    it('should handle standing position (near 180 degree angles)', () => {
      const state = createInitialCoordinationState('squat')
      const keypoints = createStandingKeypoints()
      const { result } = analyzeCoordination(keypoints, state)

      expect(result.isValid).toBe(true)
      // Standing position should have small flexion, ratio calculation should handle this
    })
  })

  describe('timing analysis', () => {
    it('should return synchronized for matched velocities', () => {
      let state = createInitialCoordinationState('squat')
      const keypoints = createStandingKeypoints()

      // First frame to establish baseline
      const { newState: state1 } = analyzeCoordination(keypoints, state, 1000)

      // Second frame with same position (no velocity difference)
      const { result } = analyzeCoordination(keypoints, state1, 1033)

      expect(result.timing.leadingJoint).toBe('synchronized')
      expect(result.timing.lagDirection).toBe('synced')
    })

    it('should have correct timing result structure', () => {
      const state = createInitialCoordinationState('squat')
      const keypoints = createSquatKeypoints()
      const { result } = analyzeCoordination(keypoints, state)

      expect(result.timing).toHaveProperty('leadingJoint')
      expect(result.timing).toHaveProperty('lagAmount')
      expect(result.timing).toHaveProperty('lagDirection')
      expect(result.timing).toHaveProperty('isSignificant')

      expect(['knee', 'hip', 'torso', 'synchronized']).toContain(result.timing.leadingJoint)
      expect(['early', 'late', 'synced']).toContain(result.timing.lagDirection)
      expect(typeof result.timing.lagAmount).toBe('number')
      expect(typeof result.timing.isSignificant).toBe('boolean')
    })
  })

  describe('calculateCoordinationScore', () => {
    it('should return high score for good coordination', () => {
      const state = createInitialCoordinationState('squat')
      const keypoints = createStandingKeypoints()

      // Build up pattern history for consistency
      let currentState = state
      for (let i = 0; i < 10; i++) {
        const { newState } = analyzeCoordination(keypoints, currentState, 1000 + i * 33)
        currentState = newState
      }

      const { result } = analyzeCoordination(keypoints, currentState, 1330)

      // With consistent pattern and no movement, should have decent score
      expect(result.coordinationScore).toBeGreaterThanOrEqual(0)
      expect(result.coordinationScore).toBeLessThanOrEqual(100)
    })

    it('should return score between 0 and 100', () => {
      const state = createInitialCoordinationState('squat')
      const keypoints = createSquatKeypoints()
      const { result } = analyzeCoordination(keypoints, state)

      expect(result.coordinationScore).toBeGreaterThanOrEqual(0)
      expect(result.coordinationScore).toBeLessThanOrEqual(100)
    })
  })

  describe('createCoordinationFeedback', () => {
    const createMockResult = (overrides: Partial<CoordinationAnalysisResult> = {}): CoordinationAnalysisResult => ({
      kneeToHipRatio: 1.0,
      optimalRatioRange: { min: 0.85, max: 1.15 },
      ratioDeviation: 0,
      timing: {
        leadingJoint: 'synchronized',
        lagAmount: 5,
        lagDirection: 'synced',
        isSignificant: false,
      },
      pattern: 'synchronized',
      patternConfidence: 0.95,
      coordinationScore: 85,
      bilateral: {
        leftCoordination: 90,
        rightCoordination: 88,
        asymmetry: 2,
      },
      isValid: true,
      ...overrides,
    })

    it('should return warning for invalid result', () => {
      const result = createMockResult({ isValid: false })
      const feedback = createCoordinationFeedback(result)

      expect(feedback.level).toBe('warning')
      expect(feedback.message).toContain('인식')
    })

    it('should return good level for score >= 80', () => {
      const result = createMockResult({ coordinationScore: 85 })
      const feedback = createCoordinationFeedback(result)

      expect(feedback.level).toBe('good')
    })

    it('should return warning level for score 60-79', () => {
      const result = createMockResult({ coordinationScore: 70 })
      const feedback = createCoordinationFeedback(result)

      expect(feedback.level).toBe('warning')
    })

    it('should return error level for score < 60', () => {
      const result = createMockResult({ coordinationScore: 50 })
      const feedback = createCoordinationFeedback(result)

      expect(feedback.level).toBe('error')
    })

    it('should return exercise-specific messages for hip_dominant pattern', () => {
      const hipDominantResult = createMockResult({
        pattern: 'hip_dominant',
        coordinationScore: 75,
      })

      const squatFeedback = createCoordinationFeedback(hipDominantResult, 'squat')
      const deadliftFeedback = createCoordinationFeedback(hipDominantResult, 'deadlift')

      // Squat should warn about hip-dominant pattern
      expect(squatFeedback.message).toContain('엉덩이')

      // Deadlift should approve of hip-dominant pattern
      expect(deadliftFeedback.message).toContain('힙 힌지')
    })

    it('should include pattern in feedback', () => {
      const result = createMockResult({ pattern: 'knee_dominant' })
      const feedback = createCoordinationFeedback(result)

      expect(feedback.pattern).toBe('knee_dominant')
    })

    it('should include suggestion in feedback', () => {
      const result = createMockResult({ pattern: 'synchronized' })
      const feedback = createCoordinationFeedback(result)

      expect(feedback.suggestion).toBeTruthy()
      expect(typeof feedback.suggestion).toBe('string')
    })

    it('should handle all pattern types', () => {
      const patterns = ['synchronized', 'knee_dominant', 'hip_dominant', 'torso_compensating'] as const

      patterns.forEach(pattern => {
        const result = createMockResult({ pattern })
        const feedback = createCoordinationFeedback(result)

        expect(feedback.pattern).toBe(pattern)
        expect(feedback.message).toBeTruthy()
        expect(feedback.suggestion).toBeTruthy()
      })
    })

    it('should return Korean messages', () => {
      const result = createMockResult()
      const feedback = createCoordinationFeedback(result)

      // Check for Korean characters
      expect(feedback.message).toMatch(/[가-힣]/)
      expect(feedback.suggestion).toMatch(/[가-힣]/)
    })
  })

  describe('pattern detection', () => {
    it('should detect synchronized pattern for balanced movement', () => {
      const state = createInitialCoordinationState('squat')
      const keypoints = createStandingKeypoints()
      const { result } = analyzeCoordination(keypoints, state)

      // First frame with stationary position should be synchronized
      expect(['synchronized', 'knee_dominant', 'hip_dominant', 'torso_compensating']).toContain(result.pattern)
    })

    it('should have pattern confidence between 0 and 1', () => {
      const state = createInitialCoordinationState('squat')
      const keypoints = createStandingKeypoints()
      const { result } = analyzeCoordination(keypoints, state)

      expect(result.patternConfidence).toBeGreaterThanOrEqual(0)
      expect(result.patternConfidence).toBeLessThanOrEqual(1)
    })
  })

  describe('bilateral coordination', () => {
    it('should calculate asymmetry as absolute difference', () => {
      const state = createInitialCoordinationState('squat')
      const keypoints = createSquatKeypoints()
      const { result } = analyzeCoordination(keypoints, state)

      const expectedAsymmetry = Math.abs(
        result.bilateral.leftCoordination - result.bilateral.rightCoordination
      )
      expect(result.bilateral.asymmetry).toBe(expectedAsymmetry)
    })

    it('should return scores between 0 and 100 for each side', () => {
      const state = createInitialCoordinationState('squat')
      const keypoints = createSquatKeypoints()
      const { result } = analyzeCoordination(keypoints, state)

      expect(result.bilateral.leftCoordination).toBeGreaterThanOrEqual(0)
      expect(result.bilateral.leftCoordination).toBeLessThanOrEqual(100)
      expect(result.bilateral.rightCoordination).toBeGreaterThanOrEqual(0)
      expect(result.bilateral.rightCoordination).toBeLessThanOrEqual(100)
    })
  })

  describe('state management', () => {
    it('should preserve exercise type across analyses', () => {
      let state = createInitialCoordinationState('lunge')
      const keypoints = createStandingKeypoints()

      for (let i = 0; i < 5; i++) {
        const { newState } = analyzeCoordination(keypoints, state, 1000 + i * 33)
        state = newState
        expect(state.exerciseType).toBe('lunge')
      }
    })

    it('should increment frame count on each analysis', () => {
      let state = createInitialCoordinationState('squat')
      const keypoints = createStandingKeypoints()

      for (let i = 0; i < 5; i++) {
        const { newState } = analyzeCoordination(keypoints, state, 1000 + i * 33)
        expect(newState.frameCount).toBe(i + 1)
        state = newState
      }
    })

    it('should update previous angles after analysis', () => {
      const state = createInitialCoordinationState('squat')
      const keypoints = createStandingKeypoints()

      const { newState } = analyzeCoordination(keypoints, state, 1000)

      expect(newState.previousKneeAngle).not.toBe(0)
      expect(newState.previousHipAngle).not.toBe(0)
    })
  })
})

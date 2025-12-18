import {
  analyzeTorsoRotation,
  calculateFrontalPlaneTilt,
  calculateCompoundRotationScore,
  createTorsoRotationFeedback,
  calculateRotationScore,
  ROTATION_THRESHOLDS,
  FRONTAL_THRESHOLDS,
  COMPOUND_SCORE_WEIGHTS,
  TorsoRotationResult,
} from '../torsoRotationAnalyzer'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'

describe('TorsoRotationAnalyzer', () => {
  // Helper to create mock keypoints
  const createMockKeypoints = (
    overrides: Record<number, { x: number; y: number; z?: number; score?: number }> = {}
  ) => {
    const keypoints = Array(33)
      .fill(null)
      .map(() => ({ x: 0, y: 0, z: 0, score: 0.9 }))
    Object.entries(overrides).forEach(([index, value]) => {
      keypoints[Number(index)] = { ...keypoints[Number(index)], ...value }
    })
    return keypoints
  }

  describe('analyzeTorsoRotation', () => {
    it('should return valid result with all new fields', () => {
      const keypoints = createMockKeypoints({
        [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 100, y: 100, z: 0, score: 0.9 },
        [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 200, y: 100, z: 0, score: 0.9 },
        [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 120, y: 300, z: 0, score: 0.9 },
        [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 180, y: 300, z: 0, score: 0.9 },
      })

      const result = analyzeTorsoRotation(keypoints)

      expect(result.isValid).toBe(true)
      expect(result).toHaveProperty('rotationAngle')
      expect(result).toHaveProperty('rotationDirection')
      expect(result).toHaveProperty('frontalTiltAngle')
      expect(result).toHaveProperty('frontalTiltDirection')
      expect(result).toHaveProperty('full3DAngle')
      expect(result).toHaveProperty('compoundScore')
    })

    it('should return invalid result for low confidence keypoints', () => {
      const keypoints = createMockKeypoints({
        [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 100, y: 100, z: 0, score: 0.2 },
        [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 200, y: 100, z: 0, score: 0.9 },
        [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 120, y: 300, z: 0, score: 0.9 },
        [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 180, y: 300, z: 0, score: 0.9 },
      })

      const result = analyzeTorsoRotation(keypoints)

      expect(result.isValid).toBe(false)
      expect(result.compoundScore).toBe(100)
    })

    it('should detect transverse plane rotation', () => {
      // Shoulders rotated (left shoulder forward)
      const keypoints = createMockKeypoints({
        [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 100, y: 100, z: -50, score: 0.9 },
        [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 200, y: 100, z: 50, score: 0.9 },
        [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 120, y: 300, z: 0, score: 0.9 },
        [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 180, y: 300, z: 0, score: 0.9 },
      })

      const result = analyzeTorsoRotation(keypoints)

      expect(result.isValid).toBe(true)
      expect(result.rotationAngle).toBeGreaterThan(0)
    })

    it('should detect frontal plane tilt', () => {
      // Left shoulder higher than right (different Y positions)
      const keypoints = createMockKeypoints({
        [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: { x: 100, y: 80, z: 0, score: 0.9 }, // Higher
        [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: { x: 200, y: 120, z: 0, score: 0.9 }, // Lower
        [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: { x: 120, y: 300, z: 0, score: 0.9 },
        [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: { x: 180, y: 300, z: 0, score: 0.9 },
      })

      const result = analyzeTorsoRotation(keypoints)

      expect(result.isValid).toBe(true)
      expect(result.frontalTiltAngle).toBeGreaterThan(0)
    })
  })

  describe('calculateFrontalPlaneTilt', () => {
    it('should return zero for aligned shoulders and hips', () => {
      const result = calculateFrontalPlaneTilt(
        { x: 100, y: 100, z: 0 },
        { x: 200, y: 100, z: 0 },
        { x: 120, y: 300, z: 0 },
        { x: 180, y: 300, z: 0 }
      )

      expect(result.tiltAngle).toBeLessThan(1)
      expect(result.tiltDirection).toBe('none')
    })

    it('should detect left shoulder high', () => {
      const result = calculateFrontalPlaneTilt(
        { x: 100, y: 80, z: 0 }, // Left shoulder higher (lower Y)
        { x: 200, y: 120, z: 0 }, // Right shoulder lower (higher Y)
        { x: 120, y: 300, z: 0 },
        { x: 180, y: 300, z: 0 }
      )

      expect(result.tiltAngle).toBeGreaterThan(5)
      expect(result.tiltDirection).toBe('left')
    })

    it('should handle edge case with narrow width', () => {
      const result = calculateFrontalPlaneTilt(
        { x: 100, y: 100, z: 0 },
        { x: 105, y: 100, z: 0 }, // Very narrow shoulder width
        { x: 100, y: 300, z: 0 },
        { x: 105, y: 300, z: 0 }
      )

      expect(result.tiltAngle).toBe(0)
      expect(result.tiltDirection).toBe('none')
    })
  })

  describe('calculateCompoundRotationScore', () => {
    it('should return 100 for perfect alignment', () => {
      const score = calculateCompoundRotationScore(0, 0)
      expect(score).toBe(100)
    })

    it('should return score < 100 for warning zone', () => {
      const score = calculateCompoundRotationScore(15, 10)
      expect(score).toBeLessThan(100)
      expect(score).toBeGreaterThan(50)
    })

    it('should return low score for severe misalignment', () => {
      const score = calculateCompoundRotationScore(30, 25)
      expect(score).toBeLessThan(50)
    })

    it('should weight transverse more than frontal', () => {
      // Same angle in different planes should yield different weights
      const transverseOnlyScore = calculateCompoundRotationScore(15, 0)
      const frontalOnlyScore = calculateCompoundRotationScore(0, 15)

      // Transverse has 0.6 weight, frontal has 0.4
      // So transverse issue should reduce score more
      expect(transverseOnlyScore).toBeLessThan(frontalOnlyScore)
    })
  })

  describe('createTorsoRotationFeedback', () => {
    const createMockResult = (overrides: Partial<TorsoRotationResult> = {}): TorsoRotationResult => ({
      rotationAngle: 0,
      rotationDirection: 'none',
      isValid: true,
      frontalTiltAngle: 0,
      frontalTiltDirection: 'none',
      full3DAngle: 0,
      compoundScore: 100,
      ...overrides,
    })

    it('should return null for invalid result', () => {
      const result = createMockResult({ isValid: false })
      const feedback = createTorsoRotationFeedback(result, 'squat')
      expect(feedback).toBeNull()
    })

    it('should return good feedback for aligned torso', () => {
      const result = createMockResult()
      const feedback = createTorsoRotationFeedback(result, 'squat')

      expect(feedback?.level).toBe('good')
      expect(feedback?.message).toContain('Good torso alignment')
    })

    it('should return warning for moderate rotation', () => {
      const result = createMockResult({
        rotationAngle: 15,
        rotationDirection: 'left',
        compoundScore: 75,
      })
      const feedback = createTorsoRotationFeedback(result, 'squat')

      expect(feedback?.level).toBe('warning')
    })

    it('should return error for severe frontal tilt', () => {
      const result = createMockResult({
        frontalTiltAngle: 20,
        frontalTiltDirection: 'left',
        compoundScore: 50,
      })
      const feedback = createTorsoRotationFeedback(result, 'squat')

      expect(feedback?.level).toBe('error')
      expect(feedback?.message).toContain('shoulder')
    })

    it('should include bilingual messages', () => {
      const result = createMockResult({
        rotationAngle: 25,
        rotationDirection: 'right',
        compoundScore: 40,
      })
      const feedback = createTorsoRotationFeedback(result, 'squat')

      expect(feedback?.message).toContain('/')
      expect(feedback?.message).toMatch(/[가-힣]/) // Contains Korean
    })
  })

  describe('calculateRotationScore', () => {
    it('should return 100 for null feedback', () => {
      const score = calculateRotationScore(null)
      expect(score).toBe(100)
    })

    it('should use compound score when result provided', () => {
      const feedback = {
        level: 'warning' as const,
        message: 'test',
        correction: 'none' as const,
        value: 15,
        idealRange: { min: 0, max: 10 },
        acceptableRange: { min: 0, max: 20 },
      }
      const result: TorsoRotationResult = {
        rotationAngle: 15,
        rotationDirection: 'left',
        isValid: true,
        frontalTiltAngle: 5,
        frontalTiltDirection: 'none',
        full3DAngle: 16,
        compoundScore: 72,
      }

      const score = calculateRotationScore(feedback, result)
      expect(score).toBe(72)
    })

    it('should fallback to legacy calculation without result', () => {
      const feedback = {
        level: 'good' as const,
        message: 'test',
        correction: 'none' as const,
        value: 5,
        idealRange: { min: 0, max: 10 },
        acceptableRange: { min: 0, max: 20 },
      }

      const score = calculateRotationScore(feedback)
      expect(score).toBe(100)
    })
  })
})

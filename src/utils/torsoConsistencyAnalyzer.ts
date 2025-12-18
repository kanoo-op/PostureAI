/**
 * Torso Consistency Analyzer Utility Module
 * 몸통 정렬 일관성 분석을 위한 유틸리티 모듈
 *
 * Tracks torso angle stability throughout exercise movements,
 * detects form breakdown, and enables rep-to-rep comparison.
 */

import {
  Point3D,
  keypointToPoint3D,
  midpoint,
  calculateAngleWithVertical,
  isValidKeypoint,
} from './pose3DUtils'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'
import type { FeedbackItem, FeedbackLevel, CorrectionDirection, SquatPhase } from './squatAnalyzer'

// ============================================
// Type Definitions
// ============================================

export interface Keypoint {
  x: number
  y: number
  z?: number
  score?: number
}

export interface TorsoConsistencyResult {
  currentAngle: number              // Current torso angle with vertical (degrees)
  phaseVariance: number             // Variance within current phase (degrees²)
  rollingVariance: number           // Rolling variance over window (degrees²)
  suddenShiftDetected: boolean      // True if angle change exceeds threshold
  shiftMagnitude: number            // Magnitude of detected shift (degrees/frame)
  depthCheckpointAngle: number | null  // Angle at current depth checkpoint if applicable
  consistencyScore: number          // 0-100 consistency score
  isValid: boolean                  // Whether required keypoints detected
}

export interface TorsoConsistencyAnalyzerState {
  // Rolling buffer for temporal analysis
  angleHistory: number[]            // Rolling buffer of torso angles
  deltaHistory: number[]            // Rolling buffer of frame-to-frame deltas

  // Per-phase statistics
  phaseAngles: {
    standing: number[]
    descending: number[]
    bottom: number[]
    ascending: number[]
  }
  currentPhase: SquatPhase

  // Depth checkpoint tracking (normalized knee angle 0-100%)
  depthCheckpoints: {
    checkpoint25: number[]          // Angles at 25% depth across reps
    checkpoint50: number[]          // Angles at 50% depth across reps
    checkpoint75: number[]          // Angles at 75% depth across reps
    checkpoint100: number[]         // Angles at 100% depth (bottom) across reps
  }
  currentRepCheckpoints: {
    checkpoint25: number | null
    checkpoint50: number | null
    checkpoint75: number | null
    checkpoint100: number | null
  }

  // Rep tracking
  repCount: number
  lastKneeAngle: number

  // Sudden shift detection
  sustainedShiftFrames: number      // Consecutive frames with high delta
}

export interface TorsoConsistencyFeedback extends FeedbackItem {
  feedbackType: 'variance' | 'sudden_shift' | 'cross_rep' | 'phase_specific'
  phaseContext?: SquatPhase
  repComparison?: {
    currentAngle: number
    averageAngle: number
    deviationPercent: number
  }
}

// ============================================
// Threshold Constants
// ============================================

export const TORSO_CONSISTENCY_THRESHOLDS = {
  // Variance thresholds (degrees²)
  variance: {
    ideal: { min: 0, max: 4 },       // < 2° std dev
    acceptable: { min: 0, max: 16 }, // < 4° std dev
  },

  // Sudden shift detection (degrees per frame)
  suddenShift: {
    threshold: 5,                    // 5 degrees/frame = sudden shift
    sustainedFrames: 5,              // 5 consecutive frames = sustained shift
  },

  // Cross-rep comparison (percent deviation)
  crossRep: {
    ideal: { min: 0, max: 5 },       // < 5% deviation from average
    acceptable: { min: 0, max: 10 }, // < 10% deviation
  },

  // Rolling buffer configuration
  buffer: {
    angleWindowSize: 30,             // 30 frames (~1 second at 30fps)
    deltaWindowSize: 5,              // 5 frames for delta analysis
  },

  // Depth checkpoint ranges (normalized knee angle %)
  depthRanges: {
    checkpoint25: { min: 20, max: 30 },
    checkpoint50: { min: 45, max: 55 },
    checkpoint75: { min: 70, max: 80 },
    checkpoint100: { min: 95, max: 100 },
  },
} as const

// ============================================
// Score Weights
// ============================================

export const CONSISTENCY_SCORE_WEIGHTS = {
  phaseVariance: 0.35,      // 35% - stability within phases
  suddenShifts: 0.25,       // 25% - absence of sudden shifts
  crossRepConsistency: 0.25, // 25% - consistency across reps
  depthCheckpoints: 0.15,   // 15% - consistency at depth checkpoints
} as const

// ============================================
// Factory Functions
// ============================================

export function createInitialTorsoConsistencyState(): TorsoConsistencyAnalyzerState {
  return {
    angleHistory: [],
    deltaHistory: [],
    phaseAngles: {
      standing: [],
      descending: [],
      bottom: [],
      ascending: [],
    },
    currentPhase: 'standing',
    depthCheckpoints: {
      checkpoint25: [],
      checkpoint50: [],
      checkpoint75: [],
      checkpoint100: [],
    },
    currentRepCheckpoints: {
      checkpoint25: null,
      checkpoint50: null,
      checkpoint75: null,
      checkpoint100: null,
    },
    repCount: 0,
    lastKneeAngle: 180,
    sustainedShiftFrames: 0,
  }
}

export function resetRepState(state: TorsoConsistencyAnalyzerState): TorsoConsistencyAnalyzerState {
  // Store current rep checkpoints before reset
  const newCheckpoints = { ...state.depthCheckpoints }
  if (state.currentRepCheckpoints.checkpoint25 !== null) {
    newCheckpoints.checkpoint25 = [...state.depthCheckpoints.checkpoint25, state.currentRepCheckpoints.checkpoint25]
  }
  if (state.currentRepCheckpoints.checkpoint50 !== null) {
    newCheckpoints.checkpoint50 = [...state.depthCheckpoints.checkpoint50, state.currentRepCheckpoints.checkpoint50]
  }
  if (state.currentRepCheckpoints.checkpoint75 !== null) {
    newCheckpoints.checkpoint75 = [...state.depthCheckpoints.checkpoint75, state.currentRepCheckpoints.checkpoint75]
  }
  if (state.currentRepCheckpoints.checkpoint100 !== null) {
    newCheckpoints.checkpoint100 = [...state.depthCheckpoints.checkpoint100, state.currentRepCheckpoints.checkpoint100]
  }

  return {
    ...state,
    phaseAngles: {
      standing: [],
      descending: [],
      bottom: [],
      ascending: [],
    },
    depthCheckpoints: newCheckpoints,
    currentRepCheckpoints: {
      checkpoint25: null,
      checkpoint50: null,
      checkpoint75: null,
      checkpoint100: null,
    },
    repCount: state.repCount + 1,
    sustainedShiftFrames: 0,
  }
}

// ============================================
// Helper Functions
// ============================================

function updateRollingBuffer(buffer: number[], value: number, maxSize: number): number[] {
  const newBuffer = [...buffer, value]
  if (newBuffer.length > maxSize) {
    newBuffer.shift()
  }
  return newBuffer
}

function calculateVariance(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length
}

function detectSuddenShift(
  deltaHistory: number[],
  previousSustainedFrames: number
): { suddenShiftDetected: boolean; sustainedShiftFrames: number; shiftMagnitude: number } {
  if (deltaHistory.length === 0) {
    return { suddenShiftDetected: false, sustainedShiftFrames: 0, shiftMagnitude: 0 }
  }

  const latestDelta = deltaHistory[deltaHistory.length - 1]
  const avgDelta = deltaHistory.reduce((a, b) => a + b, 0) / deltaHistory.length

  const isHighDelta = latestDelta > TORSO_CONSISTENCY_THRESHOLDS.suddenShift.threshold
  const newSustainedFrames = isHighDelta ? previousSustainedFrames + 1 : 0

  const suddenShiftDetected = newSustainedFrames >= TORSO_CONSISTENCY_THRESHOLDS.suddenShift.sustainedFrames

  return {
    suddenShiftDetected,
    sustainedShiftFrames: newSustainedFrames,
    shiftMagnitude: avgDelta,
  }
}

function normalizeKneeAngle(kneeAngle: number): number {
  // Convert knee angle to 0-100% depth
  // Standing (~180°) = 0%, Bottom (~90°) = 100%
  const standingAngle = 180
  const bottomAngle = 90
  const normalized = ((standingAngle - kneeAngle) / (standingAngle - bottomAngle)) * 100
  return Math.max(0, Math.min(100, normalized))
}

function updateDepthCheckpoints(
  currentAngle: number,
  kneeAngle: number,
  currentCheckpoints: TorsoConsistencyAnalyzerState['currentRepCheckpoints'],
  lastKneeAngle: number
): {
  depthCheckpointAngle: number | null
  newCurrentRepCheckpoints: TorsoConsistencyAnalyzerState['currentRepCheckpoints']
} {
  const normalizedDepth = normalizeKneeAngle(kneeAngle)
  // lastKneeAngle is used to track direction of movement if needed in future
  void lastKneeAngle
  const { depthRanges } = TORSO_CONSISTENCY_THRESHOLDS

  const newCheckpoints = { ...currentCheckpoints }
  let depthCheckpointAngle: number | null = null

  // Check each checkpoint range and record if crossing for first time
  const checkpoints: Array<{ key: keyof typeof depthRanges; checkpointKey: keyof typeof currentCheckpoints }> = [
    { key: 'checkpoint25', checkpointKey: 'checkpoint25' },
    { key: 'checkpoint50', checkpointKey: 'checkpoint50' },
    { key: 'checkpoint75', checkpointKey: 'checkpoint75' },
    { key: 'checkpoint100', checkpointKey: 'checkpoint100' },
  ]

  for (const { key, checkpointKey } of checkpoints) {
    const range = depthRanges[key]
    if (
      normalizedDepth >= range.min &&
      normalizedDepth <= range.max &&
      newCheckpoints[checkpointKey] === null
    ) {
      newCheckpoints[checkpointKey] = currentAngle
      depthCheckpointAngle = currentAngle
    }
  }

  return { depthCheckpointAngle, newCurrentRepCheckpoints: newCheckpoints }
}

function analyzeCrossRepConsistency(
  currentAngle: number,
  depthCheckpoints: TorsoConsistencyAnalyzerState['depthCheckpoints']
): { currentAngle: number; averageAngle: number; deviationPercent: number } | null {
  // Combine all checkpoint angles
  const allAngles = [
    ...depthCheckpoints.checkpoint25,
    ...depthCheckpoints.checkpoint50,
    ...depthCheckpoints.checkpoint75,
    ...depthCheckpoints.checkpoint100,
  ]

  if (allAngles.length === 0) return null

  const averageAngle = allAngles.reduce((a, b) => a + b, 0) / allAngles.length
  const deviationPercent = averageAngle !== 0
    ? Math.abs((currentAngle - averageAngle) / averageAngle) * 100
    : 0

  return { currentAngle, averageAngle, deviationPercent }
}

function createInvalidResult(): TorsoConsistencyResult {
  return {
    currentAngle: 0,
    phaseVariance: 0,
    rollingVariance: 0,
    suddenShiftDetected: false,
    shiftMagnitude: 0,
    depthCheckpointAngle: null,
    consistencyScore: 0,
    isValid: false,
  }
}

function calculateConsistencyScoreInternal(
  phaseVariance: number,
  suddenShiftDetected: boolean,
  depthCheckpoints: TorsoConsistencyAnalyzerState['depthCheckpoints'],
  currentAngle: number
): number {
  const weights = CONSISTENCY_SCORE_WEIGHTS
  const thresholds = TORSO_CONSISTENCY_THRESHOLDS

  // Phase variance score (0-100)
  let varianceScore = 100
  const stdDev = Math.sqrt(phaseVariance)
  if (stdDev > Math.sqrt(thresholds.variance.acceptable.max)) {
    varianceScore = Math.max(0, 60 - (stdDev - 4) * 10)
  } else if (stdDev > Math.sqrt(thresholds.variance.ideal.max)) {
    varianceScore = 90 - ((stdDev - 2) / 2) * 30
  }

  // Sudden shift score (binary: 100 or 40)
  const shiftScore = suddenShiftDetected ? 40 : 100

  // Cross-rep consistency score
  let crossRepScore = 100
  const crossRepData = analyzeCrossRepConsistency(currentAngle, depthCheckpoints)
  if (crossRepData) {
    if (crossRepData.deviationPercent > thresholds.crossRep.acceptable.max) {
      crossRepScore = Math.max(0, 60 - (crossRepData.deviationPercent - 10) * 3)
    } else if (crossRepData.deviationPercent > thresholds.crossRep.ideal.max) {
      crossRepScore = 90 - ((crossRepData.deviationPercent - 5) / 5) * 30
    }
  }

  // Depth checkpoint consistency score
  let checkpointScore = 100
  const allCheckpoints = [
    ...depthCheckpoints.checkpoint25,
    ...depthCheckpoints.checkpoint50,
    ...depthCheckpoints.checkpoint75,
    ...depthCheckpoints.checkpoint100,
  ]
  if (allCheckpoints.length >= 2) {
    const checkpointVariance = calculateVariance(allCheckpoints)
    const checkpointStdDev = Math.sqrt(checkpointVariance)
    if (checkpointStdDev > 4) {
      checkpointScore = Math.max(0, 60 - (checkpointStdDev - 4) * 10)
    } else if (checkpointStdDev > 2) {
      checkpointScore = 90 - ((checkpointStdDev - 2) / 2) * 30
    }
  }

  // Weighted average
  const totalScore =
    varianceScore * weights.phaseVariance +
    shiftScore * weights.suddenShifts +
    crossRepScore * weights.crossRepConsistency +
    checkpointScore * weights.depthCheckpoints

  return Math.round(totalScore)
}

// ============================================
// Main Analysis Function
// ============================================

export function analyzeTorsoConsistency(
  keypoints: Keypoint[],
  state: TorsoConsistencyAnalyzerState,
  phase: SquatPhase,
  kneeAngle: number
): { result: TorsoConsistencyResult; newState: TorsoConsistencyAnalyzerState } {
  // 1. Extract keypoints (shoulders and hips)
  const leftShoulder = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]
  const rightShoulder = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]
  const leftHip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP]
  const rightHip = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP]

  // 2. Validate keypoints
  const allValid =
    isValidKeypoint(leftShoulder, 0.5) &&
    isValidKeypoint(rightShoulder, 0.5) &&
    isValidKeypoint(leftHip, 0.5) &&
    isValidKeypoint(rightHip, 0.5)

  if (!allValid) {
    return { result: createInvalidResult(), newState: state }
  }

  // 3. Calculate current torso angle using calculateAngleWithVertical
  const hipCenter = midpoint(keypointToPoint3D(leftHip), keypointToPoint3D(rightHip))
  const shoulderCenter = midpoint(keypointToPoint3D(leftShoulder), keypointToPoint3D(rightShoulder))
  const currentAngle = calculateAngleWithVertical(hipCenter, shoulderCenter)

  // 4. Update rolling buffers
  const newAngleHistory = updateRollingBuffer(
    state.angleHistory,
    currentAngle,
    TORSO_CONSISTENCY_THRESHOLDS.buffer.angleWindowSize
  )

  // 5. Calculate frame delta
  const previousAngle = state.angleHistory.length > 0
    ? state.angleHistory[state.angleHistory.length - 1]
    : currentAngle
  const frameDelta = Math.abs(currentAngle - previousAngle)

  const newDeltaHistory = updateRollingBuffer(
    state.deltaHistory,
    frameDelta,
    TORSO_CONSISTENCY_THRESHOLDS.buffer.deltaWindowSize
  )

  // 6. Update phase angles
  const newPhaseAngles = { ...state.phaseAngles }
  newPhaseAngles[phase] = [...state.phaseAngles[phase], currentAngle]

  // 7. Calculate variances
  const phaseVariance = calculateVariance(newPhaseAngles[phase])
  const rollingVariance = calculateVariance(newAngleHistory)

  // 8. Detect sudden shifts
  const { suddenShiftDetected, sustainedShiftFrames, shiftMagnitude } = detectSuddenShift(
    newDeltaHistory,
    state.sustainedShiftFrames
  )

  // 9. Update depth checkpoints
  const { depthCheckpointAngle, newCurrentRepCheckpoints } = updateDepthCheckpoints(
    currentAngle,
    kneeAngle,
    state.currentRepCheckpoints,
    state.lastKneeAngle
  )

  // 10. Calculate consistency score
  const consistencyScore = calculateConsistencyScoreInternal(
    phaseVariance,
    suddenShiftDetected,
    state.depthCheckpoints,
    currentAngle
  )

  // 11. Build new state
  const newState: TorsoConsistencyAnalyzerState = {
    angleHistory: newAngleHistory,
    deltaHistory: newDeltaHistory,
    phaseAngles: newPhaseAngles,
    currentPhase: phase,
    depthCheckpoints: state.depthCheckpoints,
    currentRepCheckpoints: newCurrentRepCheckpoints,
    repCount: state.repCount,
    lastKneeAngle: kneeAngle,
    sustainedShiftFrames,
  }

  return {
    result: {
      currentAngle: Math.round(currentAngle * 10) / 10,
      phaseVariance: Math.round(phaseVariance * 100) / 100,
      rollingVariance: Math.round(rollingVariance * 100) / 100,
      suddenShiftDetected,
      shiftMagnitude: Math.round(shiftMagnitude * 10) / 10,
      depthCheckpointAngle,
      consistencyScore,
      isValid: true,
    },
    newState,
  }
}

// ============================================
// Feedback Generation
// ============================================

export function createTorsoConsistencyFeedback(
  result: TorsoConsistencyResult,
  state: TorsoConsistencyAnalyzerState
): TorsoConsistencyFeedback | null {
  if (!result.isValid) {
    return null
  }

  const { variance, crossRep } = TORSO_CONSISTENCY_THRESHOLDS

  // Priority 1: Sudden shift detection
  if (result.suddenShiftDetected) {
    return {
      level: 'error',
      message: '몸통이 급격히 움직였습니다. 코어를 안정시키세요 / Sudden torso shift detected. Stabilize your core',
      correction: result.shiftMagnitude > 0 ? 'backward' : 'forward',
      value: result.shiftMagnitude,
      idealRange: { min: 0, max: variance.ideal.max },
      acceptableRange: { min: 0, max: variance.acceptable.max },
      feedbackType: 'sudden_shift',
      phaseContext: state.currentPhase,
    }
  }

  // Priority 2: High phase variance
  if (result.phaseVariance > variance.acceptable.max) {
    return {
      level: 'error',
      message: '몸통 각도가 불안정합니다. 일정한 자세를 유지하세요 / Torso angle unstable. Maintain consistent posture',
      correction: 'none',
      value: Math.sqrt(result.phaseVariance), // Report as std dev
      idealRange: { min: 0, max: Math.sqrt(variance.ideal.max) },
      acceptableRange: { min: 0, max: Math.sqrt(variance.acceptable.max) },
      feedbackType: 'variance',
      phaseContext: state.currentPhase,
    }
  }

  if (result.phaseVariance > variance.ideal.max) {
    return {
      level: 'warning',
      message: '몸통 안정성을 조금 더 유지하세요 / Maintain slightly more torso stability',
      correction: 'none',
      value: Math.sqrt(result.phaseVariance),
      idealRange: { min: 0, max: Math.sqrt(variance.ideal.max) },
      acceptableRange: { min: 0, max: Math.sqrt(variance.acceptable.max) },
      feedbackType: 'variance',
      phaseContext: state.currentPhase,
    }
  }

  // Priority 3: Cross-rep inconsistency (only if multiple reps)
  if (state.repCount > 0 && result.depthCheckpointAngle !== null) {
    const crossRepResult = analyzeCrossRepConsistency(result.depthCheckpointAngle, state.depthCheckpoints)
    if (crossRepResult && crossRepResult.deviationPercent > crossRep.acceptable.max) {
      return {
        level: 'warning',
        message: `이전 반복과 몸통 각도가 다릅니다 (${crossRepResult.deviationPercent.toFixed(1)}% 차이) / Torso angle differs from previous reps`,
        correction: crossRepResult.currentAngle > crossRepResult.averageAngle ? 'backward' : 'forward',
        value: crossRepResult.deviationPercent,
        idealRange: crossRep.ideal,
        acceptableRange: crossRep.acceptable,
        feedbackType: 'cross_rep',
        repComparison: crossRepResult,
      }
    }
  }

  // Good feedback
  return {
    level: 'good',
    message: '몸통 안정성이 좋습니다 / Good torso stability',
    correction: 'none',
    value: Math.sqrt(result.phaseVariance),
    idealRange: { min: 0, max: Math.sqrt(variance.ideal.max) },
    acceptableRange: { min: 0, max: Math.sqrt(variance.acceptable.max) },
    feedbackType: 'variance',
  }
}

// ============================================
// Score Calculation
// ============================================

export function calculateConsistencyScore(feedback: TorsoConsistencyFeedback | null): number {
  if (!feedback) return 100

  const { value, idealRange, acceptableRange, level } = feedback

  if (level === 'good') return 100

  if (value <= idealRange.max) {
    return 100
  }

  if (value <= acceptableRange.max) {
    const distance = value - idealRange.max
    const maxDistance = acceptableRange.max - idealRange.max
    const ratio = distance / maxDistance
    return Math.round(90 - ratio * 30)
  }

  // Beyond acceptable range
  const distance = value - acceptableRange.max
  const score = Math.max(0, 60 - distance * 3)
  return Math.round(score)
}

// ============================================
// Multi-Segment Integration
// ============================================

import {
  analyzeTorsoSegments,
  type Keypoint as SegmentKeypoint,
} from './torsoSegmentAnalyzer'
import type { TorsoSegmentResult } from '@/types/torsoSegment'

/**
 * Extended analysis result combining consistency and segment data
 */
export interface TorsoAnalysisComplete {
  consistency: TorsoConsistencyResult
  segments: TorsoSegmentResult
}

/**
 * Combined analyzer for both consistency and segment analysis
 */
export function analyzeCompleteTorso(
  keypoints: Keypoint[],
  state: TorsoConsistencyAnalyzerState,
  phase: SquatPhase,
  normalizedDepth: number,
  minScore: number = 0.5
): TorsoAnalysisComplete {
  const { result: consistency, newState: _newState } = analyzeTorsoConsistency(
    keypoints,
    state,
    phase,
    normalizedDepth
  )

  const segments = analyzeTorsoSegments(keypoints as SegmentKeypoint[], minScore)

  return { consistency, segments }
}

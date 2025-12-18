/**
 * Inter-Joint Coordination Analyzer
 * Analyzes timing synchronization and ratio relationships between knee, hip, and torso angles
 */

import {
  Point3D,
  calculate3DAngle,
  calculateAngleWithVertical,
  keypointToPoint3D,
  isValidKeypoint,
  midpoint,
} from './pose3DUtils'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'
import { CircularBuffer } from './circularBuffer'

// ============================================
// Type Definitions
// ============================================

export type CoordinationPatternType =
  | 'synchronized'      // Joints moving in coordinated patterns
  | 'knee_dominant'     // Knee leading the movement
  | 'hip_dominant'      // Hip leading the movement
  | 'torso_compensating' // Torso compensating for poor coordination

export type CoordinationExerciseType = 'squat' | 'deadlift' | 'lunge'

export interface JointAnglePair {
  left: number
  right: number
  average: number
  timestamp: number
}

export interface TimingMismatchResult {
  leadingJoint: 'knee' | 'hip' | 'torso' | 'synchronized'
  lagAmount: number        // Degrees of phase difference
  lagDirection: 'early' | 'late' | 'synced'
  isSignificant: boolean   // True if lag > 15 degrees
}

export interface CoordinationAnalysisResult {
  // Ratio data
  kneeToHipRatio: number           // Current knee/hip angle ratio
  optimalRatioRange: { min: number; max: number }
  ratioDeviation: number           // How far from optimal (0-1 normalized)

  // Timing data
  timing: TimingMismatchResult

  // Pattern data
  pattern: CoordinationPatternType
  patternConfidence: number        // 0-1 confidence score

  // Scoring
  coordinationScore: number        // 0-100 weighted score

  // Bilateral data
  bilateral: {
    leftCoordination: number       // 0-100 score for left side
    rightCoordination: number      // 0-100 score for right side
    asymmetry: number              // Difference between sides
  }

  // Validity
  isValid: boolean
}

export interface CoordinationAnalyzerState {
  // Angle history using CircularBuffer
  kneeAngleHistory: CircularBuffer<JointAnglePair>
  hipAngleHistory: CircularBuffer<JointAnglePair>
  torsoAngleHistory: CircularBuffer<number>

  // Velocity derivatives for timing detection
  kneeVelocityHistory: CircularBuffer<number>
  hipVelocityHistory: CircularBuffer<number>

  // Pattern tracking
  patternHistory: CircularBuffer<CoordinationPatternType>

  // Previous frame data for derivative calculation
  previousTimestamp: number
  previousKneeAngle: number
  previousHipAngle: number

  // Configuration
  exerciseType: CoordinationExerciseType
  frameCount: number
}

export interface CoordinationFeedbackItem {
  level: 'good' | 'warning' | 'error'
  message: string
  pattern: CoordinationPatternType
  suggestion: string
}

// ============================================
// Constants
// ============================================

export const COORDINATION_RATIO_PRESETS: Record<CoordinationExerciseType, { min: number; max: number }> = {
  squat: { min: 0.85, max: 1.15 },    // ~1:1 knee-hip ratio
  deadlift: { min: 0.6, max: 0.9 },   // Hip-dominant (lower knee/hip ratio)
  lunge: { min: 0.7, max: 1.3 },      // Variable ratio
}

const TIMING_THRESHOLDS = {
  syncedWindow: 10,       // Degrees - within this = synchronized
  significantLag: 15,     // Degrees - above this = significant mismatch
  criticalLag: 25,        // Degrees - above this = error level
}

const COORDINATION_SCORE_WEIGHTS = {
  ratioAdherence: 0.40,   // 40% weight for ratio
  timingSync: 0.35,       // 35% weight for timing
  patternConsistency: 0.25, // 25% weight for pattern
}

const HISTORY_BUFFER_SIZE = 30  // ~1 second at 30fps
const VELOCITY_BUFFER_SIZE = 10 // For smoothing velocity derivatives

// ============================================
// Keypoint Interface
// ============================================

interface Keypoint {
  x: number
  y: number
  z?: number
  score?: number
}

// ============================================
// Factory Function
// ============================================

export function createInitialCoordinationState(
  exerciseType: CoordinationExerciseType = 'squat'
): CoordinationAnalyzerState {
  return {
    kneeAngleHistory: new CircularBuffer<JointAnglePair>(HISTORY_BUFFER_SIZE),
    hipAngleHistory: new CircularBuffer<JointAnglePair>(HISTORY_BUFFER_SIZE),
    torsoAngleHistory: new CircularBuffer<number>(HISTORY_BUFFER_SIZE),
    kneeVelocityHistory: new CircularBuffer<number>(VELOCITY_BUFFER_SIZE),
    hipVelocityHistory: new CircularBuffer<number>(VELOCITY_BUFFER_SIZE),
    patternHistory: new CircularBuffer<CoordinationPatternType>(HISTORY_BUFFER_SIZE),
    previousTimestamp: 0,
    previousKneeAngle: 0,
    previousHipAngle: 0,
    exerciseType,
    frameCount: 0,
  }
}

// ============================================
// Helper Functions
// ============================================

function calculateKneeHipRatio(
  kneeAngle: number,
  hipAngle: number
): number {
  // Avoid division by zero
  if (hipAngle === 0) return 0

  // Normalize angles from extension (180) to flexion amount
  const kneeFlexion = 180 - kneeAngle
  const hipFlexion = 180 - hipAngle

  if (hipFlexion <= 0) return 0
  return kneeFlexion / hipFlexion
}

function calculateAngleVelocity(
  currentAngle: number,
  previousAngle: number,
  deltaTimeMs: number
): number {
  if (deltaTimeMs <= 0) return 0
  return ((currentAngle - previousAngle) / deltaTimeMs) * 1000 // degrees/second
}

function detectTimingMismatch(
  kneeVelocity: number,
  hipVelocity: number,
  kneeAngle: number,
  hipAngle: number
): TimingMismatchResult {
  // Compare velocity signs and magnitudes
  const velocityDiff = Math.abs(kneeVelocity) - Math.abs(hipVelocity)
  const phaseDiff = Math.abs(kneeAngle - hipAngle)

  // Determine leading joint based on velocity
  let leadingJoint: 'knee' | 'hip' | 'synchronized' = 'synchronized'
  if (Math.abs(velocityDiff) > 20) { // 20 deg/s threshold
    leadingJoint = velocityDiff > 0 ? 'knee' : 'hip'
  }

  // Determine lag direction
  let lagDirection: 'early' | 'late' | 'synced' = 'synced'
  if (phaseDiff > TIMING_THRESHOLDS.syncedWindow) {
    // Check which joint is ahead in the movement
    lagDirection = kneeVelocity > hipVelocity ? 'early' : 'late'
  }

  return {
    leadingJoint,
    lagAmount: phaseDiff,
    lagDirection,
    isSignificant: phaseDiff > TIMING_THRESHOLDS.significantLag,
  }
}

function determinePattern(
  timing: TimingMismatchResult,
  ratio: number,
  optimalRange: { min: number; max: number },
  torsoVelocity: number
): { pattern: CoordinationPatternType; confidence: number } {
  // Check for torso compensation (high torso movement during mismatch)
  if (Math.abs(torsoVelocity) > 30 && timing.isSignificant) {
    return { pattern: 'torso_compensating', confidence: 0.85 }
  }

  // Check if synchronized
  if (!timing.isSignificant && ratio >= optimalRange.min && ratio <= optimalRange.max) {
    return { pattern: 'synchronized', confidence: 0.95 }
  }

  // Determine dominant pattern
  if (timing.leadingJoint === 'knee') {
    return { pattern: 'knee_dominant', confidence: 0.80 }
  }
  if (timing.leadingJoint === 'hip') {
    return { pattern: 'hip_dominant', confidence: 0.80 }
  }

  return { pattern: 'synchronized', confidence: 0.70 }
}

function calculateCoordinationScore(
  ratioDeviation: number,
  timing: TimingMismatchResult,
  patternConsistency: number
): number {
  // Ratio score: 100 when within range, decreases with deviation
  const ratioScore = Math.max(0, 100 - (ratioDeviation * 100))

  // Timing score: 100 when synchronized, decreases with lag
  const timingScore = Math.max(0, 100 - (timing.lagAmount * 2))

  // Pattern consistency: passed in from history analysis
  const patternScore = patternConsistency * 100

  // Weighted combination
  return Math.round(
    ratioScore * COORDINATION_SCORE_WEIGHTS.ratioAdherence +
    timingScore * COORDINATION_SCORE_WEIGHTS.timingSync +
    patternScore * COORDINATION_SCORE_WEIGHTS.patternConsistency
  )
}

function calculatePatternConsistency(
  history: CircularBuffer<CoordinationPatternType>
): number {
  if (history.size < 5) return 1.0 // Not enough data, assume consistent

  const patterns = history.getLatest()
  const lastPattern = patterns[patterns.length - 1]

  // Count how many match the current pattern
  const matchCount = patterns.filter(p => p === lastPattern).length
  return matchCount / patterns.length
}

function calculateSideCoordination(
  kneeAngle: number,
  hipAngle: number,
  optimalRange: { min: number; max: number }
): number {
  const ratio = calculateKneeHipRatio(kneeAngle, hipAngle)
  if (ratio >= optimalRange.min && ratio <= optimalRange.max) {
    return 100
  }
  const deviation = ratio < optimalRange.min
    ? optimalRange.min - ratio
    : ratio - optimalRange.max
  return Math.max(0, Math.round(100 - (deviation * 50)))
}

function createInvalidCoordinationResult(): CoordinationAnalysisResult {
  return {
    kneeToHipRatio: 0,
    optimalRatioRange: { min: 0, max: 0 },
    ratioDeviation: 0,
    timing: {
      leadingJoint: 'synchronized',
      lagAmount: 0,
      lagDirection: 'synced',
      isSignificant: false,
    },
    pattern: 'synchronized',
    patternConfidence: 0,
    coordinationScore: 0,
    bilateral: {
      leftCoordination: 0,
      rightCoordination: 0,
      asymmetry: 0,
    },
    isValid: false,
  }
}

// ============================================
// Main Analysis Function
// ============================================

export function analyzeCoordination(
  keypoints: Keypoint[],
  state: CoordinationAnalyzerState,
  timestamp: number = Date.now()
): { result: CoordinationAnalysisResult; newState: CoordinationAnalyzerState } {
  // Performance tracking - must complete within 2ms
  const startTime = performance.now()

  // Extract required keypoints using BLAZEPOSE_KEYPOINTS
  const leftHip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP]
  const rightHip = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP]
  const leftKnee = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_KNEE]
  const rightKnee = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]
  const leftAnkle = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]
  const rightAnkle = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]
  const leftShoulder = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]
  const rightShoulder = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]

  // Validate keypoints using isValidKeypoint from pose3DUtils
  const requiredKeypoints = [
    leftHip, rightHip, leftKnee, rightKnee,
    leftAnkle, rightAnkle, leftShoulder, rightShoulder
  ]
  const allValid = requiredKeypoints.every(kp => isValidKeypoint(kp, 0.5))

  if (!allValid) {
    return {
      result: createInvalidCoordinationResult(),
      newState: state,
    }
  }

  // Convert to Point3D using keypointToPoint3D from pose3DUtils
  const points = {
    leftHip: keypointToPoint3D(leftHip),
    rightHip: keypointToPoint3D(rightHip),
    leftKnee: keypointToPoint3D(leftKnee),
    rightKnee: keypointToPoint3D(rightKnee),
    leftAnkle: keypointToPoint3D(leftAnkle),
    rightAnkle: keypointToPoint3D(rightAnkle),
    leftShoulder: keypointToPoint3D(leftShoulder),
    rightShoulder: keypointToPoint3D(rightShoulder),
  }

  // Calculate knee angles (hip-knee-ankle) using calculate3DAngle
  const leftKneeAngle = calculate3DAngle(points.leftHip, points.leftKnee, points.leftAnkle)
  const rightKneeAngle = calculate3DAngle(points.rightHip, points.rightKnee, points.rightAnkle)
  const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2

  // Calculate hip angles (shoulder-hip-knee) using calculate3DAngle
  const leftHipAngle = calculate3DAngle(points.leftShoulder, points.leftHip, points.leftKnee)
  const rightHipAngle = calculate3DAngle(points.rightShoulder, points.rightHip, points.rightKnee)
  const avgHipAngle = (leftHipAngle + rightHipAngle) / 2

  // Calculate torso angle using calculateAngleWithVertical from pose3DUtils
  const hipCenter = midpoint(points.leftHip, points.rightHip)
  const shoulderCenter = midpoint(points.leftShoulder, points.rightShoulder)
  const torsoAngle = calculateAngleWithVertical(hipCenter, shoulderCenter)

  // Calculate time delta
  const deltaTime = state.previousTimestamp > 0 ? timestamp - state.previousTimestamp : 33

  // Calculate velocities
  const kneeVelocity = calculateAngleVelocity(avgKneeAngle, state.previousKneeAngle, deltaTime)
  const hipVelocity = calculateAngleVelocity(avgHipAngle, state.previousHipAngle, deltaTime)
  const torsoVelocity = state.torsoAngleHistory.size > 0
    ? calculateAngleVelocity(torsoAngle, state.torsoAngleHistory.peek() ?? 0, deltaTime)
    : 0

  // Calculate knee-to-hip ratio
  const ratio = calculateKneeHipRatio(avgKneeAngle, avgHipAngle)
  const optimalRange = COORDINATION_RATIO_PRESETS[state.exerciseType]
  const ratioDeviation = ratio < optimalRange.min
    ? (optimalRange.min - ratio) / optimalRange.min
    : ratio > optimalRange.max
    ? (ratio - optimalRange.max) / optimalRange.max
    : 0

  // Detect timing mismatch
  const timing = detectTimingMismatch(kneeVelocity, hipVelocity, avgKneeAngle, avgHipAngle)

  // Determine pattern
  const { pattern, confidence: patternConfidence } = determinePattern(
    timing,
    ratio,
    optimalRange,
    torsoVelocity
  )

  // Update state buffers (creates new state object)
  const newState: CoordinationAnalyzerState = {
    ...state,
    previousTimestamp: timestamp,
    previousKneeAngle: avgKneeAngle,
    previousHipAngle: avgHipAngle,
    frameCount: state.frameCount + 1,
    // Clone the CircularBuffer instances to maintain immutability pattern
    kneeAngleHistory: state.kneeAngleHistory,
    hipAngleHistory: state.hipAngleHistory,
    torsoAngleHistory: state.torsoAngleHistory,
    kneeVelocityHistory: state.kneeVelocityHistory,
    hipVelocityHistory: state.hipVelocityHistory,
    patternHistory: state.patternHistory,
  }

  // Push to buffers (mutates the CircularBuffer instances)
  newState.kneeAngleHistory.push({
    left: leftKneeAngle,
    right: rightKneeAngle,
    average: avgKneeAngle,
    timestamp,
  })
  newState.hipAngleHistory.push({
    left: leftHipAngle,
    right: rightHipAngle,
    average: avgHipAngle,
    timestamp,
  })
  newState.torsoAngleHistory.push(torsoAngle)
  newState.kneeVelocityHistory.push(kneeVelocity)
  newState.hipVelocityHistory.push(hipVelocity)
  newState.patternHistory.push(pattern)

  // Calculate pattern consistency
  const patternConsistency = calculatePatternConsistency(newState.patternHistory)

  // Calculate coordination score
  const coordinationScore = calculateCoordinationScore(ratioDeviation, timing, patternConsistency)

  // Calculate bilateral coordination
  const leftCoordination = calculateSideCoordination(leftKneeAngle, leftHipAngle, optimalRange)
  const rightCoordination = calculateSideCoordination(rightKneeAngle, rightHipAngle, optimalRange)

  // Check performance budget
  const elapsedTime = performance.now() - startTime
  if (elapsedTime > 2) {
    console.warn(`Coordination analysis exceeded 2ms budget: ${elapsedTime.toFixed(2)}ms`)
  }

  return {
    result: {
      kneeToHipRatio: Math.round(ratio * 100) / 100,
      optimalRatioRange: optimalRange,
      ratioDeviation: Math.round(ratioDeviation * 100) / 100,
      timing,
      pattern,
      patternConfidence,
      coordinationScore,
      bilateral: {
        leftCoordination,
        rightCoordination,
        asymmetry: Math.abs(leftCoordination - rightCoordination),
      },
      isValid: true,
    },
    newState,
  }
}

// ============================================
// Feedback Generation
// ============================================

export function createCoordinationFeedback(
  result: CoordinationAnalysisResult,
  exerciseType: CoordinationExerciseType = 'squat'
): CoordinationFeedbackItem {
  if (!result.isValid) {
    return {
      level: 'warning',
      message: '자세를 인식할 수 없습니다',
      pattern: 'synchronized',
      suggestion: '카메라를 확인하세요',
    }
  }

  // Determine feedback level based on score
  let level: 'good' | 'warning' | 'error'
  if (result.coordinationScore >= 80) {
    level = 'good'
  } else if (result.coordinationScore >= 60) {
    level = 'warning'
  } else {
    level = 'error'
  }

  // Generate pattern-specific messages
  const messages: Record<CoordinationPatternType, { message: string; suggestion: string }> = {
    synchronized: {
      message: '관절 협응이 좋습니다',
      suggestion: '현재 템포를 유지하세요',
    },
    knee_dominant: {
      message: '무릎이 엉덩이보다 먼저 움직입니다',
      suggestion: '엉덩이를 먼저 뒤로 보내세요',
    },
    hip_dominant: {
      message: exerciseType === 'deadlift'
        ? '좋은 힙 힌지 패턴입니다'
        : '엉덩이가 무릎보다 먼저 움직입니다',
      suggestion: exerciseType === 'deadlift'
        ? '현재 패턴을 유지하세요'
        : '무릎과 엉덩이를 동시에 구부리세요',
    },
    torso_compensating: {
      message: '상체가 불균형을 보상하고 있습니다',
      suggestion: '코어를 긴장시키고 천천히 움직이세요',
    },
  }

  const { message, suggestion } = messages[result.pattern]

  return {
    level,
    message,
    pattern: result.pattern,
    suggestion,
  }
}

/**
 * Video Rep Analyzer Module
 * 비디오에서 추출된 포즈 데이터를 분석하여 반복 횟수를 세고 각 반복의 폼을 점수화합니다.
 *
 * @module videoRepAnalyzer
 */

import type {
  FramePoseData,
  VideoAnalysisResult,
  VideoRepAnalysisResult,
  RepAnalysisResult,
  VideoExerciseType,
  VideoRepAnalyzerConfig,
  PhaseWeightConfig,
  ConsistencyMetrics,
  RepComparisonData,
} from '@/types/video'

// Import existing analyzers
import {
  analyzeSquat,
  createInitialState as createSquatState,
  SquatAnalyzerState,
  SquatAnalysisResult,
  SquatPhase,
} from './squatAnalyzer'
import {
  analyzeLunge,
  createInitialLungeState,
  LungeAnalyzerState,
  LungeAnalysisResult,
  LungePhase,
} from './lungeAnalyzer'
import {
  analyzeDeadlift,
  createInitialDeadliftState,
  DeadliftAnalyzerState,
  DeadliftAnalysisResult,
  DeadliftPhase,
} from './deadliftAnalyzer'
import {
  analyzePushup,
  createInitialState as createPushupState,
  PushupAnalyzerState,
  PushupAnalysisResult,
  PushupPhase,
} from './pushupAnalyzer'
import {
  analyzePlank,
  createInitialPlankState,
  PlankAnalyzerState,
  PlankAnalysisResult,
} from './plankAnalyzer'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'

// ============================================
// Constants
// ============================================

/**
 * Default phase weights for each exercise type
 * Bottom phase is weighted highest as it's most critical for form assessment
 */
export const DEFAULT_PHASE_WEIGHTS: Record<VideoExerciseType, PhaseWeightConfig> = {
  squat: { standing: 0.1, descending: 0.2, bottom: 0.5, ascending: 0.2 },
  lunge: { standing: 0.1, descending: 0.2, bottom: 0.5, ascending: 0.2 },
  deadlift: { standing: 0.15, descending: 0.2, bottom: 0.45, ascending: 0.2 },
  pushup: { standing: 0.1, descending: 0.25, bottom: 0.4, ascending: 0.25 },
  plank: { standing: 1.0, descending: 0, bottom: 0, ascending: 0 }, // Plank is isometric
  unknown: { standing: 0.25, descending: 0.25, bottom: 0.25, ascending: 0.25 },
}

const DEFAULT_CONFIG: Required<VideoRepAnalyzerConfig> = {
  exerciseType: undefined as unknown as VideoExerciseType, // Will be auto-detected
  phaseWeights: {},
  minRepDuration: 500, // 0.5 seconds minimum
  maxRepDuration: 10000, // 10 seconds maximum
  scoreAggregation: 'weighted',
  smoothingEnabled: true,
  skipFailedFrames: true,
  interpolateGaps: false,
}

// Phase mapping for generic handling
type GenericPhase = 'standing' | 'descending' | 'bottom' | 'ascending'

// Type alias for analyzer states
type AnyAnalyzerState =
  | SquatAnalyzerState
  | LungeAnalyzerState
  | DeadliftAnalyzerState
  | PushupAnalyzerState
  | PlankAnalyzerState

// Type alias for analysis results
type AnyAnalysisResult =
  | SquatAnalysisResult
  | LungeAnalysisResult
  | DeadliftAnalysisResult
  | PushupAnalysisResult
  | PlankAnalysisResult

// ============================================
// Exercise Type Detection
// ============================================

interface BodyOrientationMetrics {
  isVertical: boolean // Standing exercises (squat, lunge, deadlift)
  isHorizontal: boolean // Floor exercises (pushup, plank)
  averageHipHeight: number // Normalized hip height
  averageShoulderHeight: number
  hasSignificantKneeMovement: boolean
  hasSignificantArmMovement: boolean
  hipToAnkleRatio: number // For lunge vs squat detection
}

/**
 * Analyze body orientation from pose frames
 * 포즈 프레임에서 신체 방향 분석
 */
function analyzeBodyOrientation(frames: FramePoseData[]): BodyOrientationMetrics {
  const validFrames = frames.filter((f) => f.pose !== null)
  if (validFrames.length === 0) {
    return {
      isVertical: true,
      isHorizontal: false,
      averageHipHeight: 0.5,
      averageShoulderHeight: 0.3,
      hasSignificantKneeMovement: false,
      hasSignificantArmMovement: false,
      hipToAnkleRatio: 1,
    }
  }

  let totalHipY = 0
  let totalShoulderY = 0
  let minKneeAngle = 180
  let maxKneeAngle = 0
  let minElbowAngle = 180
  let maxElbowAngle = 0
  let validHipCount = 0
  let validShoulderCount = 0

  validFrames.forEach((frame) => {
    const pose = frame.pose!
    const keypoints = pose.keypoints

    // Calculate hip and shoulder heights (normalized Y, lower = higher on screen)
    const leftHip = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_HIP]
    const rightHip = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_HIP]
    const leftShoulder = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]
    const rightShoulder = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]

    if (leftHip && rightHip) {
      totalHipY += (leftHip.y + rightHip.y) / 2
      validHipCount++
    }
    if (leftShoulder && rightShoulder) {
      totalShoulderY += (leftShoulder.y + rightShoulder.y) / 2
      validShoulderCount++
    }

    // Track knee angle range for movement detection
    const leftKnee = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_KNEE]
    const rightKnee = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]
    const leftAnkle = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]
    const rightAnkle = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]

    if (leftHip && leftKnee && leftAnkle) {
      const angle = calculateSimpleAngle(leftHip, leftKnee, leftAnkle)
      minKneeAngle = Math.min(minKneeAngle, angle)
      maxKneeAngle = Math.max(maxKneeAngle, angle)
    }
    if (rightHip && rightKnee && rightAnkle) {
      const angle = calculateSimpleAngle(rightHip, rightKnee, rightAnkle)
      minKneeAngle = Math.min(minKneeAngle, angle)
      maxKneeAngle = Math.max(maxKneeAngle, angle)
    }

    // Track elbow angle range for pushup detection
    const leftElbow = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_ELBOW]
    const rightElbow = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_ELBOW]
    const leftWrist = keypoints[BLAZEPOSE_KEYPOINTS.LEFT_WRIST]
    const rightWrist = keypoints[BLAZEPOSE_KEYPOINTS.RIGHT_WRIST]

    if (leftShoulder && leftElbow && leftWrist) {
      const angle = calculateSimpleAngle(leftShoulder, leftElbow, leftWrist)
      minElbowAngle = Math.min(minElbowAngle, angle)
      maxElbowAngle = Math.max(maxElbowAngle, angle)
    }
    if (rightShoulder && rightElbow && rightWrist) {
      const angle = calculateSimpleAngle(rightShoulder, rightElbow, rightWrist)
      minElbowAngle = Math.min(minElbowAngle, angle)
      maxElbowAngle = Math.max(maxElbowAngle, angle)
    }
  })

  const avgHipY = validHipCount > 0 ? totalHipY / validHipCount : 0.5
  const avgShoulderY = validShoulderCount > 0 ? totalShoulderY / validShoulderCount : 0.3

  // Determine orientation based on hip-shoulder relationship
  // In vertical poses, shoulders are above hips (lower Y value)
  // In horizontal poses, shoulders and hips are at similar Y levels
  const isVertical = Math.abs(avgShoulderY - avgHipY) > 0.15
  const isHorizontal = !isVertical

  // Significant movement thresholds
  const hasSignificantKneeMovement = maxKneeAngle - minKneeAngle > 30
  const hasSignificantArmMovement = maxElbowAngle - minElbowAngle > 40

  return {
    isVertical,
    isHorizontal,
    averageHipHeight: avgHipY,
    averageShoulderHeight: avgShoulderY,
    hasSignificantKneeMovement,
    hasSignificantArmMovement,
    hipToAnkleRatio: 1, // Simplified - would need more complex calculation for lunge detection
  }
}

/**
 * Calculate simple angle between three points (for detection purposes)
 */
function calculateSimpleAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  const ab = { x: a.x - b.x, y: a.y - b.y }
  const cb = { x: c.x - b.x, y: c.y - b.y }

  const dot = ab.x * cb.x + ab.y * cb.y
  const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y)
  const magCB = Math.sqrt(cb.x * cb.x + cb.y * cb.y)

  if (magAB === 0 || magCB === 0) return 180

  const cosAngle = Math.max(-1, Math.min(1, dot / (magAB * magCB)))
  return Math.acos(cosAngle) * (180 / Math.PI)
}

/**
 * Auto-detect exercise type from pose sequence
 * 포즈 시퀀스에서 운동 유형 자동 감지
 *
 * @param frames - Array of frame pose data
 * @returns Detected exercise type and confidence
 */
export function detectExerciseType(
  frames: FramePoseData[]
): { type: VideoExerciseType; confidence: number } {
  const metrics = analyzeBodyOrientation(frames)

  // Horizontal orientation suggests pushup or plank
  if (metrics.isHorizontal) {
    // Check for arm movement to distinguish pushup from plank
    if (metrics.hasSignificantArmMovement) {
      return { type: 'pushup', confidence: 0.75 }
    }
    return { type: 'plank', confidence: 0.7 }
  }

  // Vertical orientation - squat, lunge, or deadlift
  if (metrics.isVertical) {
    // Check hip-to-ankle ratio for lunge detection
    if (metrics.hipToAnkleRatio < 0.7 || metrics.hipToAnkleRatio > 1.4) {
      return { type: 'lunge', confidence: 0.65 }
    }

    // Check for forward lean (deadlift indicator)
    const forwardLean = metrics.averageShoulderHeight - metrics.averageHipHeight
    if (forwardLean > 0.1) {
      return { type: 'deadlift', confidence: 0.6 }
    }

    // Default to squat for vertical stance with knee movement
    if (metrics.hasSignificantKneeMovement) {
      return { type: 'squat', confidence: 0.7 }
    }
  }

  return { type: 'unknown', confidence: 0.3 }
}

// ============================================
// Rep Boundary Detection
// ============================================

interface RepBoundary {
  startFrame: number
  endFrame: number
  startTimestamp: number
  endTimestamp: number
}

/**
 * Map exercise-specific phases to generic phases
 */
function mapToGenericPhase(phase: string, _exerciseType: VideoExerciseType): GenericPhase {
  const phaseMap: Record<string, GenericPhase> = {
    // Squat phases
    standing: 'standing',
    descending: 'descending',
    bottom: 'bottom',
    ascending: 'ascending',
    // Deadlift phases
    setup: 'standing',
    lift: 'ascending',
    lockout: 'standing',
    descent: 'descending',
    // Pushup phases
    up: 'standing',
  }
  return phaseMap[phase] || 'standing'
}

/**
 * Detect rep boundaries from frame analysis results
 * 프레임 분석 결과에서 반복 경계 감지
 *
 * A rep is completed when:
 * 1. Phase transitions from 'standing' through 'descending' -> 'bottom' -> 'ascending' back to 'standing'
 * 2. Or when 'repCompleted' flag is true in the analysis result
 */
function detectRepBoundaries(
  frameResults: Array<{
    frameIndex: number
    timestamp: number
    phase: GenericPhase
    repCompleted: boolean
  }>,
  config: Required<VideoRepAnalyzerConfig>
): RepBoundary[] {
  const boundaries: RepBoundary[] = []
  let repStartFrame: number | null = null
  let repStartTimestamp: number | null = null
  let lastPhase: GenericPhase = 'standing'
  let passedBottom = false

  for (let i = 0; i < frameResults.length; i++) {
    const { frameIndex, timestamp, phase, repCompleted } = frameResults[i]

    // Start tracking a new rep when transitioning from standing to descending
    if (repStartFrame === null && lastPhase === 'standing' && phase === 'descending') {
      repStartFrame = frameIndex
      repStartTimestamp = timestamp
      passedBottom = false
    }

    // Track if we've passed the bottom phase
    if (phase === 'bottom') {
      passedBottom = true
    }

    // Complete rep when returning to standing after passing bottom, or repCompleted flag
    if (repStartFrame !== null && repStartTimestamp !== null) {
      const duration = timestamp - repStartTimestamp

      if (
        (repCompleted || (phase === 'standing' && passedBottom)) &&
        duration >= config.minRepDuration &&
        duration <= config.maxRepDuration
      ) {
        boundaries.push({
          startFrame: repStartFrame,
          endFrame: frameIndex,
          startTimestamp: repStartTimestamp,
          endTimestamp: timestamp,
        })
        repStartFrame = null
        repStartTimestamp = null
        passedBottom = false
      } else if (duration > config.maxRepDuration) {
        // Rep took too long, reset
        repStartFrame = null
        repStartTimestamp = null
        passedBottom = false
      }
    }

    lastPhase = phase
  }

  return boundaries
}

// ============================================
// Per-Rep Form Scoring
// ============================================

interface FrameAnalysisResult {
  frameIndex: number
  timestamp: number
  score: number
  phase: GenericPhase
  repCompleted: boolean
  feedbacks: string[]
}

/**
 * Calculate weighted rep score based on phase weights
 * 단계 가중치를 기반으로 반복 점수 계산
 */
function calculateWeightedRepScore(
  frameResults: FrameAnalysisResult[],
  phaseWeights: PhaseWeightConfig
): {
  score: number
  phaseScores: Record<GenericPhase, number | null>
} {
  const phaseFrames: Record<GenericPhase, number[]> = {
    standing: [],
    descending: [],
    bottom: [],
    ascending: [],
  }

  // Group frame scores by phase
  frameResults.forEach((result) => {
    phaseFrames[result.phase].push(result.score)
  })

  // Calculate average score per phase
  const phaseScores: Record<GenericPhase, number | null> = {
    standing: null,
    descending: null,
    bottom: null,
    ascending: null,
  }

  let totalWeightedScore = 0
  let totalWeight = 0

  ;(Object.keys(phaseFrames) as GenericPhase[]).forEach((phase) => {
    const scores = phaseFrames[phase]
    if (scores.length > 0) {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
      phaseScores[phase] = Math.round(avgScore)
      totalWeightedScore += avgScore * phaseWeights[phase]
      totalWeight += phaseWeights[phase]
    }
  })

  const score = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0

  return { score, phaseScores }
}

/**
 * Identify worst moment in a rep
 * 반복에서 가장 나쁜 순간 식별
 */
function identifyWorstMoment(
  frameResults: FrameAnalysisResult[]
): RepAnalysisResult['worstMoment'] {
  if (frameResults.length === 0) {
    return {
      timestamp: 0,
      frameIndex: 0,
      score: 0,
      feedbacks: [],
    }
  }

  let worstFrame = frameResults[0]
  frameResults.forEach((frame) => {
    if (frame.score < worstFrame.score) {
      worstFrame = frame
    }
  })

  return {
    timestamp: worstFrame.timestamp,
    frameIndex: worstFrame.frameIndex,
    score: worstFrame.score,
    feedbacks: worstFrame.feedbacks,
  }
}

/**
 * Aggregate feedback issues across rep frames
 * 반복 프레임에서 피드백 문제 집계
 */
function aggregateFeedbacks(
  frameResults: FrameAnalysisResult[]
): { primaryIssues: string[]; feedbackSummary: Record<string, number> } {
  const feedbackCounts: Record<string, number> = {}

  frameResults.forEach((result) => {
    result.feedbacks.forEach((feedback) => {
      feedbackCounts[feedback] = (feedbackCounts[feedback] || 0) + 1
    })
  })

  // Sort by frequency and take top issues
  const sortedIssues = Object.entries(feedbackCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([issue]) => issue)

  return {
    primaryIssues: sortedIssues,
    feedbackSummary: feedbackCounts,
  }
}

/**
 * Analyze a single rep and produce RepAnalysisResult
 * 단일 반복 분석 및 RepAnalysisResult 생성
 */
function analyzeRep(
  repNumber: number,
  boundary: RepBoundary,
  frameResults: FrameAnalysisResult[],
  config: Required<VideoRepAnalyzerConfig>,
  exerciseType: VideoExerciseType
): RepAnalysisResult {
  const repFrames = frameResults.filter(
    (f) => f.frameIndex >= boundary.startFrame && f.frameIndex <= boundary.endFrame
  )

  const frameScores = repFrames.map((f) => f.score)
  const phaseWeights = {
    ...DEFAULT_PHASE_WEIGHTS[exerciseType],
    ...config.phaseWeights,
  }

  const { score, phaseScores } = calculateWeightedRepScore(repFrames, phaseWeights)
  const worstMoment = identifyWorstMoment(repFrames)
  const { primaryIssues, feedbackSummary } = aggregateFeedbacks(repFrames)

  return {
    repNumber,
    startTimestamp: boundary.startTimestamp,
    endTimestamp: boundary.endTimestamp,
    duration: boundary.endTimestamp - boundary.startTimestamp,
    score,
    phaseScores: {
      standing: phaseScores.standing,
      descending: phaseScores.descending,
      bottom: phaseScores.bottom,
      ascending: phaseScores.ascending,
    },
    frameCount: repFrames.length,
    frameScores,
    minScore: frameScores.length > 0 ? Math.min(...frameScores) : 0,
    maxScore: frameScores.length > 0 ? Math.max(...frameScores) : 0,
    avgScore:
      frameScores.length > 0
        ? Math.round(frameScores.reduce((a, b) => a + b, 0) / frameScores.length)
        : 0,
    worstMoment,
    primaryIssues,
    feedbackSummary,
  }
}

// ============================================
// Consistency Analysis
// ============================================

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2))
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length)
}

/**
 * Calculate linear regression slope for trend analysis
 */
function calculateTrendSlope(values: number[]): number {
  if (values.length < 2) return 0

  const n = values.length
  const xMean = (n - 1) / 2
  const yMean = values.reduce((a, b) => a + b, 0) / n

  let numerator = 0
  let denominator = 0

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean)
    denominator += Math.pow(i - xMean, 2)
  }

  return denominator !== 0 ? numerator / denominator : 0
}

/**
 * Calculate consistency metrics across all reps
 * 모든 반복에 대한 일관성 메트릭 계산
 */
function calculateConsistencyMetrics(reps: RepAnalysisResult[]): ConsistencyMetrics {
  if (reps.length === 0) {
    return {
      overallConsistency: 0,
      scoreStdDev: 0,
      durationStdDev: 0,
      trend: 'stable',
      trendSlope: 0,
      bestRep: 0,
      worstRep: 0,
    }
  }

  const scores = reps.map((r) => r.score)
  const durations = reps.map((r) => r.duration)

  const scoreStdDev = calculateStdDev(scores)
  const durationStdDev = calculateStdDev(durations)
  const trendSlope = calculateTrendSlope(scores)

  // Consistency score: lower std dev = higher consistency
  // Max consistency when std dev is 0, drops as std dev increases
  const overallConsistency = Math.max(0, Math.round(100 - scoreStdDev * 2))

  // Determine trend
  let trend: ConsistencyMetrics['trend']
  if (Math.abs(trendSlope) < 1) {
    trend = 'stable'
  } else if (trendSlope > 2) {
    trend = 'improving'
  } else if (trendSlope < -2) {
    trend = 'declining'
  } else if (scoreStdDev > 15) {
    trend = 'fluctuating'
  } else {
    trend = 'stable'
  }

  // Find best and worst reps
  let bestRep = 1
  let worstRep = 1
  let maxScore = scores[0]
  let minScore = scores[0]

  scores.forEach((score, i) => {
    if (score > maxScore) {
      maxScore = score
      bestRep = i + 1
    }
    if (score < minScore) {
      minScore = score
      worstRep = i + 1
    }
  })

  return {
    overallConsistency,
    scoreStdDev: Math.round(scoreStdDev * 10) / 10,
    durationStdDev: Math.round(durationStdDev),
    trend,
    trendSlope: Math.round(trendSlope * 100) / 100,
    bestRep,
    worstRep,
  }
}

/**
 * Generate rep comparison data
 * 반복 비교 데이터 생성
 */
function generateComparisonData(reps: RepAnalysisResult[]): RepComparisonData[] {
  if (reps.length === 0) return []

  const scores = reps.map((r) => r.score)
  const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length
  const stdDev = calculateStdDev(scores)

  return reps.map((rep, i) => {
    const deviation = stdDev > 0 ? (rep.score - meanScore) / stdDev : 0
    const comparedToPrevious = i > 0 ? rep.score - reps[i - 1].score : null

    let trend: RepComparisonData['trend']
    if (comparedToPrevious === null || Math.abs(comparedToPrevious) < 5) {
      trend = 'stable'
    } else if (comparedToPrevious > 0) {
      trend = 'improving'
    } else {
      trend = 'declining'
    }

    return {
      repNumber: rep.repNumber,
      score: rep.score,
      duration: rep.duration,
      deviation: Math.round(deviation * 100) / 100,
      trend,
      comparedToPrevious,
    }
  })
}

// ============================================
// Main Analysis Function
// ============================================

/**
 * Keypoint interface for analyzer compatibility
 */
interface Keypoint {
  x: number
  y: number
  z?: number
  score?: number
}

/**
 * Process a single frame with the appropriate analyzer
 * 적절한 분석기로 단일 프레임 처리
 */
function processFrame(
  frame: FramePoseData,
  exerciseType: VideoExerciseType,
  state: AnyAnalyzerState,
  timestamp: number
): {
  result: AnyAnalysisResult
  newState: AnyAnalyzerState
} | null {
  if (!frame.pose) return null

  const keypoints = frame.pose.keypoints as Keypoint[]

  switch (exerciseType) {
    case 'squat':
      return analyzeSquat(keypoints, state as SquatAnalyzerState)
    case 'lunge':
      return analyzeLunge(keypoints, state as LungeAnalyzerState)
    case 'deadlift':
      return analyzeDeadlift(keypoints, state as DeadliftAnalyzerState)
    case 'pushup':
      return analyzePushup(keypoints, state as PushupAnalyzerState)
    case 'plank':
      return analyzePlank(keypoints, state as PlankAnalyzerState, timestamp)
    default:
      // Default to squat analyzer for unknown types
      return analyzeSquat(keypoints, state as SquatAnalyzerState)
  }
}

/**
 * Create initial analyzer state for exercise type
 * 운동 유형에 대한 초기 분석기 상태 생성
 */
function createInitialAnalyzerState(
  exerciseType: VideoExerciseType,
  smoothingEnabled: boolean
): AnyAnalyzerState {
  const smoothingConfig = smoothingEnabled ? { windowSize: 5, outlierThreshold: 2.5 } : undefined

  switch (exerciseType) {
    case 'squat':
      return createSquatState(smoothingConfig)
    case 'lunge':
      return createInitialLungeState(smoothingConfig)
    case 'deadlift':
      return createInitialDeadliftState(smoothingConfig)
    case 'pushup':
      return createPushupState(smoothingConfig)
    case 'plank':
      return createInitialPlankState(smoothingConfig)
    default:
      return createSquatState(smoothingConfig)
  }
}

/**
 * Extract phase and feedbacks from analysis result
 */
function extractPhaseAndFeedbacks(
  result: AnyAnalysisResult,
  exerciseType: VideoExerciseType
): { phase: GenericPhase; repCompleted: boolean; feedbacks: string[] } {
  const feedbacks: string[] = []

  // Extract feedbacks from result
  if ('feedbacks' in result) {
    const feedbacksObj = result.feedbacks as Record<
      string,
      { level?: string; message?: string } | null | undefined
    >
    Object.values(feedbacksObj).forEach((feedback) => {
      if (feedback && feedback.level !== 'good' && feedback.message) {
        feedbacks.push(feedback.message)
      }
    })
  }

  // Get phase and repCompleted
  let phase: GenericPhase = 'standing'
  let repCompleted = false

  if ('phase' in result) {
    phase = mapToGenericPhase(
      result.phase as SquatPhase | LungePhase | DeadliftPhase | PushupPhase,
      exerciseType
    )
  }

  if ('repCompleted' in result) {
    repCompleted = result.repCompleted as boolean
  }

  return { phase, repCompleted, feedbacks }
}

/**
 * Main video rep analysis function
 * 메인 비디오 반복 분석 함수
 *
 * @param videoAnalysis - Complete video analysis result with frame pose data
 * @param config - Optional analyzer configuration
 * @returns Complete video rep analysis result
 */
export function analyzeVideoReps(
  videoAnalysis: VideoAnalysisResult,
  config?: Partial<VideoRepAnalyzerConfig>
): VideoRepAnalysisResult {
  const fullConfig: Required<VideoRepAnalyzerConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  }

  // Auto-detect exercise type if not provided
  let exerciseType = fullConfig.exerciseType
  let exerciseTypeConfidence = 1.0

  if (!exerciseType || exerciseType === 'unknown') {
    const detection = detectExerciseType(videoAnalysis.frames)
    exerciseType = detection.type
    exerciseTypeConfidence = detection.confidence
  }

  // Initialize analyzer state
  let analyzerState = createInitialAnalyzerState(exerciseType, fullConfig.smoothingEnabled)

  // Process all frames
  const frameResults: FrameAnalysisResult[] = []

  for (const frame of videoAnalysis.frames) {
    // Skip failed frames if configured
    if (!frame.pose && fullConfig.skipFailedFrames) {
      continue
    }

    // Process frame
    const processResult = processFrame(frame, exerciseType, analyzerState, frame.timestamp)

    if (processResult) {
      analyzerState = processResult.newState
      const { phase, repCompleted, feedbacks } = extractPhaseAndFeedbacks(
        processResult.result,
        exerciseType
      )

      frameResults.push({
        frameIndex: frame.frameIndex,
        timestamp: frame.timestamp,
        score: processResult.result.score,
        phase,
        repCompleted,
        feedbacks,
      })
    }
  }

  // Detect rep boundaries
  const repBoundaries = detectRepBoundaries(frameResults, fullConfig)

  // Analyze each rep
  const reps: RepAnalysisResult[] = repBoundaries.map((boundary, i) =>
    analyzeRep(i + 1, boundary, frameResults, fullConfig, exerciseType)
  )

  // Calculate consistency metrics
  const consistency = calculateConsistencyMetrics(reps)
  const comparison = generateComparisonData(reps)

  // Calculate summary
  const scores = reps.map((r) => r.score)
  const durations = reps.map((r) => r.duration)

  const summary = {
    averageScore:
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    minScore: scores.length > 0 ? Math.min(...scores) : 0,
    maxScore: scores.length > 0 ? Math.max(...scores) : 0,
    totalDuration:
      reps.length > 0 ? reps[reps.length - 1].endTimestamp - reps[0].startTimestamp : 0,
    averageRepDuration:
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0,
  }

  return {
    id: `rep-analysis-${Date.now()}`,
    videoAnalysisId: videoAnalysis.id,
    exerciseType,
    exerciseTypeConfidence,
    totalReps: reps.length,
    reps,
    summary,
    consistency,
    comparison,
    config: fullConfig,
    processedAt: Date.now(),
  }
}

// ============================================
// Exports
// ============================================

export { DEFAULT_CONFIG as DEFAULT_REP_ANALYZER_CONFIG }

export type { FrameAnalysisResult, RepBoundary }

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { Pose3D } from '@/types/pose'
import {
  analyzePlank,
  createInitialPlankState,
  formatHoldTime,
  type PlankAnalyzerState,
  type FeedbackLevel,
  type CorrectionDirection,
} from '@/utils/plankAnalyzer'
import SkeletonOverlay, { type JointFeedback, type CorrectionDirection as SkeletonCorrectionDirection } from '@/components/SkeletonOverlay'
import FeedbackPanel, { type Checkpoint } from '@/components/FeedbackPanel'
import AngleVisualization, { type AngleConfig, type FeedbackLevel as AngleFeedbackLevel } from '@/components/AngleVisualization'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'

const PLANK_ANGLE_CONFIGS: AngleConfig[] = [
  // Left body alignment: Shoulder -> Hip -> Ankle
  { vertexIndex: 23, startIndex: 11, endIndex: 27, label: 'L Align' },
  // Right body alignment: Shoulder -> Hip -> Ankle
  { vertexIndex: 24, startIndex: 12, endIndex: 28, label: 'R Align' },
]

// Helper function to map plank analyzer correction directions to skeleton overlay directions
function mapCorrectionDirection(correction: CorrectionDirection): SkeletonCorrectionDirection {
  switch (correction) {
    case 'raise':
      return 'up'
    case 'lower':
      return 'down'
    case 'straighten':
      return 'none' // No specific direction for straighten
    default:
      return correction as SkeletonCorrectionDirection
  }
}

// Dynamic import for PoseDetector to avoid SSR issues with TensorFlow.js
const PoseDetector = dynamic(() => import('@/components/PoseDetector'), {
  ssr: false,
  loading: () => (
    <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent mx-auto mb-4" />
        <p className="text-gray-400">컴포넌트 로딩 중...</p>
      </div>
    </div>
  ),
})

export default function PlankPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [fps, setFps] = useState(0)
  const [currentPose, setCurrentPose] = useState<Pose3D | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 플랭크 분석 상태
  const [analyzerState, setAnalyzerState] = useState<PlankAnalyzerState>(createInitialPlankState())
  const [score, setScore] = useState(0)
  const [holdTime, setHoldTime] = useState(0)
  const [isValidPlank, setIsValidPlank] = useState(false)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [jointFeedbacks, setJointFeedbacks] = useState<JointFeedback[]>([])
  const [angleFeedbackLevels, setAngleFeedbackLevels] = useState<Record<number, AngleFeedbackLevel>>({})

  // 타이머 상태
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [manualHoldTime, setManualHoldTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // 타이머 로직
  useEffect(() => {
    if (isTimerRunning && isValidPlank) {
      timerRef.current = setInterval(() => {
        setManualHoldTime(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isTimerRunning, isValidPlank])

  // 포즈 분석 및 피드백 생성
  const analyzePose = useCallback((pose: Pose3D | null) => {
    setCurrentPose(pose)

    if (!pose || !pose.keypoints) {
      return
    }

    // 플랭크 분석 실행
    const { result, newState } = analyzePlank(pose.keypoints, analyzerState)
    setAnalyzerState(newState)

    // 결과 업데이트
    setScore(result.score)
    setHoldTime(result.holdTime)
    setIsValidPlank(result.isValidPlank)

    // 체크포인트 생성
    const newCheckpoints: Checkpoint[] = [
      {
        id: 'bodyAlignment',
        name: '몸통 정렬',
        status: result.feedbacks.bodyAlignment.level === 'error' ? 'error' :
                result.feedbacks.bodyAlignment.level === 'warning' ? 'warning' : 'good',
        value: result.feedbacks.bodyAlignment.value,
        unit: '°',
        message: result.feedbacks.bodyAlignment.message,
      },
      {
        id: 'hipPosition',
        name: '엉덩이 위치',
        status: result.feedbacks.hipPosition.level === 'error' ? 'error' :
                result.feedbacks.hipPosition.level === 'warning' ? 'warning' : 'good',
        value: result.feedbacks.hipPosition.value,
        unit: '°',
        message: result.feedbacks.hipPosition.message,
      },
      {
        id: 'shoulderAlignment',
        name: '어깨 정렬',
        status: result.feedbacks.shoulderAlignment.level === 'error' ? 'error' :
                result.feedbacks.shoulderAlignment.level === 'warning' ? 'warning' : 'good',
        value: result.feedbacks.shoulderAlignment.value,
        unit: '%',
        message: result.feedbacks.shoulderAlignment.message,
      },
      {
        id: 'neckAlignment',
        name: '목 정렬',
        status: result.feedbacks.neckAlignment.level === 'error' ? 'error' :
                result.feedbacks.neckAlignment.level === 'warning' ? 'warning' : 'good',
        value: result.feedbacks.neckAlignment.value,
        unit: '°',
        message: result.feedbacks.neckAlignment.message,
      },
    ]
    setCheckpoints(newCheckpoints)

    // 스켈레톤 피드백 생성
    const newJointFeedbacks: JointFeedback[] = [
      // Shoulders - for body alignment feedback
      {
        jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
        level: result.feedbacks.bodyAlignment.level,
        correction: mapCorrectionDirection(result.feedbacks.shoulderAlignment.correction),
      },
      {
        jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
        level: result.feedbacks.bodyAlignment.level,
        correction: mapCorrectionDirection(result.feedbacks.shoulderAlignment.correction),
      },
      // Hips - for hip position feedback
      {
        jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_HIP,
        level: result.feedbacks.hipPosition.level,
        correction: mapCorrectionDirection(result.feedbacks.hipPosition.correction),
      },
      {
        jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
        level: result.feedbacks.hipPosition.level,
        correction: mapCorrectionDirection(result.feedbacks.hipPosition.correction),
      },
      // Wrists - for shoulder alignment reference
      {
        jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_WRIST,
        level: result.feedbacks.shoulderAlignment.level,
      },
      {
        jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_WRIST,
        level: result.feedbacks.shoulderAlignment.level,
      },
      // Nose - for neck alignment
      {
        jointIndex: BLAZEPOSE_KEYPOINTS.NOSE,
        level: result.feedbacks.neckAlignment.level,
        correction: mapCorrectionDirection(result.feedbacks.neckAlignment.correction),
      },
    ]
    setJointFeedbacks(newJointFeedbacks)

    // Build angle feedback levels for body alignment visualization
    setAngleFeedbackLevels({
      23: result.feedbacks.bodyAlignment.level, // LEFT_HIP
      24: result.feedbacks.bodyAlignment.level, // RIGHT_HIP
    })
  }, [analyzerState])

  const handlePoseDetected = useCallback((pose: Pose3D | null) => {
    analyzePose(pose)
  }, [analyzePose])

  const handleFpsUpdate = useCallback((newFps: number) => {
    setFps(newFps)
  }, [])

  const handleReady = useCallback(() => {
    setIsAnalyzing(true)
    setError(null)
  }, [])

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage)
    setIsAnalyzing(false)
  }, [])

  const handleStartStop = useCallback(() => {
    setIsTimerRunning(prev => !prev)
  }, [])

  const handleReset = useCallback(() => {
    setManualHoldTime(0)
    setIsTimerRunning(false)
    setAnalyzerState(createInitialPlankState())
    setScore(0)
  }, [])

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-gray-950">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">플랭크 자세 분석</h1>
          <p className="text-gray-400 mt-1">
            실시간으로 플랭크 자세를 분석하고 폼 피드백을 제공합니다
          </p>
        </div>

        {/* Main Grid: 2 columns on lg, single on mobile */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Video + Skeleton (lg:col-span-2) */}
          <div className="lg:col-span-2">
            <div className="relative bg-gray-900 rounded-2xl overflow-hidden">
              {/* PoseDetector component */}
              <PoseDetector
                width={640}
                height={480}
                mirrored={true}
                showSkeleton={false}
                showKeypoints={false}
                minKeypointScore={0.3}
                onPoseDetected={handlePoseDetected}
                onFpsUpdate={handleFpsUpdate}
                onReady={handleReady}
                onError={handleError}
                className="w-full aspect-video"
              />

              {/* SkeletonOverlay */}
              {isAnalyzing && currentPose?.keypoints && (
                <SkeletonOverlay
                  keypoints={currentPose.keypoints}
                  feedbacks={jointFeedbacks}
                  width={640}
                  height={480}
                  mirrored={true}
                  showSkeleton={true}
                  showKeypoints={true}
                  showAngles={false}
                  showCorrections={true}
                  showPulse={true}
                  className="w-full h-full"
                />
              )}

              {/* Angle Visualization Overlay */}
              {isAnalyzing && currentPose?.keypoints && (
                <AngleVisualization
                  keypoints={currentPose.keypoints}
                  angleConfigs={PLANK_ANGLE_CONFIGS}
                  feedbackLevels={angleFeedbackLevels}
                  width={640}
                  height={480}
                  mirrored={true}
                  minKeypointScore={0.3}
                  showAngleValues={true}
                  showAngleArcs={true}
                  className="w-full h-full"
                />
              )}

              {/* Top Overlay: Score + Hold Status */}
              {isAnalyzing && (
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                  <FormScoreBadge score={score} />
                  <HoldStatusBadge isValid={isValidPlank} isRunning={isTimerRunning} />
                </div>
              )}

              {/* Bottom Overlay: FPS + Hold Timer */}
              {isAnalyzing && (
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <div className="bg-black/70 backdrop-blur px-3 py-1.5 rounded-lg">
                    <span className="text-gray-400 text-xs">FPS</span>
                    <span className="text-white font-mono ml-2">{fps}</span>
                  </div>
                  <HoldTimerBadge seconds={manualHoldTime} />
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-4 p-4 bg-red-900/30 border border-red-700 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Control buttons */}
            {isAnalyzing && (
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleStartStop}
                  className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                    isTimerRunning
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                  }`}
                >
                  {isTimerRunning ? '일시 정지' : '타이머 시작'}
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
                >
                  리셋
                </button>
                <Link
                  href="/result"
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors text-center"
                >
                  결과 저장
                </Link>
              </div>
            )}
          </div>

          {/* Right: Feedback Panel (lg:col-span-1) */}
          <div className="lg:col-span-1 space-y-4">
            {/* Real-time Feedback Panel */}
            {isAnalyzing ? (
              <FeedbackPanel
                score={score}
                checkpoints={checkpoints}
                repCount={0}
                setCount={1}
                targetReps={1}
                targetSets={1}
                phase={isValidPlank ? 'holding' : 'ready'}
                isActive={isTimerRunning && isValidPlank}
              />
            ) : (
              <div className="bg-gray-900 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">분석 대기중</h2>
                <p className="text-gray-400 text-sm">
                  카메라가 준비되면 플랭크 자세를 취해주세요
                </p>
              </div>
            )}

            {/* Plank Guide */}
            <div className="bg-gray-900 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                올바른 플랭크 자세
              </h2>
              <ul className="space-y-3 text-sm text-gray-300">
                <GuideItem number={1} text="몸을 일직선으로 유지하세요" />
                <GuideItem number={2} text="코어에 힘을 주고 복근을 조이세요" />
                <GuideItem number={3} text="어깨는 손목 바로 위에 위치시키세요" />
                <GuideItem number={4} text="목은 척추와 일직선으로, 바닥을 바라보세요" />
                <GuideItem number={5} text="호흡을 꾸준히 유지하세요" />
              </ul>
            </div>

            {/* Color Legend */}
            <div className="bg-gray-900 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">피드백 색상</h2>
              <div className="space-y-2">
                <LegendItem color="bg-green-500" label="좋음" description="현재 자세 유지" />
                <LegendItem color="bg-orange-500" label="주의" description="약간의 교정 필요" />
                <LegendItem color="bg-red-500" label="위험" description="즉시 교정 필요" />
                <LegendItem color="bg-cyan-400" label="화살표" description="교정 방향" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// 서브 컴포넌트
// ============================================

function FormScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-400' : score >= 50 ? 'text-orange-400' : 'text-red-400'
  const bg = score >= 80 ? 'bg-green-500/20' : score >= 50 ? 'bg-orange-500/20' : 'bg-red-500/20'
  const ring = score >= 80 ? 'ring-green-500/50' : score >= 50 ? 'ring-orange-500/50' : 'ring-red-500/50'

  return (
    <div className={`${bg} backdrop-blur px-4 py-2 rounded-xl ring-2 ${ring}`}>
      <span className="text-gray-400 text-xs block">자세 점수</span>
      <span className={`text-3xl font-bold tabular-nums ${color}`}>{score}</span>
    </div>
  )
}

function HoldTimerBadge({ seconds }: { seconds: number }) {
  return (
    <div className="bg-black/70 backdrop-blur px-4 py-2 rounded-xl">
      <span className="text-gray-400 text-xs block">홀드 시간</span>
      <span className="text-2xl font-bold tabular-nums text-cyan-400 font-mono">
        {formatHoldTime(seconds)}
      </span>
    </div>
  )
}

function HoldStatusBadge({ isValid, isRunning }: { isValid: boolean; isRunning: boolean }) {
  let label: string
  let bgColor: string

  if (isRunning && isValid) {
    label = '홀드 중'
    bgColor = 'bg-green-600'
  } else if (isRunning && !isValid) {
    label = '자세 교정 필요'
    bgColor = 'bg-orange-600'
  } else {
    label = '대기 중'
    bgColor = 'bg-gray-600'
  }

  return (
    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${bgColor} text-white shadow-lg`}>
      {isRunning && isValid && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
      {label}
    </span>
  )
}

function GuideItem({ number, text }: { number: number; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600/30 text-cyan-400 flex items-center justify-center text-sm">
        {number}
      </span>
      <span>{text}</span>
    </li>
  )
}

function LegendItem({ color, label, description }: { color: string; label: string; description: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`w-4 h-4 rounded-full ${color}`} />
      <div>
        <span className="text-white text-sm font-medium">{label}</span>
        <span className="text-gray-500 text-xs ml-2">- {description}</span>
      </div>
    </div>
  )
}

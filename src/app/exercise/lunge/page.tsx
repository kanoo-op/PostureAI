'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { Pose3D } from '@/types/pose'
import {
  analyzeLunge,
  createInitialLungeState,
  getLevelLabel,
  getPhaseLabel,
  getFrontLegLabel,
  type LungeAnalyzerState,
  type LungeAnalysisResult,
  type FeedbackLevel,
} from '@/utils/lungeAnalyzer'
import AngleVisualization, { type AngleConfig, type FeedbackLevel as AngleFeedbackLevel } from '@/components/AngleVisualization'

const LUNGE_ANGLE_CONFIGS: AngleConfig[] = [
  // Left Knee: Hip -> Knee -> Ankle
  { vertexIndex: 25, startIndex: 23, endIndex: 27, label: 'L Knee' },
  // Right Knee: Hip -> Knee -> Ankle
  { vertexIndex: 26, startIndex: 24, endIndex: 28, label: 'R Knee' },
  // Left Hip: Shoulder -> Hip -> Knee
  { vertexIndex: 23, startIndex: 11, endIndex: 25, label: 'L Hip' },
  // Right Hip: Shoulder -> Hip -> Knee
  { vertexIndex: 24, startIndex: 12, endIndex: 26, label: 'R Hip' },
]

const PoseDetector = dynamic(() => import('@/components/PoseDetector'), {
  ssr: false,
  loading: () => (
    <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4" />
        <p className="text-gray-400">컴포넌트 로딩 중...</p>
      </div>
    </div>
  ),
})

interface FeedbackState {
  frontKneeAngle: { status: 'good' | 'warning' | 'bad'; message: string; value: number }
  backKneeAngle: { status: 'good' | 'warning' | 'bad'; message: string; value: number }
  hipAngle: { status: 'good' | 'warning' | 'bad'; message: string; value: number }
  torsoInclination: { status: 'good' | 'warning' | 'bad'; message: string; value: number }
  kneeOverToe: { status: 'good' | 'warning' | 'bad'; message: string; value: number }
}

// Map analyzer FeedbackLevel to UI status type
function mapFeedbackLevel(level: FeedbackLevel): 'good' | 'warning' | 'bad' {
  switch (level) {
    case 'good':
      return 'good'
    case 'warning':
      return 'warning'
    case 'error':
      return 'bad'
  }
}

export default function LungePage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [repCount, setRepCount] = useState(0)
  const [fps, setFps] = useState(0)
  const [currentPose, setCurrentPose] = useState<Pose3D | null>(null)
  const [error, setError] = useState<string | null>(null)

  // NEW: Analyzer state for tracking phases and reps
  const [analyzerState, setAnalyzerState] = useState<LungeAnalyzerState>(
    createInitialLungeState
  )

  // NEW: Latest analysis result
  const [analysisResult, setAnalysisResult] = useState<LungeAnalysisResult | null>(null)

  const [angleFeedbackLevels, setAngleFeedbackLevels] = useState<Record<number, AngleFeedbackLevel>>({})

  // Updated feedback state with 5 categories
  const [feedback, setFeedback] = useState<FeedbackState>({
    frontKneeAngle: { status: 'good', message: '대기 중', value: 0 },
    backKneeAngle: { status: 'good', message: '대기 중', value: 0 },
    hipAngle: { status: 'good', message: '대기 중', value: 0 },
    torsoInclination: { status: 'good', message: '대기 중', value: 0 },
    kneeOverToe: { status: 'good', message: '대기 중', value: 0 },
  })

  const analyzePose = useCallback((pose: Pose3D | null) => {
    setCurrentPose(pose)

    if (!pose || !pose.keypoints) {
      return
    }

    // Call the 3D analyzer
    const { result, newState } = analyzeLunge(pose.keypoints, analyzerState)

    // Update analyzer state
    setAnalyzerState(newState)

    // Store full analysis result
    setAnalysisResult(result)

    // Update rep count from analyzer state
    if (newState.repCount !== repCount) {
      setRepCount(newState.repCount)
    }

    // Map analyzer feedback to UI feedback state
    setFeedback({
      frontKneeAngle: {
        status: mapFeedbackLevel(result.feedbacks.frontKneeAngle.level),
        message: result.feedbacks.frontKneeAngle.message,
        value: result.feedbacks.frontKneeAngle.value,
      },
      backKneeAngle: {
        status: mapFeedbackLevel(result.feedbacks.backKneeAngle.level),
        message: result.feedbacks.backKneeAngle.message,
        value: result.feedbacks.backKneeAngle.value,
      },
      hipAngle: {
        status: mapFeedbackLevel(result.feedbacks.hipAngle.level),
        message: result.feedbacks.hipAngle.message,
        value: result.feedbacks.hipAngle.value,
      },
      torsoInclination: {
        status: mapFeedbackLevel(result.feedbacks.torsoInclination.level),
        message: result.feedbacks.torsoInclination.message,
        value: result.feedbacks.torsoInclination.value,
      },
      kneeOverToe: {
        status: mapFeedbackLevel(result.feedbacks.kneeOverToe.level),
        message: result.feedbacks.kneeOverToe.message,
        value: result.feedbacks.kneeOverToe.value,
      },
    })

    // Build angle feedback levels - use front knee/hip for front leg, back for back leg
    const frontIsLeft = result.frontLeg === 'left'
    setAngleFeedbackLevels({
      25: frontIsLeft ? result.feedbacks.frontKneeAngle.level : result.feedbacks.backKneeAngle.level,
      26: frontIsLeft ? result.feedbacks.backKneeAngle.level : result.feedbacks.frontKneeAngle.level,
      23: result.feedbacks.hipAngle.level,
      24: result.feedbacks.hipAngle.level,
    } as Record<number, AngleFeedbackLevel>)
  }, [analyzerState, repCount])

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

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            런지 자세 분석
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            카메라를 통해 실시간으로 런지 자세를 분석합니다
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="relative bg-gray-900 rounded-xl overflow-hidden">
              <PoseDetector
                width={640}
                height={480}
                mirrored={true}
                showSkeleton={true}
                showKeypoints={true}
                minKeypointScore={0.3}
                onPoseDetected={handlePoseDetected}
                onFpsUpdate={handleFpsUpdate}
                onReady={handleReady}
                onError={handleError}
                className="w-full aspect-video"
              />

              {isAnalyzing && currentPose?.keypoints && (
                <AngleVisualization
                  keypoints={currentPose.keypoints}
                  angleConfigs={LUNGE_ANGLE_CONFIGS}
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
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {isAnalyzing && (
              <div className="flex gap-4 mt-4">
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
                  <p className="text-sm text-gray-500 dark:text-gray-400">횟수</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{repCount}</p>
                </div>
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
                  <p className="text-sm text-gray-500 dark:text-gray-400">FPS</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{fps}</p>
                </div>
                <div className="flex-1">
                  <Link
                    href="/result"
                    className="h-full flex items-center justify-center bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    결과 저장
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Overall Score - NEW */}
            {isAnalyzing && analysisResult && (
              <OverallScoreDisplay score={analysisResult.score} />
            )}

            {/* Phase & Front Leg Indicator - NEW */}
            {isAnalyzing && analysisResult && (
              <PhaseIndicator
                phase={getPhaseLabel(analysisResult.phase)}
                frontLeg={getFrontLegLabel(analysisResult.frontLeg)}
              />
            )}

            {/* Raw Angles Panel - NEW */}
            {isAnalyzing && analysisResult && (
              <RawAnglesPanel rawAngles={analysisResult.rawAngles} />
            )}

            {/* Instructions - Keep existing */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                올바른 런지 자세
              </h2>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 mt-0.5">1</span>
                  <span>앞 무릎이 발끝을 넘지 않도록</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 mt-0.5">2</span>
                  <span>뒷 무릎은 바닥에 가깝게 내리기</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 mt-0.5">3</span>
                  <span>상체는 곧게 세우고 코어에 힘주기</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 mt-0.5">4</span>
                  <span>양발이 일직선상에 오지 않도록 주의</span>
                </li>
              </ul>
            </div>

            {/* Feedback Panel - Updated with 5 items */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                실시간 피드백
              </h2>
              {isAnalyzing ? (
                <div className="space-y-2">
                  <FeedbackItem
                    label="앞 무릎 각도"
                    status={feedback.frontKneeAngle.status}
                    message={feedback.frontKneeAngle.message}
                    value={feedback.frontKneeAngle.value}
                  />
                  <FeedbackItem
                    label="뒷 무릎 각도"
                    status={feedback.backKneeAngle.status}
                    message={feedback.backKneeAngle.message}
                    value={feedback.backKneeAngle.value}
                  />
                  <FeedbackItem
                    label="엉덩이 각도"
                    status={feedback.hipAngle.status}
                    message={feedback.hipAngle.message}
                    value={feedback.hipAngle.value}
                  />
                  <FeedbackItem
                    label="상체 기울기"
                    status={feedback.torsoInclination.status}
                    message={feedback.torsoInclination.message}
                    value={feedback.torsoInclination.value}
                  />
                  <FeedbackItem
                    label="무릎 위치"
                    status={feedback.kneeOverToe.status}
                    message={feedback.kneeOverToe.message}
                    value={feedback.kneeOverToe.value}
                  />
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  분석을 시작하면 실시간 피드백이 표시됩니다
                </p>
              )}
            </div>

            {/* Detection Status - Keep existing */}
            {isAnalyzing && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  감지 상태
                </h2>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      currentPose ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {currentPose ? '포즈 감지됨' : '포즈를 찾는 중...'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FeedbackItem({
  label,
  status,
  message,
  value,
}: {
  label: string
  status: 'good' | 'warning' | 'bad'
  message: string
  value?: number
}) {
  const statusColors = {
    good: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    bad: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }

  const dotColors = {
    good: 'bg-[#00F5A0]',
    warning: 'bg-[#FFB800]',
    bad: 'bg-[#FF3D71]',
  }

  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${dotColors[status]}`} />
        <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value !== undefined && (
          <span className="text-xs text-gray-400 font-mono">
            {typeof value === 'number' && Math.abs(value) < 1
              ? value.toFixed(2)
              : value.toFixed(1)}°
          </span>
        )}
        <span className={`text-xs px-2 py-1 rounded-full ${statusColors[status]}`}>
          {message}
        </span>
      </div>
    </div>
  )
}

function OverallScoreDisplay({ score }: { score: number }) {
  // Determine score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 90) return '#00F5A0' // excellent
    if (score >= 70) return '#7dd3fc' // good
    if (score >= 50) return '#FFB800' // average
    return '#FF3D71' // poor
  }

  const getScoreLabel = (score: number) => {
    if (score >= 90) return '완벽'
    if (score >= 70) return '좋음'
    if (score >= 50) return '보통'
    return '개선필요'
  }

  const color = getScoreColor(score)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        종합 점수
      </h2>
      <div className="flex items-center justify-center">
        <div
          className="relative w-24 h-24 rounded-full flex items-center justify-center"
          style={{
            background: `conic-gradient(${color} ${score * 3.6}deg, rgba(75, 85, 99, 0.3) 0deg)`,
          }}
        >
          <div className="absolute inset-2 bg-white dark:bg-slate-800 rounded-full flex flex-col items-center justify-center">
            <span
              className="text-2xl font-bold"
              style={{ color }}
            >
              {score}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {getScoreLabel(score)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function PhaseIndicator({
  phase,
  frontLeg,
}: {
  phase: string
  frontLeg: string
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-lg">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">동작 단계</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {phase}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400">앞다리</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {frontLeg}
          </p>
        </div>
      </div>
    </div>
  )
}

function RawAnglesPanel({
  rawAngles,
}: {
  rawAngles: {
    frontKneeAngle: number
    backKneeAngle: number
    frontHipAngle: number
    backHipAngle: number
    torsoAngle: number
    kneeOverToeDistance: number
  }
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-lg">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        측정 각도
      </h3>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">앞무릎</span>
          <span className="text-gray-900 dark:text-white font-mono">
            {rawAngles.frontKneeAngle.toFixed(1)}°
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">뒷무릎</span>
          <span className="text-gray-900 dark:text-white font-mono">
            {rawAngles.backKneeAngle.toFixed(1)}°
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">앞엉덩이</span>
          <span className="text-gray-900 dark:text-white font-mono">
            {rawAngles.frontHipAngle.toFixed(1)}°
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">상체</span>
          <span className="text-gray-900 dark:text-white font-mono">
            {rawAngles.torsoAngle.toFixed(1)}°
          </span>
        </div>
      </div>
    </div>
  )
}


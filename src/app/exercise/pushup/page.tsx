'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { Pose3D } from '@/types/pose'
import {
  analyzePushup,
  createInitialState,
  getPhaseLabel,
  type PushupAnalyzerState,
  type PushupPhase,
} from '@/utils/pushupAnalyzer'
import AngleVisualization, { type AngleConfig, type FeedbackLevel as AngleFeedbackLevel } from '@/components/AngleVisualization'

const PUSHUP_ANGLE_CONFIGS: AngleConfig[] = [
  // Left Elbow: Shoulder -> Elbow -> Wrist
  { vertexIndex: 13, startIndex: 11, endIndex: 15, label: 'L Elbow' },
  // Right Elbow: Shoulder -> Elbow -> Wrist
  { vertexIndex: 14, startIndex: 12, endIndex: 16, label: 'R Elbow' },
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
  bodyAlignment: { status: 'good' | 'warning' | 'bad'; message: string }
  elbowAngle: { status: 'good' | 'warning' | 'bad'; message: string }
  depth: { status: 'good' | 'warning' | 'bad'; message: string }
  hipPosition: { status: 'good' | 'warning' | 'bad'; message: string }
}

export default function PushupPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [repCount, setRepCount] = useState(0)
  const [fps, setFps] = useState(0)
  const [currentPose, setCurrentPose] = useState<Pose3D | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>({
    bodyAlignment: { status: 'good', message: '대기 중' },
    elbowAngle: { status: 'good', message: '대기 중' },
    depth: { status: 'good', message: '대기 중' },
    hipPosition: { status: 'good', message: '대기 중' },
  })
  const [error, setError] = useState<string | null>(null)

  // Analyzer state using useRef for persistence across re-renders
  const analyzerStateRef = useRef<PushupAnalyzerState>(createInitialState())

  // New state for enhanced features
  const [score, setScore] = useState<number>(0)
  const [phase, setPhase] = useState<PushupPhase>('up')
  const [angleFeedbackLevels, setAngleFeedbackLevels] = useState<Record<number, AngleFeedbackLevel>>({})
  const [rawAngles, setRawAngles] = useState<{
    leftElbowAngle: number
    rightElbowAngle: number
    bodyAlignmentAngle: number
    hipSagAngle: number
    depthPercent: number
  } | null>(null)

  const analyzePose = useCallback((pose: Pose3D | null) => {
    setCurrentPose(pose)

    if (!pose || !pose.keypoints) {
      return
    }

    // Call the 3D analyzer with keypoints and current state
    const { result, newState } = analyzePushup(
      pose.keypoints,
      analyzerStateRef.current
    )

    // Update analyzer state ref
    analyzerStateRef.current = newState

    // Map FeedbackLevel to UI status ('error' -> 'bad')
    const mapLevel = (level: 'good' | 'warning' | 'error'): 'good' | 'warning' | 'bad' => {
      return level === 'error' ? 'bad' : level
    }

    // Update feedback state from analyzer results
    setFeedback({
      bodyAlignment: {
        status: mapLevel(result.feedbacks.bodyAlignment.level),
        message: result.feedbacks.bodyAlignment.message,
      },
      elbowAngle: {
        status: mapLevel(result.feedbacks.elbowAngle.level),
        message: result.feedbacks.elbowAngle.message,
      },
      depth: {
        status: mapLevel(result.feedbacks.depth.level),
        message: result.feedbacks.depth.message,
      },
      hipPosition: {
        status: mapLevel(result.feedbacks.hipPosition.level),
        message: result.feedbacks.hipPosition.message,
      },
    })

    // Update score
    setScore(result.score)

    // Update phase
    setPhase(result.phase)

    // Update raw angles
    setRawAngles(result.rawAngles)

    // Map feedback level for angle visualization
    const mapToAngleLevel = (level: 'good' | 'warning' | 'error'): AngleFeedbackLevel => level
    setAngleFeedbackLevels({
      13: mapToAngleLevel(result.feedbacks.elbowAngle.level), // LEFT_ELBOW
      14: mapToAngleLevel(result.feedbacks.elbowAngle.level), // RIGHT_ELBOW
    })

    // Update rep count when a rep is completed
    if (result.repCompleted) {
      setRepCount(newState.repCount)
    }
  }, [])

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
            푸시업 자세 분석
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            카메라를 통해 실시간으로 푸시업 자세를 분석합니다
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

              {/* Angle Visualization Overlay */}
              {isAnalyzing && currentPose?.keypoints && (
                <AngleVisualization
                  keypoints={currentPose.keypoints}
                  angleConfigs={PUSHUP_ANGLE_CONFIGS}
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
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
                  <p className="text-sm text-gray-500 dark:text-gray-400">점수</p>
                  <p className={`text-2xl font-bold ${
                    score >= 80 ? 'text-[#00F5A0]' :
                    score >= 60 ? 'text-[#38bdf8]' :
                    score >= 40 ? 'text-[#FFB800]' :
                    'text-[#FF3D71]'
                  }`}>{score}</p>
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

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                올바른 푸시업 자세
              </h2>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 mt-0.5">1</span>
                  <span>손은 어깨 너비보다 약간 넓게</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 mt-0.5">2</span>
                  <span>머리부터 발끝까지 일직선 유지</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 mt-0.5">3</span>
                  <span>팔꿈치는 45도 각도로 내리기</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 mt-0.5">4</span>
                  <span>가슴이 바닥에 가까워질 때까지 내려가기</span>
                </li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                실시간 피드백
              </h2>
              {isAnalyzing ? (
                <div className="space-y-3">
                  <FeedbackItem
                    label="몸통 정렬"
                    status={feedback.bodyAlignment.status}
                    message={feedback.bodyAlignment.message}
                  />
                  <FeedbackItem
                    label="팔꿈치 각도"
                    status={feedback.elbowAngle.status}
                    message={feedback.elbowAngle.message}
                  />
                  <FeedbackItem
                    label="내려가는 깊이"
                    status={feedback.depth.status}
                    message={feedback.depth.message}
                  />
                  <FeedbackItem
                    label="엉덩이 위치"
                    status={feedback.hipPosition.status}
                    message={feedback.hipPosition.message}
                  />
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  분석을 시작하면 실시간 피드백이 표시됩니다
                </p>
              )}
            </div>

            {isAnalyzing && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  감지 상태
                </h2>
                <div className="space-y-3">
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
                  {currentPose && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">현재 단계</span>
                      <span className="text-sm font-medium text-[#0ea5e9]">
                        {getPhaseLabel(phase)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isAnalyzing && rawAngles && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  측정 각도
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">왼쪽 팔꿈치</span>
                    <span className="text-gray-900 dark:text-white font-mono">
                      {rawAngles.leftElbowAngle.toFixed(1)}°
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">오른쪽 팔꿈치</span>
                    <span className="text-gray-900 dark:text-white font-mono">
                      {rawAngles.rightElbowAngle.toFixed(1)}°
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">몸통 정렬</span>
                    <span className="text-gray-900 dark:text-white font-mono">
                      {rawAngles.bodyAlignmentAngle.toFixed(1)}°
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">엉덩이 처짐</span>
                    <span className="text-gray-900 dark:text-white font-mono">
                      {rawAngles.hipSagAngle.toFixed(1)}°
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">깊이</span>
                    <span className="text-gray-900 dark:text-white font-mono">
                      {rawAngles.depthPercent.toFixed(0)}%
                    </span>
                  </div>
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
}: {
  label: string
  status: 'good' | 'warning' | 'bad'
  message: string
}) {
  const statusColors = {
    good: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    bad: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
      <span className={`text-xs px-2 py-1 rounded-full ${statusColors[status]}`}>
        {message}
      </span>
    </div>
  )
}


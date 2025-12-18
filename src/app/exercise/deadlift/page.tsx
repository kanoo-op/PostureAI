'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { Pose3D } from '@/types/pose'
import {
  analyzeDeadlift,
  createInitialDeadliftState,
  getPhaseLabel,
  type DeadliftAnalyzerState,
  type FeedbackLevel,
  type CorrectionDirection,
  type SpineCurvatureAnalysis,
} from '@/utils/deadliftAnalyzer'
import SkeletonOverlay, { type JointFeedback } from '@/components/SkeletonOverlay'
import FeedbackPanel, { type Checkpoint } from '@/components/FeedbackPanel'
import AngleVisualization, { type AngleConfig, type FeedbackLevel as AngleFeedbackLevel } from '@/components/AngleVisualization'
import SpineVisualization from '@/components/SpineVisualization'
import SpineFeedbackCard from '@/components/SpineFeedbackCard'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'

const DEADLIFT_ANGLE_CONFIGS: AngleConfig[] = [
  // Left Hip Hinge: Shoulder -> Hip -> Knee
  { vertexIndex: 23, startIndex: 11, endIndex: 25, label: 'L Hip' },
  // Right Hip Hinge: Shoulder -> Hip -> Knee
  { vertexIndex: 24, startIndex: 12, endIndex: 26, label: 'R Hip' },
  // Left Knee: Hip -> Knee -> Ankle
  { vertexIndex: 25, startIndex: 23, endIndex: 27, label: 'L Knee' },
  // Right Knee: Hip -> Knee -> Ankle
  { vertexIndex: 26, startIndex: 24, endIndex: 28, label: 'R Knee' },
]

// Dynamic import for PoseDetector to avoid SSR issues with TensorFlow.js
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

export default function DeadliftPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [fps, setFps] = useState(0)
  const [currentPose, setCurrentPose] = useState<Pose3D | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Deadlift analyzer state
  const [analyzerState, setAnalyzerState] = useState<DeadliftAnalyzerState>(createInitialDeadliftState())
  const [score, setScore] = useState(0)
  const [phase, setPhase] = useState<string>('setup')
  const [repCount, setRepCount] = useState(0)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [jointFeedbacks, setJointFeedbacks] = useState<JointFeedback[]>([])
  const [angleFeedbackLevels, setAngleFeedbackLevels] = useState<Record<number, AngleFeedbackLevel>>({})
  const [spineCurvature, setSpineCurvature] = useState<SpineCurvatureAnalysis | undefined>(undefined)

  // 포즈 분석 및 피드백 생성
  const analyzePose = useCallback((pose: Pose3D | null) => {
    setCurrentPose(pose)

    if (!pose || !pose.keypoints) {
      return
    }

    // Run deadlift analysis
    const { result, newState } = analyzeDeadlift(pose.keypoints, analyzerState)
    setAnalyzerState(newState)

    // Update results
    setScore(result.score)
    setPhase(result.phase)

    // Increment rep count on completion
    if (result.repCompleted) {
      setRepCount(prev => prev + 1)
    }

    // Extract spine curvature
    setSpineCurvature(result.feedbacks.spineCurvature)

    // Create checkpoints for FeedbackPanel (4 items for deadlift)
    const newCheckpoints: Checkpoint[] = [
      {
        id: 'hipHinge',
        name: '힙 힌지',
        status: result.feedbacks.hipHinge.level === 'error' ? 'error' :
                result.feedbacks.hipHinge.level === 'warning' ? 'warning' : 'good',
        value: result.feedbacks.hipHinge.value,
        unit: '°',
        message: result.feedbacks.hipHinge.message,
      },
      {
        id: 'kneeAngle',
        name: '무릎 각도',
        status: result.feedbacks.kneeAngle.level === 'error' ? 'error' :
                result.feedbacks.kneeAngle.level === 'warning' ? 'warning' : 'good',
        value: result.feedbacks.kneeAngle.value,
        unit: '°',
        message: result.feedbacks.kneeAngle.message,
      },
      {
        id: 'spineAlignment',
        name: '척추 정렬',
        status: result.feedbacks.spineAlignment.level === 'error' ? 'error' :
                result.feedbacks.spineAlignment.level === 'warning' ? 'warning' : 'good',
        value: result.feedbacks.spineAlignment.value,
        unit: '°',
        message: result.feedbacks.spineAlignment.message,
      },
      {
        id: 'barPath',
        name: '바 경로',
        status: result.feedbacks.barPath.level === 'error' ? 'error' :
                result.feedbacks.barPath.level === 'warning' ? 'warning' : 'good',
        value: result.feedbacks.barPath.value,
        unit: '%',
        message: result.feedbacks.barPath.message,
      },
    ]

    // Add spine curvature checkpoints
    if (result.feedbacks.spineCurvature) {
      newCheckpoints.push(
        {
          id: 'lumbarSpine',
          name: '요추 정렬',
          status: result.feedbacks.spineCurvature.lumbar.level,
          value: result.feedbacks.spineCurvature.lumbar.angle,
          unit: '°',
          message: result.feedbacks.spineCurvature.lumbar.message,
        },
        {
          id: 'thoracicSpine',
          name: '흉추 정렬',
          status: result.feedbacks.spineCurvature.thoracic.level,
          value: result.feedbacks.spineCurvature.thoracic.angle,
          unit: '°',
          message: result.feedbacks.spineCurvature.thoracic.message,
        }
      )
    }
    setCheckpoints(newCheckpoints)

    // Create joint feedbacks for SkeletonOverlay
    const newJointFeedbacks: JointFeedback[] = [
      // Left Hip (hip hinge feedback)
      {
        jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_HIP,
        level: result.feedbacks.hipHinge.level,
        angle: result.rawAngles.leftHipHingeAngle,
        angleJoints: [
          BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
          BLAZEPOSE_KEYPOINTS.LEFT_HIP,
          BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
        ] as [number, number, number],
        correction: result.feedbacks.hipHinge.correction,
      },
      // Right Hip (hip hinge feedback)
      {
        jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
        level: result.feedbacks.hipHinge.level,
        angle: result.rawAngles.rightHipHingeAngle,
        angleJoints: [
          BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
          BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
          BLAZEPOSE_KEYPOINTS.RIGHT_KNEE,
        ] as [number, number, number],
        correction: result.feedbacks.hipHinge.correction,
      },
      // Left Knee
      {
        jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
        level: result.feedbacks.kneeAngle.level,
        angle: result.rawAngles.leftKneeAngle,
        angleJoints: [
          BLAZEPOSE_KEYPOINTS.LEFT_HIP,
          BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
          BLAZEPOSE_KEYPOINTS.LEFT_ANKLE,
        ] as [number, number, number],
        correction: result.feedbacks.kneeAngle.correction,
      },
      // Right Knee
      {
        jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_KNEE,
        level: result.feedbacks.kneeAngle.level,
        angle: result.rawAngles.rightKneeAngle,
        angleJoints: [
          BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
          BLAZEPOSE_KEYPOINTS.RIGHT_KNEE,
          BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE,
        ] as [number, number, number],
        correction: result.feedbacks.kneeAngle.correction,
      },
      // Left Shoulder (spine alignment)
      {
        jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
        level: result.feedbacks.spineAlignment.level,
        correction: result.feedbacks.spineAlignment.correction,
      },
      // Right Shoulder (spine alignment)
      {
        jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
        level: result.feedbacks.spineAlignment.level,
        correction: result.feedbacks.spineAlignment.correction,
      },
      // Left Ankle (for visibility)
      {
        jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_ANKLE,
        level: result.feedbacks.kneeAngle.level,
      },
      // Right Ankle (for visibility)
      {
        jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE,
        level: result.feedbacks.kneeAngle.level,
      },
    ]
    setJointFeedbacks(newJointFeedbacks)

    // Build angle feedback levels for visualization
    setAngleFeedbackLevels({
      23: result.feedbacks.hipHinge.level,  // LEFT_HIP
      24: result.feedbacks.hipHinge.level,  // RIGHT_HIP
      25: result.feedbacks.kneeAngle.level, // LEFT_KNEE
      26: result.feedbacks.kneeAngle.level, // RIGHT_KNEE
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

  const handleReset = useCallback(() => {
    setRepCount(0)
    setAnalyzerState(createInitialDeadliftState())
    setScore(0)
    setPhase('setup')
  }, [])

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-gray-950">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            데드리프트 자세 분석
          </h1>
          <p className="text-gray-400 mt-1">
            실시간으로 데드리프트 자세를 분석하고 교정 가이드를 제공합니다
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* 카메라 + 스켈레톤 영역 */}
          <div className="lg:col-span-2">
            <div className="relative bg-gray-900 rounded-2xl overflow-hidden">
              {/* PoseDetector */}
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

              {/* 스켈레톤 오버레이 (피드백 포함) */}
              {isAnalyzing && currentPose?.keypoints && (
                <SkeletonOverlay
                  keypoints={currentPose.keypoints}
                  feedbacks={jointFeedbacks}
                  width={640}
                  height={480}
                  mirrored={true}
                  showSkeleton={true}
                  showKeypoints={true}
                  showAngles={true}
                  showCorrections={true}
                  showPulse={true}
                  className="w-full h-full"
                />
              )}

              {/* Angle Visualization Overlay */}
              {isAnalyzing && currentPose?.keypoints && (
                <AngleVisualization
                  keypoints={currentPose.keypoints}
                  angleConfigs={DEADLIFT_ANGLE_CONFIGS}
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

              {/* Spine Curvature Visualization Overlay */}
              {isAnalyzing && currentPose?.keypoints && (
                <SpineVisualization
                  keypoints={currentPose.keypoints}
                  spineCurvature={spineCurvature}
                  width={640}
                  height={480}
                  mirrored={true}
                  showNeutralSpineReference={true}
                  showSpineSegments={true}
                  minKeypointScore={0.3}
                  className="w-full h-full"
                />
              )}

              {/* 상단 오버레이: 점수 + 페이즈 */}
              {isAnalyzing && (
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                  {/* 점수 */}
                  <ScoreBadge score={score} />

                  {/* 페이즈 */}
                  <PhaseBadge phase={phase} />
                </div>
              )}

              {/* 하단 오버레이: FPS + 상태 */}
              {isAnalyzing && (
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <div className="bg-black/70 backdrop-blur px-3 py-1.5 rounded-lg">
                    <span className="text-gray-400 text-xs">FPS</span>
                    <span className="text-white font-mono ml-2">{fps}</span>
                  </div>

                  <div className="flex gap-2">
                    <CounterBadge label="세트" value={1} max={3} />
                    <CounterBadge label="반복" value={repCount} max={10} />
                  </div>
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-4 p-4 bg-red-900/30 border border-red-700 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* 컨트롤 버튼 */}
            {isAnalyzing && (
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
                >
                  카운터 리셋
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

          {/* 피드백 패널 영역 */}
          <div className="lg:col-span-1 space-y-4">
            {/* 실시간 피드백 패널 */}
            {isAnalyzing ? (
              <FeedbackPanel
                score={score}
                checkpoints={checkpoints}
                repCount={repCount}
                setCount={1}
                targetReps={10}
                targetSets={3}
                phase={phase}
                isActive={true}
              />
            ) : (
              <div className="bg-gray-900 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                  분석 대기중
                </h2>
                <p className="text-gray-400 text-sm">
                  시작 버튼을 누르면 실시간 자세 분석이 시작됩니다
                </p>
              </div>
            )}

            {/* 척추 분석 카드 */}
            {isAnalyzing && spineCurvature && (
              <SpineFeedbackCard spineCurvature={spineCurvature} />
            )}

            {/* 자세 가이드 */}
            <div className="bg-gray-900 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                올바른 데드리프트 자세
              </h2>
              <ul className="space-y-3 text-sm text-gray-300">
                <GuideItem
                  number={1}
                  text="발은 엉덩이 너비로 벌리고 바벨 바로 위에 위치"
                />
                <GuideItem
                  number={2}
                  text="엉덩이를 뒤로 빼며 힙 힌지 자세 유지"
                />
                <GuideItem
                  number={3}
                  text="등은 중립을 유지하고 둥글게 구부리지 않기"
                />
                <GuideItem
                  number={4}
                  text="바를 몸에 최대한 가깝게 유지하며 들어올리기"
                />
                <GuideItem
                  number={5}
                  text="락아웃 시 엉덩이를 완전히 펴고 어깨를 뒤로"
                />
              </ul>
            </div>

            {/* 색상 범례 */}
            <div className="bg-gray-900 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                피드백 색상
              </h2>
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

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-400' : score >= 50 ? 'text-orange-400' : 'text-red-400'
  const bg = score >= 80 ? 'bg-green-500/20' : score >= 50 ? 'bg-orange-500/20' : 'bg-red-500/20'
  const ring = score >= 80 ? 'ring-green-500/50' : score >= 50 ? 'ring-orange-500/50' : 'ring-red-500/50'

  return (
    <div className={`${bg} backdrop-blur px-4 py-2 rounded-xl ring-2 ${ring}`}>
      <span className="text-gray-400 text-xs block">점수</span>
      <span className={`text-3xl font-bold tabular-nums ${color}`}>{score}</span>
    </div>
  )
}

function PhaseBadge({ phase }: { phase: string }) {
  const labels: Record<string, string> = {
    setup: '준비자세',
    lift: '들어올리는 중',
    lockout: '락아웃',
    descent: '내려놓는 중',
  }

  const colors: Record<string, string> = {
    setup: 'bg-gray-600',
    lift: 'bg-blue-600',
    lockout: 'bg-purple-600',
    descent: 'bg-cyan-600',
  }

  return (
    <span
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
        colors[phase] || 'bg-gray-600'
      } text-white shadow-lg`}
    >
      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
      {labels[phase] || phase}
    </span>
  )
}

function CounterBadge({ label, value, max }: { label: string; value: number; max: number }) {
  const isComplete = value >= max

  return (
    <div className="bg-black/70 backdrop-blur px-4 py-2 rounded-xl min-w-[80px]">
      <span className="text-gray-400 text-xs">{label}</span>
      <div className="flex items-baseline gap-1">
        <span
          className={`text-xl font-bold tabular-nums ${
            isComplete ? 'text-green-400' : 'text-white'
          }`}
        >
          {value}
        </span>
        <span className="text-gray-500 text-sm">/{max}</span>
      </div>
    </div>
  )
}

function GuideItem({ number, text }: { number: number; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-600/30 text-primary-400 flex items-center justify-center text-sm">
        {number}
      </span>
      <span>{text}</span>
    </li>
  )
}

function LegendItem({
  color,
  label,
  description,
}: {
  color: string
  label: string
  description: string
}) {
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

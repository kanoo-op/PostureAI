'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { Pose3D } from '@/types/pose'
import {
  analyzeSquat,
  createInitialState,
  getPhaseLabel,
  type SquatAnalyzerState,
  type FeedbackLevel,
  type CorrectionDirection,
} from '@/utils/squatAnalyzer'
import SkeletonOverlay, { type JointFeedback } from '@/components/SkeletonOverlay'
import FeedbackPanel, { type Checkpoint } from '@/components/FeedbackPanel'
import AngleVisualization, { type AngleConfig, type FeedbackLevel as AngleFeedbackLevel } from '@/components/AngleVisualization'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'
import { ReferenceOverlay, ReferenceControlPanel } from '@/components/ReferenceOverlay'
import type { ReferenceOverlayPreferences, DeviationAnalysis } from '@/types/referencePose'

const SQUAT_ANGLE_CONFIGS: AngleConfig[] = [
  // Left Knee: Hip -> Knee -> Ankle
  { vertexIndex: 25, startIndex: 23, endIndex: 27, label: 'L Knee' },
  // Right Knee: Hip -> Knee -> Ankle
  { vertexIndex: 26, startIndex: 24, endIndex: 28, label: 'R Knee' },
  // Left Hip: Shoulder -> Hip -> Knee
  { vertexIndex: 23, startIndex: 11, endIndex: 25, label: 'L Hip' },
  // Right Hip: Shoulder -> Hip -> Knee
  { vertexIndex: 24, startIndex: 12, endIndex: 26, label: 'R Hip' },
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

export default function SquatPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [fps, setFps] = useState(0)
  const [currentPose, setCurrentPose] = useState<Pose3D | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 스쿼트 분석 상태
  const [analyzerState, setAnalyzerState] = useState<SquatAnalyzerState>(createInitialState())
  const [score, setScore] = useState(0)
  const [phase, setPhase] = useState<string>('standing')
  const [repCount, setRepCount] = useState(0)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [jointFeedbacks, setJointFeedbacks] = useState<JointFeedback[]>([])
  const [angleFeedbackLevels, setAngleFeedbackLevels] = useState<Record<number, AngleFeedbackLevel>>({})

  // Reference overlay state
  const [referencePrefs, setReferencePrefs] = useState<ReferenceOverlayPreferences>({
    enabled: false,
    opacity: 0.6,
    showDeviationHighlights: true,
    selectedExercise: 'squat',
  })
  const [referenceAnalysis, setReferenceAnalysis] = useState<DeviationAnalysis | null>(null)

  // 포즈 분석 및 피드백 생성
  const analyzePose = useCallback((pose: Pose3D | null) => {
    setCurrentPose(pose)

    if (!pose || !pose.keypoints) {
      return
    }

    // 스쿼트 분석 실행
    const { result, newState } = analyzeSquat(pose.keypoints, analyzerState)
    setAnalyzerState(newState)

    // 결과 업데이트
    setScore(result.score)
    setPhase(result.phase)

    // 반복 완료 시 카운트 증가
    if (result.repCompleted) {
      setRepCount(prev => prev + 1)
    }

    // 체크포인트 생성
    const newCheckpoints: Checkpoint[] = [
      {
        id: 'knee',
        name: '무릎 각도',
        status: result.feedbacks.kneeAngle.level === 'error' ? 'error' :
                result.feedbacks.kneeAngle.level === 'warning' ? 'warning' : 'good',
        value: result.feedbacks.kneeAngle.value,
        unit: '°',
        message: result.feedbacks.kneeAngle.message,
      },
      {
        id: 'hip',
        name: '엉덩이 각도',
        status: result.feedbacks.hipAngle.level === 'error' ? 'error' :
                result.feedbacks.hipAngle.level === 'warning' ? 'warning' : 'good',
        value: result.feedbacks.hipAngle.value,
        unit: '°',
        message: result.feedbacks.hipAngle.message,
      },
      {
        id: 'torso',
        name: '상체 기울기',
        status: result.feedbacks.torsoInclination.level === 'error' ? 'error' :
                result.feedbacks.torsoInclination.level === 'warning' ? 'warning' : 'good',
        value: result.feedbacks.torsoInclination.value,
        unit: '°',
        message: result.feedbacks.torsoInclination.message,
      },
      {
        id: 'valgus',
        name: '무릎 정렬',
        status: result.feedbacks.kneeValgus.level === 'error' ? 'error' :
                result.feedbacks.kneeValgus.level === 'warning' ? 'warning' : 'good',
        value: result.feedbacks.kneeValgus.value,
        unit: '%',
        message: result.feedbacks.kneeValgus.message,
      },
    ]
    setCheckpoints(newCheckpoints)

    // 스켈레톤 피드백 생성
    const newJointFeedbacks: JointFeedback[] = [
      // 왼쪽 무릎
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
      // 오른쪽 무릎
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
      // 왼쪽 엉덩이
      {
        jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_HIP,
        level: result.feedbacks.hipAngle.level,
        angle: result.rawAngles.leftHipAngle,
        angleJoints: [
          BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
          BLAZEPOSE_KEYPOINTS.LEFT_HIP,
          BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
        ] as [number, number, number],
        correction: result.feedbacks.hipAngle.correction,
      },
      // 오른쪽 엉덩이
      {
        jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
        level: result.feedbacks.hipAngle.level,
        angle: result.rawAngles.rightHipAngle,
        angleJoints: [
          BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
          BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
          BLAZEPOSE_KEYPOINTS.RIGHT_KNEE,
        ] as [number, number, number],
        correction: result.feedbacks.hipAngle.correction,
      },
      // 어깨 (상체 기울기)
      {
        jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
        level: result.feedbacks.torsoInclination.level,
        correction: result.feedbacks.torsoInclination.correction,
      },
      {
        jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
        level: result.feedbacks.torsoInclination.level,
        correction: result.feedbacks.torsoInclination.correction,
      },
    ]

    // 무릎 정렬 문제 시 추가 피드백
    if (result.feedbacks.kneeValgus.level !== 'good') {
      newJointFeedbacks.push({
        jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
        level: result.feedbacks.kneeValgus.level,
        correction: result.feedbacks.kneeValgus.correction,
      })
      newJointFeedbacks.push({
        jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_KNEE,
        level: result.feedbacks.kneeValgus.level,
        correction: result.feedbacks.kneeValgus.correction,
      })
    }

    setJointFeedbacks(newJointFeedbacks)

    // Build angle feedback levels from joint feedbacks
    const newAngleFeedbackLevels: Record<number, AngleFeedbackLevel> = {
      25: result.feedbacks.kneeAngle.level,  // LEFT_KNEE
      26: result.feedbacks.kneeAngle.level,  // RIGHT_KNEE
      23: result.feedbacks.hipAngle.level,   // LEFT_HIP
      24: result.feedbacks.hipAngle.level,   // RIGHT_HIP
    }
    setAngleFeedbackLevels(newAngleFeedbackLevels)
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
    setAnalyzerState(createInitialState())
    setScore(0)
    setPhase('standing')
  }, [])

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-gray-950">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            스쿼트 자세 분석
          </h1>
          <p className="text-gray-400 mt-1">
            실시간으로 스쿼트 자세를 분석하고 교정 가이드를 제공합니다
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
                showSkeleton={false}  // 기본 스켈레톤 비활성화
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
                  angleConfigs={SQUAT_ANGLE_CONFIGS}
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

              {/* Reference Overlay */}
              {referencePrefs.enabled && currentPose?.keypoints && (
                <ReferenceOverlay
                  userKeypoints={currentPose.keypoints}
                  exerciseType="squat"
                  width={640}
                  height={480}
                  mirrored={true}
                  enabled={referencePrefs.enabled}
                  opacity={referencePrefs.opacity}
                  showDeviations={referencePrefs.showDeviationHighlights}
                  onDeviationAnalysis={setReferenceAnalysis}
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
              <div className="flex flex-col gap-3 mt-4">
                {/* Reference Overlay Control Panel */}
                <ReferenceControlPanel
                  exerciseType="squat"
                  onPreferencesChange={setReferencePrefs}
                />

                <div className="flex gap-3">
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

            {/* 자세 가이드 */}
            <div className="bg-gray-900 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                올바른 스쿼트 자세
              </h2>
              <ul className="space-y-3 text-sm text-gray-300">
                <GuideItem
                  number={1}
                  text="발은 어깨 너비로 벌리고 발끝은 살짝 바깥으로"
                />
                <GuideItem
                  number={2}
                  text="무릎이 발끝을 넘지 않도록 주의"
                />
                <GuideItem
                  number={3}
                  text="허벅지가 바닥과 평행이 될 때까지 내려가기"
                />
                <GuideItem
                  number={4}
                  text="등은 곧게 펴고 시선은 정면"
                />
                <GuideItem
                  number={5}
                  text="무릎이 안쪽으로 모이지 않도록 주의"
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
    standing: '서있음',
    descending: '내려가는 중',
    bottom: '최저점',
    ascending: '올라오는 중',
  }

  const colors: Record<string, string> = {
    standing: 'bg-gray-600',
    descending: 'bg-blue-600',
    bottom: 'bg-purple-600',
    ascending: 'bg-cyan-600',
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

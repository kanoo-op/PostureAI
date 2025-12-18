'use client'

import { useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { Pose3D } from '@/types/pose'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'
import {
  analyzeFrontPosture,
  analyzeSidePosture,
  detectViewType,
  getLevelLabel,
  getLevelColorClass,
  getScoreColorClass,
  type ViewType,
  type FrontPostureResult,
  type SidePostureResult,
  type PostureFeedbackItem,
} from '@/utils/staticPostureAnalyzer'
import SkeletonOverlay, {
  type JointFeedback,
  type FeedbackLevel,
  type CorrectionDirection,
} from '@/components/SkeletonOverlay'

const ImagePoseAnalyzer = dynamic(() => import('@/components/ImagePoseAnalyzer'), {
  ssr: false,
  loading: () => (
    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 dark:bg-slate-800/50">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4" />
      <p className="text-gray-400">컴포넌트 로딩 중...</p>
    </div>
  ),
})

type AnalysisResult = FrontPostureResult | SidePostureResult | null

// PostureFeedbackItem level을 FeedbackLevel로 변환
function convertLevel(level: 'good' | 'normal' | 'bad'): FeedbackLevel {
  if (level === 'good') return 'good'
  if (level === 'normal') return 'warning'
  return 'error'
}

// 정면 분석 결과를 JointFeedback 배열로 변환
function createFrontPostureFeedbacks(result: FrontPostureResult): JointFeedback[] {
  const feedbacks: JointFeedback[] = []
  const { feedbacks: fb } = result

  // 어깨 기울기 - 양쪽 어깨에 표시
  const shoulderLevel = convertLevel(fb.shoulderTilt.level)
  feedbacks.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
    level: shoulderLevel,
    message: fb.shoulderTilt.message,
    correction: fb.shoulderTilt.value > 3 ? 'down' : fb.shoulderTilt.value < -3 ? 'up' : 'none',
  })
  feedbacks.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
    level: shoulderLevel,
    message: fb.shoulderTilt.message,
    correction: fb.shoulderTilt.value > 3 ? 'up' : fb.shoulderTilt.value < -3 ? 'down' : 'none',
  })

  // 골반 기울기 - 양쪽 힙에 표시
  const pelvicLevel = convertLevel(fb.pelvicTilt.level)
  feedbacks.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_HIP,
    level: pelvicLevel,
    message: fb.pelvicTilt.message,
    correction: fb.pelvicTilt.value > 3 ? 'down' : fb.pelvicTilt.value < -3 ? 'up' : 'none',
  })
  feedbacks.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
    level: pelvicLevel,
    message: fb.pelvicTilt.message,
    correction: fb.pelvicTilt.value > 3 ? 'up' : fb.pelvicTilt.value < -3 ? 'down' : 'none',
  })

  // 척추 정렬 - 코(머리 중심)에 표시
  const spineLevel = convertLevel(fb.spineAlignment.level)
  feedbacks.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.NOSE,
    level: spineLevel,
    message: fb.spineAlignment.message,
    correction: fb.spineAlignment.value > 2 ? 'left' : fb.spineAlignment.value < -2 ? 'right' : 'none',
  })

  // 다리 정렬 - 양쪽 무릎에 표시
  const legLevel = convertLevel(fb.legAlignment.level)
  feedbacks.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
    level: legLevel,
    message: fb.legAlignment.message,
    correction: fb.legAlignment.value > 5 ? 'inward' : fb.legAlignment.value < -5 ? 'outward' : 'none',
  })
  feedbacks.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_KNEE,
    level: legLevel,
    message: fb.legAlignment.message,
    correction: fb.legAlignment.value > 5 ? 'inward' : fb.legAlignment.value < -5 ? 'outward' : 'none',
  })

  return feedbacks
}

// 측면 분석 결과를 JointFeedback 배열로 변환
function createSidePostureFeedbacks(result: SidePostureResult): JointFeedback[] {
  const feedbacks: JointFeedback[] = []
  const { feedbacks: fb } = result

  // 거북목 - 귀와 코에 표시
  const forwardHeadLevel = convertLevel(fb.forwardHead.level)
  feedbacks.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_EAR,
    level: forwardHeadLevel,
    message: fb.forwardHead.message,
    correction: fb.forwardHead.value > 10 ? 'backward' : 'none',
  })
  feedbacks.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_EAR,
    level: forwardHeadLevel,
    message: fb.forwardHead.message,
    correction: fb.forwardHead.value > 10 ? 'backward' : 'none',
  })
  feedbacks.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.NOSE,
    level: forwardHeadLevel,
    message: fb.forwardHead.message,
    correction: fb.forwardHead.value > 10 ? 'backward' : 'none',
  })

  // 목 각도 - 어깨에 표시
  const neckLevel = convertLevel(fb.neckAngle.level)
  feedbacks.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
    level: neckLevel,
    angle: fb.neckAngle.value,
    angleJoints: [
      BLAZEPOSE_KEYPOINTS.LEFT_EAR,
      BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
      BLAZEPOSE_KEYPOINTS.LEFT_HIP,
    ],
    message: fb.neckAngle.message,
  })
  feedbacks.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
    level: neckLevel,
    angle: fb.neckAngle.value,
    angleJoints: [
      BLAZEPOSE_KEYPOINTS.RIGHT_EAR,
      BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
      BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
    ],
    message: fb.neckAngle.message,
  })

  // 등굽음 (Kyphosis) - 어깨에 표시 (척추 상부)
  const kyphosisLevel = convertLevel(fb.kyphosis.level)
  feedbacks.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
    level: kyphosisLevel,
    message: fb.kyphosis.message,
    correction: fb.kyphosis.value > 45 ? 'backward' : 'none',
  })
  feedbacks.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
    level: kyphosisLevel,
    message: fb.kyphosis.message,
    correction: fb.kyphosis.value > 45 ? 'backward' : 'none',
  })

  // 허리굽이 (Lordosis) - 힙에 표시
  const lordosisLevel = convertLevel(fb.lordosis.level)
  feedbacks.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_HIP,
    level: lordosisLevel,
    angle: fb.lordosis.value,
    angleJoints: [
      BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
      BLAZEPOSE_KEYPOINTS.LEFT_HIP,
      BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
    ],
    message: fb.lordosis.message,
    correction: fb.lordosis.value > 35 ? 'forward' : fb.lordosis.value < 15 ? 'backward' : 'none',
  })
  feedbacks.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
    level: lordosisLevel,
    angle: fb.lordosis.value,
    angleJoints: [
      BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
      BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
      BLAZEPOSE_KEYPOINTS.RIGHT_KNEE,
    ],
    message: fb.lordosis.message,
    correction: fb.lordosis.value > 35 ? 'forward' : fb.lordosis.value < 15 ? 'backward' : 'none',
  })

  return feedbacks
}

export default function StaticPosturePage() {
  const [currentPose, setCurrentPose] = useState<Pose3D | null>(null)
  const [detectedViewType, setDetectedViewType] = useState<ViewType>('front')
  const [selectedViewType, setSelectedViewType] = useState<ViewType>('front')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAnalyzed, setIsAnalyzed] = useState(false)
  const [canvasInfo, setCanvasInfo] = useState({ width: 640, height: 480, scaleX: 1, scaleY: 1 })

  // 분석 실행
  const runAnalysis = useCallback((pose: Pose3D, viewType: ViewType) => {
    if (!pose.keypoints) return null

    if (viewType === 'front') {
      return analyzeFrontPosture(pose.keypoints)
    } else {
      return analyzeSidePosture(pose.keypoints)
    }
  }, [])

  // 포즈 감지 시 자동 분석
  const handlePoseDetected = useCallback((pose: Pose3D | null) => {
    if (!pose || !pose.keypoints) {
      setAnalysisResult(null)
      setCurrentPose(null)
      setIsAnalyzed(true)
      return
    }

    setCurrentPose(pose)

    // 자동으로 촬영 각도 감지
    const detected = detectViewType(pose.keypoints)
    setDetectedViewType(detected)
    setSelectedViewType(detected)

    // 분석 실행
    const result = runAnalysis(pose, detected)
    setAnalysisResult(result)
    setIsAnalyzed(true)
  }, [runAnalysis])

  // 사용자가 뷰 타입 변경 시
  const handleViewTypeChange = useCallback((newViewType: ViewType) => {
    setSelectedViewType(newViewType)

    if (currentPose) {
      const result = runAnalysis(currentPose, newViewType)
      setAnalysisResult(result)
    }
  }, [currentPose, runAnalysis])

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage)
  }, [])

  // 캔버스 정보 변경 핸들러
  const handleCanvasSizeChange = useCallback((info: { width: number; height: number; scaleX: number; scaleY: number }) => {
    setCanvasInfo(info)
  }, [])

  // 분석 결과를 JointFeedback 배열로 변환
  const jointFeedbacks = useMemo((): JointFeedback[] => {
    if (!analysisResult || analysisResult.score === 0) return []

    if (selectedViewType === 'front' && analysisResult.viewType === 'front') {
      return createFrontPostureFeedbacks(analysisResult)
    } else if (selectedViewType === 'side' && analysisResult.viewType === 'side') {
      return createSidePostureFeedbacks(analysisResult)
    }

    return []
  }, [analysisResult, selectedViewType])

  // 스켈레톤 키포인트 (원본 이미지 좌표를 캔버스 크기에 맞게 스케일 변환)
  const skeletonKeypoints = useMemo(() => {
    if (!currentPose?.keypoints) return []

    const { scaleX, scaleY } = canvasInfo

    // ImagePoseAnalyzer가 이미지를 캔버스에 그릴 때 스케일을 적용하므로
    // keypoints도 동일한 스케일로 변환 필요
    return currentPose.keypoints.map(kp => ({
      x: kp.x * scaleX,
      y: kp.y * scaleY,
      z: kp.z,
      score: kp.score,
    }))
  }, [currentPose, canvasInfo])

  const getScoreMessage = (score: number) => {
    if (score >= 90) return '매우 좋은 자세입니다!'
    if (score >= 80) return '전반적으로 좋은 자세입니다'
    if (score >= 70) return '약간의 교정이 필요합니다'
    if (score >= 60) return '자세 교정을 권장합니다'
    return '전문가 상담을 권장합니다'
  }

  const getScoreBgClass = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30'
    if (score >= 50) return 'bg-yellow-100 dark:bg-yellow-900/30'
    return 'bg-red-100 dark:bg-red-900/30'
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            정적 자세 분석
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            전신 사진을 업로드하여 체형 균형과 자세를 분석합니다
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Image upload area */}
          <div className="lg:col-span-2">
            <div className="relative">
              <ImagePoseAnalyzer
                onPoseDetected={handlePoseDetected}
                onCanvasSizeChange={handleCanvasSizeChange}
                onError={handleError}
                showBuiltInSkeleton={false}
                className="w-full"
              />

              {/* 피드백 스켈레톤 오버레이 */}
              {isAnalyzed && currentPose && analysisResult && analysisResult.score > 0 && (
                <div
                  className="absolute top-0 left-0 right-0 pointer-events-none flex items-center justify-center"
                  style={{
                    // ImagePoseAnalyzer의 캔버스 컨테이너와 동일한 높이 및 정렬
                    height: Math.max(300, canvasInfo.height),
                  }}
                >
                  <div
                    className="relative"
                    style={{
                      width: canvasInfo.width,
                      height: canvasInfo.height,
                    }}
                  >
                    <SkeletonOverlay
                      keypoints={skeletonKeypoints}
                      feedbacks={jointFeedbacks}
                      width={canvasInfo.width}
                      height={canvasInfo.height}
                      mirrored={false}
                      showSkeleton={true}
                      showKeypoints={true}
                      showAngles={true}
                      showCorrections={true}
                      showPulse={true}
                      className="rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* View Type Selector - 하이브리드 UI */}
            {isAnalyzed && currentPose && (
              <div className="mt-4 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      감지된 촬영 각도:
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {detectedViewType === 'front' ? '정면' : '측면'}
                    </span>
                    {detectedViewType !== selectedViewType && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        (수동 변경됨)
                      </span>
                    )}
                  </div>

                  {/* Toggle Buttons */}
                  <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleViewTypeChange('front')}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        selectedViewType === 'front'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
                      }`}
                    >
                      정면 분석
                    </button>
                    <button
                      onClick={() => handleViewTypeChange('side')}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        selectedViewType === 'side'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
                      }`}
                    >
                      측면 분석
                    </button>
                  </div>
                </div>

                {/* View Type Description */}
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {selectedViewType === 'front'
                    ? '정면 분석: 어깨 기울기, 골반 기울기, 척추 정렬, 다리 정렬을 분석합니다.'
                    : '측면 분석: 거북목, 목 각도, 등굽음(Kyphosis), 허리굽이(Lordosis)를 분석합니다.'}
                </p>
              </div>
            )}

            {/* Overall score card */}
            {isAnalyzed && analysisResult && analysisResult.score > 0 && (
              <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  {selectedViewType === 'front' ? '정면' : '측면'} 자세 점수
                </p>
                <div
                  className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getScoreBgClass(analysisResult.score)}`}
                >
                  <span className={`text-4xl font-bold ${getScoreColorClass(analysisResult.score)}`}>
                    {analysisResult.score}
                  </span>
                </div>
                <div className="mt-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getLevelColorClass(analysisResult.level)}`}>
                    {getLevelLabel(analysisResult.level)}
                  </span>
                </div>
                <p className="mt-4 text-gray-600 dark:text-gray-300">
                  {getScoreMessage(analysisResult.score)}
                </p>
                <div className="mt-4">
                  <Link
                    href="/result"
                    className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                  >
                    결과 저장
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Guide and results */}
          <div className="space-y-6">
            {/* Upload guide */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                촬영 가이드
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-2">
                    정면 촬영
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400">-</span>
                      <span>카메라를 정면으로 바라보세요</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400">-</span>
                      <span>전신이 모두 보이게 서주세요</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400">-</span>
                      <span>어깨/골반/다리 정렬 분석에 적합</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-2">
                    측면 촬영
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400">-</span>
                      <span>옆모습이 보이게 서주세요</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400">-</span>
                      <span>자연스럽게 서있는 자세</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400">-</span>
                      <span>거북목/등굽음/허리굽이 분석에 적합</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Analysis results */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {selectedViewType === 'front' ? '정면' : '측면'} 분석 결과
              </h2>

              {analysisResult && analysisResult.score > 0 ? (
                <div className="space-y-4">
                  {selectedViewType === 'front' && analysisResult.viewType === 'front' ? (
                    <>
                      <ResultItem
                        label="어깨 기울기"
                        feedback={analysisResult.feedbacks.shoulderTilt}
                      />
                      <ResultItem
                        label="골반 기울기"
                        feedback={analysisResult.feedbacks.pelvicTilt}
                      />
                      <ResultItem
                        label="척추 정렬"
                        feedback={analysisResult.feedbacks.spineAlignment}
                      />
                      <ResultItem
                        label="다리 정렬"
                        feedback={analysisResult.feedbacks.legAlignment}
                      />
                    </>
                  ) : selectedViewType === 'side' && analysisResult.viewType === 'side' ? (
                    <>
                      <ResultItem
                        label="거북목"
                        feedback={analysisResult.feedbacks.forwardHead}
                        unit="%"
                      />
                      <ResultItem
                        label="목 각도"
                        feedback={analysisResult.feedbacks.neckAngle}
                      />
                      <ResultItem
                        label="등굽음 (Kyphosis)"
                        feedback={analysisResult.feedbacks.kyphosis}
                      />
                      <ResultItem
                        label="허리굽이 (Lordosis)"
                        feedback={analysisResult.feedbacks.lordosis}
                      />
                    </>
                  ) : null}
                </div>
              ) : isAnalyzed ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    자세를 인식할 수 없습니다.
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                    전신이 보이는 사진을 업로드해주세요.
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  이미지를 업로드하면 분석 결과가 표시됩니다
                </p>
              )}
            </div>

            {/* Suggestions */}
            {analysisResult && analysisResult.score > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  개선 제안
                </h2>
                <div className="space-y-3">
                  {Object.values(analysisResult.feedbacks)
                    .filter(f => f.level !== 'good')
                    .map((feedback, index) => (
                      <div
                        key={index}
                        className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
                      >
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {feedback.suggestion}
                        </p>
                      </div>
                    ))}
                  {Object.values(analysisResult.feedbacks).every(f => f.level === 'good') && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      모든 항목이 양호합니다! 현재 자세를 유지하세요.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultItem({
  label,
  feedback,
  unit = '°',
}: {
  label: string
  feedback: PostureFeedbackItem
  unit?: string
}) {
  const levelColors = {
    good: 'text-green-600 dark:text-green-400',
    normal: 'text-yellow-600 dark:text-yellow-400',
    bad: 'text-red-600 dark:text-red-400',
  }

  const levelBg = {
    good: 'bg-green-50 dark:bg-green-900/20',
    normal: 'bg-yellow-50 dark:bg-yellow-900/20',
    bad: 'bg-red-50 dark:bg-red-900/20',
  }

  const levelIcons = {
    good: '✓',
    normal: '!',
    bad: '✕',
  }

  return (
    <div className={`rounded-lg p-3 ${levelBg[feedback.level]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        <span className={`text-sm font-bold ${levelColors[feedback.level]}`}>
          {levelIcons[feedback.level]} {feedback.value.toFixed(1)}{unit}
        </span>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400">
        {feedback.message}
      </p>
    </div>
  )
}

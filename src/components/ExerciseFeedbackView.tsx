'use client'

import { useMemo } from 'react'
import SkeletonOverlay, {
  type Keypoint,
  type JointFeedback,
  type FeedbackLevel,
  type CorrectionDirection,
} from './SkeletonOverlay'
import FeedbackPanel, {
  type Checkpoint,
  MiniFeedback,
} from './FeedbackPanel'
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose'

// ============================================
// 타입 정의
// ============================================

export interface AngleInfo {
  joints: [number, number, number]  // [시작, 꼭지점, 끝] 인덱스
  value: number
  label: string
}

export interface JointIssue {
  jointIndex: number
  level: FeedbackLevel
  angle?: number
  angleJoints?: [number, number, number]
  correction?: CorrectionDirection
  label: string
  message: string
  value?: number
  unit?: string
}

export interface ExerciseFeedbackViewProps {
  // 비디오/이미지 관련
  videoRef?: React.RefObject<HTMLVideoElement>
  imageUrl?: string
  width: number
  height: number
  mirrored?: boolean

  // 포즈 데이터
  keypoints: Keypoint[]

  // 피드백 데이터
  score: number
  issues: JointIssue[]

  // 운동 상태
  repCount?: number
  setCount?: number
  targetReps?: number
  targetSets?: number
  phase?: string
  isActive?: boolean

  // 표시 옵션
  showSkeleton?: boolean
  showAngles?: boolean
  showCorrections?: boolean
  showPulse?: boolean
  showMiniScore?: boolean
  panelPosition?: 'right' | 'bottom' | 'overlay'

  className?: string
}

// ============================================
// 메인 통합 컴포넌트
// ============================================

export default function ExerciseFeedbackView({
  videoRef,
  imageUrl,
  width,
  height,
  mirrored = true,
  keypoints,
  score,
  issues,
  repCount = 0,
  setCount = 1,
  targetReps = 10,
  targetSets = 3,
  phase,
  isActive = true,
  showSkeleton = true,
  showAngles = true,
  showCorrections = true,
  showPulse = true,
  showMiniScore = true,
  panelPosition = 'right',
  className = '',
}: ExerciseFeedbackViewProps) {
  // JointIssue를 JointFeedback으로 변환
  const jointFeedbacks: JointFeedback[] = useMemo(() => {
    return issues.map(issue => ({
      jointIndex: issue.jointIndex,
      level: issue.level,
      angle: issue.angle,
      angleJoints: issue.angleJoints,
      correction: issue.correction,
      message: issue.message,
    }))
  }, [issues])

  // JointIssue를 Checkpoint로 변환
  const checkpoints: Checkpoint[] = useMemo(() => {
    return issues.map(issue => ({
      id: `joint-${issue.jointIndex}`,
      name: issue.label,
      status: issue.level === 'error' ? 'error' : issue.level === 'warning' ? 'warning' : 'good',
      value: issue.value ?? issue.angle,
      unit: issue.unit ?? (issue.angle !== undefined ? '°' : undefined),
      message: issue.message,
    }))
  }, [issues])

  // 레이아웃 결정
  const isOverlay = panelPosition === 'overlay'
  const isBottom = panelPosition === 'bottom'
  const isRight = panelPosition === 'right'

  return (
    <div className={`flex ${isBottom ? 'flex-col' : 'flex-row'} gap-4 ${className}`}>
      {/* 비디오/스켈레톤 영역 */}
      <div className="relative flex-shrink-0" style={{ width, height }}>
        {/* 비디오 또는 이미지 배경 */}
        {videoRef && (
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover rounded-xl"
            playsInline
            muted
          />
        )}
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Pose"
            className="absolute inset-0 w-full h-full object-cover rounded-xl"
          />
        )}

        {/* 어두운 오버레이 (스켈레톤 가시성 향상) */}
        <div className="absolute inset-0 bg-black/20 rounded-xl" />

        {/* 스켈레톤 오버레이 */}
        <SkeletonOverlay
          keypoints={keypoints}
          feedbacks={jointFeedbacks}
          width={width}
          height={height}
          mirrored={mirrored}
          showSkeleton={showSkeleton}
          showAngles={showAngles}
          showCorrections={showCorrections}
          showPulse={showPulse}
        />

        {/* 미니 점수 (좌상단) */}
        {showMiniScore && (
          <div className="absolute top-3 left-3">
            <MiniFeedback score={score} />
          </div>
        )}

        {/* 페이즈 표시 (우상단) */}
        {phase && (
          <div className="absolute top-3 right-3">
            <PhaseTag phase={phase} isActive={isActive} />
          </div>
        )}

        {/* 반복/세트 카운터 (하단) */}
        <div className="absolute bottom-3 left-3 right-3 flex justify-between">
          <CounterTag label="세트" current={setCount} target={targetSets} />
          <CounterTag label="반복" current={repCount} target={targetReps} />
        </div>

        {/* 오버레이 모드일 때 문제 표시 */}
        {isOverlay && issues.filter(i => i.level !== 'good').length > 0 && (
          <div className="absolute bottom-16 left-3 right-3">
            <IssueOverlay issues={issues.filter(i => i.level !== 'good')} />
          </div>
        )}
      </div>

      {/* 피드백 패널 (오버레이 모드 아닐 때) */}
      {!isOverlay && (
        <div className={isBottom ? 'w-full' : 'w-80 flex-shrink-0'}>
          <FeedbackPanel
            score={score}
            checkpoints={checkpoints}
            repCount={repCount}
            setCount={setCount}
            targetReps={targetReps}
            targetSets={targetSets}
            phase={phase}
            isActive={isActive}
          />
        </div>
      )}
    </div>
  )
}

// ============================================
// 서브 컴포넌트
// ============================================

function PhaseTag({ phase, isActive }: { phase: string; isActive: boolean }) {
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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
        colors[phase] || 'bg-gray-600'
      } text-white shadow-lg`}
    >
      {isActive && (
        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
      )}
      {labels[phase] || phase}
    </span>
  )
}

function CounterTag({
  label,
  current,
  target,
}: {
  label: string
  current: number
  target: number
}) {
  const isComplete = current >= target

  return (
    <div className="bg-black/70 backdrop-blur px-3 py-1.5 rounded-lg">
      <span className="text-gray-400 text-xs">{label}</span>
      <div className="flex items-baseline gap-1">
        <span
          className={`text-lg font-bold tabular-nums ${
            isComplete ? 'text-green-400' : 'text-white'
          }`}
        >
          {current}
        </span>
        <span className="text-gray-500 text-sm">/{target}</span>
      </div>
    </div>
  )
}

function IssueOverlay({ issues }: { issues: JointIssue[] }) {
  return (
    <div className="bg-black/80 backdrop-blur rounded-xl p-3 space-y-2">
      {issues.slice(0, 3).map((issue, idx) => (
        <div
          key={idx}
          className={`flex items-center gap-2 text-sm ${
            issue.level === 'error' ? 'text-red-400' : 'text-orange-400'
          }`}
        >
          <span className="text-lg">
            {issue.level === 'error' ? '✕' : '!'}
          </span>
          <span className="flex-1">{issue.message}</span>
          {issue.correction && issue.correction !== 'none' && (
            <CorrectionArrow direction={issue.correction} />
          )}
        </div>
      ))}
    </div>
  )
}

function CorrectionArrow({ direction }: { direction: CorrectionDirection }) {
  const arrows: Record<CorrectionDirection, string> = {
    up: '↑',
    down: '↓',
    left: '←',
    right: '→',
    forward: '↗',
    backward: '↙',
    inward: '→←',
    outward: '←→',
    none: '',
  }

  if (direction === 'none') return null

  return (
    <span className="text-cyan-400 text-lg font-bold">
      {arrows[direction]}
    </span>
  )
}

// ============================================
// 스쿼트용 편의 함수
// ============================================

export interface SquatAnalysisData {
  score: number
  phase: string
  kneeAngle: { value: number; level: FeedbackLevel; message: string; correction: CorrectionDirection }
  hipAngle: { value: number; level: FeedbackLevel; message: string }
  torsoAngle: { value: number; level: FeedbackLevel; message: string; correction: CorrectionDirection }
  kneeValgus: { value: number; level: FeedbackLevel; message: string; correction: CorrectionDirection }
}

export function createSquatIssues(data: SquatAnalysisData): JointIssue[] {
  const issues: JointIssue[] = []

  // 무릎 각도 (양쪽)
  issues.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
    level: data.kneeAngle.level,
    angle: data.kneeAngle.value,
    angleJoints: [
      BLAZEPOSE_KEYPOINTS.LEFT_HIP,
      BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
      BLAZEPOSE_KEYPOINTS.LEFT_ANKLE,
    ],
    correction: data.kneeAngle.correction,
    label: '무릎 각도',
    message: data.kneeAngle.message,
    value: data.kneeAngle.value,
    unit: '°',
  })

  issues.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_KNEE,
    level: data.kneeAngle.level,
    angle: data.kneeAngle.value,
    angleJoints: [
      BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
      BLAZEPOSE_KEYPOINTS.RIGHT_KNEE,
      BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE,
    ],
    correction: data.kneeAngle.correction,
    label: '무릎 각도',
    message: data.kneeAngle.message,
  })

  // 엉덩이 각도 (양쪽)
  issues.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_HIP,
    level: data.hipAngle.level,
    angle: data.hipAngle.value,
    angleJoints: [
      BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
      BLAZEPOSE_KEYPOINTS.LEFT_HIP,
      BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
    ],
    label: '엉덩이 각도',
    message: data.hipAngle.message,
    value: data.hipAngle.value,
    unit: '°',
  })

  issues.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
    level: data.hipAngle.level,
    angle: data.hipAngle.value,
    angleJoints: [
      BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
      BLAZEPOSE_KEYPOINTS.RIGHT_HIP,
      BLAZEPOSE_KEYPOINTS.RIGHT_KNEE,
    ],
    label: '엉덩이 각도',
    message: data.hipAngle.message,
  })

  // 상체 기울기 (어깨에 표시)
  issues.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER,
    level: data.torsoAngle.level,
    correction: data.torsoAngle.correction,
    label: '상체 기울기',
    message: data.torsoAngle.message,
    value: data.torsoAngle.value,
    unit: '°',
  })

  issues.push({
    jointIndex: BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER,
    level: data.torsoAngle.level,
    correction: data.torsoAngle.correction,
    label: '상체 기울기',
    message: data.torsoAngle.message,
  })

  // 무릎 정렬 (Valgus)
  if (data.kneeValgus.level !== 'good') {
    issues.push({
      jointIndex: BLAZEPOSE_KEYPOINTS.LEFT_KNEE,
      level: data.kneeValgus.level,
      correction: data.kneeValgus.correction,
      label: '무릎 정렬',
      message: data.kneeValgus.message,
      value: data.kneeValgus.value,
      unit: '%',
    })
  }

  return issues
}

// ============================================
// 정적 자세용 편의 함수
// ============================================

export interface PostureAnalysisData {
  score: number
  viewType: 'front' | 'side'
  items: Array<{
    jointIndex: number
    level: FeedbackLevel
    label: string
    message: string
    value: number
    unit: string
    correction?: CorrectionDirection
  }>
}

export function createPostureIssues(data: PostureAnalysisData): JointIssue[] {
  return data.items.map(item => ({
    jointIndex: item.jointIndex,
    level: item.level,
    correction: item.correction,
    label: item.label,
    message: item.message,
    value: item.value,
    unit: item.unit,
  }))
}

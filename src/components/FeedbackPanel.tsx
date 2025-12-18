'use client';

import React, { useMemo } from 'react';
import SymmetryPanel from './SymmetryPanel';
import { SymmetryData } from './SymmetryFeedbackCard';

// ============================================
// 타입 정의
// ============================================

export type CheckpointStatus = 'good' | 'warning' | 'error';

export interface Checkpoint {
  id: string;
  name: string;
  status: CheckpointStatus;
  value?: string | number;
  unit?: string;
  message: string;
}

export interface FeedbackPanelProps {
  score: number;
  checkpoints: Checkpoint[];
  repCount?: number;
  setCount?: number;
  targetReps?: number;
  targetSets?: number;
  phase?: string;
  isActive?: boolean;
  className?: string;
  symmetryData?: SymmetryData[];
}

// ============================================
// 헬퍼 함수
// ============================================

const getScoreTheme = (score: number) => {
  if (score >= 80) {
    return {
      text: 'text-emerald-400',
      glow: '#00F5A0',
      gradient: 'from-emerald-500 to-emerald-400',
      shadow: '0 0 40px rgba(0, 245, 160, 0.3)',
      ring: 'ring-emerald-500/30',
    };
  }
  if (score >= 50) {
    return {
      text: 'text-amber-400',
      glow: '#FFB800',
      gradient: 'from-amber-500 to-amber-400',
      shadow: '0 0 40px rgba(255, 184, 0, 0.3)',
      ring: 'ring-amber-500/30',
    };
  }
  return {
    text: 'text-rose-400',
    glow: '#FF3D71',
    gradient: 'from-rose-500 to-rose-400',
    shadow: '0 0 40px rgba(255, 61, 113, 0.3)',
    ring: 'ring-rose-500/30',
  };
};

const getStatusConfig = (status: CheckpointStatus) => {
  const configs = {
    good: {
      icon: '✓',
      iconBg: 'bg-emerald-500',
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
    },
    warning: {
      icon: '!',
      iconBg: 'bg-amber-500',
      border: 'border-amber-500/40',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
    },
    error: {
      icon: '✕',
      iconBg: 'bg-rose-500',
      border: 'border-rose-500/40',
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
    },
  };
  return configs[status];
};

// ============================================
// 점수 디스플레이 컴포넌트
// ============================================

const ScoreDisplay: React.FC<{ score: number }> = ({ score }) => {
  const theme = getScoreTheme(score);

  return (
    <div className="relative flex flex-col items-center py-8">
      {/* 배경 글로우 */}
      <div
        className="absolute inset-0 opacity-30 blur-3xl"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${theme.glow}40 0%, transparent 60%)`,
        }}
      />

      {/* 점수 컨테이너 */}
      <div className="relative">
        {/* 외부 링 애니메이션 */}
        <div
          className={`absolute -inset-6 rounded-full opacity-50 ${theme.ring} ring-2`}
          style={{
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />

        {/* 메인 점수 */}
        <div
          className="relative animate-pulse-glow"
          style={{ '--glow-color': theme.glow } as React.CSSProperties}
        >
          <span
            className={`font-mono-tech text-8xl font-bold tracking-tight ${theme.text}`}
            style={{
              textShadow: `0 0 30px ${theme.glow}80, 0 0 60px ${theme.glow}40, 0 0 100px ${theme.glow}20`,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {score}
          </span>
        </div>

        {/* 점수 라벨 */}
        <div className="text-center mt-3">
          <span className="font-tech text-gray-500 text-sm uppercase tracking-[0.25em]">
            Form Score
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// 프로그레스 바 컴포넌트
// ============================================

const ProgressBar: React.FC<{ score: number }> = ({ score }) => {
  const theme = getScoreTheme(score);

  return (
    <div className="px-6 pb-6">
      {/* 트랙 */}
      <div className="relative h-3 bg-gray-800/80 rounded-full overflow-hidden border border-gray-700/50">
        {/* 그리드 패턴 배경 */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.08) 8px, rgba(255,255,255,0.08) 16px)`,
          }}
        />

        {/* 프로그레스 바 */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${theme.gradient} transition-all duration-500 ease-out`}
          style={{
            width: `${Math.min(100, Math.max(0, score))}%`,
            boxShadow: `0 0 15px ${theme.glow}60, inset 0 1px 0 rgba(255,255,255,0.2)`,
          }}
        >
          {/* 쉬머 이펙트 */}
          <div
            className="absolute inset-0 animate-shimmer"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
            }}
          />
        </div>

        {/* 끝점 글로우 */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all duration-500"
          style={{
            left: `calc(${Math.min(98, Math.max(2, score))}% - 6px)`,
            background: theme.glow,
            boxShadow: `0 0 12px ${theme.glow}, 0 0 24px ${theme.glow}80`,
          }}
        />
      </div>

      {/* 스케일 마커 */}
      <div className="flex justify-between mt-2 px-0.5">
        {[0, 25, 50, 75, 100].map((mark) => (
          <div key={mark} className="flex flex-col items-center">
            <div
              className={`w-px h-2 ${score >= mark ? 'bg-gray-500' : 'bg-gray-700'}`}
            />
            <span
              className={`font-mono-tech text-[10px] mt-1 ${
                score >= mark ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              {mark}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// 체크포인트 아이템 컴포넌트
// ============================================

const CheckpointItem: React.FC<{ checkpoint: Checkpoint; index: number }> = ({
  checkpoint,
  index,
}) => {
  const config = getStatusConfig(checkpoint.status);

  return (
    <div
      className={`
        relative p-4 rounded-xl border backdrop-blur-sm
        ${config.border} ${config.bg}
        animate-fade-in-up
        transition-all duration-200 hover:translate-x-1
      `}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* 스캔라인 이펙트 */}
      <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent animate-scan" />
      </div>

      <div className="flex items-start gap-4">
        {/* 상태 아이콘 */}
        <div
          className={`
            flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center
            ${config.iconBg} text-gray-900 font-bold text-sm
            shadow-lg
          `}
          style={{
            boxShadow: `0 4px 12px ${
              checkpoint.status === 'good'
                ? 'rgba(0,245,160,0.3)'
                : checkpoint.status === 'warning'
                ? 'rgba(255,184,0,0.3)'
                : 'rgba(255,61,113,0.3)'
            }`,
          }}
        >
          {config.icon}
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h4 className="font-tech font-semibold text-gray-100 text-sm">
              {checkpoint.name}
            </h4>
            {checkpoint.value !== undefined && (
              <span className={`font-mono-tech text-sm ${config.text}`}>
                {typeof checkpoint.value === 'number'
                  ? checkpoint.value.toFixed(1)
                  : checkpoint.value}
                {checkpoint.unit && (
                  <span className="text-gray-500 ml-0.5">{checkpoint.unit}</span>
                )}
              </span>
            )}
          </div>
          <p className="font-tech text-xs text-gray-400 leading-relaxed">
            {checkpoint.message}
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================
// 스탯 디스플레이 컴포넌트
// ============================================

const StatsDisplay: React.FC<{
  repCount: number;
  targetReps: number;
  setCount: number;
  targetSets: number;
  phase?: string;
  isActive?: boolean;
}> = ({ repCount, targetReps, setCount, targetSets, phase, isActive }) => {
  const phaseLabels: Record<string, string> = {
    standing: '서있음',
    descending: '내려가는 중',
    bottom: '최저점',
    ascending: '올라오는 중',
  };

  return (
    <div className="px-6 pb-6">
      <div className="grid grid-cols-2 gap-3">
        {/* 반복 횟수 */}
        <div className="relative p-4 rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <span className="font-tech text-[10px] text-gray-500 uppercase tracking-widest block mb-2">
              반복
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono-tech text-3xl font-bold text-cyan-400">
                {repCount}
              </span>
              <span className="font-mono-tech text-base text-gray-600">
                / {targetReps}
              </span>
            </div>
            {/* 미니 프로그레스 */}
            <div className="h-1 bg-gray-700 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (repCount / targetReps) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 세트 */}
        <div className="relative p-4 rounded-xl bg-gray-800/60 border border-gray-700/50 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <span className="font-tech text-[10px] text-gray-500 uppercase tracking-widest block mb-2">
              세트
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono-tech text-3xl font-bold text-violet-400">
                {setCount}
              </span>
              <span className="font-mono-tech text-base text-gray-600">
                / {targetSets}
              </span>
            </div>
            {/* 미니 프로그레스 */}
            <div className="h-1 bg-gray-700 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (setCount / targetSets) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 페이즈 인디케이터 */}
      {phase && (
        <div className="mt-3 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/60 border border-gray-700/50">
            {isActive && (
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            )}
            <span className="font-tech text-xs text-gray-300 uppercase tracking-wider">
              {phaseLabels[phase] || phase}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// 메인 컴포넌트
// ============================================

export default function FeedbackPanel({
  score,
  checkpoints,
  repCount = 0,
  setCount = 1,
  targetReps = 10,
  targetSets = 3,
  phase,
  isActive = true,
  className = '',
  symmetryData,
}: FeedbackPanelProps) {
  const clampedScore = useMemo(
    () => Math.max(0, Math.min(100, Math.round(score))),
    [score]
  );

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      {/* 메인 컨테이너 */}
      <div className="relative bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
        {/* 상단 그라디언트 오버레이 */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-gray-800/50 to-transparent pointer-events-none" />

        {/* 코너 악센트 */}
        <div className="absolute top-0 left-0 w-20 h-20">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-gray-600 to-transparent" />
          <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-gray-600 to-transparent" />
        </div>
        <div className="absolute top-0 right-0 w-20 h-20">
          <div className="absolute top-0 right-0 w-full h-0.5 bg-gradient-to-l from-gray-600 to-transparent" />
          <div className="absolute top-0 right-0 w-0.5 h-full bg-gradient-to-b from-gray-600 to-transparent" />
        </div>

        {/* 타이틀 */}
        <div className="relative px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-emerald-500/50" />
              <span className="w-2 h-2 rounded-full bg-emerald-500/25" />
            </div>
            <h2 className="font-tech font-bold text-base text-gray-100 uppercase tracking-wider">
              Form Analysis
            </h2>
          </div>
          <div className="mt-2 h-px bg-gradient-to-r from-gray-700 via-gray-600 to-transparent" />
        </div>

        {/* 점수 */}
        <ScoreDisplay score={clampedScore} />

        {/* 프로그레스 바 */}
        <ProgressBar score={clampedScore} />

        {/* 구분선 */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
            <span className="font-tech text-[10px] text-gray-500 uppercase tracking-[0.2em]">
              체크포인트
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
          </div>
        </div>

        {/* 체크포인트 목록 */}
        <div className="px-6 pb-6 space-y-3">
          {checkpoints.map((checkpoint, index) => (
            <CheckpointItem
              key={checkpoint.id}
              checkpoint={checkpoint}
              index={index}
            />
          ))}
        </div>

        {/* 대칭성 분석 패널 */}
        {symmetryData && symmetryData.length > 0 && (
          <div className="px-6 pb-6">
            <SymmetryPanel symmetryItems={symmetryData} />
          </div>
        )}

        {/* 구분선 */}
        <div className="border-t border-gray-800" />

        {/* 스탯 */}
        <div className="pt-4">
          <StatsDisplay
            repCount={repCount}
            targetReps={targetReps}
            setCount={setCount}
            targetSets={targetSets}
            phase={phase}
            isActive={isActive}
          />
        </div>

        {/* 하단 악센트 라인 */}
        <div className="h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500" />
      </div>
    </div>
  );
}

// ============================================
// 컴팩트 버전
// ============================================

export interface CompactFeedbackPanelProps {
  score: number;
  checkpoints: Checkpoint[];
  className?: string;
}

export function CompactFeedbackPanel({
  score,
  checkpoints,
  className = '',
}: CompactFeedbackPanelProps) {
  const theme = getScoreTheme(score);

  const goodCount = checkpoints.filter((c) => c.status === 'good').length;
  const warningCount = checkpoints.filter((c) => c.status === 'warning').length;
  const errorCount = checkpoints.filter((c) => c.status === 'error').length;

  return (
    <div
      className={`bg-gray-900/95 backdrop-blur-md rounded-xl p-4 border border-gray-800 ${className}`}
    >
      <div className="flex items-center gap-5">
        {/* 점수 */}
        <div className="text-center">
          <span
            className={`font-mono-tech text-4xl font-bold ${theme.text}`}
            style={{ textShadow: `0 0 20px ${theme.glow}60` }}
          >
            {score}
          </span>
        </div>

        {/* 구분선 */}
        <div className="w-px h-12 bg-gradient-to-b from-transparent via-gray-700 to-transparent" />

        {/* 상태 요약 */}
        <div className="flex items-center gap-4">
          {goodCount > 0 && (
            <StatusBadge count={goodCount} status="good" />
          )}
          {warningCount > 0 && (
            <StatusBadge count={warningCount} status="warning" />
          )}
          {errorCount > 0 && (
            <StatusBadge count={errorCount} status="error" />
          )}
        </div>
      </div>
    </div>
  );
}

const StatusBadge: React.FC<{ count: number; status: CheckpointStatus }> = ({
  count,
  status,
}) => {
  const config = getStatusConfig(status);

  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-6 h-6 rounded-lg ${config.iconBg} flex items-center justify-center text-gray-900 text-xs font-bold`}
      >
        {config.icon}
      </span>
      <span className={`font-mono-tech text-lg font-semibold ${config.text}`}>
        {count}
      </span>
    </div>
  );
};

// ============================================
// 미니 피드백 (원형)
// ============================================

export interface MiniFeedbackProps {
  score: number;
  className?: string;
}

export function MiniFeedback({ score, className = '' }: MiniFeedbackProps) {
  const theme = getScoreTheme(score);

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      <svg className="w-16 h-16 -rotate-90">
        {/* 배경 원 */}
        <circle
          cx="32"
          cy="32"
          r={radius}
          strokeWidth="4"
          stroke="currentColor"
          className="text-gray-700"
          fill="transparent"
        />
        {/* 프로그레스 원 */}
        <circle
          cx="32"
          cy="32"
          r={radius}
          strokeWidth="4"
          stroke={theme.glow}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 0.5s ease',
            filter: `drop-shadow(0 0 6px ${theme.glow}80)`,
          }}
        />
      </svg>
      <span
        className={`absolute font-mono-tech text-lg font-bold ${theme.text}`}
        style={{ textShadow: `0 0 10px ${theme.glow}60` }}
      >
        {score}
      </span>
    </div>
  );
}

// ============================================
// 유틸리티 함수
// ============================================

export function createSquatCheckpoints(
  kneeAngle: { value: number; level: CheckpointStatus; message: string },
  hipAngle: { value: number; level: CheckpointStatus; message: string },
  torso: { value: number; level: CheckpointStatus; message: string },
  kneeValgus: { value: number; level: CheckpointStatus; message: string }
): Checkpoint[] {
  return [
    {
      id: 'knee',
      name: '무릎 각도',
      status: kneeAngle.level,
      value: kneeAngle.value,
      unit: '°',
      message: kneeAngle.message,
    },
    {
      id: 'hip',
      name: '엉덩이 각도',
      status: hipAngle.level,
      value: hipAngle.value,
      unit: '°',
      message: hipAngle.message,
    },
    {
      id: 'torso',
      name: '상체 기울기',
      status: torso.level,
      value: torso.value,
      unit: '°',
      message: torso.message,
    },
    {
      id: 'valgus',
      name: '무릎 정렬',
      status: kneeValgus.level,
      value: kneeValgus.value,
      unit: '%',
      message: kneeValgus.message,
    },
  ];
}

export function createPostureCheckpoints(
  items: Array<{
    id: string;
    name: string;
    value: number;
    unit?: string;
    level: CheckpointStatus;
    message: string;
  }>
): Checkpoint[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    status: item.level,
    value: item.value,
    unit: item.unit,
    message: item.message,
  }));
}

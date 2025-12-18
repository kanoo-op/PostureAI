'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

// ============================================
// 타입 정의
// ============================================

interface SetScore {
  setNumber: number;
  score: number;
  reps: number;
}

interface AnalysisItem {
  id: string;
  name: string;
  average: number;
  min: number;
  max: number;
  unit: string;
  evaluation: 'excellent' | 'good' | 'fair' | 'poor';
}

interface ImprovementPoint {
  id: string;
  category: string;
  message: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

interface ExerciseResult {
  exerciseType: string;
  exerciseIcon: string;
  date: string;
  totalDuration: string;
  totalReps: number;
  totalSets: number;
  overallScore: number;
  setScores: SetScore[];
  analysisItems: AnalysisItem[];
  improvements: ImprovementPoint[];
}

// ============================================
// Mock 데이터
// ============================================

const mockResult: ExerciseResult = {
  exerciseType: '스쿼트',
  exerciseIcon: '🏋️',
  date: new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }),
  totalDuration: '12분 45초',
  totalReps: 45,
  totalSets: 3,
  overallScore: 82,
  setScores: [
    { setNumber: 1, score: 78, reps: 15 },
    { setNumber: 2, score: 85, reps: 15 },
    { setNumber: 3, score: 83, reps: 15 },
  ],
  analysisItems: [
    { id: 'knee', name: '무릎 각도', average: 92.5, min: 85, max: 105, unit: '°', evaluation: 'excellent' },
    { id: 'hip', name: '엉덩이 깊이', average: 78.3, min: 70, max: 88, unit: '°', evaluation: 'good' },
    { id: 'torso', name: '상체 기울기', average: 25.8, min: 18, max: 35, unit: '°', evaluation: 'fair' },
    { id: 'balance', name: '좌우 균형', average: 94.2, min: 88, max: 100, unit: '%', evaluation: 'excellent' },
    { id: 'tempo', name: '운동 템포', average: 2.8, min: 2.1, max: 3.5, unit: '초', evaluation: 'good' },
  ],
  improvements: [
    {
      id: '1',
      category: '상체 자세',
      message: '스쿼트 시 상체가 과도하게 앞으로 기울어지는 경향이 있습니다.',
      suggestion: '가슴을 펴고 시선을 정면보다 약간 위를 바라보세요. 코어에 힘을 유지하면 상체 안정성이 향상됩니다.',
      priority: 'high',
    },
    {
      id: '2',
      category: '하강 속도',
      message: '일부 반복에서 너무 빠르게 내려가는 모습이 관찰되었습니다.',
      suggestion: '2-3초에 걸쳐 천천히 내려가세요. 근육의 긴장을 유지하면서 컨트롤된 동작을 수행하세요.',
      priority: 'medium',
    },
    {
      id: '3',
      category: '발 위치',
      message: '발끝이 약간 안쪽을 향하고 있습니다.',
      suggestion: '발끝을 살짝 바깥쪽(약 15-30도)으로 향하게 하면 무릎 정렬이 개선됩니다.',
      priority: 'low',
    },
  ],
};

// ============================================
// 헬퍼 함수
// ============================================

const getScoreTheme = (score: number) => {
  if (score >= 80) {
    return {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500',
      bgLight: 'bg-emerald-500/20',
      border: 'border-emerald-500/40',
      glow: '#00F5A0',
      label: '우수',
    };
  }
  if (score >= 60) {
    return {
      text: 'text-amber-400',
      bg: 'bg-amber-500',
      bgLight: 'bg-amber-500/20',
      border: 'border-amber-500/40',
      glow: '#FFB800',
      label: '양호',
    };
  }
  return {
    text: 'text-rose-400',
    bg: 'bg-rose-500',
    bgLight: 'bg-rose-500/20',
    border: 'border-rose-500/40',
    glow: '#FF3D71',
    label: '개선필요',
  };
};

const getEvaluationConfig = (evaluation: string) => {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    excellent: { label: '우수', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    good: { label: '양호', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    fair: { label: '보통', color: 'text-amber-400', bg: 'bg-amber-500/20' },
    poor: { label: '미흡', color: 'text-rose-400', bg: 'bg-rose-500/20' },
  };
  return configs[evaluation] || configs.fair;
};

const getPriorityConfig = (priority: string) => {
  const configs: Record<string, { label: string; color: string; bg: string; border: string }> = {
    high: { label: '높음', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/40' },
    medium: { label: '중간', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/40' },
    low: { label: '낮음', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/40' },
  };
  return configs[priority] || configs.medium;
};

// ============================================
// 종합 점수 섹션
// ============================================

const OverallScoreSection: React.FC<{ result: ExerciseResult }> = ({ result }) => {
  const theme = getScoreTheme(result.overallScore);

  return (
    <div className="relative bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
      {/* 배경 글로우 */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${theme.glow}40 0%, transparent 60%)`,
        }}
      />

      {/* 코너 악센트 */}
      <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-gray-700 rounded-tl-2xl" />
      <div className="absolute top-0 right-0 w-24 h-24 border-t-2 border-r-2 border-gray-700 rounded-tr-2xl" />

      <div className="relative p-6 sm:p-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{result.exerciseIcon}</span>
            <div>
              <h2 className="font-tech font-bold text-xl text-gray-100">{result.exerciseType}</h2>
              <p className="font-tech text-sm text-gray-500">{result.date}</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full ${theme.bgLight} ${theme.border} border`}>
            <span className={`font-tech text-sm font-semibold ${theme.text}`}>{theme.label}</span>
          </div>
        </div>

        {/* 점수 */}
        <div className="flex flex-col items-center py-8">
          <div className="relative">
            {/* 외부 링 */}
            <svg className="w-40 h-40 sm:w-48 sm:h-48 -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                strokeWidth="6"
                stroke="currentColor"
                className="text-gray-800"
                fill="transparent"
              />
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                strokeWidth="6"
                stroke={theme.glow}
                fill="transparent"
                strokeLinecap="round"
                strokeDasharray={`${result.overallScore * 2.83} 283`}
                style={{
                  filter: `drop-shadow(0 0 8px ${theme.glow}80)`,
                  transition: 'stroke-dasharray 1s ease-out',
                }}
              />
            </svg>
            {/* 점수 텍스트 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`font-mono-tech text-6xl sm:text-7xl font-bold ${theme.text}`}
                style={{ textShadow: `0 0 30px ${theme.glow}60` }}
              >
                {result.overallScore}
              </span>
              <span className="font-tech text-gray-500 text-sm uppercase tracking-wider mt-1">
                종합 점수
              </span>
            </div>
          </div>
        </div>

        {/* 운동 정보 그리드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <InfoCard icon="⏱️" label="운동 시간" value={result.totalDuration} />
          <InfoCard icon="🔄" label="총 반복" value={`${result.totalReps}회`} />
          <InfoCard icon="📊" label="세트 수" value={`${result.totalSets}세트`} />
          <InfoCard icon="⚡" label="평균/세트" value={`${Math.round(result.totalReps / result.totalSets)}회`} />
        </div>
      </div>

      {/* 하단 그라디언트 라인 */}
      <div className="h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500" />
    </div>
  );
};

const InfoCard: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="bg-gray-800/50 rounded-xl p-3 sm:p-4 border border-gray-700/50 text-center">
    <span className="text-xl sm:text-2xl">{icon}</span>
    <p className="font-tech text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mt-1">{label}</p>
    <p className="font-mono-tech text-sm sm:text-base font-semibold text-gray-200 mt-0.5">{value}</p>
  </div>
);

// ============================================
// 세트별 점수 그래프
// ============================================

const SetScoresSection: React.FC<{ setScores: SetScore[] }> = ({ setScores }) => {
  const maxScore = Math.max(...setScores.map((s) => s.score));

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h3 className="font-tech font-bold text-lg text-gray-100 mb-6 flex items-center gap-2">
        <span className="w-1.5 h-5 bg-violet-500 rounded-full" />
        세트별 점수
      </h3>

      <div className="space-y-4">
        {setScores.map((set) => {
          const theme = getScoreTheme(set.score);
          const widthPercent = (set.score / 100) * 100;

          return (
            <div key={set.setNumber} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono-tech text-sm text-gray-400">SET {set.setNumber}</span>
                  <span className="font-tech text-xs text-gray-600">({set.reps}회)</span>
                </div>
                <span className={`font-mono-tech text-lg font-bold ${theme.text}`}>{set.score}</span>
              </div>
              <div className="relative h-8 bg-gray-800 rounded-lg overflow-hidden">
                {/* 배경 그리드 */}
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, transparent, transparent 10%, rgba(255,255,255,0.03) 10%, rgba(255,255,255,0.03) 20%)',
                  }}
                />
                {/* 프로그레스 바 */}
                <div
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${theme.bg} rounded-lg transition-all duration-700 ease-out group-hover:brightness-110`}
                  style={{
                    width: `${widthPercent}%`,
                    boxShadow: `0 0 20px ${theme.glow}40`,
                  }}
                >
                  {/* 쉬머 */}
                  <div
                    className="absolute inset-0 animate-shimmer opacity-50"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    }}
                  />
                </div>
                {/* 최고 점수 마커 */}
                {set.score === maxScore && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-violet-500 rounded text-[10px] font-tech text-white">
                    BEST
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 요약 */}
      <div className="mt-6 pt-4 border-t border-gray-800 flex justify-between items-center">
        <span className="font-tech text-sm text-gray-500">평균 점수</span>
        <span className="font-mono-tech text-xl font-bold text-violet-400">
          {Math.round(setScores.reduce((acc, s) => acc + s.score, 0) / setScores.length)}
        </span>
      </div>
    </div>
  );
};

// ============================================
// 상세 분석 테이블
// ============================================

const AnalysisTableSection: React.FC<{ items: AnalysisItem[] }> = ({ items }) => {
  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h3 className="font-tech font-bold text-lg text-gray-100 mb-6 flex items-center gap-2">
        <span className="w-1.5 h-5 bg-cyan-500 rounded-full" />
        상세 분석
      </h3>

      {/* 모바일: 카드 레이아웃 */}
      <div className="block sm:hidden space-y-3">
        {items.map((item) => {
          const evalConfig = getEvaluationConfig(item.evaluation);
          return (
            <div key={item.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <div className="flex items-center justify-between mb-3">
                <span className="font-tech font-semibold text-gray-200">{item.name}</span>
                <span className={`px-2 py-0.5 rounded-full ${evalConfig.bg} ${evalConfig.color} text-xs font-tech`}>
                  {evalConfig.label}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">평균</p>
                  <p className="font-mono-tech text-cyan-400">
                    {item.average}
                    <span className="text-gray-600 text-xs ml-0.5">{item.unit}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">최소</p>
                  <p className="font-mono-tech text-gray-400">
                    {item.min}
                    <span className="text-gray-600 text-xs ml-0.5">{item.unit}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">최대</p>
                  <p className="font-mono-tech text-gray-400">
                    {item.max}
                    <span className="text-gray-600 text-xs ml-0.5">{item.unit}</span>
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 데스크톱: 테이블 레이아웃 */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-3 px-4 font-tech text-xs text-gray-500 uppercase tracking-wider">항목</th>
              <th className="text-center py-3 px-4 font-tech text-xs text-gray-500 uppercase tracking-wider">평균값</th>
              <th className="text-center py-3 px-4 font-tech text-xs text-gray-500 uppercase tracking-wider">범위</th>
              <th className="text-center py-3 px-4 font-tech text-xs text-gray-500 uppercase tracking-wider">평가</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const evalConfig = getEvaluationConfig(item.evaluation);
              return (
                <tr
                  key={item.id}
                  className={`border-b border-gray-800/50 transition-colors hover:bg-gray-800/30 animate-fade-in-up`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="py-4 px-4">
                    <span className="font-tech font-semibold text-gray-200">{item.name}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="font-mono-tech text-lg text-cyan-400">
                      {item.average}
                      <span className="text-gray-600 text-sm ml-1">{item.unit}</span>
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="font-mono-tech text-sm text-gray-400">
                      {item.min} ~ {item.max}
                      <span className="text-gray-600 ml-1">{item.unit}</span>
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full ${evalConfig.bg} ${evalConfig.color} text-sm font-tech`}>
                      {evalConfig.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================
// 개선 포인트 섹션
// ============================================

const ImprovementsSection: React.FC<{ improvements: ImprovementPoint[] }> = ({ improvements }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h3 className="font-tech font-bold text-lg text-gray-100 mb-6 flex items-center gap-2">
        <span className="w-1.5 h-5 bg-amber-500 rounded-full" />
        개선 포인트
      </h3>

      <div className="space-y-3">
        {improvements.map((item, index) => {
          const priorityConfig = getPriorityConfig(item.priority);
          const isExpanded = expandedId === item.id;

          return (
            <div
              key={item.id}
              className={`rounded-xl border ${priorityConfig.border} ${priorityConfig.bg} overflow-hidden transition-all duration-300 animate-fade-in-up`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="w-full p-4 text-left flex items-start gap-4"
              >
                {/* 우선순위 인디케이터 */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-tech font-bold text-sm ${
                      item.priority === 'high'
                        ? 'bg-rose-500 text-white'
                        : item.priority === 'medium'
                        ? 'bg-amber-500 text-gray-900'
                        : 'bg-cyan-500 text-gray-900'
                    }`}
                  >
                    {index + 1}
                  </div>
                </div>

                {/* 콘텐츠 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-tech font-semibold text-gray-200">{item.category}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${priorityConfig.bg} ${priorityConfig.color} border ${priorityConfig.border}`}>
                      {priorityConfig.label}
                    </span>
                  </div>
                  <p className="font-tech text-sm text-gray-400 leading-relaxed">{item.message}</p>
                </div>

                {/* 화살표 */}
                <div className="flex-shrink-0">
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* 확장 콘텐츠 */}
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-4 pb-4 pt-0 ml-12">
                  <div className="bg-gray-800/50 rounded-lg p-4 border-l-2 border-emerald-500">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-emerald-400">💡</span>
                      <span className="font-tech text-xs text-emerald-400 uppercase tracking-wider">제안</span>
                    </div>
                    <p className="font-tech text-sm text-gray-300 leading-relaxed">{item.suggestion}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// 액션 버튼 섹션
// ============================================

const ActionButtonsSection: React.FC = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // 저장 시뮬레이션
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setIsSaved(true);
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 기록 저장 */}
        <button
          onClick={handleSave}
          disabled={isSaving || isSaved}
          className={`
            relative py-4 px-6 rounded-xl font-tech font-semibold text-sm
            transition-all duration-300 overflow-hidden
            ${
              isSaved
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-750 hover:border-gray-600'
            }
            border disabled:opacity-50
          `}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isSaving ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                저장 중...
              </>
            ) : isSaved ? (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                저장 완료
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                기록 저장
              </>
            )}
          </span>
        </button>

        {/* 다시하기 */}
        <Link
          href="/analyze"
          className="py-4 px-6 rounded-xl font-tech font-semibold text-sm bg-violet-500/20 border border-violet-500/50 text-violet-400 hover:bg-violet-500/30 transition-all duration-300 text-center flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          다시하기
        </Link>

        {/* 홈으로 */}
        <Link
          href="/"
          className="py-4 px-6 rounded-xl font-tech font-semibold text-sm bg-gray-800 border border-gray-700 text-gray-200 hover:bg-gray-750 hover:border-gray-600 transition-all duration-300 text-center flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          홈으로
        </Link>
      </div>
    </div>
  );
};

// ============================================
// 메인 페이지 컴포넌트
// ============================================

export default function ResultPage() {
  return (
    <div className="min-h-screen bg-gray-950 py-6 px-4 sm:py-8 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-tech font-bold text-2xl sm:text-3xl text-gray-100">운동 결과</h1>
            <p className="font-tech text-sm text-gray-500 mt-1">분석이 완료되었습니다</p>
          </div>
          <Link
            href="/history"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-tech text-sm">기록</span>
          </Link>
        </div>

        {/* 종합 점수 */}
        <OverallScoreSection result={mockResult} />

        {/* 세트별 점수 + 상세 분석 (2컬럼 그리드) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SetScoresSection setScores={mockResult.setScores} />
          <AnalysisTableSection items={mockResult.analysisItems} />
        </div>

        {/* 개선 포인트 */}
        <ImprovementsSection improvements={mockResult.improvements} />

        {/* 액션 버튼 */}
        <ActionButtonsSection />
      </div>
    </div>
  );
}

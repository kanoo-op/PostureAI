'use client';

import React from 'react';
import { ANALYSIS_COLORS } from './constants';
import type { AnalysisCacheEntry } from '@/types/video';

interface ResumeAnalysisModalProps {
  isOpen: boolean;
  cacheEntry: AnalysisCacheEntry;
  onResume: () => void;
  onStartNew: () => void;
  onClose: () => void;
}

export default function ResumeAnalysisModal({
  isOpen,
  cacheEntry,
  onResume,
  onStartNew,
  onClose,
}: ResumeAnalysisModalProps) {
  if (!isOpen) return null;

  const progressPercent = cacheEntry.progress.percent;
  const lastUpdated = new Date(cacheEntry.updatedAt).toLocaleString('ko-KR');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          backgroundColor: ANALYSIS_COLORS.surface,
          border: `1px solid ${ANALYSIS_COLORS.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}
        >
          <svg
            className="w-7 h-7"
            style={{ color: '#A855F7' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Title */}
        <h2
          className="text-xl font-bold text-center mb-2"
          style={{ color: ANALYSIS_COLORS.textPrimary }}
        >
          이전 분석 발견
        </h2>

        {/* Description */}
        <p
          className="text-center mb-4"
          style={{ color: ANALYSIS_COLORS.textSecondary }}
        >
          이 영상에 대한 미완료 분석이 있습니다.
        </p>

        {/* Progress Info */}
        <div
          className="rounded-xl p-4 mb-6"
          style={{ backgroundColor: ANALYSIS_COLORS.surfaceElevated }}
        >
          <div className="flex justify-between items-center mb-2">
            <span style={{ color: ANALYSIS_COLORS.textSecondary }}>진행률</span>
            <span
              className="font-semibold"
              style={{ color: ANALYSIS_COLORS.primary }}
            >
              {progressPercent}%
            </span>
          </div>
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: ANALYSIS_COLORS.progressTrack }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progressPercent}%`,
                background: `linear-gradient(90deg, ${ANALYSIS_COLORS.primary}, ${ANALYSIS_COLORS.secondary})`,
              }}
            />
          </div>
          <div
            className="text-xs mt-2"
            style={{ color: ANALYSIS_COLORS.textMuted }}
          >
            {cacheEntry.progress.currentFrame} / {cacheEntry.progress.totalFrames} 프레임 • 마지막 업데이트: {lastUpdated}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onStartNew}
            className="flex-1 py-3 rounded-xl font-medium transition-colors"
            style={{
              backgroundColor: ANALYSIS_COLORS.surfaceElevated,
              color: ANALYSIS_COLORS.textSecondary,
              border: `1px solid ${ANALYSIS_COLORS.border}`,
            }}
          >
            새로 시작
          </button>
          <button
            onClick={onResume}
            className="flex-1 py-3 rounded-xl font-semibold transition-all"
            style={{
              background: `linear-gradient(135deg, ${ANALYSIS_COLORS.primary}, ${ANALYSIS_COLORS.secondary})`,
              color: ANALYSIS_COLORS.backgroundSolid,
            }}
          >
            이어서 분석
          </button>
        </div>
      </div>
    </div>
  );
}

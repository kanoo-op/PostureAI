'use client';

import React from 'react';
import type { VideoAnalysisSummary } from '@/types/video';
import { ANALYSIS_COLORS } from './constants';

interface VideoAnalysisResultSummaryProps {
  summary: VideoAnalysisSummary;
}

function formatTime(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}초`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}분 ${remainingSeconds.toFixed(0)}초`;
}

export default function VideoAnalysisResultSummary({
  summary,
}: VideoAnalysisResultSummaryProps) {
  const successRate = summary.totalFrames > 0
    ? ((summary.successfulFrames / summary.totalFrames) * 100).toFixed(1)
    : '0';

  const hasWarnings = summary.failedFrames > 0 || summary.averageConfidence < 0.5;

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        backgroundColor: ANALYSIS_COLORS.background,
        border: `1px solid ${ANALYSIS_COLORS.border}`,
      }}
    >
      <h3
        className="text-lg font-semibold mb-4"
        style={{ color: ANALYSIS_COLORS.textPrimary }}
      >
        분석 결과 요약
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Total frames analyzed */}
        <div className="space-y-1">
          <div
            className="text-sm"
            style={{ color: ANALYSIS_COLORS.textSecondary }}
          >
            분석된 프레임
          </div>
          <div
            className="text-2xl font-mono font-bold"
            style={{ color: ANALYSIS_COLORS.primary }}
          >
            {summary.totalFrames.toLocaleString()}
          </div>
        </div>

        {/* Success rate */}
        <div className="space-y-1">
          <div
            className="text-sm"
            style={{ color: ANALYSIS_COLORS.textSecondary }}
          >
            성공률
          </div>
          <div
            className="text-2xl font-mono font-bold"
            style={{
              color: parseFloat(successRate) >= 90
                ? ANALYSIS_COLORS.statusSuccess
                : parseFloat(successRate) >= 70
                ? ANALYSIS_COLORS.statusWarning
                : ANALYSIS_COLORS.statusError,
            }}
          >
            {successRate}%
          </div>
        </div>

        {/* Average confidence */}
        <div className="space-y-1">
          <div
            className="text-sm"
            style={{ color: ANALYSIS_COLORS.textSecondary }}
          >
            평균 신뢰도
          </div>
          <div
            className="text-2xl font-mono font-bold"
            style={{
              color: summary.averageConfidence >= 0.7
                ? ANALYSIS_COLORS.primary
                : ANALYSIS_COLORS.statusWarning,
            }}
          >
            {(summary.averageConfidence * 100).toFixed(1)}%
          </div>
        </div>

        {/* Total processing time */}
        <div className="space-y-1">
          <div
            className="text-sm"
            style={{ color: ANALYSIS_COLORS.textSecondary }}
          >
            총 처리 시간
          </div>
          <div
            className="text-2xl font-mono font-bold"
            style={{ color: ANALYSIS_COLORS.textPrimary }}
          >
            {formatTime(summary.totalProcessingTime)}
          </div>
        </div>

        {/* Average processing rate */}
        <div className="space-y-1">
          <div
            className="text-sm"
            style={{ color: ANALYSIS_COLORS.textSecondary }}
          >
            평균 처리 속도
          </div>
          <div
            className="text-2xl font-mono font-bold"
            style={{ color: ANALYSIS_COLORS.primary }}
          >
            {summary.averageProcessingRate.toFixed(1)} fps
          </div>
        </div>

        {/* Failed frames */}
        {summary.failedFrames > 0 && (
          <div className="space-y-1">
            <div
              className="text-sm"
              style={{ color: ANALYSIS_COLORS.textSecondary }}
            >
              실패한 프레임
            </div>
            <div
              className="text-2xl font-mono font-bold"
              style={{ color: ANALYSIS_COLORS.statusWarning }}
            >
              {summary.failedFrames.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Warnings */}
      {hasWarnings && (
        <div
          className="mt-4 p-3 rounded-lg flex items-center gap-2"
          style={{
            backgroundColor: ANALYSIS_COLORS.statusWarningBg,
            color: ANALYSIS_COLORS.statusWarning,
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span className="text-sm">
            {summary.failedFrames > 0 && summary.averageConfidence < 0.5
              ? '일부 프레임 감지 실패 및 낮은 신뢰도'
              : summary.failedFrames > 0
              ? '일부 프레임에서 포즈 감지에 실패했습니다'
              : '전체적인 신뢰도가 낮습니다. 더 나은 조명이나 카메라 각도를 시도해보세요'}
          </span>
        </div>
      )}
    </div>
  );
}

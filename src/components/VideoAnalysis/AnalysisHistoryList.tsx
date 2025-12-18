'use client';

import React from 'react';
import { ANALYSIS_COLORS } from './constants';
import type { AnalysisCacheSummary, CacheAnalysisStatus } from '@/types/video';

interface AnalysisHistoryListProps {
  analyses: AnalysisCacheSummary[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  className?: string;
}

const STATUS_CONFIG: Record<CacheAnalysisStatus, { label: string; color: string; bgColor: string }> = {
  completed: { label: '완료', color: ANALYSIS_COLORS.statusSuccess, bgColor: ANALYSIS_COLORS.statusSuccessBg },
  in_progress: { label: '진행중', color: ANALYSIS_COLORS.statusProcessing, bgColor: 'rgba(59, 130, 246, 0.1)' },
  paused: { label: '일시정지', color: '#A855F7', bgColor: 'rgba(168, 85, 247, 0.1)' },
  error: { label: '오류', color: ANALYSIS_COLORS.statusError, bgColor: ANALYSIS_COLORS.statusErrorBg },
};

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AnalysisHistoryList({
  analyses,
  onSelect,
  onDelete,
  className = '',
}: AnalysisHistoryListProps) {
  if (analyses.length === 0) {
    return (
      <div
        className={`text-center py-8 ${className}`}
        style={{ color: ANALYSIS_COLORS.textMuted }}
      >
        분석 기록이 없습니다
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {analyses.map((analysis) => {
        const statusConfig = STATUS_CONFIG[analysis.status];

        return (
          <div
            key={analysis.id}
            className="rounded-xl p-4 transition-colors cursor-pointer group"
            style={{
              backgroundColor: 'rgba(31, 41, 55, 0.6)',
            }}
            onClick={() => onSelect(analysis.id)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(31, 41, 55, 0.6)';
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Video name */}
                <h4
                  className="font-medium truncate mb-1"
                  style={{ color: ANALYSIS_COLORS.textPrimary }}
                >
                  {analysis.videoName}
                </h4>

                {/* Progress for incomplete analyses */}
                {analysis.status !== 'completed' && (
                  <div className="mb-2">
                    <div
                      className="w-full h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: ANALYSIS_COLORS.progressTrack }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${analysis.progressPercent}%`,
                          backgroundColor: statusConfig.color,
                        }}
                      />
                    </div>
                    <span
                      className="text-xs"
                      style={{ color: ANALYSIS_COLORS.textMuted }}
                    >
                      {analysis.framesProcessed} / {analysis.totalFrames} 프레임
                    </span>
                  </div>
                )}

                {/* Meta info */}
                <div
                  className="text-xs flex items-center gap-2"
                  style={{ color: ANALYSIS_COLORS.textMuted }}
                >
                  <span>{formatDate(analysis.updatedAt)}</span>
                  <span>•</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor: statusConfig.bgColor,
                      color: statusConfig.color,
                    }}
                  >
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(analysis.id);
                }}
                className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  backgroundColor: ANALYSIS_COLORS.statusErrorBg,
                  color: ANALYSIS_COLORS.statusError,
                }}
                title="삭제"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

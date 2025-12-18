'use client';

import React from 'react';
import type { VideoAnalysisStatus } from '@/types/video';
import { ANALYSIS_COLORS } from './constants';

interface AnalysisStatusBadgeProps {
  status: VideoAnalysisStatus;
}

const STATUS_CONFIG: Record<VideoAnalysisStatus, {
  label: string;
  color: string;
  bgColor: string;
  pulse: boolean;
}> = {
  idle: {
    label: '대기 중',
    color: ANALYSIS_COLORS.statusCancelled,
    bgColor: ANALYSIS_COLORS.statusCancelledBg,
    pulse: false,
  },
  initializing: {
    label: '초기화 중...',
    color: ANALYSIS_COLORS.statusProcessing,
    bgColor: ANALYSIS_COLORS.statusProcessingGlow,
    pulse: true,
  },
  extracting: {
    label: '프레임 추출 중...',
    color: ANALYSIS_COLORS.statusProcessing,
    bgColor: ANALYSIS_COLORS.statusProcessingGlow,
    pulse: false,
  },
  processing: {
    label: '포즈 분석 중...',
    color: ANALYSIS_COLORS.statusProcessing,
    bgColor: ANALYSIS_COLORS.statusProcessingGlow,
    pulse: true,
  },
  completed: {
    label: '분석 완료',
    color: ANALYSIS_COLORS.statusSuccess,
    bgColor: ANALYSIS_COLORS.statusSuccessBg,
    pulse: false,
  },
  cancelled: {
    label: '취소됨',
    color: ANALYSIS_COLORS.statusCancelled,
    bgColor: ANALYSIS_COLORS.statusCancelledBg,
    pulse: false,
  },
  error: {
    label: '오류 발생',
    color: ANALYSIS_COLORS.statusError,
    bgColor: ANALYSIS_COLORS.statusErrorBg,
    pulse: false,
  },
};

export default function AnalysisStatusBadge({ status }: AnalysisStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
        config.pulse ? 'animate-pulse' : ''
      }`}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </div>
  );
}

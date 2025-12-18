'use client';

import React from 'react';
import { ANALYSIS_COLORS } from './constants';

interface Props {
  status: 'error' | 'warning' | 'info';
  error?: string | null;
  message?: string;
}

export default function DetectionStatusBanner({ status, error, message }: Props) {
  const getColors = () => {
    switch (status) {
      case 'error':
        return {
          bg: ANALYSIS_COLORS.statusErrorBg,
          border: ANALYSIS_COLORS.statusError,
          text: ANALYSIS_COLORS.statusError,
        };
      case 'warning':
        return {
          bg: ANALYSIS_COLORS.statusWarningBg,
          border: ANALYSIS_COLORS.statusWarning,
          text: ANALYSIS_COLORS.statusWarning,
        };
      default:
        return {
          bg: ANALYSIS_COLORS.statusProcessingGlow,
          border: ANALYSIS_COLORS.statusProcessing,
          text: ANALYSIS_COLORS.statusProcessing,
        };
    }
  };

  const colors = getColors();
  const displayMessage = error || message || '알 수 없는 오류가 발생했습니다.';

  const getIcon = () => {
    switch (status) {
      case 'error':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3"
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      <span style={{ color: colors.text }}>
        {getIcon()}
      </span>
      <div className="flex-1">
        <p
          className="text-sm font-medium"
          style={{ color: colors.text }}
        >
          {status === 'error' ? '감지 오류' : status === 'warning' ? '경고' : '정보'}
        </p>
        <p
          className="text-sm mt-1"
          style={{ color: ANALYSIS_COLORS.textSecondary }}
        >
          {displayMessage}
        </p>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { ANALYSIS_COLORS } from './constants';
import type { CameraError } from '@/types/video';

interface CameraErrorStateProps {
  error: CameraError;
  onRetry?: () => void;
  className?: string;
}

const ERROR_MESSAGES: Record<CameraError, string> = {
  denied: '카메라 접근 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.',
  in_use: '카메라가 다른 프로그램에서 사용 중입니다.',
  not_supported: '이 브라우저는 영상 녹화를 지원하지 않습니다.',
  quota_exceeded: '저장 공간이 부족합니다.',
  unknown: '카메라를 시작할 수 없습니다. 잠시 후 다시 시도해주세요.',
};

const ERROR_ICONS: Record<CameraError, React.ReactNode> = {
  denied: (
    <svg
      className="w-10 h-10"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      />
    </svg>
  ),
  in_use: (
    <svg
      className="w-10 h-10"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  not_supported: (
    <svg
      className="w-10 h-10"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
  quota_exceeded: (
    <svg
      className="w-10 h-10"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
      />
    </svg>
  ),
  unknown: (
    <svg
      className="w-10 h-10"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

export default function CameraErrorState({
  error,
  onRetry,
  className = '',
}: CameraErrorStateProps) {
  const canRetry = error !== 'denied' && error !== 'not_supported';

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
    >
      {/* Error icon */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{
          backgroundColor: ANALYSIS_COLORS.statusErrorBg,
          color: ANALYSIS_COLORS.statusError,
        }}
      >
        {ERROR_ICONS[error]}
      </div>

      {/* Error title */}
      <h3
        className="text-lg font-semibold mb-2"
        style={{ color: ANALYSIS_COLORS.statusError }}
      >
        카메라 오류
      </h3>

      {/* Error message */}
      <p
        className="text-sm mb-6 max-w-xs"
        style={{ color: ANALYSIS_COLORS.textSecondary }}
      >
        {ERROR_MESSAGES[error]}
      </p>

      {/* Additional help for denied permission */}
      {error === 'denied' && (
        <div
          className="text-xs p-4 rounded-lg mb-6 max-w-xs"
          style={{
            backgroundColor: ANALYSIS_COLORS.surfaceElevated,
            color: ANALYSIS_COLORS.textMuted,
          }}
        >
          <p className="mb-2 font-medium" style={{ color: ANALYSIS_COLORS.textSecondary }}>
            권한 설정 방법:
          </p>
          <ol className="list-decimal list-inside text-left space-y-1">
            <li>브라우저 주소창 왼쪽의 자물쇠 아이콘 클릭</li>
            <li>&quot;카메라&quot; 권한을 &quot;허용&quot;으로 변경</li>
            <li>페이지 새로고침</li>
          </ol>
        </div>
      )}

      {/* Retry button */}
      {canRetry && onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-3 rounded-xl font-medium transition-colors"
          style={{
            backgroundColor: ANALYSIS_COLORS.surfaceElevated,
            color: ANALYSIS_COLORS.textPrimary,
            border: `1px solid ${ANALYSIS_COLORS.border}`,
          }}
        >
          다시 시도
        </button>
      )}
    </div>
  );
}

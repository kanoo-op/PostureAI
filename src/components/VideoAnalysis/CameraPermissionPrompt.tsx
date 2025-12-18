'use client';

import React from 'react';
import { ANALYSIS_COLORS } from './constants';

interface CameraPermissionPromptProps {
  onRequestPermission: () => void;
  isLoading?: boolean;
  className?: string;
}

export default function CameraPermissionPrompt({
  onRequestPermission,
  isLoading = false,
  className = '',
}: CameraPermissionPromptProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
    >
      {/* Camera icon with lock */}
      <div
        className="relative w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ backgroundColor: ANALYSIS_COLORS.surfaceElevated }}
      >
        <svg
          className="w-10 h-10"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: ANALYSIS_COLORS.textSecondary }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        {/* Lock badge */}
        <div
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ backgroundColor: ANALYSIS_COLORS.statusWarning }}
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 24 24"
            style={{ color: '#000000' }}
          >
            <path
              fillRule="evenodd"
              d="M12 1C8.686 1 6 3.686 6 7v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V11a2 2 0 00-2-2h-2V7c0-3.314-2.686-6-6-6zm-4 6c0-2.21 1.79-4 4-4s4 1.79 4 4v2H8V7zm4 6a2 2 0 00-1 3.732V19a1 1 0 102 0v-2.268A2 2 0 0012 13z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h3
        className="text-lg font-semibold mb-2"
        style={{ color: ANALYSIS_COLORS.textPrimary }}
      >
        카메라 접근 권한 필요
      </h3>

      {/* Description */}
      <p
        className="text-sm mb-6 max-w-xs"
        style={{ color: ANALYSIS_COLORS.textSecondary }}
      >
        운동 영상을 녹화하려면 카메라 접근 권한이 필요합니다.
        브라우저의 권한 요청을 허용해주세요.
      </p>

      {/* Permission button */}
      <button
        onClick={onRequestPermission}
        disabled={isLoading}
        className="px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
        style={{
          background: `linear-gradient(135deg, ${ANALYSIS_COLORS.primary}, ${ANALYSIS_COLORS.secondary})`,
          color: ANALYSIS_COLORS.backgroundSolid,
          boxShadow: `0 4px 20px ${ANALYSIS_COLORS.primaryGlow}`,
        }}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            권한 요청 중...
          </span>
        ) : (
          '카메라 권한 요청'
        )}
      </button>
    </div>
  );
}

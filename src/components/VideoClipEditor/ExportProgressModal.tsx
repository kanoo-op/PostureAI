'use client';

import React from 'react';
import { CLIP_EDITOR_COLORS } from './constants';
import type { ClipExportStatus } from '@/types/videoClip';

interface ExportProgressModalProps {
  isOpen: boolean;
  status: ClipExportStatus;
  progress: number;  // 0-100
  message: string;
  errorMessage?: string;
  onCancel: () => void;
  onViewResult: () => void;
  onClose: () => void;
  language: 'ko' | 'en';
}

const TRANSLATIONS = {
  ko: {
    exporting: '클립 내보내기 중...',
    analyzing: '분석 중...',
    completed: '완료!',
    error: '오류 발생',
    cancel: '취소',
    viewResult: '결과 보기',
    close: '닫기',
  },
  en: {
    exporting: 'Exporting clip...',
    analyzing: 'Analyzing...',
    completed: 'Completed!',
    error: 'Error occurred',
    cancel: 'Cancel',
    viewResult: 'View Result',
    close: 'Close',
  },
};

export default function ExportProgressModal({
  isOpen,
  status,
  progress,
  message,
  errorMessage,
  onCancel,
  onViewResult,
  onClose,
  language,
}: ExportProgressModalProps) {
  const t = TRANSLATIONS[language];

  if (!isOpen) return null;

  const getStatusTitle = (): string => {
    switch (status) {
      case 'exporting':
        return t.exporting;
      case 'analyzing':
        return t.analyzing;
      case 'completed':
        return t.completed;
      case 'error':
        return t.error;
      default:
        return '';
    }
  };

  const getStatusColor = (): string => {
    switch (status) {
      case 'completed':
        return CLIP_EDITOR_COLORS.success;
      case 'error':
        return CLIP_EDITOR_COLORS.danger;
      default:
        return CLIP_EDITOR_COLORS.primary;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
    >
      <div
        className="w-full max-w-md mx-4 p-6 rounded-2xl shadow-2xl"
        style={{
          backgroundColor: CLIP_EDITOR_COLORS.backgroundElevated,
          border: `1px solid ${CLIP_EDITOR_COLORS.border}`,
        }}
      >
        {/* Status Icon */}
        <div className="flex justify-center mb-4">
          {status === 'completed' ? (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: `${CLIP_EDITOR_COLORS.success}20`,
                boxShadow: `0 0 20px ${CLIP_EDITOR_COLORS.successGlow}`,
              }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke={CLIP_EDITOR_COLORS.success}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          ) : status === 'error' ? (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: `${CLIP_EDITOR_COLORS.danger}20`,
                boxShadow: `0 0 20px ${CLIP_EDITOR_COLORS.dangerGlow}`,
              }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke={CLIP_EDITOR_COLORS.danger}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse"
              style={{
                backgroundColor: `${CLIP_EDITOR_COLORS.primary}20`,
              }}
            >
              <svg
                className="w-8 h-8 animate-spin"
                fill="none"
                stroke={CLIP_EDITOR_COLORS.primary}
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
            </div>
          )}
        </div>

        {/* Title */}
        <h3
          className="text-lg font-semibold text-center mb-2"
          style={{ color: CLIP_EDITOR_COLORS.textPrimary }}
        >
          {getStatusTitle()}
        </h3>

        {/* Progress Bar */}
        {(status === 'exporting' || status === 'analyzing') && (
          <div className="mb-4">
            <div
              className="w-full h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: CLIP_EDITOR_COLORS.background }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  backgroundColor: getStatusColor(),
                }}
              />
            </div>
            <p
              className="text-sm text-center mt-2"
              style={{ color: CLIP_EDITOR_COLORS.textSecondary }}
            >
              {Math.round(progress)}%
            </p>
          </div>
        )}

        {/* Message */}
        <p
          className="text-sm text-center mb-6"
          style={{ color: CLIP_EDITOR_COLORS.textSecondary }}
        >
          {status === 'error' && errorMessage ? errorMessage : message}
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          {(status === 'exporting' || status === 'analyzing') && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
              style={{
                backgroundColor: CLIP_EDITOR_COLORS.backgroundSurface,
                color: CLIP_EDITOR_COLORS.textSecondary,
                border: `1px solid ${CLIP_EDITOR_COLORS.border}`,
              }}
            >
              {t.cancel}
            </button>
          )}

          {status === 'completed' && (
            <button
              onClick={onViewResult}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
              style={{
                backgroundColor: CLIP_EDITOR_COLORS.success,
                color: CLIP_EDITOR_COLORS.background,
              }}
            >
              {t.viewResult}
            </button>
          )}

          {(status === 'completed' || status === 'error') && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
              style={{
                backgroundColor: CLIP_EDITOR_COLORS.backgroundSurface,
                color: CLIP_EDITOR_COLORS.textSecondary,
                border: `1px solid ${CLIP_EDITOR_COLORS.border}`,
              }}
            >
              {t.close}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

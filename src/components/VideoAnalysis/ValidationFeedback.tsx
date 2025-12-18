'use client';

import React from 'react';
import { VIDEO_COLORS } from './constants';
import type { VideoValidationResult } from '@/types/video';

interface ValidationFeedbackProps {
  result: VideoValidationResult;
  className?: string;
}

export default function ValidationFeedback({ result, className = '' }: ValidationFeedbackProps) {
  if (result.errors.length === 0 && result.warnings.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Errors */}
      {result.errors.map((error, index) => (
        <div
          key={`error-${index}`}
          className="flex items-start gap-2 p-3 rounded-lg"
          style={{ backgroundColor: VIDEO_COLORS.errorBg }}
          role="alert"
        >
          <svg
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            style={{ color: VIDEO_COLORS.error }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span
            className="text-sm"
            style={{ color: VIDEO_COLORS.error }}
          >
            {error.message}
          </span>
        </div>
      ))}

      {/* Warnings */}
      {result.warnings.map((warning, index) => (
        <div
          key={`warning-${index}`}
          className="flex items-start gap-2 p-3 rounded-lg"
          style={{ backgroundColor: VIDEO_COLORS.warningBg }}
          role="alert"
        >
          <svg
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            style={{ color: VIDEO_COLORS.warning }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span
            className="text-sm"
            style={{ color: VIDEO_COLORS.warning }}
          >
            {warning.message}
          </span>
        </div>
      ))}
    </div>
  );
}

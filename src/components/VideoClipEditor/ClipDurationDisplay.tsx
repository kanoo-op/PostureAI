'use client';

import React from 'react';
import { CLIP_EDITOR_COLORS } from './constants';
import { CLIP_CONSTRAINTS } from '@/types/videoClip';

interface ClipDurationDisplayProps {
  startTime: number;   // milliseconds
  endTime: number;     // milliseconds
  isValid: boolean;
  language: 'ko' | 'en';
}

const TRANSLATIONS = {
  ko: {
    duration: '클립 길이',
    start: '시작',
    end: '종료',
    tooShort: '최소 2초 이상',
    tooLong: '최대 5분 이하',
  },
  en: {
    duration: 'Clip Duration',
    start: 'Start',
    end: 'End',
    tooShort: 'Minimum 2 seconds',
    tooLong: 'Maximum 5 minutes',
  },
};

function formatTimecode(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

export default function ClipDurationDisplay({
  startTime,
  endTime,
  isValid,
  language,
}: ClipDurationDisplayProps) {
  const t = TRANSLATIONS[language];
  const durationMs = endTime - startTime;

  const getValidationMessage = (): string | null => {
    if (durationMs < CLIP_CONSTRAINTS.MIN_DURATION_MS) return t.tooShort;
    if (durationMs > CLIP_CONSTRAINTS.MAX_DURATION_MS) return t.tooLong;
    return null;
  };

  const validationMessage = getValidationMessage();

  return (
    <div
      className="flex items-center gap-6 px-4 py-3 rounded-xl"
      style={{
        backgroundColor: CLIP_EDITOR_COLORS.backgroundSurface,
        border: `1px solid ${isValid ? CLIP_EDITOR_COLORS.border : CLIP_EDITOR_COLORS.danger}`,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-xs"
          style={{ color: CLIP_EDITOR_COLORS.textMuted }}
        >
          {t.start}
        </span>
        <span
          className="font-mono text-sm"
          style={{ color: CLIP_EDITOR_COLORS.textPrimary }}
        >
          {formatTimecode(startTime)}
        </span>
      </div>

      <div
        className="flex-1 text-center"
      >
        <span
          className="text-xs block"
          style={{ color: CLIP_EDITOR_COLORS.textMuted }}
        >
          {t.duration}
        </span>
        <span
          className="font-mono text-lg font-semibold"
          style={{ color: isValid ? CLIP_EDITOR_COLORS.primary : CLIP_EDITOR_COLORS.danger }}
        >
          {formatTimecode(durationMs)}
        </span>
        {validationMessage && (
          <span
            className="text-xs block mt-1"
            style={{ color: CLIP_EDITOR_COLORS.danger }}
          >
            {validationMessage}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span
          className="text-xs"
          style={{ color: CLIP_EDITOR_COLORS.textMuted }}
        >
          {t.end}
        </span>
        <span
          className="font-mono text-sm"
          style={{ color: CLIP_EDITOR_COLORS.textPrimary }}
        >
          {formatTimecode(endTime)}
        </span>
      </div>
    </div>
  );
}

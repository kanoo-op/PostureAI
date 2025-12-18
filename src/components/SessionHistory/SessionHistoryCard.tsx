'use client';

import React from 'react';
import { VIDEO_ANALYSIS_COLORS } from '@/components/VideoAnalysisView/constants';
import { SESSION_HISTORY_TRANSLATIONS } from './translations';
import { DateTimeDisplay } from './DateTimeDisplay';
import { formatDuration } from '@/utils/dateFormatter';
import type { VideoSessionRecord } from '@/types/sessionHistory';

interface SessionHistoryCardProps {
  session: VideoSessionRecord;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
  language: 'ko' | 'en';
}

function getScoreColor(score: number): string {
  if (score >= 80) return VIDEO_ANALYSIS_COLORS.statusGood;
  if (score >= 60) return VIDEO_ANALYSIS_COLORS.statusWarning;
  return VIDEO_ANALYSIS_COLORS.statusError;
}

function getScoreBg(score: number): string {
  if (score >= 80) return VIDEO_ANALYSIS_COLORS.statusGoodBg;
  if (score >= 60) return VIDEO_ANALYSIS_COLORS.statusWarningBg;
  return VIDEO_ANALYSIS_COLORS.statusErrorBg;
}

function getConsistencyLabel(
  consistency: number,
  language: 'ko' | 'en'
): string {
  const t = SESSION_HISTORY_TRANSLATIONS[language];
  if (consistency >= 80) return t.high;
  if (consistency >= 50) return t.medium;
  return t.low;
}

export function SessionHistoryCard({
  session,
  isSelected,
  onSelect,
  onDelete,
  onExport,
  language,
}: SessionHistoryCardProps) {
  const t = SESSION_HISTORY_TRANSLATIONS[language];
  const exerciseLabel = t[session.exerciseType] || session.exerciseType;

  return (
    <div
      className="rounded-xl p-4 transition-all"
      style={{
        backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
        border: `${isSelected ? '2px' : '1px'} solid ${isSelected ? VIDEO_ANALYSIS_COLORS.primary : VIDEO_ANALYSIS_COLORS.border}`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Score Badge */}
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: getScoreBg(session.overallScore) }}
          >
            <span
              className="text-lg font-bold"
              style={{ color: getScoreColor(session.overallScore) }}
            >
              {session.overallScore}
            </span>
          </div>

          {/* Exercise Info */}
          <div>
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.primary }}
              />
              <span
                className="font-semibold"
                style={{ color: VIDEO_ANALYSIS_COLORS.textPrimary }}
              >
                {exerciseLabel}
              </span>
            </div>
            <DateTimeDisplay
              timestamp={session.timestamp}
              language={language}
              className="text-sm"
            />
          </div>
        </div>

        {/* Stats */}
        <div
          className="text-right text-sm"
          style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}
        >
          <p>
            {t.reps}: {session.totalReps}
          </p>
          <p>
            {t.duration}: {formatDuration(session.duration)}
          </p>
          <p>
            {t.consistency}: {getConsistencyLabel(session.consistency.overallConsistency, language)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => onSelect(session.id)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: isSelected
              ? VIDEO_ANALYSIS_COLORS.toggleActiveBg
              : VIDEO_ANALYSIS_COLORS.surfaceElevated,
            color: isSelected
              ? VIDEO_ANALYSIS_COLORS.primary
              : VIDEO_ANALYSIS_COLORS.textSecondary,
            border: `1px solid ${isSelected ? VIDEO_ANALYSIS_COLORS.primary : VIDEO_ANALYSIS_COLORS.border}`,
          }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className="w-4 h-4"
            style={{ accentColor: VIDEO_ANALYSIS_COLORS.primary }}
          />
          {t.selectForCompare}
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => onExport(session.id)}
            className="px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: VIDEO_ANALYSIS_COLORS.surfaceElevated,
              color: VIDEO_ANALYSIS_COLORS.textSecondary,
            }}
            title={t.export}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </button>
          <button
            onClick={() => onDelete(session.id)}
            className="px-3 py-2 rounded-lg text-sm transition-colors group"
            style={{
              backgroundColor: VIDEO_ANALYSIS_COLORS.surfaceElevated,
              color: VIDEO_ANALYSIS_COLORS.textMuted,
            }}
            title={t.deleteSession}
          >
            <svg
              className="w-4 h-4 group-hover:text-red-400 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

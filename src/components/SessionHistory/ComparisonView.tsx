'use client';

import React, { useMemo } from 'react';
import { VIDEO_ANALYSIS_COLORS } from '@/components/VideoAnalysisView/constants';
import { SESSION_HISTORY_TRANSLATIONS } from './translations';
import { ComparisonHeader } from './ComparisonHeader';
import { ScoreComparisonCard } from './ScoreComparisonCard';
import { ProgressSummaryCards } from './ProgressSummaryCards';
import { ProgressChartPanel } from './ProgressChartPanel';
import { RepScoreComparisonChart } from './RepScoreComparisonChart';
import { compareSessions } from '@/utils/sessionComparison';
import { formatSessionDate } from '@/utils/dateFormatter';
import type { VideoSessionRecord, ProgressChartData } from '@/types/sessionHistory';

interface ComparisonViewProps {
  sessions: VideoSessionRecord[];
  onClose: () => void;
  language: 'ko' | 'en';
}

export function ComparisonView({
  sessions,
  onClose,
  language,
}: ComparisonViewProps) {
  const t = SESSION_HISTORY_TRANSLATIONS[language];
  const locale = language === 'ko' ? 'ko-KR' : 'en-US';

  // Calculate comparison data
  const comparison = useMemo(() => compareSessions(sessions), [sessions]);

  // Create chart data
  const chartData: ProgressChartData = useMemo(() => {
    const sortedSessions = [...sessions].sort((a, b) => a.timestamp - b.timestamp);
    return {
      labels: sortedSessions.map(s => formatSessionDate(s.timestamp, locale)),
      scores: sortedSessions.map(s => s.overallScore),
      repCounts: sortedSessions.map(s => s.totalReps),
      exerciseType: sortedSessions[0]?.exerciseType || 'squat',
    };
  }, [sessions, locale]);

  return (
    <div
      className="min-h-screen p-4 md:p-6"
      style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.background }}
    >
      <div className="max-w-6xl mx-auto">
        <ComparisonHeader onClose={onClose} language={language} />

        {/* Summary Cards */}
        <ProgressSummaryCards comparison={comparison} language={language} />

        {/* Session Comparison Cards */}
        <div
          className={`grid gap-4 mb-6 ${
            sessions.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
          }`}
        >
          {comparison.sessions.map((session, index) => (
            <ScoreComparisonCard
              key={session.id}
              session={session}
              index={index}
              language={language}
            />
          ))}
        </div>

        {/* Progress Chart */}
        <div className="mb-6">
          <ProgressChartPanel
            data={chartData}
            language={language}
          />
        </div>

        {/* Rep Score Comparison */}
        <div className="mb-6">
          <RepScoreComparisonChart sessions={sessions} language={language} />
        </div>

        {/* Common Issues */}
        {comparison.commonIssues.length > 0 && (
          <div
            className="rounded-xl p-4 mb-6"
            style={{
              backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
              border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
            }}
          >
            <h3
              className="text-lg font-semibold mb-3"
              style={{ color: VIDEO_ANALYSIS_COLORS.textPrimary }}
            >
              {t.commonIssues}
            </h3>
            <ul className="space-y-2">
              {comparison.commonIssues.map((issue, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2"
                  style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-2"
                    style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.statusWarning }}
                  />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Resolved Issues */}
        {comparison.resolvedIssues.length > 0 && (
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
              border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
            }}
          >
            <h3
              className="text-lg font-semibold mb-3"
              style={{ color: VIDEO_ANALYSIS_COLORS.textPrimary }}
            >
              {t.resolvedIssues}
            </h3>
            <ul className="space-y-2">
              {comparison.resolvedIssues.map((issue, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2"
                  style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-2"
                    style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.statusGood }}
                  />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

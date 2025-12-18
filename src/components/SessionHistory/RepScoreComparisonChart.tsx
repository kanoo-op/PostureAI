'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { VIDEO_ANALYSIS_COLORS } from '@/components/VideoAnalysisView/constants';
import { SESSION_HISTORY_TRANSLATIONS, COMPARISON_COLORS } from './translations';
import { normalizeRepScoresForComparison } from '@/utils/sessionComparison';
import type { VideoSessionRecord } from '@/types/sessionHistory';

interface RepScoreComparisonChartProps {
  sessions: VideoSessionRecord[];
  language: 'ko' | 'en';
}

export function RepScoreComparisonChart({
  sessions,
  language,
}: RepScoreComparisonChartProps) {
  const t = SESSION_HISTORY_TRANSLATIONS[language];

  // Normalize rep scores for comparison
  const normalized = normalizeRepScoresForComparison(sessions);

  if (normalized.length === 0 || normalized[0].normalizedScores.length === 0) {
    return (
      <div
        className="rounded-xl p-4 text-center"
        style={{
          backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
          border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
        }}
      >
        <p style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}>
          {language === 'ko' ? '비교할 데이터가 충분하지 않습니다' : 'Not enough data to compare'}
        </p>
      </div>
    );
  }

  // Transform data for chart
  const chartData = normalized[0].normalizedScores.map((_, repIndex) => {
    const repData: Record<string, number | string> = {
      rep: `${language === 'ko' ? '반복' : 'Rep'} ${repIndex + 1}`,
    };

    normalized.forEach((session, sessionIndex) => {
      const sessionLabel = String.fromCharCode(65 + sessionIndex);
      repData[`session${sessionLabel}`] = session.normalizedScores[repIndex];
    });

    return repData;
  });

  const sessionColors = [
    COMPARISON_COLORS.sessionA,
    COMPARISON_COLORS.sessionB,
    COMPARISON_COLORS.sessionC,
  ];

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
        border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
      }}
    >
      <h3
        className="text-lg font-semibold mb-4"
        style={{ color: VIDEO_ANALYSIS_COLORS.textPrimary }}
      >
        {t.repScoreComparison}
      </h3>

      <div className="h-64 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={VIDEO_ANALYSIS_COLORS.border}
              vertical={false}
            />
            <XAxis
              dataKey="rep"
              tick={{ fill: VIDEO_ANALYSIS_COLORS.textSecondary, fontSize: 12 }}
              axisLine={{ stroke: VIDEO_ANALYSIS_COLORS.border }}
              tickLine={{ stroke: VIDEO_ANALYSIS_COLORS.border }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: VIDEO_ANALYSIS_COLORS.textSecondary, fontSize: 12 }}
              axisLine={{ stroke: VIDEO_ANALYSIS_COLORS.border }}
              tickLine={{ stroke: VIDEO_ANALYSIS_COLORS.border }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: VIDEO_ANALYSIS_COLORS.surfaceSolid,
                border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
                borderRadius: '8px',
                color: VIDEO_ANALYSIS_COLORS.textPrimary,
              }}
              labelStyle={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}
            />
            <Legend
              wrapperStyle={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}
            />
            {normalized.map((_, index) => {
              const sessionLabel = String.fromCharCode(65 + index);
              return (
                <Bar
                  key={`session${sessionLabel}`}
                  dataKey={`session${sessionLabel}`}
                  name={`${language === 'ko' ? '세션' : 'Session'} ${sessionLabel}`}
                  fill={sessionColors[index]}
                  radius={[4, 4, 0, 0]}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

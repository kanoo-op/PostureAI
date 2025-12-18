'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { VIDEO_ANALYSIS_COLORS } from '@/components/VideoAnalysisView/constants';
import { SESSION_HISTORY_TRANSLATIONS } from './translations';
import type { ProgressChartData } from '@/types/sessionHistory';

interface ProgressChartPanelProps {
  data: ProgressChartData;
  language: 'ko' | 'en';
}

export function ProgressChartPanel({
  data,
  language,
}: ProgressChartPanelProps) {
  const t = SESSION_HISTORY_TRANSLATIONS[language];

  // Transform data for recharts
  const chartData = data.labels.map((label, index) => ({
    date: label,
    score: data.scores[index],
    reps: data.repCounts[index],
  }));

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
        {t.scoreProgression}
      </h3>

      <div className="h-64 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={VIDEO_ANALYSIS_COLORS.border}
              vertical={false}
            />
            <XAxis
              dataKey="date"
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
              formatter={(value) => [`${value ?? 0}`, t.score]}
            />
            <Legend
              wrapperStyle={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}
            />
            <Line
              type="monotone"
              dataKey="score"
              name={t.score}
              stroke={VIDEO_ANALYSIS_COLORS.primary}
              strokeWidth={3}
              dot={{
                fill: VIDEO_ANALYSIS_COLORS.primary,
                strokeWidth: 2,
                r: 4,
              }}
              activeDot={{
                fill: VIDEO_ANALYSIS_COLORS.primary,
                strokeWidth: 2,
                r: 6,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { VIDEO_ANALYSIS_COLORS, TRANSLATIONS } from './constants';
import FormIssueItem from './FormIssueItem';
import AngleMeasurementCard from './AngleMeasurementCard';
import type { FormFeedbackPanelProps } from './types';
import { useFormFeedback } from './hooks/useFormFeedback';

export default function FormFeedbackPanel({
  currentTimestamp,
  repAnalysisResult,
  currentRepIndex,
  language,
}: FormFeedbackPanelProps) {
  const t = TRANSLATIONS[language];
  const { issues, angleMeasurements } = useFormFeedback(
    currentTimestamp,
    repAnalysisResult,
    currentRepIndex
  );

  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
        border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
      }}
    >
      <h3
        className="text-lg font-semibold mb-4"
        style={{ color: VIDEO_ANALYSIS_COLORS.textPrimary }}
      >
        {t.formFeedback}
      </h3>

      {/* Angle Measurements */}
      {angleMeasurements.length > 0 && (
        <div className="mb-4">
          <h4
            className="text-sm font-medium mb-2"
            style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}
          >
            {t.angleMeasurements}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {angleMeasurements.map((m, i) => (
              <AngleMeasurementCard key={i} {...m} />
            ))}
          </div>
        </div>
      )}

      {/* Issues List */}
      <div>
        <h4
          className="text-sm font-medium mb-2"
          style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}
        >
          {t.issues}
        </h4>

        {issues.length > 0 ? (
          <div className="flex flex-col gap-2">
            {issues.map((issue, i) => (
              <FormIssueItem key={i} issue={issue} />
            ))}
          </div>
        ) : (
          <p
            className="text-sm py-4 text-center"
            style={{ color: VIDEO_ANALYSIS_COLORS.textMuted }}
          >
            {t.noIssues}
          </p>
        )}
      </div>
    </div>
  );
}

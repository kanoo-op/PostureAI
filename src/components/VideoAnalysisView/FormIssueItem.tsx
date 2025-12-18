'use client';

import React from 'react';
import { VIDEO_ANALYSIS_COLORS } from './constants';

interface FormIssueItemProps {
  issue: {
    type: string;
    severity: 'good' | 'warning' | 'error';
    message: string;
  };
}

export default function FormIssueItem({ issue }: FormIssueItemProps) {
  const getBgColor = () => {
    switch (issue.severity) {
      case 'good':
        return VIDEO_ANALYSIS_COLORS.statusGoodBg;
      case 'warning':
        return VIDEO_ANALYSIS_COLORS.statusWarningBg;
      case 'error':
        return VIDEO_ANALYSIS_COLORS.statusErrorBg;
    }
  };

  const getDotColor = () => {
    switch (issue.severity) {
      case 'good':
        return VIDEO_ANALYSIS_COLORS.statusGood;
      case 'warning':
        return VIDEO_ANALYSIS_COLORS.statusWarning;
      case 'error':
        return VIDEO_ANALYSIS_COLORS.statusError;
    }
  };

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg"
      style={{ backgroundColor: getBgColor() }}
    >
      <div
        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
        style={{ backgroundColor: getDotColor() }}
      />
      <p className="text-sm" style={{ color: VIDEO_ANALYSIS_COLORS.textPrimary }}>
        {issue.message}
      </p>
    </div>
  );
}

'use client';

import React from 'react';
import { ANALYSIS_COLORS } from './constants';

interface CancelAnalysisButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function CancelAnalysisButton({
  onClick,
  disabled = false,
}: CancelAnalysisButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80"
      style={{
        backgroundColor: ANALYSIS_COLORS.statusErrorBg,
        color: ANALYSIS_COLORS.statusError,
        border: `1px solid ${ANALYSIS_COLORS.statusError}`,
      }}
    >
      분석 취소
    </button>
  );
}

'use client';

import React from 'react';
import { ANALYSIS_COLORS } from './constants';

interface Props {
  onClick: () => void;
}

export default function ChangeExerciseButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="py-3 px-4 rounded-xl font-medium transition-all hover:scale-[1.02]"
      style={{
        backgroundColor: ANALYSIS_COLORS.surfaceElevated,
        color: ANALYSIS_COLORS.textSecondary,
        border: `1px solid ${ANALYSIS_COLORS.border}`,
      }}
    >
      다른 운동 선택
    </button>
  );
}

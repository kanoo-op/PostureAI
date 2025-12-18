'use client';

import React from 'react';
import { ANALYSIS_COLORS, DETECTION_COLORS } from './constants';

interface Props {
  onClick: () => void;
  isHighConfidence: boolean;
}

export default function ConfirmDetectionButton({ onClick, isHighConfidence }: Props) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-3 px-4 rounded-xl font-semibold transition-all hover:scale-[1.02]"
      style={{
        background: isHighConfidence
          ? `linear-gradient(135deg, ${DETECTION_COLORS.confidenceHigh}, ${ANALYSIS_COLORS.secondary})`
          : `linear-gradient(135deg, ${DETECTION_COLORS.confidenceMedium}, ${DETECTION_COLORS.confidenceMedium}aa)`,
        color: ANALYSIS_COLORS.backgroundSolid,
        boxShadow: isHighConfidence
          ? `0 4px 20px ${DETECTION_COLORS.confidenceHighGlow}`
          : `0 4px 20px ${DETECTION_COLORS.confidenceMediumGlow}`,
      }}
    >
      {isHighConfidence ? '확인 및 분석 시작' : '이 운동으로 분석'}
    </button>
  );
}

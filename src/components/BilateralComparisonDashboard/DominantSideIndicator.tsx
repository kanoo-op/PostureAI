'use client';

import React from 'react';
import { DominantSideIndicatorProps } from './types';
import { BILATERAL_COLORS, SIDE_LABELS } from './constants';

export default function DominantSideIndicator({ side }: DominantSideIndicatorProps) {
  if (side === 'balanced') {
    return (
      <span className="text-xs" style={{ color: BILATERAL_COLORS.status.good }}>
        ✓ {SIDE_LABELS.balanced.ko}
      </span>
    );
  }

  const sideColor = side === 'left' ? BILATERAL_COLORS.leftSide : BILATERAL_COLORS.rightSide;
  const sideLabel = SIDE_LABELS[side];

  return (
    <span className="text-xs" style={{ color: sideColor }}>
      {sideLabel.ko}측 제한 / {sideLabel.en} limitation
    </span>
  );
}

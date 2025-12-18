'use client';

import React from 'react';
import { BILATERAL_COLORS } from './constants';

export default function EmptyState() {
  return (
    <div className="text-center py-8 px-4">
      <div className="flex justify-center gap-2 mb-3">
        <span
          className="w-3 h-3 rounded-full animate-pulse"
          style={{ backgroundColor: BILATERAL_COLORS.leftSide }}
        />
        <span
          className="w-3 h-3 rounded-full animate-pulse"
          style={{ backgroundColor: BILATERAL_COLORS.rightSide, animationDelay: '0.2s' }}
        />
      </div>
      <p className="text-sm" style={{ color: BILATERAL_COLORS.textSecondary }}>
        포즈를 감지하면 양측 비교가 표시됩니다
      </p>
      <p className="text-xs mt-1" style={{ color: BILATERAL_COLORS.textMuted }}>
        Bilateral comparison will appear when pose is detected
      </p>
    </div>
  );
}

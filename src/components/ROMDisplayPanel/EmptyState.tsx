'use client';

import React from 'react';
import { ROM_COLORS, ROM_LABELS } from './constants';
import { EmptyStateProps } from './types';

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="text-center py-8 px-4">
      <div className="flex justify-center gap-2 mb-3">
        <span
          className="w-3 h-3 rounded-full animate-pulse"
          style={{ backgroundColor: ROM_COLORS.status.good }}
        />
        <span
          className="w-3 h-3 rounded-full animate-pulse"
          style={{ backgroundColor: ROM_COLORS.status.warning, animationDelay: '0.2s' }}
        />
        <span
          className="w-3 h-3 rounded-full animate-pulse"
          style={{ backgroundColor: ROM_COLORS.status.hypermobile, animationDelay: '0.4s' }}
        />
      </div>
      <p className="text-sm" style={{ color: ROM_COLORS.textSecondary }}>
        {message || ROM_LABELS.noData.ko}
      </p>
      <p className="text-xs mt-1" style={{ color: ROM_COLORS.textMuted }}>
        {ROM_LABELS.noData.en}
      </p>
    </div>
  );
}

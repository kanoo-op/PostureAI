// src/components/AngleDashboard/DashboardToggle.tsx

'use client';

import React from 'react';
import { DashboardToggleProps } from './types';
import { DASHBOARD_COLORS } from './constants';

export default function DashboardToggle({
  isVisible,
  onToggle,
  className = '',
}: DashboardToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-xl
        text-xs font-medium uppercase tracking-wider
        border transition-all duration-200
        ${isVisible
          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
          : 'bg-gray-800/60 border-gray-700/50 text-gray-400 hover:bg-gray-700/60'
        }
        ${className}
      `}
      style={{
        boxShadow: isVisible ? `0 0 12px ${DASHBOARD_COLORS.status.goodGlow}` : 'none',
      }}
      aria-label={isVisible ? 'Hide angle dashboard' : 'Show angle dashboard'}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <span>{isVisible ? '각도 숨기기' : '각도 보기'}</span>
    </button>
  );
}

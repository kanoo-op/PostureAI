'use client';

import React from 'react';
import { PREDICTION_COLORS } from './constants';

interface PredictionToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
  className?: string;
}

export default function PredictionToggle({
  isEnabled,
  onToggle,
  className = '',
}: PredictionToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-xl
        text-xs font-medium uppercase tracking-wider
        border transition-all duration-200
        ${isEnabled
          ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
          : 'bg-gray-800/60 border-gray-700/50 text-gray-400 hover:bg-gray-700/60'
        }
        ${className}
      `}
      style={{
        boxShadow: isEnabled ? `0 0 12px ${PREDICTION_COLORS.glow}` : 'none',
      }}
      aria-label={isEnabled ? 'Disable prediction' : 'Enable prediction'}
    >
      {/* Prediction icon */}
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
      <span>{isEnabled ? '\uC608\uCE21 \uB044\uAE30' : '\uC608\uCE21 \uCF1C\uAE30'}</span>
    </button>
  );
}

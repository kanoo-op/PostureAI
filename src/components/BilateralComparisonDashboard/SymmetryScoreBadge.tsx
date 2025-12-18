'use client';

import React from 'react';
import { SymmetryScoreBadgeProps } from './types';
import { BILATERAL_COLORS } from './constants';

export default function SymmetryScoreBadge({ score, level, size = 'md' }: SymmetryScoreBadgeProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
  };

  const statusColors = BILATERAL_COLORS.status;
  const bgColor = statusColors[`${level}Bg` as keyof typeof statusColors];
  const borderColor = statusColors[level];
  const glowColor = statusColors[`${level}Glow` as keyof typeof statusColors];

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-mono font-bold border-2`}
      style={{
        backgroundColor: bgColor as string,
        borderColor: borderColor as string,
        color: borderColor as string,
        boxShadow: `0 0 12px ${glowColor}`,
      }}
    >
      {score}
    </div>
  );
}

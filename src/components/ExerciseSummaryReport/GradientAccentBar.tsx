'use client';

import React from 'react';
import { SUMMARY_COLORS } from './constants';

export default function GradientAccentBar() {
  return (
    <div
      className="h-1"
      style={{
        background: `linear-gradient(90deg, ${SUMMARY_COLORS.status.error}, ${SUMMARY_COLORS.status.warning}, ${SUMMARY_COLORS.status.good})`,
      }}
    />
  );
}

'use client';

import React from 'react';
import { ROM_COLORS } from './constants';

export default function GradientAccentBar() {
  return (
    <div
      className="h-1"
      style={{
        background: `linear-gradient(90deg, ${ROM_COLORS.status.warning}, ${ROM_COLORS.status.good}, ${ROM_COLORS.status.hypermobile})`,
      }}
    />
  );
}

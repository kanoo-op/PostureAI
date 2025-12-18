'use client';

import React from 'react';
import { CLIP_EDITOR_COLORS } from './constants';

interface TrimRegionOverlayProps {
  startPercent: number;
  endPercent: number;
}

export default function TrimRegionOverlay({
  startPercent,
  endPercent,
}: TrimRegionOverlayProps) {
  return (
    <>
      {/* Excluded region - before start */}
      <div
        className="absolute top-0 left-0 h-full z-10 pointer-events-none"
        style={{
          width: `${startPercent}%`,
          backgroundColor: CLIP_EDITOR_COLORS.trimExcluded,
        }}
      />

      {/* Selected region */}
      <div
        className="absolute top-0 h-full z-10 pointer-events-none"
        style={{
          left: `${startPercent}%`,
          width: `${endPercent - startPercent}%`,
          backgroundColor: CLIP_EDITOR_COLORS.trimRegion,
          borderLeft: `2px solid ${CLIP_EDITOR_COLORS.trimHandle}`,
          borderRight: `2px solid ${CLIP_EDITOR_COLORS.trimHandle}`,
        }}
      />

      {/* Excluded region - after end */}
      <div
        className="absolute top-0 h-full z-10 pointer-events-none"
        style={{
          left: `${endPercent}%`,
          width: `${100 - endPercent}%`,
          backgroundColor: CLIP_EDITOR_COLORS.trimExcluded,
        }}
      />
    </>
  );
}

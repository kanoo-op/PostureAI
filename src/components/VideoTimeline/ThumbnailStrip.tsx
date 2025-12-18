'use client';

import React, { useMemo } from 'react';
import { TIMELINE_COLORS } from './constants';
import type { ThumbnailStripProps } from './types';
import ThumbnailSkeleton from './ThumbnailSkeleton';

export default function ThumbnailStrip({
  thumbnails,
  visibleRange,
  duration,
  isLoading = false,
  className = '',
}: ThumbnailStripProps) {
  // Filter thumbnails to only those in visible range for performance
  const visibleThumbnails = useMemo(() => {
    const startSec = visibleRange.start / 1000;
    const endSec = visibleRange.end / 1000;

    return thumbnails.filter(
      t => t.timestamp >= startSec - 1 && t.timestamp <= endSec + 1
    );
  }, [thumbnails, visibleRange]);

  // Calculate position for each thumbnail
  const getPositionPercent = (timestamp: number): number => {
    const { start, end } = visibleRange;
    const range = end - start;
    if (range === 0) return 0;
    return ((timestamp * 1000 - start) / range) * 100;
  };

  if (isLoading) {
    return <ThumbnailSkeleton className={className} />;
  }

  if (thumbnails.length === 0) {
    return null;
  }

  return (
    <div
      className={`absolute inset-0 flex overflow-hidden rounded-lg pointer-events-none ${className}`}
      style={{ backgroundColor: TIMELINE_COLORS.thumbnailBackground }}
      aria-hidden="true"
    >
      {visibleThumbnails.map((thumbnail, index) => {
        const position = getPositionPercent(thumbnail.timestamp);
        const isInView = position >= -10 && position <= 110;

        if (!isInView) return null;

        return (
          <div
            key={`thumb-${thumbnail.timestamp}-${index}`}
            className="absolute h-full"
            style={{
              left: `${position}%`,
              transform: 'translateX(-50%)',
              width: `${thumbnail.width}px`,
              maxWidth: '15%',
            }}
          >
            <img
              src={thumbnail.dataUrl}
              alt=""
              className="h-full w-full object-cover"
              style={{
                borderLeft: `1px solid ${TIMELINE_COLORS.thumbnailBorder}`,
                borderRight: `1px solid ${TIMELINE_COLORS.thumbnailBorder}`,
                opacity: 0.7,
              }}
              loading="lazy"
            />
          </div>
        );
      })}
    </div>
  );
}

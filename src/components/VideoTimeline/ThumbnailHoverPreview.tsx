'use client';

import React from 'react';
import { TIMELINE_COLORS } from './constants';
import type { ThumbnailHoverPreviewProps } from './types';

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function ThumbnailHoverPreview({
  thumbnail,
  position,
  visible,
}: ThumbnailHoverPreviewProps) {
  if (!visible || !thumbnail) return null;

  const previewWidth = 180;
  const previewHeight = 102; // 16:9 aspect ratio

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: position.x,
        top: position.y - 20,
        transform: 'translate(-50%, -100%)',
      }}
    >
      {/* Thumbnail image */}
      <div
        className="rounded-lg overflow-hidden shadow-2xl"
        style={{
          width: previewWidth,
          height: previewHeight,
          border: `2px solid ${TIMELINE_COLORS.thumbnailHoverBorder}`,
          backgroundColor: TIMELINE_COLORS.backgroundElevated,
        }}
      >
        <img
          src={thumbnail.dataUrl}
          alt={`Frame at ${formatTimestamp(thumbnail.timestamp)}`}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Timestamp label */}
      <div
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs font-medium"
        style={{
          backgroundColor: TIMELINE_COLORS.backgroundElevated,
          color: TIMELINE_COLORS.textPrimary,
          border: `1px solid ${TIMELINE_COLORS.surface}`,
        }}
      >
        {formatTimestamp(thumbnail.timestamp)}
      </div>

      {/* Arrow pointer */}
      <div
        className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-full"
        style={{
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: `8px solid ${TIMELINE_COLORS.thumbnailHoverBorder}`,
        }}
      />
    </div>
  );
}

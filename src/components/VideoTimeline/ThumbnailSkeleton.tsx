'use client';

import React from 'react';
import { TIMELINE_COLORS } from './constants';

interface ThumbnailSkeletonProps {
  className?: string;
}

export default function ThumbnailSkeleton({ className = '' }: ThumbnailSkeletonProps) {
  return (
    <div
      className={`absolute inset-0 rounded-lg overflow-hidden ${className}`}
      style={{ backgroundColor: TIMELINE_COLORS.thumbnailBackground }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            90deg,
            ${TIMELINE_COLORS.thumbnailLoadingShimmerStart} 0%,
            ${TIMELINE_COLORS.thumbnailLoadingShimmerEnd} 50%,
            ${TIMELINE_COLORS.thumbnailLoadingShimmerStart} 100%
          )`,
          backgroundSize: '200% 100%',
          animation: 'thumbnail-shimmer 1.5s ease-in-out infinite',
        }}
      />
      {/* Skeleton thumbnail placeholders */}
      <div className="absolute inset-0 flex justify-around items-center px-2">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-8 w-12 rounded"
            style={{ backgroundColor: TIMELINE_COLORS.surface, opacity: 0.5 }}
          />
        ))}
      </div>
      {/* Add shimmer keyframes via style tag */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes thumbnail-shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `
      }} />
    </div>
  );
}

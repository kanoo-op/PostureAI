'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { ThumbnailCache } from '@/utils/thumbnailCache';
import type { ThumbnailData } from '@/types/video';

interface UseThumbnailCacheOptions {
  thumbnails: ThumbnailData[];
  visibleRange: { start: number; end: number };
  hoveredTimestamp: number | null;
}

export function useThumbnailCache({
  thumbnails,
  visibleRange,
  hoveredTimestamp,
}: UseThumbnailCacheOptions) {
  const cacheRef = useRef<ThumbnailCache>(new ThumbnailCache());
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize cache when thumbnails change
  useEffect(() => {
    const cache = cacheRef.current;
    if (thumbnails.length > 0) {
      cache.initialize(thumbnails);
      setIsInitialized(true);
    }

    return () => {
      cache.clear();
    };
  }, [thumbnails]);

  // Get thumbnails in visible range
  const visibleThumbnails = useMemo(() => {
    if (!isInitialized) return [];
    const startSec = visibleRange.start / 1000;
    const endSec = visibleRange.end / 1000;
    return cacheRef.current.getThumbnailsInRange(startSec, endSec);
  }, [isInitialized, visibleRange]);

  // Get thumbnail at hovered position
  const hoveredThumbnail = useMemo(() => {
    if (!isInitialized || hoveredTimestamp === null) return null;
    return cacheRef.current.getNearestThumbnail(hoveredTimestamp / 1000);
  }, [isInitialized, hoveredTimestamp]);

  return {
    isInitialized,
    visibleThumbnails,
    hoveredThumbnail,
    thumbnailCount: cacheRef.current.count,
  };
}

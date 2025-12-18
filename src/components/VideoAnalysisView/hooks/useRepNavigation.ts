'use client';

import { useState, useCallback, useMemo } from 'react';
import type { VideoRepAnalysisResult } from '@/types/video';

export function useRepNavigation(
  repAnalysisResult: VideoRepAnalysisResult | null,
  currentTime: number,
  onSeek: (time: number) => void
) {
  const [selectedRepIndex, setSelectedRepIndex] = useState<number | null>(null);

  // Find which rep is currently playing based on timestamp
  const currentRepIndex = useMemo(() => {
    if (!repAnalysisResult?.reps?.length) return null;

    const currentMs = currentTime * 1000;
    const index = repAnalysisResult.reps.findIndex(
      (rep) => currentMs >= rep.startTimestamp && currentMs <= rep.endTimestamp
    );

    return index >= 0 ? index : null;
  }, [repAnalysisResult, currentTime]);

  // Select a rep and seek to its start
  const selectRep = useCallback(
    (index: number) => {
      if (!repAnalysisResult?.reps?.[index]) return;

      setSelectedRepIndex(index);
      const rep = repAnalysisResult.reps[index];
      onSeek(rep.startTimestamp / 1000); // Convert ms to seconds
    },
    [repAnalysisResult, onSeek]
  );

  return {
    selectedRepIndex,
    currentRepIndex,
    selectRep,
  };
}

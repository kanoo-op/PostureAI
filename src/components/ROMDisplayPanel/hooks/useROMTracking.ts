// src/components/ROMDisplayPanel/hooks/useROMTracking.ts

import { useState, useEffect, useRef } from 'react';
import { Keypoint } from '@tensorflow-models/pose-detection';
import {
  JointROMTracker,
  JointROMResult,
  SessionROMSummary,
} from '@/utils/jointROMAnalyzer';
import { CurrentJointStats } from '../types';

interface UseROMTrackingOptions {
  romTracker: JointROMTracker;
  keypoints: Keypoint[];
  isTracking: boolean;
}

interface UseROMTrackingResult {
  currentStats: CurrentJointStats[];
  sessionSummary: SessionROMSummary | null;
  jointResults: JointROMResult[];
  sessionDuration: number;  // In seconds
}

export function useROMTracking({
  romTracker,
  keypoints,
  isTracking,
}: UseROMTrackingOptions): UseROMTrackingResult {
  const [currentStats, setCurrentStats] = useState<CurrentJointStats[]>([]);
  const [sessionSummary, setSessionSummary] = useState<SessionROMSummary | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

  // Update session duration every second
  useEffect(() => {
    if (!isTracking) return;

    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      setSessionDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking]);

  // Record angles when keypoints change
  useEffect(() => {
    if (!isTracking || !keypoints || keypoints.length === 0) return;

    // Get current stats for live display
    const stats = romTracker.getCurrentStats();
    setCurrentStats(stats);

    // Get session summary for joint results
    const summary = romTracker.getSessionSummary();
    setSessionSummary(summary);
  }, [keypoints, isTracking, romTracker]);

  const jointResults = sessionSummary?.joints ?? [];

  return {
    currentStats,
    sessionSummary,
    jointResults,
    sessionDuration,
  };
}

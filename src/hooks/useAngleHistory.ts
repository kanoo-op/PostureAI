'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ExerciseType,
  JointAngleType,
  SessionRecord,
  TrendAnalysis,
  StorageStatus
} from '@/types/angleHistory';
import {
  AngleHistoryTracker,
  createAngleTracker
} from '@/utils/angleHistoryTracker';
import {
  getSessions,
  deleteSession,
  getStorageStatus,
  exportData,
  clearExerciseHistory
} from '@/utils/angleHistoryStorage';
import {
  analyzeTrends,
  hasEnoughDataForTrends,
  getComparisonData
} from '@/utils/angleHistoryAnalyzer';

interface UseAngleHistoryOptions {
  exerciseType: ExerciseType;
  autoAnalyze?: boolean;
}

interface UseAngleHistoryReturn {
  // Recording
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: (notes?: string) => SessionRecord | null;
  cancelRecording: () => void;
  recordAngle: (jointType: JointAngleType, angle: number) => void;
  recordAngles: (angles: Partial<Record<JointAngleType, number>>) => void;
  recordRep: () => void;
  recordScore: (score: number) => void;
  currentStats: {
    duration: number;
    repCount: number;
    averageScore: number;
  };

  // History
  sessions: SessionRecord[];
  refreshSessions: () => void;
  deleteSessionById: (id: string) => boolean;
  clearHistory: () => boolean;

  // Trends
  trendAnalysis: TrendAnalysis | null;
  hasEnoughData: boolean;
  refreshTrends: () => void;

  // Storage
  storageStatus: StorageStatus;
  exportHistory: () => string;

  // Chart data
  getChartData: (jointType: JointAngleType, days?: number) => Array<{
    date: number;
    average: number;
    min: number;
    max: number;
  }>;
}

const defaultStorageStatus: StorageStatus = {
  usedBytes: 0,
  totalBytes: 5 * 1024 * 1024,
  sessionCount: 0,
  oldestSession: null,
  newestSession: null
};

export function useAngleHistory(
  options: UseAngleHistoryOptions
): UseAngleHistoryReturn {
  const { exerciseType, autoAnalyze = true } = options;

  // Tracker instance
  const trackerRef = useRef<AngleHistoryTracker | null>(null);

  // State
  const [isRecording, setIsRecording] = useState(false);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis | null>(null);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>(defaultStorageStatus);
  const [currentStats, setCurrentStats] = useState({
    duration: 0,
    repCount: 0,
    averageScore: 0
  });
  const [hasEnoughData, setHasEnoughData] = useState(false);

  // Initialize tracker
  useEffect(() => {
    trackerRef.current = createAngleTracker(exerciseType);
  }, [exerciseType]);

  // Refresh sessions function
  const refreshSessions = useCallback(() => {
    const loaded = getSessions(exerciseType);
    setSessions(loaded);
  }, [exerciseType]);

  // Refresh trends function
  const refreshTrends = useCallback(() => {
    const analysis = analyzeTrends(exerciseType);
    setTrendAnalysis(analysis);
    setHasEnoughData(hasEnoughDataForTrends(exerciseType));
  }, [exerciseType]);

  // Load initial data
  useEffect(() => {
    refreshSessions();
    setStorageStatus(getStorageStatus());
    setHasEnoughData(hasEnoughDataForTrends(exerciseType));
    if (autoAnalyze) {
      refreshTrends();
    }
  }, [exerciseType, autoAnalyze, refreshSessions, refreshTrends]);

  // Update stats during recording
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      if (trackerRef.current) {
        const stats = trackerRef.current.getCurrentStats();
        setCurrentStats({
          duration: stats.duration,
          repCount: stats.repCount,
          averageScore: stats.averageScore
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  // Recording functions
  const startRecording = useCallback(() => {
    if (trackerRef.current) {
      trackerRef.current.startSession();
      setIsRecording(true);
    }
  }, []);

  const stopRecording = useCallback((notes?: string): SessionRecord | null => {
    if (!trackerRef.current) return null;

    const session = trackerRef.current.endSession({ notes });
    setIsRecording(false);

    if (session) {
      refreshSessions();
      setStorageStatus(getStorageStatus());
      setHasEnoughData(hasEnoughDataForTrends(exerciseType));
      if (autoAnalyze) {
        refreshTrends();
      }
    }

    return session;
  }, [autoAnalyze, exerciseType, refreshSessions, refreshTrends]);

  const cancelRecording = useCallback(() => {
    if (trackerRef.current) {
      trackerRef.current.cancelSession();
      setIsRecording(false);
    }
  }, []);

  const recordAngle = useCallback((jointType: JointAngleType, angle: number) => {
    if (trackerRef.current) {
      trackerRef.current.recordAngle(jointType, angle);
    }
  }, []);

  const recordAngles = useCallback((angles: Partial<Record<JointAngleType, number>>) => {
    if (trackerRef.current) {
      trackerRef.current.recordAngles(angles);
    }
  }, []);

  const recordRep = useCallback(() => {
    if (trackerRef.current) {
      trackerRef.current.recordRep();
    }
  }, []);

  const recordScore = useCallback((score: number) => {
    if (trackerRef.current) {
      trackerRef.current.recordScore(score);
    }
  }, []);

  // History functions
  const deleteSessionById = useCallback((id: string): boolean => {
    const success = deleteSession(id);
    if (success) {
      refreshSessions();
      setStorageStatus(getStorageStatus());
      setHasEnoughData(hasEnoughDataForTrends(exerciseType));
    }
    return success;
  }, [exerciseType, refreshSessions]);

  const clearHistory = useCallback((): boolean => {
    const success = clearExerciseHistory(exerciseType);
    if (success) {
      setSessions([]);
      setTrendAnalysis(null);
      setStorageStatus(getStorageStatus());
      setHasEnoughData(false);
    }
    return success;
  }, [exerciseType]);

  // Export
  const exportHistory = useCallback((): string => {
    return exportData();
  }, []);

  // Chart data
  const getChartData = useCallback(
    (jointType: JointAngleType, days: number = 30) => {
      return getComparisonData(exerciseType, jointType, days);
    },
    [exerciseType]
  );

  return {
    isRecording,
    startRecording,
    stopRecording,
    cancelRecording,
    recordAngle,
    recordAngles,
    recordRep,
    recordScore,
    currentStats,
    sessions,
    refreshSessions,
    deleteSessionById,
    clearHistory,
    trendAnalysis,
    hasEnoughData,
    refreshTrends,
    storageStatus,
    exportHistory,
    getChartData
  };
}

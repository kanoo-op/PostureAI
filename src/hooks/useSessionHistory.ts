import { useState, useEffect, useCallback } from 'react';
import { sessionStorageService } from '@/services/sessionStorageService';
import type { VideoSessionRecord } from '@/types/sessionHistory';
import type { VideoExerciseType } from '@/types/video';

const PAGE_SIZE = 10;

export function useSessionHistory(exerciseFilter?: VideoExerciseType) {
  const [sessions, setSessions] = useState<VideoSessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadSessions = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    try {
      const allSessions = exerciseFilter
        ? await sessionStorageService.getSessionsByExercise(exerciseFilter)
        : await sessionStorageService.getAllSessions();

      // Sort by timestamp descending (newest first)
      const sorted = allSessions.sort((a, b) => b.timestamp - a.timestamp);

      // Paginate
      const start = 0;
      const end = (pageNum + 1) * PAGE_SIZE;
      const paginated = sorted.slice(start, end);

      setSessions(paginated);
      setHasMore(end < sorted.length);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [exerciseFilter]);

  useEffect(() => {
    loadSessions(0);
  }, [loadSessions]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadSessions(nextPage);
  }, [page, loadSessions]);

  const deleteSession = useCallback(async (id: string) => {
    try {
      await sessionStorageService.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }, []);

  return {
    sessions,
    isLoading,
    loadMore,
    hasMore,
    deleteSession,
    refresh: () => {
      setPage(0);
      loadSessions(0);
    },
  };
}

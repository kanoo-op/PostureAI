'use client';

import React, { useState, useMemo } from 'react';
import { VIDEO_ANALYSIS_COLORS } from '@/components/VideoAnalysisView/constants';
import { SESSION_HISTORY_TRANSLATIONS } from './translations';
import { SessionHistoryCard } from './SessionHistoryCard';
import { SessionLoadingSkeleton } from './SessionLoadingSkeleton';
import { SessionDeleteConfirmation } from './SessionDeleteConfirmation';
import { ExerciseTypeFilter } from './ExerciseTypeFilter';
import { SessionExportButton } from './SessionExportButton';
import { StorageStatusIndicator } from './StorageStatusIndicator';
import type { VideoSessionRecord } from '@/types/sessionHistory';
import type { VideoExerciseType } from '@/types/video';

interface SessionHistoryListProps {
  sessions: VideoSessionRecord[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onDeleteSession: (id: string) => void;
  onCompare: (ids: string[]) => void;
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  language: 'ko' | 'en';
}

type SortOption = 'newest' | 'oldest' | 'highScore' | 'lowScore';

export function SessionHistoryList({
  sessions,
  selectedIds,
  onSelectionChange,
  onDeleteSession,
  onCompare,
  isLoading,
  hasMore,
  onLoadMore,
  language,
}: SessionHistoryListProps) {
  const t = SESSION_HISTORY_TRANSLATIONS[language];
  const [filter, setFilter] = useState<VideoExerciseType | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    sessionId: string | null;
    timestamp: number;
  }>({
    isOpen: false,
    sessionId: null,
    timestamp: 0,
  });

  // Filter and sort sessions
  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    // Apply filter
    if (filter !== 'all') {
      result = result.filter((s) => s.exerciseType === filter);
    }

    // Apply sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'oldest':
        result.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'highScore':
        result.sort((a, b) => b.overallScore - a.overallScore);
        break;
      case 'lowScore':
        result.sort((a, b) => a.overallScore - b.overallScore);
        break;
    }

    return result;
  }, [sessions, filter, sortBy]);

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else if (selectedIds.length < 3) {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleDeleteClick = (id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (session) {
      setDeleteConfirm({
        isOpen: true,
        sessionId: id,
        timestamp: session.timestamp,
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.sessionId) {
      onDeleteSession(deleteConfirm.sessionId);
      // Remove from selection if selected
      if (selectedIds.includes(deleteConfirm.sessionId)) {
        onSelectionChange(selectedIds.filter((id) => id !== deleteConfirm.sessionId));
      }
    }
    setDeleteConfirm({ isOpen: false, sessionId: null, timestamp: 0 });
  };

  const handleExport = async (id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (session) {
      const json = JSON.stringify(session, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${session.exerciseType}-${new Date(session.timestamp).toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl font-bold"
          style={{ color: VIDEO_ANALYSIS_COLORS.textPrimary }}
        >
          {t.sessionHistory}
        </h1>
        <div className="flex items-center gap-4">
          <StorageStatusIndicator language={language} />
          <SessionExportButton language={language} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <ExerciseTypeFilter value={filter} onChange={setFilter} language={language} />

        <div className="flex items-center gap-2">
          <label
            className="text-sm"
            style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}
          >
            Sort:
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
              color: VIDEO_ANALYSIS_COLORS.textPrimary,
              border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
            }}
          >
            <option value="newest">{t.sortNewest}</option>
            <option value="oldest">{t.sortOldest}</option>
            <option value="highScore">{t.sortHighScore}</option>
            <option value="lowScore">{t.sortLowScore}</option>
          </select>
        </div>
      </div>

      {/* Selection Status */}
      {selectedIds.length > 0 && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-lg"
          style={{
            backgroundColor: VIDEO_ANALYSIS_COLORS.toggleActiveBg,
            border: `1px solid ${VIDEO_ANALYSIS_COLORS.primary}`,
          }}
        >
          <span style={{ color: VIDEO_ANALYSIS_COLORS.primary }}>
            {selectedIds.length}/3 {t.selected}
          </span>
          {selectedIds.length >= 2 && (
            <button
              onClick={() => onCompare(selectedIds)}
              className="px-4 py-2 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: VIDEO_ANALYSIS_COLORS.primary,
                color: VIDEO_ANALYSIS_COLORS.background,
              }}
            >
              {t.compareSelected} ({selectedIds.length})
            </button>
          )}
        </div>
      )}

      {/* Session List */}
      {isLoading && sessions.length === 0 ? (
        <SessionLoadingSkeleton count={3} />
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <SessionHistoryCard
              key={session.id}
              session={session}
              isSelected={selectedIds.includes(session.id)}
              onSelect={handleSelect}
              onDelete={handleDeleteClick}
              onExport={handleExport}
              language={language}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="px-6 py-2 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
              color: VIDEO_ANALYSIS_COLORS.textSecondary,
              border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            {isLoading ? '...' : t.loadMore}
          </button>
        </div>
      )}

      {/* Max Selection Warning */}
      {selectedIds.length >= 3 && (
        <p
          className="text-center text-sm"
          style={{ color: VIDEO_ANALYSIS_COLORS.statusWarning }}
        >
          {t.maxSelectionReached}
        </p>
      )}

      {/* Delete Confirmation */}
      <SessionDeleteConfirmation
        isOpen={deleteConfirm.isOpen}
        sessionDate={deleteConfirm.timestamp}
        onConfirm={handleDeleteConfirm}
        onCancel={() =>
          setDeleteConfirm({ isOpen: false, sessionId: null, timestamp: 0 })
        }
        language={language}
      />
    </div>
  );
}

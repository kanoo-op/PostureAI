'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { SessionHistoryList } from '@/components/SessionHistory/SessionHistoryList';
import { EmptyHistoryState } from '@/components/SessionHistory/EmptyHistoryState';
import { SessionLoadingSkeleton } from '@/components/SessionHistory/SessionLoadingSkeleton';
import { useSessionHistory } from '@/hooks/useSessionHistory';
import { VIDEO_ANALYSIS_COLORS } from '@/components/VideoAnalysisView/constants';

export default function HistoryPage() {
  const router = useRouter();
  const { sessions, isLoading, loadMore, hasMore, deleteSession } = useSessionHistory();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [language, setLanguage] = useState<'ko' | 'en'>('ko');

  useEffect(() => {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('en')) {
      setLanguage('en');
    }
  }, []);

  const handleCompare = (ids: string[]) => {
    router.push(`/session-comparison?sessions=${ids.join(',')}`);
  };

  const handleStartAnalysis = () => {
    router.push('/');
  };

  if (isLoading && sessions.length === 0) {
    return (
      <div
        className="min-h-screen p-4 md:p-6"
        style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.background }}
      >
        <div className="max-w-4xl mx-auto">
          <h1
            className="text-2xl font-bold mb-6"
            style={{ color: VIDEO_ANALYSIS_COLORS.textPrimary }}
          >
            {language === 'ko' ? '세션 기록' : 'Session History'}
          </h1>
          <SessionLoadingSkeleton count={3} />
        </div>
      </div>
    );
  }

  if (!isLoading && sessions.length === 0) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.background }}
      >
        <EmptyHistoryState
          onStartAnalysis={handleStartAnalysis}
          language={language}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-4 md:p-6"
      style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.background }}
    >
      <div className="max-w-4xl mx-auto">
        <SessionHistoryList
          sessions={sessions}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onDeleteSession={deleteSession}
          onCompare={handleCompare}
          isLoading={isLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          language={language}
        />
      </div>
    </div>
  );
}

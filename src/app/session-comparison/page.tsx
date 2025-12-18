'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { ComparisonView } from '@/components/SessionHistory';
import { sessionStorageService } from '@/services/sessionStorageService';
import { VIDEO_ANALYSIS_COLORS } from '@/components/VideoAnalysisView/constants';
import type { VideoSessionRecord } from '@/types/sessionHistory';

function SessionComparisonContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIds = searchParams.get('sessions')?.split(',') || [];

  const [sessions, setSessions] = useState<VideoSessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'ko' | 'en'>('ko');

  useEffect(() => {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('en')) {
      setLanguage('en');
    }
  }, []);

  useEffect(() => {
    async function loadSessions() {
      if (sessionIds.length < 2) {
        setError(
          language === 'ko'
            ? '비교하려면 최소 2개의 세션이 필요합니다'
            : 'At least 2 sessions required for comparison'
        );
        setIsLoading(false);
        return;
      }

      try {
        const loaded = await Promise.all(
          sessionIds.map((id) => sessionStorageService.getSession(id))
        );
        const validSessions = loaded.filter(
          (s): s is VideoSessionRecord => s !== null
        );

        if (validSessions.length < 2) {
          setError(
            language === 'ko'
              ? '비교에 필요한 세션을 충분히 로드하지 못했습니다'
              : 'Could not load enough sessions for comparison'
          );
        } else {
          setSessions(validSessions);
        }
      } catch (err) {
        setError(
          language === 'ko'
            ? '세션을 로드하지 못했습니다'
            : 'Failed to load sessions'
        );
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadSessions();
  }, [sessionIds, language]);

  const handleClose = () => {
    router.push('/history');
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.background }}
      >
        <div
          className="animate-spin w-12 h-12 border-4 border-t-transparent rounded-full"
          style={{
            borderColor: VIDEO_ANALYSIS_COLORS.primary,
            borderTopColor: 'transparent',
          }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.background }}
      >
        <div className="text-center">
          <p
            style={{ color: VIDEO_ANALYSIS_COLORS.statusError }}
            className="mb-4"
          >
            {error}
          </p>
          <button
            onClick={handleClose}
            className="px-6 py-2 rounded-lg"
            style={{
              backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
              color: VIDEO_ANALYSIS_COLORS.textPrimary,
            }}
          >
            {language === 'ko' ? '뒤로 가기' : 'Go Back'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <ComparisonView sessions={sessions} onClose={handleClose} language={language} />
  );
}

export default function SessionComparisonPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.background }}
        >
          <div
            className="animate-spin w-12 h-12 border-4 border-t-transparent rounded-full"
            style={{
              borderColor: VIDEO_ANALYSIS_COLORS.primary,
              borderTopColor: 'transparent',
            }}
          />
        </div>
      }
    >
      <SessionComparisonContent />
    </Suspense>
  );
}

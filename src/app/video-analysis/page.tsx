'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { VideoAnalysisView } from '@/components/VideoAnalysisView';
import { VIDEO_ANALYSIS_COLORS, TRANSLATIONS } from '@/components/VideoAnalysisView/constants';
import { sessionStorageService } from '@/services/sessionStorageService';
import { mapAnalysisToSessionRecord } from '@/utils/sessionMapper';
import type { VideoAnalysisResult, VideoRepAnalysisResult } from '@/types/video';

interface StoredAnalysisData {
  videoUrl: string;
  analysisResult: VideoAnalysisResult;
  repAnalysisResult: VideoRepAnalysisResult;
}

export default function VideoAnalysisPage() {
  const router = useRouter();
  const [data, setData] = useState<StoredAnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'ko' | 'en'>('ko');
  const sessionSavedRef = useRef(false);

  useEffect(() => {
    // Detect language from browser
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('en')) {
      setLanguage('en');
    }

    // Load analysis data from sessionStorage
    try {
      const storedData = sessionStorage.getItem('videoAnalysisData');
      if (storedData) {
        const parsed = JSON.parse(storedData) as StoredAnalysisData;
        setData(parsed);
      } else {
        setError(TRANSLATIONS[language].noData);
      }
    } catch (err) {
      console.error('Failed to load analysis data:', err);
      setError(TRANSLATIONS[language].noData);
    }
  }, [language]);

  // Auto-save session when analysis data is loaded
  useEffect(() => {
    if (data && data.analysisResult && data.repAnalysisResult && !sessionSavedRef.current) {
      sessionSavedRef.current = true;
      const sessionRecord = mapAnalysisToSessionRecord(
        data.analysisResult,
        data.repAnalysisResult
      );
      sessionStorageService.saveSession(sessionRecord).catch((err) => {
        console.error('Failed to save session:', err);
      });
    }
  }, [data]);

  const handleBack = () => {
    router.back();
  };

  // Loading state
  if (!data && !error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.background }}
      >
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-t-transparent rounded-full mx-auto mb-4"
            style={{ borderColor: VIDEO_ANALYSIS_COLORS.primary, borderTopColor: 'transparent' }}
          />
          <p style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}>
            {TRANSLATIONS[language].loadingAnalysis}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.background }}
      >
        <div className="text-center">
          <p
            className="text-lg mb-4"
            style={{ color: VIDEO_ANALYSIS_COLORS.statusError }}
          >
            {error || TRANSLATIONS[language].noData}
          </p>
          <button
            onClick={handleBack}
            className="px-6 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
              color: VIDEO_ANALYSIS_COLORS.textPrimary,
              border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
            }}
          >
            {TRANSLATIONS[language].back}
          </button>
        </div>
      </div>
    );
  }

  return (
    <VideoAnalysisView
      videoUrl={data.videoUrl}
      analysisResult={data.analysisResult}
      repAnalysisResult={data.repAnalysisResult}
      language={language}
      onBack={handleBack}
    />
  );
}

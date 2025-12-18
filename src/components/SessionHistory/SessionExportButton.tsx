'use client';

import React, { useState } from 'react';
import { VIDEO_ANALYSIS_COLORS } from '@/components/VideoAnalysisView/constants';
import { SESSION_HISTORY_TRANSLATIONS } from './translations';
import { sessionStorageService } from '@/services/sessionStorageService';

interface SessionExportButtonProps {
  language: 'ko' | 'en';
}

export function SessionExportButton({ language }: SessionExportButtonProps) {
  const t = SESSION_HISTORY_TRANSLATIONS[language];
  const [isExporting, setIsExporting] = useState(false);

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const json = await sessionStorageService.exportSessions();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `posture-sessions-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export sessions:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExportAll}
      disabled={isExporting}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      style={{
        backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
        color: VIDEO_ANALYSIS_COLORS.textSecondary,
        border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
        opacity: isExporting ? 0.5 : 1,
      }}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
        />
      </svg>
      {isExporting ? '...' : t.exportAll}
    </button>
  );
}

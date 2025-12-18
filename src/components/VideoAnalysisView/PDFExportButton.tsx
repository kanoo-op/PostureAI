'use client';

import React, { useState } from 'react';
import { VIDEO_ANALYSIS_COLORS, TRANSLATIONS } from './constants';
import { VideoPdfReportGenerator } from '@/utils/videoPdfReport';
import type { VideoRepAnalysisResult } from '@/types/video';

interface PDFExportButtonProps {
  repAnalysisResult: VideoRepAnalysisResult;
  language: 'ko' | 'en';
}

export default function PDFExportButton({
  repAnalysisResult,
  language,
}: PDFExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const t = TRANSLATIONS[language];

  const handleExport = async () => {
    setIsGenerating(true);

    try {
      const generator = new VideoPdfReportGenerator({
        language,
        includeScreenshots: false,
        includeRecommendations: true,
      });

      const blob = await generator.generateReport({
        exerciseType: repAnalysisResult.exerciseType,
        repAnalysis: repAnalysisResult,
        problemMomentCaptures: [],
      });

      // Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `video-analysis-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isGenerating}
      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        backgroundColor: VIDEO_ANALYSIS_COLORS.primary,
        color: '#FFFFFF',
      }}
    >
      {isGenerating ? (
        <>
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {t.generating}
        </>
      ) : (
        <>
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {t.exportPdf}
        </>
      )}
    </button>
  );
}

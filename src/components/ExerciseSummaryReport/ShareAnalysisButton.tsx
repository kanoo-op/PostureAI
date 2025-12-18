'use client';

import React, { useState } from 'react';
import { SessionRecord } from '@/types/angleHistory';
import { SummaryData } from './types';
import { SUMMARY_COLORS } from './constants';
import ShareAnalysis from './ShareAnalysis';

export interface ShareAnalysisButtonProps {
  session: SessionRecord;
  summaryData: SummaryData;
  language?: 'ko' | 'en';
}

export default function ShareAnalysisButton({
  session,
  summaryData,
  language = 'ko',
}: ShareAnalysisButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all hover:opacity-90"
        style={{
          backgroundColor: SUMMARY_COLORS.secondary,
          color: SUMMARY_COLORS.backgroundSolid,
        }}
      >
        <span>📤</span>
        <span>{language === 'ko' ? '코치에게 공유' : 'Share with Coach'}</span>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl overflow-hidden shadow-2xl"
            style={{
              backgroundColor: SUMMARY_COLORS.background,
              border: `1px solid ${SUMMARY_COLORS.border}`
            }}
          >
            {/* Modal Header */}
            <div
              className="flex justify-between items-center p-4"
              style={{ borderBottom: `1px solid ${SUMMARY_COLORS.border}` }}
            >
              <h2 className="text-lg font-semibold" style={{ color: SUMMARY_COLORS.textPrimary }}>
                {language === 'ko' ? '분석 결과 공유' : 'Share Analysis'}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:opacity-70 transition-opacity"
                style={{ color: SUMMARY_COLORS.textSecondary }}
              >
                ✕
              </button>
            </div>

            {/* Share Analysis Content */}
            <ShareAnalysis
              session={session}
              summaryData={summaryData}
              language={language}
              onExportComplete={() => setTimeout(() => setIsOpen(false), 2000)}
            />
          </div>
        </div>
      )}
    </>
  );
}

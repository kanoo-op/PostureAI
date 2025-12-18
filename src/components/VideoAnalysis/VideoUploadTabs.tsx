'use client';

import React from 'react';
import { ANALYSIS_COLORS } from './constants';

interface VideoUploadTabsProps {
  activeTab: 'upload' | 'record';
  onTabChange: (tab: 'upload' | 'record') => void;
  className?: string;
}

export default function VideoUploadTabs({
  activeTab,
  onTabChange,
  className = '',
}: VideoUploadTabsProps) {
  return (
    <div
      className={`flex rounded-xl p-1 ${className}`}
      style={{ backgroundColor: ANALYSIS_COLORS.surfaceElevated }}
      role="tablist"
      aria-label="영상 입력 방식 선택"
    >
      <button
        role="tab"
        aria-selected={activeTab === 'upload'}
        aria-controls="upload-panel"
        onClick={() => onTabChange('upload')}
        className="flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all"
        style={{
          backgroundColor: activeTab === 'upload' ? ANALYSIS_COLORS.surface : 'transparent',
          color: activeTab === 'upload' ? ANALYSIS_COLORS.primary : ANALYSIS_COLORS.textSecondary,
          borderBottom: activeTab === 'upload' ? `2px solid ${ANALYSIS_COLORS.primary}` : '2px solid transparent',
        }}
      >
        <span className="flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          영상 업로드
        </span>
      </button>

      <button
        role="tab"
        aria-selected={activeTab === 'record'}
        aria-controls="record-panel"
        onClick={() => onTabChange('record')}
        className="flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all"
        style={{
          backgroundColor: activeTab === 'record' ? ANALYSIS_COLORS.surface : 'transparent',
          color: activeTab === 'record' ? ANALYSIS_COLORS.primary : ANALYSIS_COLORS.textSecondary,
          borderBottom: activeTab === 'record' ? `2px solid ${ANALYSIS_COLORS.primary}` : '2px solid transparent',
        }}
      >
        <span className="flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          영상 녹화
        </span>
      </button>
    </div>
  );
}

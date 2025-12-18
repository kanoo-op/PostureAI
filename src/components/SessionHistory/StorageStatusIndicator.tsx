'use client';

import React, { useState, useEffect } from 'react';
import { VIDEO_ANALYSIS_COLORS } from '@/components/VideoAnalysisView/constants';
import { sessionStorageService } from '@/services/sessionStorageService';

interface StorageStatusIndicatorProps {
  language: 'ko' | 'en';
}

export function StorageStatusIndicator({ language }: StorageStatusIndicatorProps) {
  const [storageInfo, setStorageInfo] = useState<{
    used: number;
    available: number;
  } | null>(null);

  useEffect(() => {
    const loadStorageInfo = async () => {
      try {
        const info = await sessionStorageService.getStorageInfo();
        setStorageInfo(info);
      } catch (error) {
        console.error('Failed to load storage info:', error);
      }
    };

    loadStorageInfo();
  }, []);

  if (!storageInfo || storageInfo.available === 0) return null;

  const percentUsed = (storageInfo.used / storageInfo.available) * 100;
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <div
        className="w-16 h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.surfaceElevated }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(percentUsed, 100)}%`,
            backgroundColor:
              percentUsed > 90
                ? VIDEO_ANALYSIS_COLORS.statusError
                : percentUsed > 70
                  ? VIDEO_ANALYSIS_COLORS.statusWarning
                  : VIDEO_ANALYSIS_COLORS.primary,
          }}
        />
      </div>
      <span style={{ color: VIDEO_ANALYSIS_COLORS.textMuted }}>
        {formatBytes(storageInfo.used)} / {formatBytes(storageInfo.available)}
      </span>
    </div>
  );
}

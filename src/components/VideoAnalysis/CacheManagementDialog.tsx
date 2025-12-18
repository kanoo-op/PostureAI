'use client';

import React, { useState, useEffect } from 'react';
import { ANALYSIS_COLORS } from './constants';
import { getStorageQuota, clearAllCache } from '@/utils/videoAnalysisCache';
import type { StorageQuotaInfo } from '@/types/video';

interface CacheManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCacheCleared: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function CacheManagementDialog({
  isOpen,
  onClose,
  onCacheCleared,
}: CacheManagementDialogProps) {
  const [quota, setQuota] = useState<StorageQuotaInfo | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getStorageQuota().then(setQuota).catch(console.error);
      setConfirmClear(false);
    }
  }, [isOpen]);

  const handleClearCache = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }

    setIsClearing(true);
    try {
      await clearAllCache();
      onCacheCleared();
      onClose();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setIsClearing(false);
      setConfirmClear(false);
    }
  };

  if (!isOpen) return null;

  // Determine usage bar color
  const getUsageColor = (percent: number) => {
    if (percent >= 90) return ANALYSIS_COLORS.statusError;
    if (percent >= 70) return ANALYSIS_COLORS.statusWarning;
    return ANALYSIS_COLORS.primary;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          backgroundColor: ANALYSIS_COLORS.surface,
          border: `1px solid ${ANALYSIS_COLORS.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-xl font-bold"
            style={{ color: ANALYSIS_COLORS.textPrimary }}
          >
            캐시 관리
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{
              backgroundColor: ANALYSIS_COLORS.surfaceElevated,
              color: ANALYSIS_COLORS.textSecondary,
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Storage Usage */}
        {quota && (
          <div
            className="rounded-xl p-4 mb-6"
            style={{ backgroundColor: ANALYSIS_COLORS.surfaceElevated }}
          >
            <div className="flex justify-between items-center mb-2">
              <span style={{ color: ANALYSIS_COLORS.textSecondary }}>저장소 사용량</span>
              <span
                className="font-semibold"
                style={{ color: getUsageColor(quota.percentUsed) }}
              >
                {quota.percentUsed}%
              </span>
            </div>
            <div
              className="w-full h-3 rounded-full overflow-hidden mb-2"
              style={{ backgroundColor: 'rgba(55, 65, 81, 0.8)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${quota.percentUsed}%`,
                  backgroundColor: getUsageColor(quota.percentUsed),
                }}
              />
            </div>
            <div
              className="text-sm"
              style={{ color: ANALYSIS_COLORS.textMuted }}
            >
              {formatBytes(quota.used)} / {formatBytes(quota.available)} 사용 중
            </div>
          </div>
        )}

        {/* Clear Cache Button */}
        <button
          onClick={handleClearCache}
          disabled={isClearing}
          className="w-full py-3 rounded-xl font-medium transition-colors"
          style={{
            backgroundColor: confirmClear ? ANALYSIS_COLORS.statusError : ANALYSIS_COLORS.statusErrorBg,
            color: confirmClear ? '#ffffff' : ANALYSIS_COLORS.statusError,
            opacity: isClearing ? 0.6 : 1,
          }}
        >
          {isClearing
            ? '삭제 중...'
            : confirmClear
            ? '정말 모든 캐시를 삭제하시겠습니까?'
            : '모든 캐시 삭제'}
        </button>

        {confirmClear && (
          <button
            onClick={() => setConfirmClear(false)}
            className="w-full py-2 mt-2 text-sm"
            style={{ color: ANALYSIS_COLORS.textMuted }}
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
}

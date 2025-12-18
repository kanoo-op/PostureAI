'use client';

import React, { useState } from 'react';
import { SessionActionsFooterProps } from './types';
import { SUMMARY_COLORS } from './constants';

export default function SessionActionsFooter({
  onClose,
  onShare,
  onSaveNotes,
  language = 'ko',
}: SessionActionsFooterProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const handleSaveNotes = () => {
    if (onSaveNotes && notes.trim()) {
      onSaveNotes(notes.trim());
      setShowNotes(false);
    }
  };

  return (
    <div className="p-4" style={{ borderTop: `1px solid ${SUMMARY_COLORS.border}` }}>
      {showNotes ? (
        <div className="space-y-3">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={language === 'ko' ? '메모를 입력하세요...' : 'Add notes...'}
            className="w-full p-3 rounded-lg resize-none focus:outline-none focus:ring-2"
            style={{
              backgroundColor: SUMMARY_COLORS.surfaceElevated,
              color: SUMMARY_COLORS.textPrimary,
              border: `1px solid ${SUMMARY_COLORS.border}`,
            }}
            rows={3}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveNotes}
              className="flex-1 py-2 rounded-lg font-medium text-sm"
              style={{
                backgroundColor: SUMMARY_COLORS.primary,
                color: SUMMARY_COLORS.backgroundSolid,
              }}
            >
              {language === 'ko' ? '저장' : 'Save'}
            </button>
            <button
              onClick={() => setShowNotes(false)}
              className="px-4 py-2 rounded-lg font-medium text-sm"
              style={{
                backgroundColor: SUMMARY_COLORS.surfaceElevated,
                color: SUMMARY_COLORS.textSecondary,
              }}
            >
              {language === 'ko' ? '취소' : 'Cancel'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          {onSaveNotes && (
            <button
              onClick={() => setShowNotes(true)}
              className="flex-1 py-3 rounded-lg font-medium text-sm transition-colors hover:opacity-90"
              style={{
                backgroundColor: SUMMARY_COLORS.surfaceElevated,
                color: SUMMARY_COLORS.textPrimary,
              }}
            >
              {language === 'ko' ? '메모 추가' : 'Add Notes'}
            </button>
          )}
          {onShare && (
            <button
              onClick={onShare}
              className="flex-1 py-3 rounded-lg font-medium text-sm transition-colors hover:opacity-90"
              style={{
                backgroundColor: SUMMARY_COLORS.secondary,
                color: SUMMARY_COLORS.backgroundSolid,
              }}
            >
              {language === 'ko' ? '공유' : 'Share'}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-lg font-medium text-sm transition-colors hover:opacity-90"
              style={{
                backgroundColor: SUMMARY_COLORS.primary,
                color: SUMMARY_COLORS.backgroundSolid,
              }}
            >
              {language === 'ko' ? '닫기' : 'Close'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

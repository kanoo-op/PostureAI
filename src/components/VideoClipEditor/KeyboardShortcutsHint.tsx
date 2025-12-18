'use client';

import React, { useState } from 'react';
import { CLIP_EDITOR_COLORS } from './constants';

interface KeyboardShortcutsHintProps {
  language: 'ko' | 'en';
}

const TRANSLATIONS = {
  ko: {
    shortcuts: '단축키',
    leftArrow: '← : 시작점 1프레임 이전',
    rightArrow: '→ : 시작점 1프레임 이후',
    shiftLeftArrow: 'Shift+← : 종료점 1프레임 이전',
    shiftRightArrow: 'Shift+→ : 종료점 1프레임 이후',
    ctrlZ: 'Ctrl+Z : 실행 취소',
    ctrlY: 'Ctrl+Y : 다시 실행',
    space: 'Space : 재생/일시정지',
  },
  en: {
    shortcuts: 'Shortcuts',
    leftArrow: '← : Start point -1 frame',
    rightArrow: '→ : Start point +1 frame',
    shiftLeftArrow: 'Shift+← : End point -1 frame',
    shiftRightArrow: 'Shift+→ : End point +1 frame',
    ctrlZ: 'Ctrl+Z : Undo',
    ctrlY: 'Ctrl+Y : Redo',
    space: 'Space : Play/Pause',
  },
};

export default function KeyboardShortcutsHint({ language }: KeyboardShortcutsHintProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = TRANSLATIONS[language];

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-2 rounded-lg transition-all hover:opacity-80"
        style={{
          backgroundColor: CLIP_EDITOR_COLORS.backgroundElevated,
          color: CLIP_EDITOR_COLORS.textMuted,
        }}
        title={t.shortcuts}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
        </svg>
      </button>

      {isExpanded && (
        <div
          className="absolute bottom-full right-0 mb-2 p-3 rounded-lg shadow-xl z-50 min-w-64"
          style={{
            backgroundColor: CLIP_EDITOR_COLORS.backgroundElevated,
            border: `1px solid ${CLIP_EDITOR_COLORS.border}`,
          }}
        >
          <h4
            className="font-medium text-sm mb-2"
            style={{ color: CLIP_EDITOR_COLORS.textPrimary }}
          >
            {t.shortcuts}
          </h4>
          <ul className="space-y-1 text-xs" style={{ color: CLIP_EDITOR_COLORS.textSecondary }}>
            <li>{t.leftArrow}</li>
            <li>{t.rightArrow}</li>
            <li>{t.shiftLeftArrow}</li>
            <li>{t.shiftRightArrow}</li>
            <li>{t.ctrlZ}</li>
            <li>{t.ctrlY}</li>
            <li>{t.space}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

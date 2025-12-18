'use client';

import React, { useState } from 'react';
import { KEYBOARD_SHORTCUTS, PLAYBACK_CONTROL_COLORS, TRANSLATIONS } from './constants';

interface KeyboardShortcutHintsProps {
  language: 'ko' | 'en';
}

export default function KeyboardShortcutHints({ language }: KeyboardShortcutHintsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = TRANSLATIONS[language];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg transition-colors"
        style={{
          backgroundColor: isOpen
            ? PLAYBACK_CONTROL_COLORS.backgroundElevated
            : 'transparent',
          color: PLAYBACK_CONTROL_COLORS.textSecondary,
        }}
        aria-label={t.keyboardShortcuts}
        aria-expanded={isOpen}
      >
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
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute bottom-full right-0 mb-2 p-3 rounded-xl min-w-[200px] z-50"
          style={{
            backgroundColor: PLAYBACK_CONTROL_COLORS.backgroundElevated,
            border: `1px solid ${PLAYBACK_CONTROL_COLORS.border}`,
          }}
        >
          <h4
            className="text-sm font-semibold mb-2"
            style={{ color: PLAYBACK_CONTROL_COLORS.textPrimary }}
          >
            {t.keyboardShortcuts}
          </h4>
          <ul className="space-y-1.5">
            {KEYBOARD_SHORTCUTS.map((shortcut) => (
              <li
                key={shortcut.key}
                className="flex items-center justify-between gap-4"
              >
                <span
                  className="text-xs"
                  style={{ color: PLAYBACK_CONTROL_COLORS.textSecondary }}
                >
                  {shortcut.description}
                </span>
                <kbd
                  className="px-2 py-0.5 rounded text-xs font-mono"
                  style={{
                    backgroundColor: PLAYBACK_CONTROL_COLORS.backgroundSurface,
                    color: PLAYBACK_CONTROL_COLORS.textPrimary,
                    border: `1px solid ${PLAYBACK_CONTROL_COLORS.border}`,
                  }}
                >
                  {shortcut.key}
                </kbd>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

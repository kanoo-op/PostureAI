'use client';

import React from 'react';
import type { AudioLanguage } from '@/types/audioFeedback';

// Design tokens
const COLORS = {
  primary: '#0284c7',
  textPrimary: '#FFFFFF',
  textMuted: '#64748B',
  borderDefault: 'rgba(75, 85, 99, 0.3)',
  surface: 'rgba(30, 41, 59, 0.95)',
};

interface LanguageSelectorProps {
  language: AudioLanguage;
  onLanguageChange: (language: AudioLanguage) => void;
  disabled?: boolean;
}

export function LanguageSelector({ language, onLanguageChange, disabled = false }: LanguageSelectorProps) {
  const languages: { value: AudioLanguage; label: string; flag: string }[] = [
    { value: 'ko', label: 'KO', flag: '' },
    { value: 'en', label: 'EN', flag: '' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        padding: '4px',
        backgroundColor: COLORS.surface,
        borderRadius: '8px',
        border: `1px solid ${COLORS.borderDefault}`,
      }}
      role="radiogroup"
      aria-label="Select language"
    >
      {languages.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onLanguageChange(value)}
          disabled={disabled}
          role="radio"
          aria-checked={language === value}
          style={{
            padding: '6px 12px',
            backgroundColor: language === value ? COLORS.primary : 'transparent',
            border: 'none',
            borderRadius: '6px',
            color: language === value ? COLORS.textPrimary : COLORS.textMuted,
            fontSize: '13px',
            fontWeight: 600,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

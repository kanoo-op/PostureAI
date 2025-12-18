'use client';

import React, { useState, useEffect } from 'react';

// Design tokens
const COLORS = {
  voiceActive: '#00F5A0',
  textMuted: '#64748B',
  textSecondary: '#94A3B8',
};

interface ConfigPersistenceIndicatorProps {
  isSaved: boolean;
  showOnSaveOnly?: boolean;
}

export function ConfigPersistenceIndicator({
  isSaved,
  showOnSaveOnly = true,
}: ConfigPersistenceIndicatorProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isSaved) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSaved]);

  if (showOnSaveOnly && !visible) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
      role="status"
      aria-live="polite"
      title="Settings saved"
    >
      {/* Check icon */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20 6L9 17l-5-5"
          stroke={COLORS.voiceActive}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <span
        style={{
          fontSize: '11px',
          color: COLORS.textMuted,
        }}
      >
        Saved
      </span>
    </div>
  );
}

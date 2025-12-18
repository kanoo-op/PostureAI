'use client';

import { REFERENCE_OVERLAY_COLORS } from './constants';

interface Props {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
}

export default function ReferenceToggleControl({ enabled, onToggle, className = '' }: Props) {
  return (
    <button
      onClick={() => onToggle(!enabled)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(!enabled);
        }
      }}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${className}`}
      style={{
        backgroundColor: enabled
          ? `${REFERENCE_OVERLAY_COLORS.toggleActive}20`
          : REFERENCE_OVERLAY_COLORS.surface,
        border: `1px solid ${enabled ? REFERENCE_OVERLAY_COLORS.toggleActive : REFERENCE_OVERLAY_COLORS.border}`,
      }}
      aria-pressed={enabled}
      aria-label={enabled ? '참조 오버레이 끄기' : '참조 오버레이 켜기'}
      tabIndex={0}
    >
      {/* Reference skeleton icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={enabled ? REFERENCE_OVERLAY_COLORS.toggleActive : REFERENCE_OVERLAY_COLORS.textSecondary}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="5" r="3" />
        <line x1="12" y1="8" x2="12" y2="15" />
        <line x1="12" y1="15" x2="8" y2="21" />
        <line x1="12" y1="15" x2="16" y2="21" />
        <line x1="8" y1="10" x2="16" y2="10" />
      </svg>

      <span
        className="text-sm font-medium"
        style={{
          color: enabled
            ? REFERENCE_OVERLAY_COLORS.toggleActive
            : REFERENCE_OVERLAY_COLORS.textSecondary,
        }}
      >
        참조
      </span>
    </button>
  );
}

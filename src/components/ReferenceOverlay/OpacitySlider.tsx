'use client';

import { REFERENCE_OVERLAY_COLORS, REFERENCE_OVERLAY_CONFIG } from './constants';

interface Props {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export default function OpacitySlider({ value, onChange, disabled = false, className = '' }: Props) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg ${className}`}
      style={{
        backgroundColor: REFERENCE_OVERLAY_COLORS.surface,
        border: `1px solid ${REFERENCE_OVERLAY_COLORS.border}`,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        className="text-xs"
        style={{ color: REFERENCE_OVERLAY_COLORS.textSecondary }}
      >
        투명도
      </span>

      <input
        type="range"
        min={REFERENCE_OVERLAY_CONFIG.minOpacity * 100}
        max={REFERENCE_OVERLAY_CONFIG.maxOpacity * 100}
        step={REFERENCE_OVERLAY_CONFIG.opacityStep * 100}
        value={value * 100}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        disabled={disabled}
        className="w-20 h-1 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1"
        style={{
          background: `linear-gradient(to right, ${REFERENCE_OVERLAY_COLORS.referenceSkeleton} 0%, ${REFERENCE_OVERLAY_COLORS.referenceSkeleton} ${value * 100}%, ${REFERENCE_OVERLAY_COLORS.border} ${value * 100}%, ${REFERENCE_OVERLAY_COLORS.border} 100%)`,
        }}
        aria-label="참조 오버레이 투명도"
        aria-valuemin={REFERENCE_OVERLAY_CONFIG.minOpacity * 100}
        aria-valuemax={REFERENCE_OVERLAY_CONFIG.maxOpacity * 100}
        aria-valuenow={Math.round(value * 100)}
      />

      <span
        className="text-xs w-8 text-right tabular-nums"
        style={{ color: REFERENCE_OVERLAY_COLORS.textPrimary }}
      >
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

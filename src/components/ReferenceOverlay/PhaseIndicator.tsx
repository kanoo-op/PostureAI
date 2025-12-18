'use client';

import type { ExercisePhase } from '@/types/referencePose';
import { REFERENCE_OVERLAY_COLORS } from './constants';

interface Props {
  phase: ExercisePhase;
  confidence: number;
  description: string;
}

const PHASE_LABELS: Record<string, string> = {
  standing: '서있음',
  'half-depth': '중간',
  'full-depth': '최저점',
  up: '상단',
  down: '하단',
  start: '시작',
  mid: '중간',
  end: '끝',
};

export default function PhaseIndicator({ phase, confidence, description }: Props) {
  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-lg"
      style={{
        backgroundColor: REFERENCE_OVERLAY_COLORS.phaseIndicatorBg,
        border: `1px solid ${REFERENCE_OVERLAY_COLORS.phaseIndicatorBorder}`,
      }}
    >
      {/* Animated phase dot */}
      <span
        className="w-2 h-2 rounded-full animate-pulse"
        style={{ backgroundColor: REFERENCE_OVERLAY_COLORS.referenceSkeleton }}
      />

      {/* Phase label */}
      <span
        className="text-sm font-medium"
        style={{ color: REFERENCE_OVERLAY_COLORS.textPrimary }}
      >
        이상적 자세: {PHASE_LABELS[phase] || phase}
      </span>

      {/* Confidence bar */}
      <div
        className="w-16 h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: REFERENCE_OVERLAY_COLORS.border }}
      >
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{
            width: `${confidence * 100}%`,
            backgroundColor: REFERENCE_OVERLAY_COLORS.referenceSkeleton,
          }}
        />
      </div>
    </div>
  );
}

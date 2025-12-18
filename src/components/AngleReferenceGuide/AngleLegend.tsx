'use client';

import { ANGLE_GUIDE_COLORS } from './colors';

interface AngleLegendProps {
  showUserSkeleton?: boolean;
}

export default function AngleLegend({ showUserSkeleton = false }: AngleLegendProps) {
  return (
    <div
      className="px-4 py-3 flex flex-wrap gap-4 text-xs"
      style={{
        borderTop: `1px solid ${ANGLE_GUIDE_COLORS.surface}`,
        backgroundColor: ANGLE_GUIDE_COLORS.backgroundElevated,
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-4 h-1 rounded"
          style={{ backgroundColor: ANGLE_GUIDE_COLORS.skeletonIdeal }}
        />
        <span style={{ color: ANGLE_GUIDE_COLORS.textSecondary }}>
          이상적 자세
        </span>
      </div>

      {showUserSkeleton && (
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-1 rounded"
            style={{ backgroundColor: ANGLE_GUIDE_COLORS.skeletonUser }}
          />
          <span style={{ color: ANGLE_GUIDE_COLORS.textSecondary }}>
            현재 자세
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: ANGLE_GUIDE_COLORS.angleOptimal }}
        />
        <span style={{ color: ANGLE_GUIDE_COLORS.textSecondary }}>최적</span>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: ANGLE_GUIDE_COLORS.angleAcceptable }}
        />
        <span style={{ color: ANGLE_GUIDE_COLORS.textSecondary }}>양호</span>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: ANGLE_GUIDE_COLORS.angleWarning }}
        />
        <span style={{ color: ANGLE_GUIDE_COLORS.textSecondary }}>주의</span>
      </div>
    </div>
  );
}

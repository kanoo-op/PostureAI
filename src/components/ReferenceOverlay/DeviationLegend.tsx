'use client';

import { REFERENCE_OVERLAY_COLORS } from './constants';
import { BLAZEPOSE_KEYPOINTS } from '@/types/pose';

interface Props {
  overallScore: number;
  worstJoints: number[];
}

const JOINT_NAMES: Record<number, string> = {
  [BLAZEPOSE_KEYPOINTS.LEFT_SHOULDER]: '왼쪽 어깨',
  [BLAZEPOSE_KEYPOINTS.RIGHT_SHOULDER]: '오른쪽 어깨',
  [BLAZEPOSE_KEYPOINTS.LEFT_HIP]: '왼쪽 엉덩이',
  [BLAZEPOSE_KEYPOINTS.RIGHT_HIP]: '오른쪽 엉덩이',
  [BLAZEPOSE_KEYPOINTS.LEFT_KNEE]: '왼쪽 무릎',
  [BLAZEPOSE_KEYPOINTS.RIGHT_KNEE]: '오른쪽 무릎',
  [BLAZEPOSE_KEYPOINTS.LEFT_ANKLE]: '왼쪽 발목',
  [BLAZEPOSE_KEYPOINTS.RIGHT_ANKLE]: '오른쪽 발목',
};

export default function DeviationLegend({ overallScore, worstJoints }: Props) {
  const scoreColor = overallScore >= 80
    ? REFERENCE_OVERLAY_COLORS.deviationAligned
    : overallScore >= 60
    ? REFERENCE_OVERLAY_COLORS.deviationMinor
    : REFERENCE_OVERLAY_COLORS.deviationMajor;

  return (
    <div
      className="absolute bottom-4 right-4 p-3 rounded-lg min-w-[180px]"
      style={{
        backgroundColor: REFERENCE_OVERLAY_COLORS.surface,
        border: `1px solid ${REFERENCE_OVERLAY_COLORS.border}`,
      }}
    >
      {/* Overall score */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs"
          style={{ color: REFERENCE_OVERLAY_COLORS.textSecondary }}
        >
          일치도
        </span>
        <span
          className="text-lg font-bold"
          style={{ color: scoreColor }}
        >
          {overallScore}%
        </span>
      </div>

      {/* Worst joints */}
      {worstJoints.length > 0 && (
        <div>
          <span
            className="text-xs block mb-1"
            style={{ color: REFERENCE_OVERLAY_COLORS.textSecondary }}
          >
            교정 필요:
          </span>
          <div className="flex flex-wrap gap-1">
            {worstJoints.map(jointIdx => (
              <span
                key={jointIdx}
                className="px-2 py-0.5 text-xs rounded"
                style={{
                  backgroundColor: `${REFERENCE_OVERLAY_COLORS.deviationMajor}20`,
                  color: REFERENCE_OVERLAY_COLORS.deviationMajor,
                }}
              >
                {JOINT_NAMES[jointIdx] || `Joint ${jointIdx}`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 pt-2 border-t" style={{ borderColor: REFERENCE_OVERLAY_COLORS.border }}>
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: REFERENCE_OVERLAY_COLORS.deviationAligned }}
            />
            <span style={{ color: REFERENCE_OVERLAY_COLORS.textSecondary }}>좋음</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: REFERENCE_OVERLAY_COLORS.deviationMinor }}
            />
            <span style={{ color: REFERENCE_OVERLAY_COLORS.textSecondary }}>주의</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: REFERENCE_OVERLAY_COLORS.deviationMajor }}
            />
            <span style={{ color: REFERENCE_OVERLAY_COLORS.textSecondary }}>교정</span>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { REFERENCE_OVERLAY_COLORS } from './constants';

interface Props {
  exerciseType: string;
}

export default function NoReferenceDataNotice({ exerciseType }: Props) {
  return (
    <div
      className="absolute top-4 right-4 p-3 rounded-lg max-w-[200px]"
      style={{
        backgroundColor: REFERENCE_OVERLAY_COLORS.surface,
        border: `1px solid ${REFERENCE_OVERLAY_COLORS.border}`,
      }}
    >
      <p
        className="text-xs"
        style={{ color: REFERENCE_OVERLAY_COLORS.textSecondary }}
      >
        &apos;{exerciseType}&apos; 운동에 대한 참조 데이터가 아직 준비되지 않았습니다.
      </p>
    </div>
  );
}

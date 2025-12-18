'use client';

import { IdealAngleConfig, AngleComparisonResult } from './types';
import { ANGLE_GUIDE_COLORS } from './colors';
import { ANGLE_LABELS } from '@/components/AngleDashboard/constants';

interface AngleValueDisplayProps {
  angles: IdealAngleConfig[];
  comparisonResults?: AngleComparisonResult[];
  showComparison?: boolean;
  compact?: boolean;
}

export default function AngleValueDisplay({
  angles,
  comparisonResults,
  showComparison = false,
  compact = false,
}: AngleValueDisplayProps) {
  return (
    <div className={`space-y-${compact ? '2' : '3'}`}>
      {angles.map((angle) => {
        const comparison = comparisonResults?.find(
          (r) => r.jointType === angle.jointType
        );
        const label = ANGLE_LABELS[angle.jointType];

        return (
          <div
            key={angle.jointType}
            className="rounded-lg p-3"
            style={{ backgroundColor: ANGLE_GUIDE_COLORS.backgroundElevated }}
          >
            <div className="flex justify-between items-center mb-1">
              <span
                className="text-sm font-medium"
                style={{ color: ANGLE_GUIDE_COLORS.textPrimary }}
              >
                {label?.ko || angle.descriptionKo}
              </span>
              <span
                className="font-mono font-bold text-lg"
                style={{ color: ANGLE_GUIDE_COLORS.primary }}
              >
                {angle.idealValue}°
              </span>
            </div>

            {/* Range indicator */}
            <div className="flex items-center gap-2 text-xs mb-2">
              <span style={{ color: ANGLE_GUIDE_COLORS.textMuted }}>
                적정 범위:
              </span>
              <span style={{ color: ANGLE_GUIDE_COLORS.textSecondary }}>
                {angle.acceptableRange.min}° - {angle.acceptableRange.max}°
              </span>
            </div>

            {/* Visual range bar */}
            <div className="relative h-2 rounded-full overflow-hidden mb-2"
              style={{ backgroundColor: ANGLE_GUIDE_COLORS.surface }}>
              {/* Acceptable range highlight */}
              <div
                className="absolute h-full rounded-full"
                style={{
                  backgroundColor: ANGLE_GUIDE_COLORS.angleOptimal,
                  opacity: 0.3,
                  left: `${(angle.acceptableRange.min / 180) * 100}%`,
                  width: `${((angle.acceptableRange.max - angle.acceptableRange.min) / 180) * 100}%`,
                }}
              />
              {/* Ideal value marker */}
              <div
                className="absolute w-1 h-full"
                style={{
                  backgroundColor: ANGLE_GUIDE_COLORS.primary,
                  left: `${(angle.idealValue / 180) * 100}%`,
                  transform: 'translateX(-50%)',
                }}
              />
              {/* User value marker (if comparison enabled) */}
              {showComparison && comparison && comparison.userAngle > 0 && (
                <div
                  className="absolute w-2 h-2 rounded-full top-1/2 -translate-y-1/2"
                  style={{
                    backgroundColor:
                      comparison.status === 'optimal'
                        ? ANGLE_GUIDE_COLORS.angleOptimal
                        : comparison.status === 'acceptable'
                        ? ANGLE_GUIDE_COLORS.angleAcceptable
                        : ANGLE_GUIDE_COLORS.angleWarning,
                    left: `${(comparison.userAngle / 180) * 100}%`,
                    transform: 'translateX(-50%) translateY(-50%)',
                    boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                  }}
                />
              )}
            </div>

            {/* Comparison result */}
            {showComparison && comparison && (
              <div
                className="pt-2 border-t"
                style={{ borderColor: ANGLE_GUIDE_COLORS.surface }}
              >
                <div className="flex justify-between items-center">
                  <span style={{ color: ANGLE_GUIDE_COLORS.textMuted }}>
                    현재 각도:
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono font-bold"
                      style={{
                        color:
                          comparison.status === 'optimal'
                            ? ANGLE_GUIDE_COLORS.angleOptimal
                            : comparison.status === 'acceptable'
                            ? ANGLE_GUIDE_COLORS.angleAcceptable
                            : ANGLE_GUIDE_COLORS.angleWarning,
                      }}
                    >
                      {Math.round(comparison.userAngle)}°
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor:
                          comparison.status === 'optimal'
                            ? `${ANGLE_GUIDE_COLORS.angleOptimal}20`
                            : comparison.status === 'acceptable'
                            ? `${ANGLE_GUIDE_COLORS.angleAcceptable}20`
                            : `${ANGLE_GUIDE_COLORS.angleWarning}20`,
                        color:
                          comparison.status === 'optimal'
                            ? ANGLE_GUIDE_COLORS.angleOptimal
                            : comparison.status === 'acceptable'
                            ? ANGLE_GUIDE_COLORS.angleAcceptable
                            : ANGLE_GUIDE_COLORS.angleWarning,
                      }}
                    >
                      {comparison.deviation > 0 ? '+' : ''}
                      {Math.round(comparison.deviation)}°
                    </span>
                  </div>
                </div>
                {comparison.status !== 'optimal' && (
                  <p
                    className="text-xs mt-1.5"
                    style={{ color: ANGLE_GUIDE_COLORS.textSecondary }}
                  >
                    {comparison.correctionHintKo}
                  </p>
                )}
                {comparison.status === 'optimal' && (
                  <p
                    className="text-xs mt-1.5"
                    style={{ color: ANGLE_GUIDE_COLORS.angleOptimal }}
                  >
                    좋은 자세입니다!
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

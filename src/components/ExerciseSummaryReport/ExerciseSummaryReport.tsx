'use client';

import React, { useMemo } from 'react';
import { ExerciseSummaryReportProps } from './types';
import { SUMMARY_COLORS } from './constants';
import { generateSummaryData } from './utils/generateSummaryData';
import SummaryHeader from './SummaryHeader';
import AngleStatisticsCard from './AngleStatisticsCard';
import ROMAchievementSection from './ROMAchievementSection';
import SymmetryScoreCard from './SymmetryScoreCard';
import FormBreakdownChart from './FormBreakdownChart';
import RepQualityTrendChart from './RepQualityTrendChart';
import CollapsibleSection from './CollapsibleSection';
import GradientAccentBar from './GradientAccentBar';
import ShareAnalysisButton from './ShareAnalysisButton';

export default function ExerciseSummaryReport({
  session,
  isVisible = true,
  onClose,
  onShare,
  onSaveNotes,
  className = '',
  language = 'ko',
}: ExerciseSummaryReportProps) {
  // Generate summary data (memoized for performance)
  const summaryData = useMemo(() => {
    return generateSummaryData(session);
  }, [session]);

  if (!isVisible) return null;

  return (
    <div
      className={`rounded-2xl overflow-hidden shadow-2xl ${className}`}
      style={{
        backgroundColor: SUMMARY_COLORS.background,
        border: `1px solid ${SUMMARY_COLORS.border}`,
        backdropFilter: 'blur(12px)',
        maxWidth: '28rem',
        width: '100%',
      }}
    >
      {/* Header */}
      <SummaryHeader
        exerciseType={summaryData.exerciseType}
        timestamp={summaryData.timestamp}
        duration={summaryData.duration}
        overallScore={summaryData.overallScore}
        language={language}
      />

      {/* Content sections */}
      <div className="max-h-[60vh] overflow-y-auto">
        {/* Angle Statistics */}
        <CollapsibleSection
          title="3D 각도 통계"
          titleEn="3D Angle Statistics"
          defaultExpanded={true}
          language={language}
        >
          <AngleStatisticsCard statistics={summaryData.angleStatistics} language={language} />
        </CollapsibleSection>

        {/* ROM Achievement */}
        <CollapsibleSection
          title="ROM 달성도"
          titleEn="ROM Achievement"
          defaultExpanded={true}
          language={language}
        >
          <ROMAchievementSection achievements={summaryData.romAchievements} language={language} />
        </CollapsibleSection>

        {/* Symmetry Scores */}
        {summaryData.symmetryScores.length > 0 && (
          <CollapsibleSection
            title="좌우 대칭"
            titleEn="Bilateral Symmetry"
            defaultExpanded={false}
            language={language}
          >
            <SymmetryScoreCard scores={summaryData.symmetryScores} language={language} />
          </CollapsibleSection>
        )}

        {/* Form Breakdown */}
        <CollapsibleSection
          title="자세 분석"
          titleEn="Form Analysis"
          defaultExpanded={true}
          language={language}
        >
          <FormBreakdownChart breakdown={summaryData.formBreakdown} language={language} />
        </CollapsibleSection>

        {/* Rep Quality Trend */}
        {summaryData.repQualityTrend.length > 0 && (
          <CollapsibleSection
            title="반복별 품질"
            titleEn="Rep Quality"
            defaultExpanded={false}
            language={language}
          >
            <RepQualityTrendChart trend={summaryData.repQualityTrend} language={language} />
          </CollapsibleSection>
        )}
      </div>

      {/* Actions Footer */}
      <div className="p-4" style={{ borderTop: `1px solid ${SUMMARY_COLORS.border}` }}>
        <div className="flex gap-3">
          {onSaveNotes && (
            <button
              onClick={() => {}}
              className="flex-1 py-3 rounded-lg font-medium text-sm transition-colors hover:opacity-90"
              style={{
                backgroundColor: SUMMARY_COLORS.surfaceElevated,
                color: SUMMARY_COLORS.textPrimary,
              }}
            >
              {language === 'ko' ? '메모 추가' : 'Add Notes'}
            </button>
          )}
          <ShareAnalysisButton
            session={session}
            summaryData={summaryData}
            language={language}
          />
          {onClose && (
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-lg font-medium text-sm transition-colors hover:opacity-90"
              style={{
                backgroundColor: SUMMARY_COLORS.primary,
                color: SUMMARY_COLORS.backgroundSolid,
              }}
            >
              {language === 'ko' ? '닫기' : 'Close'}
            </button>
          )}
        </div>
      </div>

      {/* Bottom accent */}
      <GradientAccentBar />
    </div>
  );
}

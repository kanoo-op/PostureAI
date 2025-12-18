'use client';

import React from 'react';
import { VIDEO_ANALYSIS_COLORS, TRANSLATIONS } from './constants';
import SideBySideComparisonView from './SideBySideComparisonView';
import SynchronizedPlaybackControls from './SynchronizedPlaybackControls';
import RepSelectorPanel from './RepSelectorPanel';
import FormFeedbackPanel from './FormFeedbackPanel';
import PDFExportButton from './PDFExportButton';
import { useSynchronizedPlayback } from './hooks/useSynchronizedPlayback';
import { useRepNavigation } from './hooks/useRepNavigation';
import { useSkeletonControls } from './hooks/useSkeletonControls';
import type { VideoAnalysisViewProps } from './types';

export default function VideoAnalysisView({
  videoUrl,
  analysisResult,
  repAnalysisResult,
  language = 'ko',
  onBack,
}: VideoAnalysisViewProps) {
  const t = TRANSLATIONS[language];

  // Synchronized playback state
  const {
    videoRef,
    currentTime,
    duration,
    isPlaying,
    playbackRate,
    currentPose,
    currentFrameIndex,
    totalFrames,
    isAtStart,
    isAtEnd,
    play,
    pause,
    seek,
    setPlaybackRate,
    stepForward,
    stepBackward,
  } = useSynchronizedPlayback(analysisResult);

  // Rep navigation
  const { selectedRepIndex, currentRepIndex, selectRep } = useRepNavigation(
    repAnalysisResult,
    currentTime,
    seek
  );

  // Skeleton controls
  const {
    viewMode,
    opacity,
    showJointAngles,
    focusModeEnabled,
    setViewMode,
    setOpacity,
    toggleJointAngles,
    toggleFocusMode,
    problematicJoints,
    hasProblems,
  } = useSkeletonControls(repAnalysisResult, currentRepIndex, currentTime * 1000);

  // Score color helper
  const getScoreColor = (score: number) => {
    if (score >= 80) return VIDEO_ANALYSIS_COLORS.statusGood;
    if (score >= 60) return VIDEO_ANALYSIS_COLORS.statusWarning;
    return VIDEO_ANALYSIS_COLORS.statusError;
  };

  return (
    <div
      className="min-h-screen p-4 md:p-6"
      style={{ backgroundColor: VIDEO_ANALYSIS_COLORS.background }}
    >
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg transition-colors hover:bg-gray-800"
              aria-label={t.back}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke={VIDEO_ANALYSIS_COLORS.textSecondary}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          <h1
            className="text-2xl font-bold"
            style={{ color: VIDEO_ANALYSIS_COLORS.textPrimary }}
          >
            {t.pageTitle}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Overall Score Badge */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{
              backgroundColor: VIDEO_ANALYSIS_COLORS.surface,
              border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
            }}
          >
            <span
              className="text-sm"
              style={{ color: VIDEO_ANALYSIS_COLORS.textSecondary }}
            >
              {t.overallScore}
            </span>
            <span
              className="text-2xl font-bold"
              style={{
                color: getScoreColor(repAnalysisResult.summary.averageScore),
              }}
            >
              {repAnalysisResult.summary.averageScore}
            </span>
          </div>

          <PDFExportButton
            repAnalysisResult={repAnalysisResult}
            language={language}
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Video and Skeleton View - Takes 3 columns */}
        <div className="lg:col-span-3 space-y-4">
          <SideBySideComparisonView
            videoRef={videoRef}
            videoUrl={videoUrl}
            currentPose={currentPose}
            language={language}
            viewMode={viewMode}
            opacity={opacity}
            showJointAngles={showJointAngles}
            focusModeEnabled={focusModeEnabled}
            hasProblems={hasProblems}
            problematicJoints={problematicJoints}
            onViewModeChange={setViewMode}
            onOpacityChange={setOpacity}
            onToggleJointAngles={toggleJointAngles}
            onToggleFocusMode={toggleFocusMode}
          />

          <SynchronizedPlaybackControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            playbackRate={playbackRate}
            onPlay={play}
            onPause={pause}
            onSeek={seek}
            onSetPlaybackRate={setPlaybackRate}
            onStepForward={stepForward}
            onStepBackward={stepBackward}
            currentFrameIndex={currentFrameIndex}
            totalFrames={totalFrames}
            isAtStart={isAtStart}
            isAtEnd={isAtEnd}
            repBoundaries={repAnalysisResult.reps}
            frames={analysisResult.frames}
            language={language}
            repAnalysisResult={repAnalysisResult}
          />
        </div>

        {/* Right Sidebar - Takes 1 column */}
        <div className="space-y-4">
          <RepSelectorPanel
            reps={repAnalysisResult.reps}
            selectedRepIndex={selectedRepIndex}
            onSelectRep={selectRep}
            currentTime={currentTime}
            language={language}
          />

          <FormFeedbackPanel
            currentTimestamp={currentTime * 1000}
            repAnalysisResult={repAnalysisResult}
            currentRepIndex={currentRepIndex}
            language={language}
          />
        </div>
      </div>
    </div>
  );
}

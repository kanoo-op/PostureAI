'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import { CLIP_EDITOR_COLORS } from './constants';
import { useClipEditor } from './hooks/useClipEditor';
import TrimHandle from './TrimHandle';
import TrimRegionOverlay from './TrimRegionOverlay';
import RepRangeSelector from './RepRangeSelector';
import VideoPreviewCanvas from './VideoPreviewCanvas';
import ClipDurationDisplay from './ClipDurationDisplay';
import UndoRedoControls from './UndoRedoControls';
import KeyboardShortcutsHint from './KeyboardShortcutsHint';
import ThumbnailStrip from '../VideoTimeline/ThumbnailStrip';
import type { RepAnalysisResult, ThumbnailData } from '@/types/video';
import type { ClipBoundary } from '@/types/videoClip';

interface VideoClipEditorProps {
  videoElement: HTMLVideoElement | null;
  duration: number;             // Video duration in ms
  frameRate: number;            // Video frame rate
  repBoundaries: RepAnalysisResult[];
  thumbnails: ThumbnailData[];
  onExport: (boundary: ClipBoundary, selectedReps: number[]) => void;
  onCancel: () => void;
  language: 'ko' | 'en';
  initialBoundary?: ClipBoundary;
}

const TRANSLATIONS = {
  ko: {
    title: '클립 편집기',
    export: '분석 시작',
    cancel: '취소',
    selectSegment: '분석할 구간을 선택하세요',
  },
  en: {
    title: 'Clip Editor',
    export: 'Start Analysis',
    cancel: 'Cancel',
    selectSegment: 'Select a segment to analyze',
  },
};

export default function VideoClipEditor({
  videoElement,
  duration,
  frameRate,
  repBoundaries,
  thumbnails,
  onExport,
  onCancel,
  language,
  initialBoundary,
}: VideoClipEditorProps) {
  const t = TRANSLATIONS[language];
  const timelineRef = useRef<HTMLDivElement>(null);

  const {
    clipBoundary,
    selectedRepRange,
    isDragging,
    previewTime,
    clipDurationMs,
    isValidDuration,
    canUndo,
    canRedo,
    startDrag,
    endDrag,
    updateDragPosition,
    selectRepRange,
    stepFrame,
    undo,
    redo,
    setPreviewTime,
  } = useClipEditor({
    duration,
    frameRate,
    repBoundaries,
    initialBoundary,
  });

  // Calculate positions as percentages
  const startPercent = (clipBoundary.startTimestamp / duration) * 100;
  const endPercent = (clipBoundary.endTimestamp / duration) * 100;

  // Handle position change from drag
  const handlePositionChange = useCallback((percent: number) => {
    const timestampMs = (percent / 100) * duration;
    updateDragPosition(timestampMs);
  }, [duration, updateDragPosition]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default for arrow keys and space
      if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      // Undo/Redo
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          undo();
          return;
        }
        if (e.key === 'y') {
          e.preventDefault();
          redo();
          return;
        }
      }

      // Frame stepping
      if (e.key === 'ArrowLeft') {
        stepFrame('backward', e.shiftKey ? 'end' : 'start');
      }
      if (e.key === 'ArrowRight') {
        stepFrame('forward', e.shiftKey ? 'end' : 'start');
      }

      // Space for play/pause preview
      if (e.key === ' ' && videoElement) {
        if (videoElement.paused) {
          videoElement.play();
        } else {
          videoElement.pause();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, stepFrame, videoElement]);

  // Get selected rep numbers for export
  const getSelectedRepNumbers = (): number[] => {
    if (!selectedRepRange) return [];
    const reps: number[] = [];
    for (let i = selectedRepRange.startRepIndex; i <= selectedRepRange.endRepIndex; i++) {
      if (repBoundaries[i]) {
        reps.push(repBoundaries[i].repNumber);
      }
    }
    return reps;
  };

  // Handle export
  const handleExport = () => {
    onExport(clipBoundary, getSelectedRepNumbers());
  };

  // Handle timeline click to preview
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    const timestampMs = (percent / 100) * duration;
    setPreviewTime(timestampMs);
  };

  // Calculate rep marker positions
  const repMarkers = repBoundaries.map((rep, index) => {
    const startPercent = (rep.startTimestamp / duration) * 100;
    const endPercent = (rep.endTimestamp / duration) * 100;
    const isSelected = selectedRepRange
      ? index >= selectedRepRange.startRepIndex && index <= selectedRepRange.endRepIndex
      : false;

    return {
      repNumber: rep.repNumber,
      startPercent,
      endPercent,
      isSelected,
    };
  });

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{
        backgroundColor: CLIP_EDITOR_COLORS.backgroundSurface,
        border: `1px solid ${CLIP_EDITOR_COLORS.border}`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          borderBottom: `1px solid ${CLIP_EDITOR_COLORS.border}`,
        }}
      >
        <h3
          className="font-semibold"
          style={{ color: CLIP_EDITOR_COLORS.textPrimary }}
        >
          {t.title}
        </h3>

        <div className="flex items-center gap-2">
          <UndoRedoControls
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
          />
          <KeyboardShortcutsHint language={language} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Video Preview */}
        <div className="flex justify-center">
          <VideoPreviewCanvas
            videoElement={videoElement}
            previewTime={previewTime || clipBoundary.startTimestamp}
            width={320}
            height={180}
          />
        </div>

        {/* Timeline Track */}
        <div
          ref={timelineRef}
          className="relative h-16 rounded-lg overflow-hidden cursor-pointer"
          style={{ backgroundColor: CLIP_EDITOR_COLORS.timelineTrack }}
          onClick={handleTimelineClick}
        >
          {/* Thumbnail Strip */}
          <ThumbnailStrip
            thumbnails={thumbnails}
            visibleRange={{ start: 0, end: duration }}
            duration={duration / 1000}
            isLoading={false}
          />

          {/* Rep markers */}
          {repMarkers.map((marker) => (
            <div
              key={marker.repNumber}
              className="absolute top-0 h-full z-5 pointer-events-none"
              style={{
                left: `${marker.startPercent}%`,
                width: `${marker.endPercent - marker.startPercent}%`,
                borderLeft: `2px solid ${marker.isSelected ? CLIP_EDITOR_COLORS.repMarkerSelected : CLIP_EDITOR_COLORS.repMarker}`,
                borderRight: `2px solid ${marker.isSelected ? CLIP_EDITOR_COLORS.repMarkerSelected : CLIP_EDITOR_COLORS.repMarker}`,
                backgroundColor: marker.isSelected ? `${CLIP_EDITOR_COLORS.repMarkerSelected}20` : 'transparent',
              }}
            >
              <span
                className="absolute top-0 left-1 text-xs font-bold"
                style={{ color: marker.isSelected ? CLIP_EDITOR_COLORS.repMarkerSelected : CLIP_EDITOR_COLORS.repMarker }}
              >
                {marker.repNumber}
              </span>
            </div>
          ))}

          {/* Trim Region Overlay */}
          <TrimRegionOverlay
            startPercent={startPercent}
            endPercent={endPercent}
          />

          {/* Trim Handles */}
          <TrimHandle
            position={startPercent}
            type="start"
            isActive={isDragging === 'start'}
            onDragStart={() => startDrag('start')}
            onDragEnd={endDrag}
            onPositionChange={handlePositionChange}
            containerRef={timelineRef}
            aria-label="Start trim handle"
          />
          <TrimHandle
            position={endPercent}
            type="end"
            isActive={isDragging === 'end'}
            onDragStart={() => startDrag('end')}
            onDragEnd={endDrag}
            onPositionChange={handlePositionChange}
            containerRef={timelineRef}
            aria-label="End trim handle"
          />

          {/* Playhead indicator for preview time */}
          {previewTime > 0 && (
            <div
              className="absolute top-0 h-full w-0.5 z-40 pointer-events-none"
              style={{
                left: `${(previewTime / duration) * 100}%`,
                backgroundColor: CLIP_EDITOR_COLORS.timelinePlayhead,
                boxShadow: `0 0 4px ${CLIP_EDITOR_COLORS.timelinePlayhead}`,
              }}
            />
          )}
        </div>

        {/* Duration Display */}
        <ClipDurationDisplay
          startTime={clipBoundary.startTimestamp}
          endTime={clipBoundary.endTimestamp}
          isValid={isValidDuration}
          language={language}
        />

        {/* Rep Range Selector */}
        {repBoundaries.length > 0 && (
          <RepRangeSelector
            reps={repBoundaries}
            selectedRange={selectedRepRange}
            onSelectRange={selectRepRange}
            language={language}
          />
        )}

        {/* Instruction text */}
        <p
          className="text-sm text-center"
          style={{ color: CLIP_EDITOR_COLORS.textMuted }}
        >
          {t.selectSegment}
        </p>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-end gap-3 px-4 py-3"
        style={{
          borderTop: `1px solid ${CLIP_EDITOR_COLORS.border}`,
        }}
      >
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
          style={{
            backgroundColor: CLIP_EDITOR_COLORS.backgroundElevated,
            color: CLIP_EDITOR_COLORS.textSecondary,
          }}
        >
          {t.cancel}
        </button>

        <button
          onClick={handleExport}
          disabled={!isValidDuration}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: CLIP_EDITOR_COLORS.primary,
            color: CLIP_EDITOR_COLORS.textPrimary,
          }}
        >
          {t.export}
        </button>
      </div>

      {/* Bottom gradient accent */}
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, ${CLIP_EDITOR_COLORS.primary}, ${CLIP_EDITOR_COLORS.success})`,
        }}
      />
    </div>
  );
}

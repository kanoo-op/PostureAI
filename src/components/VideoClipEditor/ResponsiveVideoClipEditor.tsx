'use client';

import React, { useState, useCallback } from 'react';
import VideoClipEditor from './VideoClipEditor';
import ExportProgressModal from './ExportProgressModal';
import { useClipExport } from './hooks/useClipExport';
import type { RepAnalysisResult, ThumbnailData, VideoAnalysisResult, VideoRepAnalysisResult } from '@/types/video';
import type { ClipBoundary, ClippedSession } from '@/types/videoClip';

interface ResponsiveVideoClipEditorProps {
  videoElement: HTMLVideoElement | null;
  duration: number;             // Video duration in ms
  frameRate: number;            // Video frame rate
  repBoundaries: RepAnalysisResult[];
  thumbnails: ThumbnailData[];
  parentSessionId: string;
  existingAnalysis?: VideoAnalysisResult;
  existingRepAnalysis?: VideoRepAnalysisResult;
  onClipCreated: (session: ClippedSession) => void;
  onClose: () => void;
  language: 'ko' | 'en';
  initialBoundary?: ClipBoundary;
}

export default function ResponsiveVideoClipEditor({
  videoElement,
  duration,
  frameRate,
  repBoundaries,
  thumbnails,
  parentSessionId,
  existingAnalysis,
  existingRepAnalysis,
  onClipCreated,
  onClose,
  language,
  initialBoundary,
}: ResponsiveVideoClipEditorProps) {
  const [showModal, setShowModal] = useState(false);
  const [pendingBoundary, setPendingBoundary] = useState<ClipBoundary | null>(null);
  const [pendingReps, setPendingReps] = useState<number[]>([]);

  const {
    status,
    progress,
    message,
    result,
    startExport,
    cancelExport,
    reset,
  } = useClipExport({
    parentSessionId,
    onComplete: (session) => {
      // Keep modal open to show completion
    },
    onError: (error) => {
      console.error('Clip export error:', error);
    },
  });

  // Handle export request from editor
  const handleExport = useCallback((boundary: ClipBoundary, selectedReps: number[]) => {
    setPendingBoundary(boundary);
    setPendingReps(selectedReps);
    setShowModal(true);

    // Start export process
    startExport(boundary, selectedReps, existingAnalysis, existingRepAnalysis);
  }, [startExport, existingAnalysis, existingRepAnalysis]);

  // Handle cancel from modal
  const handleCancel = useCallback(() => {
    cancelExport();
    setShowModal(false);
    setPendingBoundary(null);
    setPendingReps([]);
  }, [cancelExport]);

  // Handle view result
  const handleViewResult = useCallback(() => {
    if (result) {
      onClipCreated(result);
      setShowModal(false);
      reset();
    }
  }, [result, onClipCreated, reset]);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setShowModal(false);
    reset();
  }, [reset]);

  // Handle editor close
  const handleEditorClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
      <VideoClipEditor
        videoElement={videoElement}
        duration={duration}
        frameRate={frameRate}
        repBoundaries={repBoundaries}
        thumbnails={thumbnails}
        onExport={handleExport}
        onCancel={handleEditorClose}
        language={language}
        initialBoundary={initialBoundary}
      />

      <ExportProgressModal
        isOpen={showModal}
        status={status}
        progress={progress}
        message={message}
        onCancel={handleCancel}
        onViewResult={handleViewResult}
        onClose={handleModalClose}
        language={language}
      />
    </div>
  );
}

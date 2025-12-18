'use client';

import React, { useRef, useState, useEffect } from 'react';
import { VIDEO_COLORS } from './constants';
import FileInfoDisplay from './FileInfoDisplay';
import VideoPlayer, { VideoPlayerRef } from './VideoPlayer';
import type { VideoMetadata } from '@/types/video';

interface VideoPreviewCardProps {
  file: File;
  metadata: VideoMetadata;
  onRemove?: () => void;
  onAnalyze?: () => void;
  className?: string;
}

export default function VideoPreviewCard({
  file,
  metadata,
  onRemove,
  onAnalyze,
  className = '',
}: VideoPreviewCardProps) {
  const playerRef = useRef<VideoPlayerRef>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (!videoUrl) return null;

  return (
    <div
      className={`rounded-2xl overflow-hidden border ${className}`}
      style={{
        backgroundColor: VIDEO_COLORS.surface,
        borderColor: VIDEO_COLORS.border,
      }}
    >
      {/* Video player */}
      <VideoPlayer
        ref={playerRef}
        src={videoUrl}
        className="aspect-video"
      />

      {/* Info and actions */}
      <div className="p-4 space-y-4">
        <FileInfoDisplay metadata={metadata} />

        <div className="flex gap-3">
          {onRemove && (
            <button
              onClick={onRemove}
              className="flex-1 py-2.5 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: VIDEO_COLORS.dropzoneIdle,
                color: VIDEO_COLORS.textSecondary,
              }}
            >
              다른 영상 선택
            </button>
          )}
          {onAnalyze && (
            <button
              onClick={onAnalyze}
              className="flex-1 py-2.5 rounded-lg font-medium transition-colors hover:opacity-90"
              style={{
                backgroundColor: VIDEO_COLORS.primary,
                color: '#FFFFFF',
              }}
            >
              분석 시작
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

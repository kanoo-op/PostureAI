'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ANALYSIS_COLORS, RECORDING_COLORS } from './constants';

interface RecordingPreviewProps {
  videoBlob: Blob;
  onConfirm: () => void;
  onRetake: () => void;
  onCancel: () => void;
  className?: string;
}

export default function RecordingPreview({
  videoBlob,
  onConfirm,
  onRetake,
  onCancel,
  className = '',
}: RecordingPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(videoBlob);
    setVideoUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoBlob]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Video preview */}
      <div
        className="relative rounded-xl overflow-hidden mb-4"
        style={{ backgroundColor: RECORDING_COLORS.cameraPreviewBg }}
      >
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full aspect-video object-contain"
            onEnded={handleVideoEnded}
            playsInline
          />
        )}

        {/* Play/Pause overlay */}
        <button
          onClick={handlePlayPause}
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
          aria-label={isPlaying ? '일시 정지' : '재생'}
        >
          {!isPlaying && (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
            >
              <svg
                className="w-8 h-8 ml-1"
                fill="currentColor"
                viewBox="0 0 24 24"
                style={{ color: ANALYSIS_COLORS.backgroundSolid }}
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
        </button>

        {/* File size indicator */}
        <div
          className="absolute bottom-3 right-3 px-2 py-1 rounded text-xs"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: ANALYSIS_COLORS.textPrimary,
          }}
        >
          {formatSize(videoBlob.size)}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        {/* Primary action - Analyze */}
        <button
          onClick={onConfirm}
          className="w-full py-4 rounded-xl font-semibold text-lg transition-all"
          style={{
            background: `linear-gradient(135deg, ${ANALYSIS_COLORS.primary}, ${ANALYSIS_COLORS.secondary})`,
            color: ANALYSIS_COLORS.backgroundSolid,
            boxShadow: `0 4px 20px ${ANALYSIS_COLORS.primaryGlow}`,
          }}
          aria-label="녹화 영상 분석하기"
        >
          분석하기
        </button>

        {/* Secondary actions */}
        <div className="flex gap-3">
          <button
            onClick={onRetake}
            className="flex-1 py-3 rounded-xl font-medium transition-colors"
            style={{
              backgroundColor: ANALYSIS_COLORS.surfaceElevated,
              color: ANALYSIS_COLORS.textPrimary,
              border: `1px solid ${ANALYSIS_COLORS.border}`,
            }}
            aria-label="다시 녹화하기"
          >
            다시 녹화
          </button>

          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-medium transition-colors"
            style={{
              backgroundColor: 'transparent',
              color: ANALYSIS_COLORS.textSecondary,
              border: `1px solid ${ANALYSIS_COLORS.border}`,
            }}
            aria-label="취소"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

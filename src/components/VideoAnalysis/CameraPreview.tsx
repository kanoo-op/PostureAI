'use client';

import React, { useRef, useEffect } from 'react';
import { RECORDING_COLORS } from './constants';

interface CameraPreviewProps {
  stream: MediaStream | null;
  isRecording: boolean;
  mirrored?: boolean;
  width?: number;
  height?: number;
  className?: string;
}

export default function CameraPreview({
  stream,
  isRecording,
  mirrored = true,
  width = 1280,
  height = 720,
  className = '',
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement && stream) {
      videoElement.srcObject = stream;
    }

    return () => {
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{ backgroundColor: RECORDING_COLORS.cameraPreviewBg }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        width={width}
        height={height}
        className="w-full h-full object-cover"
        style={{
          transform: mirrored ? 'scaleX(-1)' : 'none',
        }}
        aria-label={isRecording ? '녹화 중인 웹캠 화면' : '웹캠 미리보기'}
      />
      {!stream && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: RECORDING_COLORS.cameraPreviewBg }}
        >
          <div className="text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: '#ffffff' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm opacity-50" style={{ color: '#ffffff' }}>
              카메라 연결 중...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

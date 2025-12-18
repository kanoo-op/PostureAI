'use client';

import React from 'react';
import { VIDEO_ANALYSIS_COLORS, TRANSLATIONS } from './constants';

interface VideoPanelProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoUrl: string;
  language: 'ko' | 'en';
}

export default function VideoPanel({ videoRef, videoUrl, language }: VideoPanelProps) {
  const t = TRANSLATIONS[language];

    return (
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          backgroundColor: VIDEO_ANALYSIS_COLORS.surfaceSolid,
          border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
        }}
      >
        {/* Label */}
        <div
          className="absolute top-3 left-3 px-3 py-1 rounded-lg text-sm font-medium z-10"
          style={{
            backgroundColor: VIDEO_ANALYSIS_COLORS.backgroundTranslucent,
            color: VIDEO_ANALYSIS_COLORS.textSecondary,
          }}
        >
          {t.originalVideo}
        </div>

        {/* Video element */}
        <video
          ref={videoRef as React.RefObject<HTMLVideoElement>}
          src={videoUrl}
          className="w-full h-full object-contain"
          playsInline
          preload="metadata"
        />
      </div>
    );
}

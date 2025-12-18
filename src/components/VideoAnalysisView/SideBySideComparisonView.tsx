'use client';

import React, { useState, useEffect } from 'react';
import VideoPanel from './VideoPanel';
import SkeletonPanel from './SkeletonPanel';
import SkeletonCanvasLayer from './SkeletonCanvasLayer';
import SkeletonControlToolbar from './SkeletonControlToolbar';
import { VIDEO_ANALYSIS_COLORS } from './constants';
import type { Pose3D } from '@/types/pose';
import type { SkeletonViewMode, ProblematicJoint } from './types';

interface SideBySideComparisonViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoUrl: string;
  currentPose: Pose3D | null;
  language: 'ko' | 'en';
  // New props for controls
  viewMode: SkeletonViewMode;
  opacity: number;
  showJointAngles: boolean;
  focusModeEnabled: boolean;
  hasProblems: boolean;
  problematicJoints: ProblematicJoint[];
  onViewModeChange: (mode: SkeletonViewMode) => void;
  onOpacityChange: (opacity: number) => void;
  onToggleJointAngles: () => void;
  onToggleFocusMode: () => void;
}

export default function SideBySideComparisonView({
  videoRef,
  videoUrl,
  currentPose,
  language,
  viewMode,
  opacity,
  showJointAngles,
  focusModeEnabled,
  hasProblems,
  problematicJoints,
  onViewModeChange,
  onOpacityChange,
  onToggleJointAngles,
  onToggleFocusMode,
}: SideBySideComparisonViewProps) {
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });

  // Update dimensions when video loads
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDimensions({
        width: video.videoWidth || 640,
        height: video.videoHeight || 480,
      });
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [videoRef]);

  return (
    <div>
      {/* Control Toolbar */}
      <SkeletonControlToolbar
        viewMode={viewMode}
        opacity={opacity}
        showJointAngles={showJointAngles}
        focusModeEnabled={focusModeEnabled}
        hasProblems={hasProblems}
        onViewModeChange={onViewModeChange}
        onOpacityChange={onOpacityChange}
        onToggleJointAngles={onToggleJointAngles}
        onToggleFocusMode={onToggleFocusMode}
        language={language}
      />

      {/* View Content */}
      {viewMode === 'side-by-side' ? (
        // Side-by-side mode: video and skeleton panels next to each other
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <VideoPanel videoRef={videoRef} videoUrl={videoUrl} language={language} />
          <SkeletonPanel
            pose={currentPose}
            width={dimensions.width}
            height={dimensions.height}
            language={language}
            showJointAngles={showJointAngles}
            focusModeEnabled={focusModeEnabled}
            problematicJoints={problematicJoints}
          />
        </div>
      ) : (
        // Overlay mode: skeleton overlaid on video
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            backgroundColor: VIDEO_ANALYSIS_COLORS.surfaceSolid,
            border: `1px solid ${VIDEO_ANALYSIS_COLORS.border}`,
          }}
        >
          {/* Video element */}
          <video
            ref={videoRef as React.RefObject<HTMLVideoElement>}
            src={videoUrl}
            className="w-full h-full object-contain"
            playsInline
            preload="metadata"
          />

          {/* Skeleton overlay layer */}
          <SkeletonCanvasLayer
            pose={currentPose}
            width={dimensions.width}
            height={dimensions.height}
            opacity={opacity}
            showJointAngles={showJointAngles}
            focusModeEnabled={focusModeEnabled}
            problematicJoints={problematicJoints}
          />
        </div>
      )}
    </div>
  );
}

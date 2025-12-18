'use client';

import React from 'react';
import { VIDEO_COLORS } from './constants';
import FormatBadge from './FormatBadge';
import { formatFileSize, formatDuration } from '@/utils/videoProcessingUtils';
import type { VideoMetadata } from '@/types/video';

interface FileInfoDisplayProps {
  metadata: VideoMetadata;
  className?: string;
}

export default function FileInfoDisplay({ metadata, className = '' }: FileInfoDisplayProps) {
  return (
    <div
      className={`p-3 rounded-lg ${className}`}
      style={{ backgroundColor: VIDEO_COLORS.dropzoneIdle }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p
            className="font-medium truncate text-sm"
            style={{ color: VIDEO_COLORS.textPrimary }}
            title={metadata.fileName}
          >
            {metadata.fileName}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span
              className="text-xs"
              style={{ color: VIDEO_COLORS.textSecondary }}
            >
              {formatFileSize(metadata.fileSize)}
            </span>
            <span
              className="text-xs"
              style={{ color: VIDEO_COLORS.textSecondary }}
            >
              {formatDuration(metadata.duration)}
            </span>
            <span
              className="text-xs"
              style={{ color: VIDEO_COLORS.textSecondary }}
            >
              {metadata.width}×{metadata.height}
            </span>
          </div>
        </div>
        <FormatBadge format={metadata.mimeType} />
      </div>
    </div>
  );
}

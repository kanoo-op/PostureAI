'use client';

import React from 'react';
import { FeedbackQueueItem } from './FeedbackQueueItem';
import type { VideoFeedbackQueueItem } from '@/types/videoVoiceFeedback';

// Design tokens
const COLORS = {
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  surface: 'rgba(30, 41, 59, 0.95)',
  borderDefault: 'rgba(75, 85, 99, 0.3)',
};

interface UpcomingFeedbackPreviewProps {
  items: VideoFeedbackQueueItem[];
  maxItems?: number;
  currentVideoTime?: number;
  videoDuration?: number;
}

export function UpcomingFeedbackPreview({
  items,
  maxItems = 5,
  videoDuration,
}: UpcomingFeedbackPreviewProps) {
  const displayItems = items.slice(0, maxItems);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '4px',
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
            color: COLORS.textPrimary,
          }}
        >
          Upcoming Feedback
        </h4>
        <span
          style={{
            fontSize: '12px',
            color: COLORS.textMuted,
          }}
        >
          {items.length} items
        </span>
      </div>

      {/* Items list */}
      {displayItems.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {displayItems.map((item, index) => (
            <FeedbackQueueItem
              key={item.id}
              id={item.id}
              type={item.type}
              priority={item.priority}
              content={item.content}
              videoTimestamp={item.videoTimestamp}
              repNumber={item.repNumber}
              isRepSummary={item.isRepSummary}
              feedbackLevel={item.feedbackLevel}
              isNext={index === 0}
              videoDuration={videoDuration}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            backgroundColor: COLORS.surface,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: '8px',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: COLORS.textMuted,
            }}
          >
            No upcoming feedback
          </p>
        </div>
      )}

      {/* More indicator */}
      {items.length > maxItems && (
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            color: COLORS.textMuted,
            textAlign: 'center',
          }}
        >
          +{items.length - maxItems} more items
        </p>
      )}
    </div>
  );
}

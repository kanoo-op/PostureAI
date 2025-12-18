'use client';

import React from 'react';

// Design tokens
const COLORS = {
  repBoundary: '#7C3AED',
  repBoundaryGlow: 'rgba(124, 58, 237, 0.3)',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  surface: 'rgba(30, 41, 59, 0.95)',
  borderDefault: 'rgba(75, 85, 99, 0.3)',
  voiceActive: '#00F5A0',
  priorityHigh: '#FFB800',
  priorityCritical: '#FF3D71',
};

interface RepSummaryCardProps {
  repNumber: number;
  score: number;
  primaryIssue?: string;
  isAnimated?: boolean;
  onDismiss?: () => void;
}

function getScoreColor(score: number): string {
  if (score >= 80) return COLORS.voiceActive;
  if (score >= 60) return COLORS.priorityHigh;
  return COLORS.priorityCritical;
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Needs Work';
}

export function RepSummaryCard({
  repNumber,
  score,
  primaryIssue,
  isAnimated = false,
  onDismiss,
}: RepSummaryCardProps) {
  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        backgroundColor: COLORS.surface,
        border: `1px solid ${COLORS.borderDefault}`,
        borderRadius: '12px',
        boxShadow: isAnimated ? `0 0 16px ${COLORS.repBoundaryGlow}` : 'none',
        animation: isAnimated ? 'slideIn 0.3s ease' : 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        {/* Rep badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              padding: '4px 10px',
              backgroundColor: `${COLORS.repBoundary}30`,
              borderRadius: '6px',
            }}
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: COLORS.repBoundary,
              }}
            >
              Rep {repNumber}
            </span>
          </div>
          <span
            style={{
              fontSize: '12px',
              color: COLORS.textSecondary,
            }}
          >
            Complete
          </span>
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            style={{
              padding: '4px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              opacity: 0.6,
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke={COLORS.textMuted} strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Score display */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: primaryIssue ? '12px' : '0',
        }}
      >
        {/* Score circle */}
        <div
          style={{
            position: 'relative',
            width: '56px',
            height: '56px',
          }}
        >
          <svg width="56" height="56" viewBox="0 0 56 56">
            {/* Background circle */}
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke={COLORS.borderDefault}
              strokeWidth="4"
            />
            {/* Progress circle */}
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke={scoreColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 150.8} 150.8`}
              transform="rotate(-90 28 28)"
              style={{
                transition: 'stroke-dasharray 0.5s ease',
              }}
            />
          </svg>
          <span
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '16px',
              fontWeight: 700,
              color: scoreColor,
            }}
          >
            {Math.round(score)}
          </span>
        </div>

        {/* Score label */}
        <div>
          <p
            style={{
              margin: '0 0 4px',
              fontSize: '18px',
              fontWeight: 600,
              color: scoreColor,
            }}
          >
            {scoreLabel}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: COLORS.textSecondary,
            }}
          >
            Form Score
          </p>
        </div>
      </div>

      {/* Primary issue */}
      {primaryIssue && (
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'rgba(17, 24, 39, 0.5)',
            borderRadius: '8px',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: COLORS.textSecondary,
            }}
          >
            <span style={{ color: COLORS.priorityHigh, marginRight: '6px' }}>Note:</span>
            {primaryIssue}
          </p>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

const COLORS_EXTENDED = {
  ...COLORS,
  textMuted: '#64748B',
};

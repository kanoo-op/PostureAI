'use client';

import React from 'react';

// Design tokens
const COLORS = {
  autoPauseOverlay: 'rgba(255, 61, 113, 0.15)',
  priorityCritical: '#FF3D71',
  priorityCriticalGlow: 'rgba(255, 61, 113, 0.4)',
  voiceActive: '#00F5A0',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  surface: 'rgba(30, 41, 59, 0.95)',
  borderDefault: 'rgba(75, 85, 99, 0.3)',
};

interface AutoPauseNotificationProps {
  isVisible: boolean;
  issueDescription: string;
  repNumber?: number;
  onResume: () => void;
}

export function AutoPauseNotification({
  isVisible,
  issueDescription,
  repNumber,
  onResume,
}: AutoPauseNotificationProps) {
  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.autoPauseOverlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.3s ease',
      }}
      role="alertdialog"
      aria-labelledby="auto-pause-title"
      aria-describedby="auto-pause-description"
    >
      <div
        style={{
          backgroundColor: COLORS.surface,
          border: `2px solid ${COLORS.priorityCritical}`,
          borderRadius: '16px',
          padding: '24px 32px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: `0 0 32px ${COLORS.priorityCriticalGlow}`,
          animation: 'slideUp 0.3s ease',
        }}
      >
        {/* Alert icon */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              backgroundColor: `${COLORS.priorityCritical}20`,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z"
                stroke={COLORS.priorityCritical}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="12"
                y1="8"
                x2="12"
                y2="12"
                stroke={COLORS.priorityCritical}
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="16" r="1" fill={COLORS.priorityCritical} />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2
          id="auto-pause-title"
          style={{
            margin: '0 0 8px',
            fontSize: '18px',
            fontWeight: 600,
            color: COLORS.priorityCritical,
            textAlign: 'center',
          }}
        >
          Critical Issue Detected
        </h2>

        {/* Rep number */}
        {repNumber && (
          <p
            style={{
              margin: '0 0 12px',
              fontSize: '13px',
              color: COLORS.textSecondary,
              textAlign: 'center',
            }}
          >
            During Rep {repNumber}
          </p>
        )}

        {/* Issue description */}
        <p
          id="auto-pause-description"
          style={{
            margin: '0 0 24px',
            fontSize: '15px',
            color: COLORS.textPrimary,
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          {issueDescription}
        </p>

        {/* Resume button */}
        <button
          onClick={onResume}
          style={{
            width: '100%',
            padding: '12px 24px',
            backgroundColor: COLORS.voiceActive,
            border: 'none',
            borderRadius: '8px',
            color: '#000000',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.boxShadow = `0 4px 16px ${COLORS.voiceActive}50`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Resume Playback
        </button>

        {/* Pause indicator */}
        <p
          style={{
            margin: '16px 0 0',
            fontSize: '12px',
            color: COLORS.textSecondary,
            textAlign: 'center',
          }}
        >
          Video paused for your review
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
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

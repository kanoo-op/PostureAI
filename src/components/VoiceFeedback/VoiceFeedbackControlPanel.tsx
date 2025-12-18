'use client';

import React, { useState } from 'react';
import { VoiceFeedbackToggle } from './VoiceFeedbackToggle';
import { LanguageSelector } from './LanguageSelector';
import { VoiceVolumeSlider } from './VoiceVolumeSlider';
import { PlaybackRateSync } from './PlaybackRateSync';
import { VoiceFeedbackStatusBar } from './VoiceFeedbackStatusBar';
import { CurrentlySpeakingIndicator } from './CurrentlySpeakingIndicator';
import { UpcomingFeedbackPreview } from './UpcomingFeedbackPreview';
import { AccessibilityModeIndicator } from './AccessibilityModeIndicator';
import { ConfigPersistenceIndicator } from './ConfigPersistenceIndicator';
import type { VideoVoiceFeedbackConfig, VideoFeedbackQueueItem } from '@/types/videoVoiceFeedback';
import type { AudioLanguage } from '@/types/audioFeedback';

// Design tokens
const COLORS = {
  background: 'rgba(17, 24, 39, 0.85)',
  surface: 'rgba(30, 41, 59, 0.95)',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  borderDefault: 'rgba(75, 85, 99, 0.3)',
  voiceActive: '#00F5A0',
};

interface VoiceFeedbackControlPanelProps {
  config: VideoVoiceFeedbackConfig;
  isInitialized: boolean;
  isSpeaking: boolean;
  isAutoPaused: boolean;
  currentSpeechContent: string | null;
  currentRepBeingNarrated: number | null;
  queueCount: number;
  upcomingFeedback: VideoFeedbackQueueItem[];
  currentSpeechRate?: number;
  isScreenReaderDetected?: boolean;
  videoDuration?: number;
  onToggleEnabled: () => void;
  onLanguageChange: (language: AudioLanguage) => void;
  onVolumeChange: (volume: number) => void;
  onTogglePlaybackRateSync: () => void;
  onToggleRepSummaries: () => void;
  onToggleAutoPause: () => void;
  onSkipCurrentFeedback: () => void;
}

export function VoiceFeedbackControlPanel({
  config,
  isInitialized,
  isSpeaking,
  isAutoPaused,
  currentSpeechContent,
  currentRepBeingNarrated,
  queueCount,
  upcomingFeedback,
  currentSpeechRate = 1.0,
  isScreenReaderDetected = false,
  videoDuration,
  onToggleEnabled,
  onLanguageChange,
  onVolumeChange,
  onTogglePlaybackRateSync,
  onToggleRepSummaries,
  onToggleAutoPause,
  onSkipCurrentFeedback,
}: VoiceFeedbackControlPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [configSaved, setConfigSaved] = useState(false);

  const handleConfigChange = () => {
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 100);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        backgroundColor: COLORS.surface,
        border: `1px solid ${COLORS.borderDefault}`,
        borderRadius: '12px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: 0,
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
              stroke={config.enabled ? COLORS.voiceActive : COLORS.textMuted}
              strokeWidth="2"
            />
            <path
              d="M19 10v2a7 7 0 01-14 0v-2"
              stroke={config.enabled ? COLORS.voiceActive : COLORS.textMuted}
              strokeWidth="2"
            />
            <line
              x1="12"
              y1="19"
              x2="12"
              y2="23"
              stroke={config.enabled ? COLORS.voiceActive : COLORS.textMuted}
              strokeWidth="2"
            />
          </svg>
          <h3
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 600,
              color: COLORS.textPrimary,
            }}
          >
            Voice Feedback
          </h3>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <path
              d="M6 9l6 6 6-6"
              stroke={COLORS.textMuted}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ConfigPersistenceIndicator isSaved={configSaved} />
          <VoiceFeedbackToggle
            isEnabled={config.enabled}
            onToggle={() => {
              onToggleEnabled();
              handleConfigChange();
            }}
            disabled={!isInitialized}
          />
        </div>
      </div>

      {/* Status bar */}
      <VoiceFeedbackStatusBar
        isInitialized={isInitialized}
        isEnabled={config.enabled}
        isSpeaking={isSpeaking}
        queueCount={queueCount}
        language={config.language}
        isAutoPaused={isAutoPaused}
      />

      {/* Currently speaking */}
      {config.enabled && (
        <CurrentlySpeakingIndicator
          isSpeaking={isSpeaking}
          currentMessage={currentSpeechContent}
          repNumber={currentRepBeingNarrated}
          onSkip={onSkipCurrentFeedback}
        />
      )}

      {/* Expandable content */}
      {isExpanded && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            paddingTop: '8px',
            borderTop: `1px solid ${COLORS.borderDefault}`,
          }}
        >
          {/* Accessibility indicator */}
          <AccessibilityModeIndicator isScreenReaderDetected={isScreenReaderDetected} />

          {/* Control grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}
          >
            {/* Language selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                style={{
                  fontSize: '12px',
                  color: COLORS.textSecondary,
                }}
              >
                Language
              </label>
              <LanguageSelector
                language={config.language}
                onLanguageChange={(lang) => {
                  onLanguageChange(lang);
                  handleConfigChange();
                }}
                disabled={!config.enabled}
              />
            </div>

            {/* Playback rate sync */}
            <PlaybackRateSync
              enabled={config.syncVoiceToPlaybackRate}
              onToggle={() => {
                onTogglePlaybackRateSync();
                handleConfigChange();
              }}
              currentSpeechRate={currentSpeechRate}
              minRate={config.minSpeechRate}
              maxRate={config.maxSpeechRate}
              disabled={!config.enabled}
            />
          </div>

          {/* Volume slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              style={{
                fontSize: '12px',
                color: COLORS.textSecondary,
              }}
            >
              Voice Volume
            </label>
            <VoiceVolumeSlider
              volume={config.voiceVolume}
              onVolumeChange={(vol) => {
                onVolumeChange(vol);
                handleConfigChange();
              }}
              disabled={!config.enabled}
              isActive={isSpeaking}
            />
          </div>

          {/* Toggle options */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
            }}
          >
            {/* Rep summaries toggle */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: config.enabled ? 'pointer' : 'not-allowed',
                opacity: config.enabled ? 1 : 0.5,
              }}
            >
              <input
                type="checkbox"
                checked={config.enableRepSummaries}
                onChange={() => {
                  onToggleRepSummaries();
                  handleConfigChange();
                }}
                disabled={!config.enabled}
                style={{ accentColor: COLORS.voiceActive }}
              />
              <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>
                Rep Summaries
              </span>
            </label>

            {/* Auto-pause toggle */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: config.enabled ? 'pointer' : 'not-allowed',
                opacity: config.enabled ? 1 : 0.5,
              }}
            >
              <input
                type="checkbox"
                checked={config.autoPauseOnCritical}
                onChange={() => {
                  onToggleAutoPause();
                  handleConfigChange();
                }}
                disabled={!config.enabled}
                style={{ accentColor: COLORS.voiceActive }}
              />
              <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>
                Auto-Pause on Critical
              </span>
            </label>
          </div>

          {/* Upcoming feedback preview */}
          {config.enabled && upcomingFeedback.length > 0 && (
            <UpcomingFeedbackPreview
              items={upcomingFeedback}
              maxItems={3}
              videoDuration={videoDuration}
            />
          )}
        </div>
      )}
    </div>
  );
}

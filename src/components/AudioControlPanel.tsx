/**
 * AudioControlPanel Component
 * UI component for controlling audio feedback settings
 */

'use client';

import React, { useCallback } from 'react';
import type { AudioFeedbackConfig, AudioFeedbackState, VerbosityLevel, AudioLanguage } from '@/types/audioFeedback';

interface AudioControlPanelProps {
  config: AudioFeedbackConfig;
  state: AudioFeedbackState;
  onInitialize: () => Promise<boolean>;
  onConfigChange: (config: Partial<AudioFeedbackConfig>) => void;
  className?: string;
}

// Design token colors
const COLORS = {
  surface: 'rgba(31, 41, 55, 0.85)',
  border: 'rgba(75, 85, 99, 0.3)',
  statusGood: '#00F5A0',
  audioMuted: '#6B7280',
  audioSpeaking: '#00ddff',
  textPrimary: '#ffffff',
  textSecondary: '#9CA3AF',
};

export function AudioControlPanel({
  config,
  state,
  onInitialize,
  onConfigChange,
  className = '',
}: AudioControlPanelProps) {
  const handleInitialize = useCallback(async () => {
    await onInitialize();
  }, [onInitialize]);

  const handleVolumeChange = useCallback((type: 'masterVolume' | 'voiceVolume' | 'beepVolume', value: number) => {
    onConfigChange({ [type]: value });
  }, [onConfigChange]);

  const handleVerbosityChange = useCallback((verbosity: VerbosityLevel) => {
    onConfigChange({ verbosity });
  }, [onConfigChange]);

  const handleLanguageChange = useCallback((language: AudioLanguage) => {
    onConfigChange({ language });
  }, [onConfigChange]);

  const handleToggle = useCallback((key: 'enabled' | 'enablePhaseBeeps' | 'enableVoiceCorrections') => {
    onConfigChange({ [key]: !config[key] });
  }, [config, onConfigChange]);

  return (
    <div
      className={`rounded-lg p-4 ${className}`}
      style={{
        backgroundColor: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ color: COLORS.textPrimary }} className="font-semibold">
          Audio Feedback
        </h3>
        <div className="flex items-center gap-2">
          {/* Status Indicator */}
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: !state.isInitialized
                ? COLORS.audioMuted
                : state.isSpeaking
                  ? COLORS.audioSpeaking
                  : config.enabled
                    ? COLORS.statusGood
                    : COLORS.audioMuted,
              boxShadow: state.isSpeaking ? `0 0 8px ${COLORS.audioSpeaking}` : 'none',
            }}
          />
          <span style={{ color: COLORS.textSecondary }} className="text-xs">
            {!state.isInitialized ? 'Not initialized' : state.isSpeaking ? 'Speaking' : config.enabled ? 'Active' : 'Muted'}
          </span>
        </div>
      </div>

      {/* Initialize Button - Required before audio works */}
      {!state.isInitialized && (
        <button
          onClick={handleInitialize}
          disabled={!state.audioSupported && !state.speechSupported}
          className="w-full mb-4 py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: COLORS.statusGood,
            color: '#000000',
          }}
        >
          {state.audioSupported || state.speechSupported
            ? 'Enable Audio'
            : 'Audio Not Supported'}
        </button>
      )}

      {/* Master Enable Toggle */}
      <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <span style={{ color: COLORS.textPrimary }}>Enable Audio</span>
        <button
          onClick={() => handleToggle('enabled')}
          className="relative w-12 h-6 rounded-full transition-colors"
          style={{
            backgroundColor: config.enabled ? COLORS.statusGood : COLORS.audioMuted,
          }}
        >
          <span
            className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
            style={{
              transform: config.enabled ? 'translateX(26px)' : 'translateX(4px)',
            }}
          />
        </button>
      </div>

      {/* Volume Sliders */}
      <div className="space-y-3 mb-4">
        <VolumeSlider
          label="Master Volume"
          value={config.masterVolume}
          onChange={(v) => handleVolumeChange('masterVolume', v)}
          activeColor={COLORS.statusGood}
        />
        <VolumeSlider
          label="Voice Volume"
          value={config.voiceVolume}
          onChange={(v) => handleVolumeChange('voiceVolume', v)}
          activeColor={COLORS.statusGood}
          disabled={!config.enableVoiceCorrections}
        />
        <VolumeSlider
          label="Beep Volume"
          value={config.beepVolume}
          onChange={(v) => handleVolumeChange('beepVolume', v)}
          activeColor={COLORS.statusGood}
          disabled={!config.enablePhaseBeeps}
        />
      </div>

      {/* Toggle Options */}
      <div className="space-y-2 mb-4 pb-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <ToggleOption
          label="Phase Beeps"
          checked={config.enablePhaseBeeps}
          onChange={() => handleToggle('enablePhaseBeeps')}
          activeColor={COLORS.statusGood}
        />
        <ToggleOption
          label="Voice Corrections"
          checked={config.enableVoiceCorrections}
          onChange={() => handleToggle('enableVoiceCorrections')}
          activeColor={COLORS.statusGood}
        />
      </div>

      {/* Verbosity Selector */}
      <div className="mb-4">
        <label style={{ color: COLORS.textSecondary }} className="text-sm block mb-2">
          Verbosity
        </label>
        <div className="flex gap-2">
          {(['minimal', 'moderate', 'detailed'] as VerbosityLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => handleVerbosityChange(level)}
              className="flex-1 py-1.5 px-2 rounded text-sm transition-colors"
              style={{
                backgroundColor: config.verbosity === level ? COLORS.statusGood : 'transparent',
                color: config.verbosity === level ? '#000000' : COLORS.textSecondary,
                border: `1px solid ${config.verbosity === level ? COLORS.statusGood : COLORS.border}`,
              }}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Language Toggle */}
      <div>
        <label style={{ color: COLORS.textSecondary }} className="text-sm block mb-2">
          Language
        </label>
        <div className="flex gap-2">
          {(['ko', 'en'] as AudioLanguage[]).map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className="flex-1 py-1.5 px-2 rounded text-sm transition-colors"
              style={{
                backgroundColor: config.language === lang ? COLORS.statusGood : 'transparent',
                color: config.language === lang ? '#000000' : COLORS.textSecondary,
                border: `1px solid ${config.language === lang ? COLORS.statusGood : COLORS.border}`,
              }}
            >
              {lang === 'ko' ? '한국어' : 'English'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

interface VolumeSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  activeColor: string;
  disabled?: boolean;
}

function VolumeSlider({ label, value, onChange, activeColor, disabled }: VolumeSliderProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  }, [onChange]);

  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <div className="flex justify-between items-center mb-1">
        <span style={{ color: COLORS.textSecondary }} className="text-sm">
          {label}
        </span>
        <span style={{ color: COLORS.textPrimary }} className="text-sm">
          {Math.round(value * 100)}%
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed"
        style={{
          background: `linear-gradient(to right, ${activeColor} 0%, ${activeColor} ${value * 100}%, ${COLORS.audioMuted} ${value * 100}%, ${COLORS.audioMuted} 100%)`,
        }}
      />
    </div>
  );
}

interface ToggleOptionProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  activeColor: string;
}

function ToggleOption({ label, checked, onChange, activeColor }: ToggleOptionProps) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: COLORS.textSecondary }} className="text-sm">
        {label}
      </span>
      <button
        onClick={onChange}
        className="relative w-10 h-5 rounded-full transition-colors"
        style={{
          backgroundColor: checked ? activeColor : COLORS.audioMuted,
        }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
          style={{
            transform: checked ? 'translateX(22px)' : 'translateX(2px)',
          }}
        />
      </button>
    </div>
  );
}

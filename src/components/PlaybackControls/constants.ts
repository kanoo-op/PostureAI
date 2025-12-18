import type { PlaybackSpeedOption, KeyboardShortcutConfig } from './types';

export const PLAYBACK_SPEEDS: PlaybackSpeedOption[] = [
  { value: 0.25, label: '0.25x', isSlowMo: true },
  { value: 0.5, label: '0.5x', isSlowMo: true },
  { value: 0.75, label: '0.75x', isSlowMo: true },
  { value: 1, label: '1x', isSlowMo: false },
  { value: 1.5, label: '1.5x', isSlowMo: false },
  { value: 2, label: '2x', isSlowMo: false },
];

export const KEYBOARD_SHORTCUTS: KeyboardShortcutConfig[] = [
  { key: 'J', action: 'framePrevious', description: 'Previous frame' },
  { key: 'L', action: 'frameNext', description: 'Next frame' },
  { key: 'K', action: 'playPause', description: 'Play/Pause' },
  { key: '<', action: 'speedDecrease', description: 'Decrease speed' },
  { key: '>', action: 'speedIncrease', description: 'Increase speed' },
];

export const PLAYBACK_CONTROL_COLORS = {
  // Primary
  primary: '#0284C7',
  primaryHover: '#0369A1',
  primaryLight: '#E0F2FE',

  // Background
  background: '#0F172A',
  backgroundSurface: 'rgba(17, 24, 39, 0.85)',
  backgroundElevated: 'rgba(30, 41, 59, 0.95)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  // Border
  border: 'rgba(75, 85, 99, 0.3)',
  borderActive: '#0284C7',

  // Accent
  accentSuccess: '#00F5A0',
  accentWarning: '#FFB800',
  accentDanger: '#FF3D71',

  // Speed control specific
  speedActive: '#00F5A0',
  speedInactive: '#475569',

  // Frame step specific
  frameStepBg: 'rgba(0, 245, 160, 0.1)',
  frameStepBorder: '#00F5A0',
};

export const TRANSLATIONS = {
  ko: {
    speed: '재생 속도',
    previousFrame: '이전 프레임',
    nextFrame: '다음 프레임',
    playbackRate: '재생 속도',
    slowMotion: '슬로우 모션',
    normalSpeed: '일반 속도',
    fastForward: '빠르게',
    frameStep: '프레임 이동',
    keyboardShortcuts: '키보드 단축키',
  },
  en: {
    speed: 'Speed',
    previousFrame: 'Previous Frame',
    nextFrame: 'Next Frame',
    playbackRate: 'Playback Rate',
    slowMotion: 'Slow Motion',
    normalSpeed: 'Normal Speed',
    fastForward: 'Fast Forward',
    frameStep: 'Frame Step',
    keyboardShortcuts: 'Keyboard Shortcuts',
  },
};

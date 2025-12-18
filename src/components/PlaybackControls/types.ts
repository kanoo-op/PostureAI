export type PlaybackSpeed = 0.25 | 0.5 | 0.75 | 1 | 1.5 | 2;

export interface PlaybackSpeedOption {
  value: PlaybackSpeed;
  label: string;
  isSlowMo: boolean;
}

export interface FrameStepDirection {
  direction: 'previous' | 'next';
}

export interface PlaybackControlsState {
  speed: PlaybackSpeed;
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  frameDuration: number; // in milliseconds
}

export interface KeyboardShortcutConfig {
  key: string;
  action: string;
  description: string;
}

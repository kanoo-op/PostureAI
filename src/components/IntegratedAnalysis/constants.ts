/**
 * Design tokens for integrated analysis components
 */

import { VELOCITY_COLORS } from '../VelocityDashboard/constants';

export const INTEGRATED_COLORS = {
  ...VELOCITY_COLORS,

  // Movement quality colors
  quality: {
    controlled: '#00F5A0',
    controlledGlow: 'rgba(0, 245, 160, 0.4)',
    controlledBg: 'rgba(0, 245, 160, 0.15)',
    moderate: '#FFB800',
    moderateGlow: 'rgba(255, 184, 0, 0.4)',
    moderateBg: 'rgba(255, 184, 0, 0.15)',
    rushed: '#FF3D71',
    rushedGlow: 'rgba(255, 61, 113, 0.4)',
    rushedBg: 'rgba(255, 61, 113, 0.15)',
  },

  // Integration indicator
  integration: {
    indicator: '#8B5CF6',
    indicatorGlow: 'rgba(139, 92, 246, 0.4)',
  },
};

export const QUALITY_LABELS: Record<string, string> = {
  controlled: 'Controlled',
  moderate: 'Moderate',
  rushed: 'Rushed',
};

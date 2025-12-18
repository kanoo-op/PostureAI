export const REFERENCE_OVERLAY_COLORS = {
  // From design specification
  referenceSkeleton: '#00D4FF',
  referenceSkeletonGlow: 'rgba(0, 212, 255, 0.4)',
  userSkeleton: '#00F5A0',
  userSkeletonGlow: 'rgba(0, 245, 160, 0.4)',

  // Deviation colors
  deviationMinor: '#FFB800',
  deviationMinorGlow: 'rgba(255, 184, 0, 0.4)',
  deviationMajor: '#FF3D71',
  deviationMajorGlow: 'rgba(255, 61, 113, 0.4)',
  deviationAligned: '#00F5A0',

  // UI colors
  toggleActive: '#00F5A0',
  toggleInactive: '#4B5563',
  phaseIndicatorBg: 'rgba(0, 212, 255, 0.15)',
  phaseIndicatorBorder: 'rgba(0, 212, 255, 0.5)',

  // Surface colors
  surface: 'rgba(17, 24, 39, 0.85)',
  border: 'rgba(75, 85, 99, 0.3)',
  textPrimary: '#ffffff',
  textSecondary: '#94a3b8',
} as const;

export const REFERENCE_OVERLAY_CONFIG = {
  defaultOpacity: 0.6,
  minOpacity: 0.2,
  maxOpacity: 1.0,
  opacityStep: 0.1,
  skeletonLineWidth: 3,
  referenceLineWidth: 2,
  keypointRadius: 4,
  deviationLineWidth: 2,
  storageKey: 'referenceOverlay_preferences',
} as const;

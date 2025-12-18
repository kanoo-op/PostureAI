export const ANGLE_GUIDE_COLORS = {
  // Primary palette
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',
  secondary: '#10B981',
  secondaryLight: '#34D399',

  // Accent colors
  accentWarning: '#F59E0B',
  accentError: '#EF4444',
  accentSuccess: '#22C55E',

  // Backgrounds
  background: '#0F172A',
  backgroundElevated: '#1E293B',
  backgroundOverlay: 'rgba(15, 23, 42, 0.85)',
  surface: '#334155',
  surfaceHover: '#475569',

  // Text
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  // Skeleton visualization
  skeletonIdeal: '#3B82F6',      // Blue for ideal skeleton
  skeletonUser: '#F97316',       // Orange for user skeleton
  skeletonMatch: '#22C55E',      // Green when matching ideal
  skeletonDeviation: '#EF4444', // Red for deviation

  // Angle indicators
  angleOptimal: '#22C55E',
  angleAcceptable: '#F59E0B',
  angleWarning: '#EF4444',

  // Grid and axes
  gridLines: 'rgba(148, 163, 184, 0.15)',
  axisX: '#EF4444',
  axisY: '#22C55E',
  axisZ: '#3B82F6',
} as const;

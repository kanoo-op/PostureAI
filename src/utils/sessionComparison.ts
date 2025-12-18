import type { VideoSessionRecord, SessionComparisonResult } from '@/types/sessionHistory';

export function compareSessions(
  sessions: VideoSessionRecord[]
): SessionComparisonResult {
  // Sort by timestamp
  const sorted = [...sessions].sort((a, b) => a.timestamp - b.timestamp);

  // Calculate score progression
  const scoreProgression = sorted.map(s => ({
    sessionId: s.id,
    score: s.overallScore,
    date: s.timestamp,
  }));

  // Calculate average score change
  const scoreChanges: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    scoreChanges.push(sorted[i].overallScore - sorted[i - 1].overallScore);
  }
  const averageScoreChange = scoreChanges.length > 0
    ? scoreChanges.reduce((a, b) => a + b, 0) / scoreChanges.length
    : 0;

  // Determine consistency trend
  const consistencyTrend = determineConsistencyTrend(sorted);

  // Find common and resolved issues
  const { commonIssues, resolvedIssues } = analyzeIssues(sorted);

  return {
    sessions: sorted,
    scoreProgression,
    averageScoreChange,
    consistencyTrend,
    commonIssues,
    resolvedIssues,
  };
}

function determineConsistencyTrend(
  sessions: VideoSessionRecord[]
): 'improving' | 'declining' | 'stable' {
  if (sessions.length < 2) return 'stable';

  const first = sessions[0].consistency.overallConsistency;
  const last = sessions[sessions.length - 1].consistency.overallConsistency;
  const diff = last - first;

  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

function analyzeIssues(sessions: VideoSessionRecord[]): {
  commonIssues: string[];
  resolvedIssues: string[];
} {
  if (sessions.length === 0) {
    return { commonIssues: [], resolvedIssues: [] };
  }

  // Collect all issues from all sessions
  const allIssues = sessions.flatMap(s =>
    s.problemMoments.flatMap(pm => pm.issues)
  );

  // Count issue frequency
  const issueCounts = new Map<string, number>();
  allIssues.forEach(issue => {
    issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1);
  });

  // Common issues appear in multiple sessions
  const commonIssues = Array.from(issueCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([issue]) => issue);

  // Resolved issues: appeared in earlier sessions but not in latest
  const latestIssues = new Set(
    sessions[sessions.length - 1]?.problemMoments.flatMap(pm => pm.issues) || []
  );
  const earlierIssues = new Set(
    sessions.slice(0, -1).flatMap(s => s.problemMoments.flatMap(pm => pm.issues))
  );
  const resolvedIssues = Array.from(earlierIssues).filter(i => !latestIssues.has(i));

  return { commonIssues, resolvedIssues };
}

// Handle different rep counts gracefully
export function normalizeRepScoresForComparison(
  sessions: VideoSessionRecord[]
): { sessionId: string; normalizedScores: number[] }[] {
  if (sessions.length === 0) return [];

  const minReps = Math.min(...sessions.map(s => s.perRepScores.length));

  return sessions.map(s => ({
    sessionId: s.id,
    // Take first N reps where N = minimum rep count across sessions
    normalizedScores: s.perRepScores.slice(0, minReps),
  }));
}

export function calculateScoreImprovement(sessions: VideoSessionRecord[]): number {
  if (sessions.length < 2) return 0;
  const sorted = [...sessions].sort((a, b) => a.timestamp - b.timestamp);
  return sorted[sorted.length - 1].overallScore - sorted[0].overallScore;
}

export function getTrendDirection(sessions: VideoSessionRecord[]): 'up' | 'down' | 'stable' {
  const improvement = calculateScoreImprovement(sessions);
  if (improvement > 3) return 'up';
  if (improvement < -3) return 'down';
  return 'stable';
}

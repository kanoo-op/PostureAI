'use client';

import { useState, useMemo, useCallback } from 'react';
import { JointAngleType, SessionRecord, ExerciseType } from '@/types/angleHistory';
import { getSessions, getSessionById } from '@/utils/angleHistoryStorage';
import {
  NormalizedRepData,
  PhaseAngleData,
  DeviationPoint,
  MovementPhase,
} from '../types';
import { DEVIATION_THRESHOLDS, DEFAULT_JOINTS } from '../constants';

// Generate synthetic phase data from session angles
// Since SessionRecord stores aggregates, we simulate phase progression
function generatePhaseData(
  session: SessionRecord,
  repNumber: number,
  repCount: number
): PhaseAngleData[] {
  const phases: MovementPhase[] = ['setup', 'descent', 'bottom', 'ascent', 'lockout'];

  return phases.map((phase, phaseIndex) => {
    const phasePercent = (phaseIndex / (phases.length - 1)) * 100;

    // Calculate phase-specific angles with realistic variation
    const angles = session.angles.map((angleData) => {
      // Apply phase-based modulation (deeper at bottom, shallower at setup/lockout)
      let phaseModifier = 1;
      if (phase === 'bottom') phaseModifier = 1.2;
      else if (phase === 'setup' || phase === 'lockout') phaseModifier = 0.8;
      else if (phase === 'descent' || phase === 'ascent') phaseModifier = 1.0;

      // Add per-rep variance based on stdDev
      const repVariance = (repNumber / repCount - 0.5) * angleData.stdDev;
      const value = angleData.average * phaseModifier + repVariance;

      return {
        jointType: angleData.jointType,
        value: Math.round(value * 10) / 10,
        deviation: 0, // Will be calculated later
      };
    });

    return {
      phase,
      phasePercent,
      angles,
    };
  });
}

// Normalize rep data from session
function normalizeRepData(session: SessionRecord): NormalizedRepData[] {
  const reps: NormalizedRepData[] = [];

  for (let i = 1; i <= session.repCount; i++) {
    const phaseData = generatePhaseData(session, i, session.repCount);

    // Calculate overall quality from angle deviations
    const avgDeviation =
      session.angles.reduce((sum, a) => sum + a.stdDev, 0) / session.angles.length;
    const overallQuality = Math.max(0, Math.min(100, 100 - avgDeviation * 5));

    reps.push({
      repNumber: i,
      sessionId: session.id,
      sessionTimestamp: session.timestamp,
      phaseData,
      overallQuality: Math.round(overallQuality),
    });
  }

  return reps;
}

// Calculate mean angle at each phase for deviation calculation
function calculateMeanAngles(
  reps: NormalizedRepData[],
  joints: JointAngleType[]
): Map<string, number> {
  const meanMap = new Map<string, number>();

  // For each phase and joint, calculate mean across all selected reps
  const phaseCount = reps[0]?.phaseData.length ?? 0;

  for (let phaseIdx = 0; phaseIdx < phaseCount; phaseIdx++) {
    for (const jointType of joints) {
      const values = reps
        .map((rep) =>
          rep.phaseData[phaseIdx]?.angles.find((a) => a.jointType === jointType)?.value
        )
        .filter((v): v is number => v !== undefined);

      if (values.length > 0) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const key = `${phaseIdx}-${jointType}`;
        meanMap.set(key, mean);
      }
    }
  }

  return meanMap;
}

export function useRepComparisonData(exerciseType: ExerciseType, currentSessionId?: string) {
  // State
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>(
    currentSessionId ? [currentSessionId] : []
  );
  const [selectedRepNumbers, setSelectedRepNumbers] = useState<number[]>([]);
  const [selectedJoints, setSelectedJoints] = useState<JointAngleType[]>(DEFAULT_JOINTS);
  const [isSessionCompareMode, setIsSessionCompareMode] = useState(false);

  // Load available sessions
  const availableSessions = useMemo(() => {
    return getSessions(exerciseType).slice(0, 20); // Limit for performance
  }, [exerciseType]);

  // Load data for selected sessions
  const sessionData = useMemo(() => {
    return selectedSessionIds
      .map((id) => getSessionById(id))
      .filter((s): s is SessionRecord => s !== null);
  }, [selectedSessionIds]);

  // Normalize all rep data
  const allNormalizedReps = useMemo(() => {
    return sessionData.flatMap((session) => normalizeRepData(session));
  }, [sessionData]);

  // Get selected reps
  const selectedReps = useMemo(() => {
    if (selectedRepNumbers.length === 0) {
      // Default: select first 3 reps if available
      return allNormalizedReps.slice(0, 3);
    }
    return allNormalizedReps.filter((rep) => selectedRepNumbers.includes(rep.repNumber));
  }, [allNormalizedReps, selectedRepNumbers]);

  // Calculate deviations from mean
  const { repsWithDeviation, deviationPoints } = useMemo(() => {
    if (selectedReps.length < 2) {
      return { repsWithDeviation: selectedReps, deviationPoints: [] };
    }

    const meanAngles = calculateMeanAngles(selectedReps, selectedJoints);
    const points: DeviationPoint[] = [];

    const updatedReps = selectedReps.map((rep) => ({
      ...rep,
      phaseData: rep.phaseData.map((phase, phaseIdx) => ({
        ...phase,
        angles: phase.angles.map((angle) => {
          const key = `${phaseIdx}-${angle.jointType}`;
          const mean = meanAngles.get(key) ?? angle.value;
          const deviation = angle.value - mean;

          // Track significant deviations
          if (
            Math.abs(deviation) >= DEVIATION_THRESHOLDS.minor &&
            selectedJoints.includes(angle.jointType)
          ) {
            let severity: 'minor' | 'moderate' | 'significant' = 'minor';
            if (Math.abs(deviation) >= DEVIATION_THRESHOLDS.significant) {
              severity = 'significant';
            } else if (Math.abs(deviation) >= DEVIATION_THRESHOLDS.moderate) {
              severity = 'moderate';
            }

            points.push({
              repNumber: rep.repNumber,
              phasePercent: phase.phasePercent,
              jointType: angle.jointType,
              deviation: Math.round(deviation * 10) / 10,
              severity,
            });
          }

          return {
            ...angle,
            deviation: Math.round(deviation * 10) / 10,
          };
        }),
      })),
    }));

    return { repsWithDeviation: updatedReps, deviationPoints: points };
  }, [selectedReps, selectedJoints]);

  // Calculate consistency score
  const consistencyScore = useMemo(() => {
    if (selectedReps.length < 2) return 100;

    const deviations = deviationPoints.map((p) => Math.abs(p.deviation));
    if (deviations.length === 0) return 100;

    const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
    return Math.max(0, Math.min(100, Math.round(100 - avgDeviation * 5)));
  }, [selectedReps.length, deviationPoints]);

  // Available joints from data
  const availableJoints = useMemo(() => {
    if (sessionData.length === 0) return [];
    const jointSet = new Set<JointAngleType>();
    sessionData.forEach((session) => {
      session.angles.forEach((angle) => jointSet.add(angle.jointType));
    });
    return Array.from(jointSet);
  }, [sessionData]);

  // Handlers
  const handleSessionChange = useCallback((sessionIds: string[]) => {
    setSelectedSessionIds(sessionIds);
    setSelectedRepNumbers([]); // Reset rep selection when sessions change
  }, []);

  const handleRepSelectionChange = useCallback((repNumbers: number[]) => {
    setSelectedRepNumbers(repNumbers);
  }, []);

  const handleJointChange = useCallback((joints: JointAngleType[]) => {
    setSelectedJoints(joints);
  }, []);

  const toggleSessionCompareMode = useCallback(() => {
    setIsSessionCompareMode((prev) => !prev);
  }, []);

  return {
    // Data
    availableSessions,
    sessionData,
    allNormalizedReps,
    selectedReps: repsWithDeviation,
    deviationPoints,
    availableJoints,

    // State
    selectedSessionIds,
    selectedRepNumbers,
    selectedJoints,
    isSessionCompareMode,
    consistencyScore,

    // Handlers
    handleSessionChange,
    handleRepSelectionChange,
    handleJointChange,
    toggleSessionCompareMode,
  };
}

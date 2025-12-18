'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Keypoint } from '@/components/SkeletonOverlay';
import type { ExerciseReferenceData, DeviationAnalysis } from '@/types/referencePose';
import { loadReferenceData } from '@/data/referencePoses';
import { analyzeDeviations } from '@/utils/referenceDeviationAnalyzer';
import { detectPhase } from '@/utils/phaseDetector';
import ReferenceSkeletonRenderer from './ReferenceSkeletonRenderer';
import PhaseIndicator from './PhaseIndicator';
import DeviationLegend from './DeviationLegend';
import NoReferenceDataNotice from './NoReferenceDataNotice';
import { REFERENCE_OVERLAY_CONFIG } from './constants';

interface Props {
  userKeypoints: Keypoint[];
  exerciseType: string;
  width: number;
  height: number;
  mirrored?: boolean;
  enabled?: boolean;
  opacity?: number;
  showDeviations?: boolean;
  onDeviationAnalysis?: (analysis: DeviationAnalysis) => void;
  className?: string;
}

export default function ReferenceOverlay({
  userKeypoints,
  exerciseType,
  width,
  height,
  mirrored = true,
  enabled = true,
  opacity = REFERENCE_OVERLAY_CONFIG.defaultOpacity,
  showDeviations = true,
  onDeviationAnalysis,
  className = '',
}: Props) {
  const [referenceData, setReferenceData] = useState<ExerciseReferenceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasData, setHasData] = useState(true);

  // Load reference data on exercise type change
  useEffect(() => {
    if (!enabled) return;

    setIsLoading(true);
    loadReferenceData(exerciseType)
      .then(data => {
        setReferenceData(data);
        setHasData(data !== null);
      })
      .catch(() => setHasData(false))
      .finally(() => setIsLoading(false));
  }, [exerciseType, enabled]);

  // Detect current phase and get matching reference pose
  const phaseResult = useMemo(() => {
    if (!referenceData || userKeypoints.length === 0) return null;
    return detectPhase(exerciseType, userKeypoints, referenceData);
  }, [exerciseType, userKeypoints, referenceData]);

  // Calculate deviations
  const deviationAnalysis = useMemo(() => {
    if (!phaseResult?.closestPoseData || userKeypoints.length === 0) return null;
    return analyzeDeviations(userKeypoints, phaseResult.closestPoseData, width, height);
  }, [userKeypoints, phaseResult, width, height]);

  // Report deviation analysis
  useEffect(() => {
    if (deviationAnalysis && onDeviationAnalysis) {
      onDeviationAnalysis(deviationAnalysis);
    }
  }, [deviationAnalysis, onDeviationAnalysis]);

  if (!enabled) return null;
  if (isLoading) return null;
  if (!hasData) return <NoReferenceDataNotice exerciseType={exerciseType} />;
  if (!phaseResult?.closestPoseData) return null;

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Reference skeleton overlay */}
      <ReferenceSkeletonRenderer
        referenceKeypoints={phaseResult.closestPoseData.keypoints}
        deviations={deviationAnalysis?.jointDeviations}
        width={width}
        height={height}
        opacity={opacity}
        mirrored={mirrored}
        showDeviations={showDeviations}
        criticalJoints={phaseResult.closestPoseData.criticalJoints}
      />

      {/* Phase indicator */}
      <PhaseIndicator
        phase={phaseResult.currentPhase}
        confidence={phaseResult.confidence}
        description={phaseResult.closestPoseData.description}
      />

      {/* Deviation legend */}
      {showDeviations && deviationAnalysis && (
        <DeviationLegend
          overallScore={deviationAnalysis.overallScore}
          worstJoints={deviationAnalysis.worstJoints}
        />
      )}
    </div>
  );
}

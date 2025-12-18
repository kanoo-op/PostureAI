'use client';

import React, { useMemo, useState, useRef } from 'react';
import { MultiRepAngleChartProps, MovementPhase, JointAnglePoint } from './types';
import { REP_COMPARISON_COLORS, CHART_DIMENSIONS } from './constants';
import { JointAngleType } from '@/types/angleHistory';
import DeviationHighlightOverlay from './DeviationHighlightOverlay';
import PhaseTimelineAxis from './PhaseTimelineAxis';
import AngleValueTooltip from './AngleValueTooltip';

interface PathData {
  repNumber: number;
  jointType: JointAngleType;
  color: string;
  pathD: string;
  points: {
    x: number;
    y: number;
    value: number;
    deviation: number;
    phase: MovementPhase;
  }[];
}

export default function MultiRepAngleChart({
  selectedReps,
  selectedJoints,
  deviationPoints,
  showDeviationBand,
  compact = false,
}: MultiRepAngleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    repNumber: number;
    jointType: JointAngleType;
    value: number;
    deviation: number;
    phase: MovementPhase;
  }>({
    visible: false,
    x: 0,
    y: 0,
    repNumber: 0,
    jointType: 'kneeFlexion',
    value: 0,
    deviation: 0,
    phase: 'setup',
  });

  const { marginTop, marginBottom } = CHART_DIMENSIONS;
  const chartHeight = compact ? CHART_DIMENSIONS.heightCompact : CHART_DIMENSIONS.height;
  const innerHeight = chartHeight - marginTop - marginBottom;

  // Calculate angle range
  const { minAngle, maxAngle } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    selectedReps.forEach((rep) => {
      rep.phaseData.forEach((phase) => {
        phase.angles
          .filter((a) => selectedJoints.includes(a.jointType))
          .forEach((a) => {
            min = Math.min(min, a.value);
            max = Math.max(max, a.value);
          });
      });
    });

    // Handle empty data case
    if (min === Infinity || max === -Infinity) {
      return { minAngle: 0, maxAngle: 180 };
    }

    // Add padding
    const padding = (max - min) * 0.1 || 10;
    return {
      minAngle: Math.floor(min - padding),
      maxAngle: Math.ceil(max + padding),
    };
  }, [selectedReps, selectedJoints]);

  // Generate path data for each rep and joint
  const paths = useMemo<PathData[]>(() => {
    return selectedReps.flatMap((rep, repIdx) => {
      return selectedJoints.map((jointType) => {
        const points = rep.phaseData.map((phase) => {
          const angle = phase.angles.find((a) => a.jointType === jointType);
          const y =
            ((maxAngle - (angle?.value ?? 0)) / (maxAngle - minAngle)) * innerHeight + marginTop;
          return {
            x: phase.phasePercent,
            y,
            value: angle?.value ?? 0,
            deviation: angle?.deviation ?? 0,
            phase: phase.phase,
          };
        });

        const pathD = points
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
          .join(' ');

        return {
          repNumber: rep.repNumber,
          jointType,
          color: REP_COMPARISON_COLORS.repLines[repIdx % REP_COMPARISON_COLORS.repLines.length],
          pathD,
          points,
        };
      });
    });
  }, [selectedReps, selectedJoints, minAngle, maxAngle, innerHeight, marginTop]);

  // Handle mouse interactions
  const handleMouseMove = (e: React.MouseEvent<SVGPathElement>, path: PathData) => {
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;

    // Find nearest point
    const nearestPoint = path.points.reduce((nearest, point) => {
      return Math.abs(point.x - x) < Math.abs(nearest.x - x) ? point : nearest;
    });

    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      repNumber: path.repNumber,
      jointType: path.jointType,
      value: nearestPoint.value,
      deviation: nearestPoint.deviation,
      phase: nearestPoint.phase,
    });
  };

  const handleMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  if (selectedReps.length === 0) {
    return (
      <div
        className="p-4 rounded-lg text-center"
        style={{ backgroundColor: REP_COMPARISON_COLORS.surfaceElevated }}
      >
        <p className="text-sm" style={{ color: REP_COMPARISON_COLORS.textMuted }}>
          렙을 선택하여 비교하세요 / Select reps to compare
        </p>
      </div>
    );
  }

  // Generate y-axis labels
  const yAxisLabels = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const value = Math.round(maxAngle - (maxAngle - minAngle) * ratio);
    const y = marginTop + innerHeight * ratio;
    return { value, y };
  });

  return (
    <div
      ref={containerRef}
      className="rounded-lg p-3 relative"
      style={{ backgroundColor: REP_COMPARISON_COLORS.surfaceElevated }}
    >
      <svg
        viewBox={`0 0 100 ${chartHeight}`}
        className="w-full"
        style={{ height: chartHeight }}
        preserveAspectRatio="none"
        onMouseLeave={handleMouseLeave}
        role="img"
        aria-label="Multi-rep angle comparison chart"
      >
        {/* Grid lines - vertical */}
        {[0, 25, 50, 75, 100].map((percent) => (
          <line
            key={`v-${percent}`}
            x1={percent}
            y1={marginTop}
            x2={percent}
            y2={chartHeight - marginBottom}
            stroke={REP_COMPARISON_COLORS.chartGrid}
            strokeWidth="0.3"
          />
        ))}

        {/* Grid lines - horizontal and y-axis labels */}
        {yAxisLabels.map((label, i) => (
          <g key={`h-${i}`}>
            <line
              x1="0"
              y1={label.y}
              x2="100"
              y2={label.y}
              stroke={REP_COMPARISON_COLORS.chartGrid}
              strokeWidth="0.3"
            />
            <text
              x="-1"
              y={label.y}
              fill={REP_COMPARISON_COLORS.chartAxis}
              fontSize="3"
              textAnchor="end"
              dominantBaseline="middle"
            >
              {label.value}
            </text>
          </g>
        ))}

        {/* Deviation band (if enabled and we have data) */}
        {showDeviationBand && (
          <DeviationHighlightOverlay
            deviationPoints={deviationPoints}
            chartWidth={100}
            chartHeight={chartHeight}
          />
        )}

        {/* Rep lines */}
        {paths.map((path, idx) => (
          <path
            key={`${path.repNumber}-${path.jointType}-${idx}`}
            d={path.pathD}
            fill="none"
            stroke={path.color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-opacity cursor-pointer"
            style={{ opacity: 0.8 }}
            onMouseMove={(e) => handleMouseMove(e, path)}
            onMouseLeave={handleMouseLeave}
          />
        ))}

        {/* Data points */}
        {paths.flatMap((path, pathIdx) =>
          path.points.map((point, pointIdx) => (
            <circle
              key={`point-${pathIdx}-${pointIdx}`}
              cx={point.x}
              cy={point.y}
              r="1.2"
              fill={path.color}
              className="transition-all"
            />
          ))
        )}
      </svg>

      {/* Phase Timeline Axis */}
      <PhaseTimelineAxis
        width={100}
        phases={['setup', 'descent', 'bottom', 'ascent', 'lockout']}
      />

      {/* Tooltip */}
      <AngleValueTooltip
        visible={tooltip.visible}
        x={tooltip.x}
        y={tooltip.y}
        repNumber={tooltip.repNumber}
        jointType={tooltip.jointType}
        value={tooltip.value}
        deviation={tooltip.deviation}
        phase={tooltip.phase}
      />
    </div>
  );
}

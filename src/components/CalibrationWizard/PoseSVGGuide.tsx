'use client';

import React from 'react';
import { CALIBRATION_COLORS } from './constants';

type PoseType = 'squat-deep' | 'squat-standing' | 'hip-hinge' | 'standing' | 'arm-bent' | 'arm-extended' | 't-pose';

interface PoseSVGGuideProps {
  pose: PoseType;
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function PoseSVGGuide({
  pose,
  isActive = false,
  size = 'md',
}: PoseSVGGuideProps) {
  const sizeMap = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-48 h-48',
  };

  const strokeColor = isActive ? CALIBRATION_COLORS.active : CALIBRATION_COLORS.textSecondary;
  const glowFilter = isActive ? `drop-shadow(0 0 8px ${CALIBRATION_COLORS.activeGlow})` : 'none';

  const commonProps = {
    stroke: strokeColor,
    strokeWidth: 3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
    style: { filter: glowFilter, transition: 'all 0.3s ease' },
  };

  const renderPose = () => {
    switch (pose) {
      case 'standing':
        return (
          <g {...commonProps}>
            {/* Head */}
            <circle cx="50" cy="15" r="8" />
            {/* Body */}
            <line x1="50" y1="23" x2="50" y2="55" />
            {/* Left arm */}
            <line x1="50" y1="30" x2="35" y2="50" />
            {/* Right arm */}
            <line x1="50" y1="30" x2="65" y2="50" />
            {/* Left leg */}
            <line x1="50" y1="55" x2="40" y2="90" />
            {/* Right leg */}
            <line x1="50" y1="55" x2="60" y2="90" />
          </g>
        );

      case 't-pose':
        return (
          <g {...commonProps}>
            {/* Head */}
            <circle cx="50" cy="15" r="8" />
            {/* Body */}
            <line x1="50" y1="23" x2="50" y2="55" />
            {/* Left arm - horizontal */}
            <line x1="50" y1="30" x2="15" y2="30" />
            {/* Right arm - horizontal */}
            <line x1="50" y1="30" x2="85" y2="30" />
            {/* Left leg */}
            <line x1="50" y1="55" x2="40" y2="90" />
            {/* Right leg */}
            <line x1="50" y1="55" x2="60" y2="90" />
          </g>
        );

      case 'squat-deep':
        return (
          <g {...commonProps}>
            {/* Head */}
            <circle cx="50" cy="30" r="8" />
            {/* Body - angled forward */}
            <line x1="50" y1="38" x2="45" y2="55" />
            {/* Left arm */}
            <line x1="48" y1="42" x2="30" y2="55" />
            {/* Right arm */}
            <line x1="48" y1="42" x2="65" y2="55" />
            {/* Left thigh - horizontal */}
            <line x1="45" y1="55" x2="30" y2="60" />
            {/* Left shin - vertical */}
            <line x1="30" y1="60" x2="30" y2="90" />
            {/* Right thigh - horizontal */}
            <line x1="45" y1="55" x2="60" y2="60" />
            {/* Right shin - vertical */}
            <line x1="60" y1="60" x2="60" y2="90" />
          </g>
        );

      case 'squat-standing':
        return (
          <g {...commonProps}>
            {/* Head */}
            <circle cx="50" cy="15" r="8" />
            {/* Body */}
            <line x1="50" y1="23" x2="50" y2="50" />
            {/* Left arm */}
            <line x1="50" y1="28" x2="35" y2="45" />
            {/* Right arm */}
            <line x1="50" y1="28" x2="65" y2="45" />
            {/* Left leg - slight bend */}
            <line x1="50" y1="50" x2="42" y2="70" />
            <line x1="42" y1="70" x2="40" y2="90" />
            {/* Right leg - slight bend */}
            <line x1="50" y1="50" x2="58" y2="70" />
            <line x1="58" y1="70" x2="60" y2="90" />
          </g>
        );

      case 'hip-hinge':
        return (
          <g {...commonProps}>
            {/* Head - forward */}
            <circle cx="30" cy="30" r="8" />
            {/* Body - angled forward (hip hinge) */}
            <line x1="36" y1="35" x2="50" y2="55" />
            {/* Left arm - hanging */}
            <line x1="40" y1="40" x2="25" y2="55" />
            {/* Right arm - hanging */}
            <line x1="40" y1="40" x2="35" y2="60" />
            {/* Left leg - straight */}
            <line x1="50" y1="55" x2="40" y2="90" />
            {/* Right leg - straight */}
            <line x1="50" y1="55" x2="60" y2="90" />
          </g>
        );

      case 'arm-bent':
        return (
          <g {...commonProps}>
            {/* Head */}
            <circle cx="50" cy="15" r="8" />
            {/* Body */}
            <line x1="50" y1="23" x2="50" y2="55" />
            {/* Left arm - bent at elbow */}
            <line x1="50" y1="30" x2="35" y2="35" />
            <line x1="35" y1="35" x2="30" y2="25" />
            {/* Right arm - bent at elbow */}
            <line x1="50" y1="30" x2="65" y2="35" />
            <line x1="65" y1="35" x2="70" y2="25" />
            {/* Left leg */}
            <line x1="50" y1="55" x2="40" y2="90" />
            {/* Right leg */}
            <line x1="50" y1="55" x2="60" y2="90" />
          </g>
        );

      case 'arm-extended':
        return (
          <g {...commonProps}>
            {/* Head */}
            <circle cx="50" cy="15" r="8" />
            {/* Body */}
            <line x1="50" y1="23" x2="50" y2="55" />
            {/* Left arm - extended forward */}
            <line x1="50" y1="30" x2="20" y2="35" />
            {/* Right arm - extended forward */}
            <line x1="50" y1="30" x2="80" y2="35" />
            {/* Left leg */}
            <line x1="50" y1="55" x2="40" y2="90" />
            {/* Right leg */}
            <line x1="50" y1="55" x2="60" y2="90" />
          </g>
        );

      default:
        return renderPose(); // Standing as default
    }
  };

  return (
    <div className={`${sizeMap[size]}`}>
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
      >
        {renderPose()}
      </svg>
    </div>
  );
}

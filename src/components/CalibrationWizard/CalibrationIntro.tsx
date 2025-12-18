'use client';

import React from 'react';
import { CALIBRATION_COLORS, POSE_STEPS } from './constants';
import PoseSVGGuide from './PoseSVGGuide';

interface CalibrationIntroProps {
  onStart: () => void;
}

export default function CalibrationIntro({ onStart }: CalibrationIntroProps) {
  return (
    <div className="p-6">
      {/* Title section */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2" style={{ color: CALIBRATION_COLORS.textPrimary }}>
          3D Angle Calibration
        </h2>
        <h3 className="text-lg" style={{ color: CALIBRATION_COLORS.active }}>
          3D 각도 캘리브레이션
        </h3>
      </div>

      {/* Illustration */}
      <div className="flex justify-center mb-6">
        <div
          className="p-6 rounded-2xl"
          style={{ backgroundColor: CALIBRATION_COLORS.surface }}
        >
          <PoseSVGGuide pose="t-pose" isActive size="lg" />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-4 mb-6">
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: CALIBRATION_COLORS.surface }}
        >
          <h4 className="font-medium mb-2" style={{ color: CALIBRATION_COLORS.textPrimary }}>
            What is calibration? / 캘리브레이션이란?
          </h4>
          <p className="text-sm" style={{ color: CALIBRATION_COLORS.textSecondary }}>
            Calibration measures your personal comfortable range of motion for each joint.
            This allows the system to provide feedback tailored to your body.
          </p>
          <p className="text-sm mt-2" style={{ color: CALIBRATION_COLORS.textMuted }}>
            캘리브레이션은 각 관절의 편안한 가동 범위를 측정합니다.
            이를 통해 개인화된 피드백을 제공받을 수 있습니다.
          </p>
        </div>

        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: CALIBRATION_COLORS.surface }}
        >
          <h4 className="font-medium mb-2" style={{ color: CALIBRATION_COLORS.textPrimary }}>
            How long does it take? / 소요 시간
          </h4>
          <p className="text-sm" style={{ color: CALIBRATION_COLORS.textSecondary }}>
            Approximately 2-3 minutes. You will perform {POSE_STEPS.length} different poses.
          </p>
          <p className="text-sm mt-1" style={{ color: CALIBRATION_COLORS.textMuted }}>
            약 2-3분 소요됩니다. {POSE_STEPS.length}가지 자세를 수행합니다.
          </p>
        </div>

        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: CALIBRATION_COLORS.surface }}
        >
          <h4 className="font-medium mb-2" style={{ color: CALIBRATION_COLORS.textPrimary }}>
            What will you do? / 무엇을 하나요?
          </h4>
          <ul className="text-sm space-y-1" style={{ color: CALIBRATION_COLORS.textSecondary }}>
            <li>• Stand where your full body is visible to the camera</li>
            <li>• Follow the on-screen instructions for each pose</li>
            <li>• Hold each position until the countdown completes</li>
          </ul>
          <ul className="text-sm space-y-1 mt-2" style={{ color: CALIBRATION_COLORS.textMuted }}>
            <li>• 전신이 카메라에 보이는 곳에 서세요</li>
            <li>• 화면의 안내에 따라 각 자세를 취하세요</li>
            <li>• 카운트다운이 끝날 때까지 자세를 유지하세요</li>
          </ul>
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={onStart}
        className="w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-[1.02]"
        style={{
          backgroundColor: CALIBRATION_COLORS.active,
          color: CALIBRATION_COLORS.background,
          boxShadow: `0 0 20px ${CALIBRATION_COLORS.activeGlow}`,
        }}
      >
        Start Calibration / 시작하기
      </button>
    </div>
  );
}

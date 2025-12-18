'use client';

import { ViewportControls } from './types';
import { ANGLE_GUIDE_COLORS } from './colors';

interface ViewControlsPanelProps {
  controls: ViewportControls;
  onReset: () => void;
  className?: string;
}

export default function ViewControlsPanel({
  controls,
  onReset,
  className = '',
}: ViewControlsPanelProps) {
  const formatAngle = (radians: number) => {
    return Math.round((radians * 180) / Math.PI);
  };

  return (
    <div
      className={`p-3 rounded-lg space-y-2 ${className}`}
      style={{ backgroundColor: ANGLE_GUIDE_COLORS.backgroundElevated }}
    >
      <div className="flex justify-between items-center">
        <span
          className="text-xs font-medium"
          style={{ color: ANGLE_GUIDE_COLORS.textSecondary }}
        >
          뷰포트 컨트롤
        </span>
        <button
          onClick={onReset}
          className="px-2 py-1 text-xs rounded transition-colors"
          style={{
            backgroundColor: ANGLE_GUIDE_COLORS.surface,
            color: ANGLE_GUIDE_COLORS.textSecondary,
          }}
        >
          초기화
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div
          className="flex justify-between"
          style={{ color: ANGLE_GUIDE_COLORS.textMuted }}
        >
          <span>X 회전:</span>
          <span
            className="font-mono"
            style={{ color: ANGLE_GUIDE_COLORS.axisX }}
          >
            {formatAngle(controls.rotationX)}°
          </span>
        </div>
        <div
          className="flex justify-between"
          style={{ color: ANGLE_GUIDE_COLORS.textMuted }}
        >
          <span>Y 회전:</span>
          <span
            className="font-mono"
            style={{ color: ANGLE_GUIDE_COLORS.axisY }}
          >
            {formatAngle(controls.rotationY)}°
          </span>
        </div>
        <div
          className="flex justify-between"
          style={{ color: ANGLE_GUIDE_COLORS.textMuted }}
        >
          <span>확대:</span>
          <span
            className="font-mono"
            style={{ color: ANGLE_GUIDE_COLORS.textPrimary }}
          >
            {controls.zoom.toFixed(2)}x
          </span>
        </div>
        <div
          className="flex justify-between"
          style={{ color: ANGLE_GUIDE_COLORS.textMuted }}
        >
          <span>이동:</span>
          <span
            className="font-mono"
            style={{ color: ANGLE_GUIDE_COLORS.textPrimary }}
          >
            {controls.panX.toFixed(2)}, {controls.panY.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

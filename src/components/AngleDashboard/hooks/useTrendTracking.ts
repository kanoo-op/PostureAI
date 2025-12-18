// src/components/AngleDashboard/hooks/useTrendTracking.ts

'use client';

import { useRef, useCallback } from 'react';
import { JointAngleType } from '@/types/angleHistory';
import { TrendDirection, AngleDisplayData } from '../types';
import { TREND_WINDOW_SIZE } from '../constants';

interface TrendBuffer {
  values: number[];
  lastDirection: TrendDirection;
}

export function useTrendTracking() {
  const buffers = useRef<Map<JointAngleType, TrendBuffer>>(new Map());

  const getBuffer = useCallback((jointType: JointAngleType): TrendBuffer => {
    if (!buffers.current.has(jointType)) {
      buffers.current.set(jointType, { values: [], lastDirection: 'stable' });
    }
    return buffers.current.get(jointType)!;
  }, []);

  const calculateTrend = useCallback((jointType: JointAngleType, currentValue: number): TrendDirection => {
    const buffer = getBuffer(jointType);

    // Add current value to buffer
    buffer.values.push(currentValue);

    // Keep only the last TREND_WINDOW_SIZE values
    if (buffer.values.length > TREND_WINDOW_SIZE) {
      buffer.values.shift();
    }

    // Need at least 3 samples to determine trend
    if (buffer.values.length < 3) {
      return 'stable';
    }

    // Calculate simple moving average trend
    const halfPoint = Math.floor(buffer.values.length / 2);
    const firstHalf = buffer.values.slice(0, halfPoint);
    const secondHalf = buffer.values.slice(halfPoint);

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;
    const threshold = 2; // 2 degrees threshold for trend change

    let direction: TrendDirection;
    if (Math.abs(diff) < threshold) {
      direction = 'stable';
    } else if (diff > 0) {
      // Increasing angle - context dependent if improving
      direction = 'improving';
    } else {
      direction = 'declining';
    }

    buffer.lastDirection = direction;
    return direction;
  }, [getBuffer]);

  const updateAnglesWithTrends = useCallback((angles: AngleDisplayData[]): AngleDisplayData[] => {
    return angles.map(angle => ({
      ...angle,
      trend: calculateTrend(angle.jointType, angle.value),
    }));
  }, [calculateTrend]);

  const reset = useCallback(() => {
    buffers.current.clear();
  }, []);

  return {
    calculateTrend,
    updateAnglesWithTrends,
    reset,
  };
}

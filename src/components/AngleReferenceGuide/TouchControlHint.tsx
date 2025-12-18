'use client';

import { useState, useEffect } from 'react';
import { ANGLE_GUIDE_COLORS } from './colors';

export default function TouchControlHint() {
  const [isVisible, setIsVisible] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Check if touch device
    setIsTouchDevice(
      'ontouchstart' in window || navigator.maxTouchPoints > 0
    );

    // Hide hint after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="absolute bottom-16 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg text-xs text-center transition-opacity duration-500"
      style={{
        backgroundColor: ANGLE_GUIDE_COLORS.backgroundOverlay,
        color: ANGLE_GUIDE_COLORS.textSecondary,
        opacity: isVisible ? 1 : 0,
      }}
    >
      {isTouchDevice ? (
        <>
          <p>한 손가락: 회전</p>
          <p>두 손가락: 확대/축소</p>
        </>
      ) : (
        <>
          <p>드래그: 회전 | Shift+드래그: 이동</p>
          <p>스크롤: 확대/축소 | R: 초기화</p>
        </>
      )}
    </div>
  );
}

import { useState, useCallback, useRef, useEffect } from 'react';
import { ViewportControls } from '../types';

const DEFAULT_CONTROLS: ViewportControls = {
  rotationX: 0,
  rotationY: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
};

interface UseViewportControlsReturn {
  controls: ViewportControls;
  setControls: React.Dispatch<React.SetStateAction<ViewportControls>>;
  reset: () => void;
  bindEvents: (element: HTMLElement | null) => void;
}

export function useViewportControls(
  initialControls: Partial<ViewportControls> = {}
): UseViewportControlsReturn {
  const [controls, setControls] = useState<ViewportControls>({
    ...DEFAULT_CONTROLS,
    ...initialControls,
  });
  const isDragging = useRef(false);
  const lastPosition = useRef({ x: 0, y: 0 });
  const dragMode = useRef<'rotate' | 'pan'>('rotate');
  const elementRef = useRef<HTMLElement | null>(null);
  const touchDistance = useRef<number | null>(null);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    isDragging.current = true;
    lastPosition.current = { x: e.clientX, y: e.clientY };
    dragMode.current = e.shiftKey ? 'pan' : 'rotate';
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;

    const deltaX = e.clientX - lastPosition.current.x;
    const deltaY = e.clientY - lastPosition.current.y;
    lastPosition.current = { x: e.clientX, y: e.clientY };

    setControls((prev) => {
      if (dragMode.current === 'rotate') {
        return {
          ...prev,
          rotationY: prev.rotationY + deltaX * 0.01,
          rotationX: Math.max(
            -Math.PI / 2,
            Math.min(Math.PI / 2, prev.rotationX + deltaY * 0.01)
          ),
        };
      } else {
        return {
          ...prev,
          panX: prev.panX + deltaX * 0.001,
          panY: prev.panY + deltaY * 0.001,
        };
      }
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setControls((prev) => ({
      ...prev,
      zoom: Math.max(0.5, Math.min(3, prev.zoom - e.deltaY * 0.001)),
    }));
  }, []);

  // Touch support
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging.current = true;
      lastPosition.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      dragMode.current = 'rotate';
    } else if (e.touches.length === 2) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistance.current = Math.sqrt(dx * dx + dy * dy);
    }
    e.preventDefault();
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 1 && isDragging.current) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastPosition.current.x;
      const deltaY = touch.clientY - lastPosition.current.y;
      lastPosition.current = { x: touch.clientX, y: touch.clientY };

      setControls((prev) => ({
        ...prev,
        rotationY: prev.rotationY + deltaX * 0.01,
        rotationX: Math.max(
          -Math.PI / 2,
          Math.min(Math.PI / 2, prev.rotationX + deltaY * 0.01)
        ),
      }));
    } else if (e.touches.length === 2 && touchDistance.current !== null) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDistance = Math.sqrt(dx * dx + dy * dy);
      const scale = newDistance / touchDistance.current;

      setControls((prev) => ({
        ...prev,
        zoom: Math.max(0.5, Math.min(3, prev.zoom * scale)),
      }));

      touchDistance.current = newDistance;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    touchDistance.current = null;
  }, []);

  // Keyboard controls for accessibility
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.05;

    switch (e.key) {
      case 'ArrowLeft':
        setControls((prev) => ({
          ...prev,
          rotationY: prev.rotationY - step,
        }));
        e.preventDefault();
        break;
      case 'ArrowRight':
        setControls((prev) => ({
          ...prev,
          rotationY: prev.rotationY + step,
        }));
        e.preventDefault();
        break;
      case 'ArrowUp':
        setControls((prev) => ({
          ...prev,
          rotationX: Math.max(-Math.PI / 2, prev.rotationX - step),
        }));
        e.preventDefault();
        break;
      case 'ArrowDown':
        setControls((prev) => ({
          ...prev,
          rotationX: Math.min(Math.PI / 2, prev.rotationX + step),
        }));
        e.preventDefault();
        break;
      case '+':
      case '=':
        setControls((prev) => ({
          ...prev,
          zoom: Math.min(3, prev.zoom + 0.1),
        }));
        e.preventDefault();
        break;
      case '-':
        setControls((prev) => ({
          ...prev,
          zoom: Math.max(0.5, prev.zoom - 0.1),
        }));
        e.preventDefault();
        break;
      case 'r':
      case 'R':
        setControls(DEFAULT_CONTROLS);
        e.preventDefault();
        break;
    }
  }, []);

  const bindEvents = useCallback(
    (element: HTMLElement | null) => {
      // Cleanup old element
      if (elementRef.current) {
        const el = elementRef.current;
        el.removeEventListener('mousedown', handleMouseDown);
        el.removeEventListener('mousemove', handleMouseMove);
        el.removeEventListener('mouseup', handleMouseUp);
        el.removeEventListener('mouseleave', handleMouseUp);
        el.removeEventListener('wheel', handleWheel);
        el.removeEventListener('touchstart', handleTouchStart);
        el.removeEventListener('touchmove', handleTouchMove);
        el.removeEventListener('touchend', handleTouchEnd);
        el.removeEventListener('keydown', handleKeyDown);
      }

      elementRef.current = element;

      if (element) {
        element.addEventListener('mousedown', handleMouseDown);
        element.addEventListener('mousemove', handleMouseMove);
        element.addEventListener('mouseup', handleMouseUp);
        element.addEventListener('mouseleave', handleMouseUp);
        element.addEventListener('wheel', handleWheel, { passive: false });
        element.addEventListener('touchstart', handleTouchStart, {
          passive: false,
        });
        element.addEventListener('touchmove', handleTouchMove, {
          passive: false,
        });
        element.addEventListener('touchend', handleTouchEnd);
        element.addEventListener('keydown', handleKeyDown);

        // Make element focusable for keyboard controls
        if (!element.hasAttribute('tabindex')) {
          element.setAttribute('tabindex', '0');
        }
      }
    },
    [
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleWheel,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      handleKeyDown,
    ]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (elementRef.current) {
        const el = elementRef.current;
        el.removeEventListener('mousedown', handleMouseDown);
        el.removeEventListener('mousemove', handleMouseMove);
        el.removeEventListener('mouseup', handleMouseUp);
        el.removeEventListener('mouseleave', handleMouseUp);
        el.removeEventListener('wheel', handleWheel);
        el.removeEventListener('touchstart', handleTouchStart);
        el.removeEventListener('touchmove', handleTouchMove);
        el.removeEventListener('touchend', handleTouchEnd);
        el.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleKeyDown,
  ]);

  const reset = useCallback(() => {
    setControls(DEFAULT_CONTROLS);
  }, []);

  return { controls, setControls, reset, bindEvents };
}

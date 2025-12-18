// src/components/AngleDashboard/hooks/useDashboardToggle.ts

'use client';

import { useState, useEffect, useCallback } from 'react';
import { DASHBOARD_STORAGE_KEY } from '../constants';

export function useDashboardToggle(defaultVisible: boolean = true) {
  const [isVisible, setIsVisible] = useState(defaultVisible);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(DASHBOARD_STORAGE_KEY);
        if (stored !== null) {
          setIsVisible(stored === 'true');
        }
      } catch {
        // localStorage not available
      }
      setIsInitialized(true);
    }
  }, []);

  // Persist to localStorage on change
  const toggle = useCallback(() => {
    setIsVisible(prev => {
      const newValue = !prev;
      try {
        localStorage.setItem(DASHBOARD_STORAGE_KEY, String(newValue));
      } catch {
        // localStorage not available
      }
      return newValue;
    });
  }, []);

  const setVisible = useCallback((visible: boolean) => {
    setIsVisible(visible);
    try {
      localStorage.setItem(DASHBOARD_STORAGE_KEY, String(visible));
    } catch {
      // localStorage not available
    }
  }, []);

  return {
    isVisible,
    isInitialized,
    toggle,
    setVisible,
  };
}

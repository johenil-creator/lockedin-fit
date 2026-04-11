import { useState, useRef, useEffect, useCallback } from "react";
import { playRestComplete } from "../lib/sounds";
import { notification, NotificationType } from "../lib/haptics";

export function useRestTimers() {
  const [restTimers, setRestTimers] = useState<Record<string, number>>({});
  const intervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // Cleanup all intervals on unmount
  useEffect(() => {
    const refs = intervalsRef.current;
    return () => {
      Object.values(refs).forEach(clearInterval);
    };
  }, []);

  const startRestTimer = useCallback(
    (exId: string, setIdx: number, restTime: number) => {
      const key = `${exId}-${setIdx}`;
      const duration = restTime || 90;

      // Enforce single active rest timer — dismiss any existing ones first
      Object.keys(intervalsRef.current).forEach((existingKey) => {
        if (existingKey !== key) {
          clearInterval(intervalsRef.current[existingKey]);
          delete intervalsRef.current[existingKey];
        }
      });
      setRestTimers(() => ({ [key]: duration }));

      // Clear any existing interval for this key
      if (intervalsRef.current[key]) clearInterval(intervalsRef.current[key]);

      intervalsRef.current[key] = setInterval(() => {
        setRestTimers((prev) => {
          const next = (prev[key] ?? 0) - 1;
          if (next <= 0) {
            clearInterval(intervalsRef.current[key]);
            delete intervalsRef.current[key];
            const { [key]: _, ...rest } = prev;
            // Play sound + haptic when rest timer completes
            playRestComplete();
            notification(NotificationType.Success);
            return rest;
          }
          return { ...prev, [key]: next };
        });
      }, 1000);
    },
    []
  );

  const dismissRestTimer = useCallback((key: string) => {
    if (intervalsRef.current[key]) {
      clearInterval(intervalsRef.current[key]);
      delete intervalsRef.current[key];
    }
    setRestTimers((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  /** Advance all active timers by the given number of seconds (e.g. after returning from background). */
  const advanceTimers = useCallback((elapsedSec: number) => {
    setRestTimers((prev) => {
      const updated: Record<string, number> = {};
      let anyExpired = false;
      for (const [key, remaining] of Object.entries(prev)) {
        const adjusted = remaining - elapsedSec;
        if (adjusted > 0) {
          updated[key] = adjusted;
        } else {
          if (intervalsRef.current[key]) {
            clearInterval(intervalsRef.current[key]);
            delete intervalsRef.current[key];
          }
          anyExpired = true;
        }
      }
      // Play sound if any timer expired while app was in background
      if (anyExpired) {
        playRestComplete();
        notification(NotificationType.Success);
      }
      return updated;
    });
  }, []);

  return { restTimers, startRestTimer, dismissRestTimer, advanceTimers };
}

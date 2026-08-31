/**
 * hooks/useAutoImportWorkouts.ts
 *
 * Automatically imports Apple Watch workouts detected via HealthKit into the
 * LockedInFIT log the moment they are discovered — no manual tap required.
 *
 * Runs on mount and whenever `externalWorkouts` changes (foreground refresh).
 * Deduplication is enforced via AsyncStorage so each workout is imported once.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { HealthExternalWorkout } from '../lib/healthkit/types';
import {
  convertExternalWorkoutToSession,
  calcImportXP,
  activityDisplayName,
  loadImportedIds,
  markAsImported,
} from '../lib/importHealthWorkout';

type Params = {
  externalWorkouts: HealthExternalWorkout[];
  addWorkout: (session: any) => Promise<void>;
  awardXP: (amount: number, reason: string) => Promise<void>;
  recordActivity: () => Promise<void>;
};

type AutoImportResult = {
  /** Number of workouts imported in the most recent batch (resets after toast). */
  autoImportedCount: number;
  /** Total XP awarded in the most recent batch. */
  autoImportedXP: number;
  /** Call after showing toast to reset the counters. */
  resetAutoImport: () => void;
};

export function useAutoImportWorkouts({
  externalWorkouts,
  addWorkout,
  awardXP,
  recordActivity,
}: Params): AutoImportResult {
  const [autoImportedCount, setAutoImportedCount] = useState(0);
  const [autoImportedXP, setAutoImportedXP] = useState(0);

  // In-memory set of IDs already imported this session (avoids re-reading
  // AsyncStorage on every externalWorkouts change).
  const knownIds = useRef<Set<string> | null>(null);
  // Prevent concurrent import runs.
  const running = useRef(false);

  const runImport = useCallback(async (workouts: HealthExternalWorkout[]) => {
    if (running.current || workouts.length === 0) return;
    running.current = true;

    try {
      // Load persisted IDs on first run.
      if (knownIds.current === null) {
        knownIds.current = await loadImportedIds();
      }

      const pending = workouts.filter((w) => !knownIds.current!.has(w.id));
      if (pending.length === 0) return;

      let batchCount = 0;
      let batchXP = 0;

      for (const workout of pending) {
        try {
          const session = convertExternalWorkoutToSession(workout);
          await addWorkout(session);

          const { amount } = calcImportXP(workout.duration);
          await awardXP(amount, `Apple Watch: ${activityDisplayName(workout.activityType)}`);
          await recordActivity();
          await markAsImported(workout.id);

          knownIds.current!.add(workout.id);
          batchCount++;
          batchXP += amount;
        } catch {
          // Skip individual failures — don't block the rest of the batch.
        }
      }

      if (batchCount > 0) {
        setAutoImportedCount((n) => n + batchCount);
        setAutoImportedXP((n) => n + batchXP);
      }
    } finally {
      running.current = false;
    }
  }, [addWorkout, awardXP, recordActivity]);

  useEffect(() => {
    runImport(externalWorkouts);
  }, [externalWorkouts, runImport]);

  const resetAutoImport = useCallback(() => {
    setAutoImportedCount(0);
    setAutoImportedXP(0);
  }, []);

  return { autoImportedCount, autoImportedXP, resetAutoImport };
}

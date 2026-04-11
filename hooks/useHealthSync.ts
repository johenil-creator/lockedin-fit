/**
 * hooks/useHealthSync.ts — Write LockedInFIT workouts to Apple Health.
 *
 * Fire-and-forget pattern: writes never block UI. The hook manages an
 * auto-sync preference persisted in AsyncStorage so users can toggle
 * automatic syncing from settings.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { getCached, setCached } from '../lib/healthkit/cache';
import { writeWorkout } from '../lib/healthkit/HealthKitService';
import type { HealthKitWorkoutWrite } from '../lib/healthkit/types';

// ── Constants ────────────────────────────────────────────────────────────────

const AUTO_SYNC_KEY = 'auto-sync-enabled';
const PREF_TTL = 365 * 24 * 60 * 60_000; // 1 year

// ── Types ────────────────────────────────────────────────────────────────────

type WorkoutSession = {
  id: string;
  name: string;
  date: string;
  startedAt?: string;
  completedAt?: string;
  sessionType?: 'strength' | 'cardio';
  cardioModality?: string;
};

export type UseHealthSyncReturn = {
  /** Write a completed session to Apple Health. Fire-and-forget. */
  syncWorkoutToHealth: (session: WorkoutSession) => void;
  /** Whether auto-sync is enabled (user preference). */
  autoSyncEnabled: boolean;
  /** Toggle auto-sync on/off. */
  toggleAutoSync: () => Promise<void>;
  /** True while a write is in progress. */
  isSyncing: boolean;
  /** Last sync error, if any. */
  lastError: string | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapCardioModality(modality?: string): string {
  const map: Record<string, string> = {
    running: 'Running',
    cycling: 'Cycling',
    rowing: 'Rowing',
    walking: 'Walking',
    swimming: 'Swimming',
    elliptical: 'Elliptical',
    stairclimber: 'StairClimbing',
    jump_rope: 'JumpRope',
  };
  return map[modality ?? ''] ?? 'Other';
}

/** MET value for vigorous weight lifting */
const STRENGTH_MET = 5.0;
/** MET value for moderate cardio (generic) */
const CARDIO_MET = 8.0;
/** Default body weight in kg when profile weight is unavailable */
const DEFAULT_WEIGHT_KG = 75;

function sessionToHealthWorkout(
  session: WorkoutSession,
  weightKg = DEFAULT_WEIGHT_KG,
): HealthKitWorkoutWrite {
  const startDate = session.startedAt ?? session.date;
  const endDate = session.completedAt ?? new Date().toISOString();

  const durationMs =
    new Date(endDate).getTime() - new Date(startDate).getTime();
  const durationMin = durationMs / 60_000;
  const durationHours = durationMin / 60;

  const type =
    session.sessionType === 'cardio'
      ? mapCardioModality(session.cardioModality)
      : 'TraditionalStrengthTraining';

  // Calories = MET × weight_kg × duration_hours
  const met = session.sessionType === 'cardio' ? CARDIO_MET : STRENGTH_MET;
  const energyBurned = Math.round(met * weightKg * durationHours);

  return {
    type,
    startDate,
    endDate,
    duration: durationMin,
    energyBurned,
    metadata: {
      source: 'LockedInFIT',
      sessionId: session.id,
    },
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useHealthSync(): UseHealthSyncReturn {
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const autoSyncRef = useRef(false);

  // Hydrate preference
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    getCached<boolean>(AUTO_SYNC_KEY).then((cached) => {
      const enabled = cached ?? false;
      autoSyncRef.current = enabled;
      setAutoSyncEnabled(enabled);
    });
  }, []);

  const toggleAutoSync = useCallback(async () => {
    const next = !autoSyncRef.current;
    autoSyncRef.current = next;
    setAutoSyncEnabled(next);
    await setCached(AUTO_SYNC_KEY, next, PREF_TTL);
  }, []);

  const syncWorkoutToHealth = useCallback((session: WorkoutSession) => {
    if (Platform.OS !== 'ios') return;

    setIsSyncing(true);
    setLastError(null);

    const workout = sessionToHealthWorkout(session);

    writeWorkout(workout)
      .then(() => setIsSyncing(false))
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : 'Failed to write workout to Health';
        setLastError(message);
        setIsSyncing(false);
      });
  }, []);

  return {
    syncWorkoutToHealth,
    autoSyncEnabled,
    toggleAutoSync,
    isSyncing,
    lastError,
  };
}

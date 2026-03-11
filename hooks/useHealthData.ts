/**
 * hooks/useHealthData.ts — Main health data hook.
 *
 * Provides today's combined health snapshot, 7-day history, and external
 * workouts (Apple Health workouts not logged in LockedInFIT).
 *
 * Refresh strategy:
 *   - Auto-refresh on app foreground via AppState listener
 *   - Respects per-type TTL cache (no redundant HealthKit calls)
 *   - Manual `syncHealthData()` for pull-to-refresh
 *
 * Performance:
 *   - All HealthKit reads batched into a single Promise.all
 *   - AsyncStorage cache checked first; only fetches on miss/expired
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { getCached, setCached } from '../lib/healthkit/cache';
import {
  fetchWorkouts as fetchHKWorkouts,
  fetchStepCount,
  fetchHeartRateSamples,
  fetchRestingHeartRate,
  fetchHRV,
  fetchActiveEnergy,
  fetchSleepAnalysis,
} from '../lib/healthkit/HealthKitService';
import type { HealthDailySnapshot, HealthExternalWorkout } from '../lib/healthkit/types';

// ── Constants ────────────────────────────────────────────────────────────────

/** Minimum ms between foreground-triggered refreshes. */
const FOREGROUND_DEBOUNCE_MS = 15 * 60_000; // 15 min

// ── Types ────────────────────────────────────────────────────────────────────

export type UseHealthDataReturn = {
  dailySnapshot: HealthDailySnapshot | null;
  weeklySnapshots: HealthDailySnapshot[];
  externalWorkouts: HealthExternalWorkout[];
  lastSyncTime: number | null;
  syncHealthData: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

/**
 * Build a daily snapshot from individual HealthKit queries.
 * All reads batched via Promise.all — one round-trip per day.
 */
async function buildDailySnapshot(date: Date): Promise<HealthDailySnapshot> {
  const dayStart = startOfDay(date);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [steps, hr, restingHr, hrv, activeEnergy, sleep] = await Promise.all([
    fetchStepCount(dayStart, dayEnd).catch(() => null),
    fetchHeartRateSamples(dayStart, dayEnd).catch(() => []),
    fetchRestingHeartRate(dayStart, dayEnd).catch(() => []),
    fetchHRV(dayStart, dayEnd).catch(() => []),
    fetchActiveEnergy(dayStart, dayEnd).catch(() => null),
    fetchSleepAnalysis(dayStart, dayEnd).catch(() => []),
  ]);

  // Average HR from samples
  const hrValues = Array.isArray(hr) ? hr : [];
  const avgHR =
    hrValues.length > 0
      ? Math.round(hrValues.reduce((s: number, v: any) => s + (v.value ?? 0), 0) / hrValues.length)
      : null;

  // Latest resting HR
  const restingHRVal =
    Array.isArray(restingHr) && restingHr.length > 0 ? restingHr[0].value : null;

  // Latest HRV
  const hrvVal =
    Array.isArray(hrv) && hrv.length > 0 ? hrv[0].value : null;

  // Sleep hours
  let sleepHours: number | null = null;
  if (Array.isArray(sleep) && sleep.length > 0) {
    let totalMs = 0;
    for (const sample of sleep) {
      const stage = (sample.value ?? sample.stage ?? '').toString().toLowerCase();
      if (stage === 'inbed' || stage === 'awake') continue;
      const start = new Date(sample.startDate).getTime();
      const end = new Date(sample.endDate).getTime();
      totalMs += end - start;
    }
    sleepHours = totalMs > 0 ? Math.round((totalMs / 3_600_000) * 10) / 10 : null;
  }

  return {
    date: dayStart.toISOString(),
    steps: typeof steps === 'number' ? steps : null,
    heartRate: avgHR,
    restingHeartRate: restingHRVal,
    hrv: hrvVal,
    activeEnergy: typeof activeEnergy === 'number' ? activeEnergy : null,
    sleepHours,
  };
}

/**
 * Filter Apple Health workouts to exclude any that overlap with
 * LockedInFIT sessions (within 30-min window).
 */
function filterExternalWorkouts(
  hkWorkouts: any[],
  localSessions: Array<{ startedAt?: string; completedAt?: string; date: string }>,
): HealthExternalWorkout[] {
  const OVERLAP_MS = 30 * 60_000;

  const localIntervals = localSessions
    .filter((s) => s.startedAt)
    .map((s) => ({
      start: new Date(s.startedAt!).getTime(),
      end: new Date(s.completedAt ?? s.date).getTime(),
    }));

  return (hkWorkouts ?? [])
    .filter((hkw: any) => {
      const hkStart = new Date(hkw.start ?? hkw.startDate).getTime();
      const hkEnd = new Date(hkw.end ?? hkw.endDate).getTime();

      return !localIntervals.some(
        (local) =>
          Math.abs(hkStart - local.start) < OVERLAP_MS ||
          Math.abs(hkEnd - local.end) < OVERLAP_MS ||
          (hkStart >= local.start && hkStart <= local.end) ||
          (local.start >= hkStart && local.start <= hkEnd),
      );
    })
    .map((hkw: any) => ({
      id: hkw.id ?? hkw.uuid ?? `hk-${hkw.startDate}`,
      activityType: hkw.activityName ?? hkw.activityType ?? 'Other',
      startDate: hkw.start ?? hkw.startDate,
      endDate: hkw.end ?? hkw.endDate,
      duration: hkw.duration ?? 0,
      calories: hkw.calories ?? hkw.activeEnergyBurned ?? 0,
      source: hkw.sourceName ?? 'Apple Health',
    }));
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useHealthData(): UseHealthDataReturn {
  const [dailySnapshot, setDailySnapshot] = useState<HealthDailySnapshot | null>(null);
  const [weeklySnapshots, setWeeklySnapshots] = useState<HealthDailySnapshot[]>([]);
  const [externalWorkouts, setExternalWorkouts] = useState<HealthExternalWorkout[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadingRef = useRef(false);
  const lastForegroundSync = useRef(0);

  const syncHealthData = useCallback(async (force = false) => {
    if (Platform.OS !== 'ios') return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // ── Check cache first ──────────────────────────────────────────────
      if (!force) {
        const [cachedDaily, cachedWeekly, cachedWorkouts, cachedSyncTime] =
          await Promise.all([
            getCached<HealthDailySnapshot>('daily-snapshot'),
            getCached<HealthDailySnapshot[]>('weekly-snapshots'),
            getCached<HealthExternalWorkout[]>('external-workouts'),
            getCached<number>('last-sync-time'),
          ]);

        if (cachedDaily && cachedWeekly && cachedWorkouts) {
          setDailySnapshot(cachedDaily);
          setWeeklySnapshots(cachedWeekly);
          setExternalWorkouts(cachedWorkouts);
          setLastSyncTime(cachedSyncTime);
          return;
        }
      }

      // ── Fetch fresh data ───────────────────────────────────────────────
      const today = new Date();
      const sevenDaysAgo = daysAgo(7);

      // Batch reads
      const [todaySnapshot, hkWorkouts] = await Promise.all([
        buildDailySnapshot(today),
        fetchHKWorkouts(sevenDaysAgo, today).catch(() => []),
      ]);

      // Build weekly snapshots (today + past 6 days)
      const pastDays = await Promise.all(
        Array.from({ length: 6 }, (_, i) => buildDailySnapshot(daysAgo(i + 1))),
      );
      const weekly = [todaySnapshot, ...pastDays];

      // Filter external workouts
      // Load local sessions from AsyncStorage
      let localSessions: any[] = [];
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const raw = await AsyncStorage.getItem('@lockedinfit/workouts');
        localSessions = raw ? JSON.parse(raw) : [];
      } catch {
        // If we can't load local sessions, treat all HK workouts as external
      }
      const external = filterExternalWorkouts(hkWorkouts, localSessions);

      const syncTime = Date.now();

      // ── Update state ───────────────────────────────────────────────────
      setDailySnapshot(todaySnapshot);
      setWeeklySnapshots(weekly);
      setExternalWorkouts(external);
      setLastSyncTime(syncTime);

      // ── Persist to cache (fire-and-forget) ─────────────────────────────
      Promise.all([
        setCached('daily-snapshot', todaySnapshot),
        setCached('weekly-snapshots', weekly),
        setCached('external-workouts', external),
        setCached('last-sync-time', syncTime, 24 * 60 * 60_000),
      ]).catch(() => {});
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to sync health data';
      setError(message);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, []);

  // ── Initial load ───────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    syncHealthData();
  }, [syncHealthData]);

  // ── Foreground refresh ─────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const now = Date.now();
        if (now - lastForegroundSync.current > FOREGROUND_DEBOUNCE_MS) {
          lastForegroundSync.current = now;
          syncHealthData(true);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [syncHealthData]);

  return {
    dailySnapshot,
    weeklySnapshots,
    externalWorkouts,
    lastSyncTime,
    syncHealthData: () => syncHealthData(true),
    isLoading,
    error,
  };
}

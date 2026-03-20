/**
 * lib/healthkit/HealthKitService.ts — Core HealthKit wrapper
 *
 * Wraps `react-native-health` callback APIs as async/await functions.
 * Every public function follows the promisify pattern established in
 * the original `hooks/useHealthKit.ts`.
 *
 * This module performs NO caching — callers (hooks) handle TTL-based
 * caching via `lib/healthkit/cache.ts`.
 *
 * All functions are safe to call on Android — they return empty/null
 * results when HealthKit is unavailable.
 */

import { Platform } from 'react-native';
import type { HealthPermission, HealthUnit } from 'react-native-health';
import { HealthKitError } from './types';
import type { HealthKitWorkoutWrite } from './types';

// ── Lazy module reference ────────────────────────────────────────────────────

/**
 * Lazily require react-native-health to avoid crashing on Android
 * where the native module isn't linked.
 */
function getAppleHealthKit(): import('react-native-health').AppleHealthKit {
  const mod = require('react-native-health') as import('react-native-health').AppleHealthKit;
  if (!mod || typeof mod.initHealthKit !== 'function') {
    throw new HealthKitError(
      'HealthKit native module not linked. Rebuild with: npx expo run:ios',
      'not_linked',
    );
  }
  return mod;
}

// ── Availability ─────────────────────────────────────────────────────────────

/** Check if HealthKit is available on this device. */
export function checkAvailability(): boolean {
  if (Platform.OS !== 'ios') return false;
  try {
    getAppleHealthKit();
    return true;
  } catch (e) {
    if (__DEV__) console.warn("[HealthKitService] caught:", e);
    return false;
  }
}

// ── Initialization ───────────────────────────────────────────────────────────

type InitOptions = {
  permissions: {
    read: readonly string[];
    write: readonly string[];
  };
};

let _initialized = false;

/**
 * Initialize HealthKit with the given permissions.
 * Safe to call multiple times — subsequent calls with broader permissions
 * will trigger a new permission dialog.
 */
export async function initializeHealthKit(options: InitOptions): Promise<void> {
  if (Platform.OS !== 'ios') return;

  const AppleHealthKit = getAppleHealthKit();
  const Constants = AppleHealthKit.Constants;

  const readPerms = options.permissions.read
    .map((p) => (Constants.Permissions as Record<string, HealthPermission>)[p])
    .filter(Boolean);

  const writePerms = options.permissions.write
    .map((p) => (Constants.Permissions as Record<string, HealthPermission>)[p])
    .filter(Boolean);

  if (__DEV__) {
    console.log('[HealthKit] initHealthKit with read:', readPerms, 'write:', writePerms);
  }

  return new Promise<void>((resolve, reject) => {
    // Timeout after 15s in case the native callback never fires
    const timeout = setTimeout(() => {
      if (__DEV__) console.error('[HealthKit] initHealthKit timed out after 15s');
      reject(new HealthKitError(
        'HealthKit request timed out. Try again or enable in Settings > Health.',
        'timeout',
      ));
    }, 15_000);

    try {
      AppleHealthKit.initHealthKit(
        {
          permissions: {
            read: readPerms,
            write: writePerms,
          },
        },
        (err: any) => {
          clearTimeout(timeout);
          if (__DEV__) console.log('[HealthKit] initHealthKit callback fired, err:', err);
          if (err) {
            const errStr = typeof err === 'string' ? err : JSON.stringify(err);
            if (__DEV__) console.error('[HealthKit] initHealthKit error:', errStr, err);
            reject(new HealthKitError(
              errStr.includes?.('denied') ? 'Health access denied.' : errStr,
              'permission_denied',
              errStr,
            ));
          } else {
            _initialized = true;
            resolve();
          }
        },
      );
      if (__DEV__) console.log('[HealthKit] initHealthKit called successfully');
    } catch (e) {
      clearTimeout(timeout);
      if (__DEV__) console.error('[HealthKit] initHealthKit threw:', e);
      reject(new HealthKitError(
        'HealthKit native module error',
        'native_error',
        String(e),
      ));
    }
  });
}

// ── Guard ────────────────────────────────────────────────────────────────────

function ensureIOS(): void {
  if (Platform.OS !== 'ios') {
    throw new HealthKitError('HealthKit is only available on iOS', 'not_available');
  }
}

// ── Workouts ─────────────────────────────────────────────────────────────────

/**
 * Fetch workout sessions from HealthKit within a date range.
 * Returns raw workout objects including activityName, duration, calories, distance.
 */
export async function fetchWorkouts(
  startDate: Date,
  endDate: Date,
): Promise<any[]> {
  ensureIOS();
  const AppleHealthKit = getAppleHealthKit();

  return new Promise((resolve, reject) => {
    (AppleHealthKit as any).getAnchoredWorkouts(
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      (err: string, results: any) => {
        if (err) {
          reject(new HealthKitError(err, 'fetch_failed', err));
        } else {
          // getAnchoredWorkouts returns { data: [...], newAnchor: ... }
          const workouts = results?.data ?? results ?? [];
          resolve(Array.isArray(workouts) ? workouts : []);
        }
      },
    );
  });
}

// ── Heart Rate ───────────────────────────────────────────────────────────────

/**
 * Fetch heart rate samples within a date range.
 * Each sample has { value (BPM), startDate, endDate }.
 */
export async function fetchHeartRateSamples(
  startDate: Date,
  endDate: Date,
): Promise<Array<{ value: number; startDate: string; endDate: string }>> {
  ensureIOS();
  const AppleHealthKit = getAppleHealthKit();

  return new Promise((resolve, reject) => {
    AppleHealthKit.getHeartRateSamples(
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: false,
        limit: 500,
      },
      (err: string, results: any[]) => {
        if (err) reject(new HealthKitError(err, 'fetch_failed', err));
        else resolve(results ?? []);
      },
    );
  });
}

// ── Resting Heart Rate ───────────────────────────────────────────────────────

/**
 * Fetch resting heart rate samples.
 * Apple Watch computes this daily; returns one value per day typically.
 */
export async function fetchRestingHeartRate(
  startDate: Date,
  endDate: Date,
): Promise<Array<{ value: number; startDate: string; endDate: string }>> {
  ensureIOS();
  const AppleHealthKit = getAppleHealthKit();

  return new Promise((resolve, reject) => {
    AppleHealthKit.getRestingHeartRateSamples(
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: false,
      },
      (err: string, results: any[]) => {
        if (err) reject(new HealthKitError(err, 'fetch_failed', err));
        else resolve(results ?? []);
      },
    );
  });
}

// ── HRV ──────────────────────────────────────────────────────────────────────

/**
 * Fetch Heart Rate Variability (SDNN) samples.
 * Typically one per day, measured during sleep by Apple Watch.
 */
export async function fetchHRV(
  startDate: Date,
  endDate: Date,
): Promise<Array<{ value: number; startDate: string; endDate: string }>> {
  ensureIOS();
  const AppleHealthKit = getAppleHealthKit();

  return new Promise((resolve, reject) => {
    AppleHealthKit.getHeartRateVariabilitySamples(
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: false,
      },
      (err: string, results: any[]) => {
        if (err) reject(new HealthKitError(err, 'fetch_failed', err));
        else resolve(results ?? []);
      },
    );
  });
}

// ── Step Count ───────────────────────────────────────────────────────────────

/**
 * Fetch aggregated step count for a date range.
 * Works on iPhone alone (no Apple Watch required).
 */
export async function fetchStepCount(
  startDate: Date,
  endDate: Date,
): Promise<number> {
  ensureIOS();
  const AppleHealthKit = getAppleHealthKit();

  return new Promise((resolve, reject) => {
    AppleHealthKit.getStepCount(
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      (err: string, result: { value: number }) => {
        if (err) reject(new HealthKitError(err, 'fetch_failed', err));
        else resolve(result?.value ?? 0);
      },
    );
  });
}

// ── Active Energy ────────────────────────────────────────────────────────────

/**
 * Fetch active energy burned (kcal) for a date range.
 */
export async function fetchActiveEnergy(
  startDate: Date,
  endDate: Date,
): Promise<number> {
  ensureIOS();
  const AppleHealthKit = getAppleHealthKit();

  return new Promise((resolve, reject) => {
    AppleHealthKit.getActiveEnergyBurned(
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      (err: string, results: any[]) => {
        if (err) {
          reject(new HealthKitError(err, 'fetch_failed', err));
        } else {
          // Sum all active energy values in the range
          const total = (results ?? []).reduce(
            (sum: number, r: any) => sum + (r?.value ?? 0),
            0,
          );
          resolve(Math.round(total));
        }
      },
    );
  });
}

// ── Walking/Running Distance ─────────────────────────────────────────────────

/**
 * Fetch walking + running distance in miles (HealthKit default).
 * Converted to km by the caller if needed.
 */
export async function fetchWalkingRunningDistance(
  startDate: Date,
  endDate: Date,
): Promise<number> {
  ensureIOS();
  const AppleHealthKit = getAppleHealthKit();

  return new Promise((resolve, reject) => {
    AppleHealthKit.getDistanceWalkingRunning(
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      (err: string, result: { value: number }) => {
        if (err) reject(new HealthKitError(err, 'fetch_failed', err));
        // Convert miles to km
        else resolve(Math.round((result?.value ?? 0) * 1.60934 * 100) / 100);
      },
    );
  });
}

// ── Sleep Analysis ───────────────────────────────────────────────────────────

/**
 * Fetch sleep analysis samples.
 * Returns sleep stage data with start/end times.
 */
export async function fetchSleepAnalysis(
  startDate: Date,
  endDate: Date,
): Promise<any[]> {
  ensureIOS();
  const AppleHealthKit = getAppleHealthKit();

  return new Promise((resolve, reject) => {
    AppleHealthKit.getSleepSamples(
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 100,
      },
      (err: string, results: any[]) => {
        if (err) reject(new HealthKitError(err, 'fetch_failed', err));
        else resolve(results ?? []);
      },
    );
  });
}

// ── Daily Snapshot ────────────────────────────────────────────────────────────

/**
 * Fetch all health data for a single day in one batch.
 * Combines steps, HR, resting HR, HRV, active energy, and sleep.
 */
export async function fetchDailySnapshot(date: Date): Promise<{
  steps: number | null;
  heartRate: number | null;
  restingHeartRate: number | null;
  hrv: number | null;
  activeEnergy: number | null;
  sleepHours: number | null;
}> {
  ensureIOS();

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [steps, hrSamples, restingHR, hrvSamples, activeEnergy, sleepSamples] =
    await Promise.all([
      fetchStepCount(dayStart, dayEnd).catch(() => null),
      fetchHeartRateSamples(dayStart, dayEnd).catch(() => []),
      fetchRestingHeartRate(dayStart, dayEnd).catch(() => []),
      fetchHRV(dayStart, dayEnd).catch(() => []),
      fetchActiveEnergy(dayStart, dayEnd).catch(() => null),
      fetchSleepAnalysis(dayStart, dayEnd).catch(() => []),
    ]);

  // Average HR
  const hrValues = hrSamples ?? [];
  const avgHR =
    hrValues.length > 0
      ? Math.round(hrValues.reduce((s, v) => s + (v.value ?? 0), 0) / hrValues.length)
      : null;

  // Latest resting HR
  const restingHRValue =
    Array.isArray(restingHR) && restingHR.length > 0
      ? restingHR[0].value
      : null;

  // Latest HRV
  const hrvValue =
    Array.isArray(hrvSamples) && hrvSamples.length > 0
      ? hrvSamples[0].value
      : null;

  // Total sleep hours from sleep samples
  let sleepHours: number | null = null;
  if (Array.isArray(sleepSamples) && sleepSamples.length > 0) {
    let totalMs = 0;
    for (const sample of sleepSamples) {
      const stage = sample.value ?? sample.stage ?? '';
      // Count actual sleep stages, not 'inBed' or 'awake'
      if (stage === 'INBED' || stage === 'AWAKE' || stage === 'inBed' || stage === 'awake') continue;
      const start = new Date(sample.startDate).getTime();
      const end = new Date(sample.endDate).getTime();
      totalMs += end - start;
    }
    sleepHours = totalMs > 0 ? Math.round((totalMs / 3_600_000) * 10) / 10 : null;
  }

  return {
    steps,
    heartRate: avgHR,
    restingHeartRate: restingHRValue,
    hrv: hrvValue,
    activeEnergy,
    sleepHours,
  };
}

// ── Write Workout ────────────────────────────────────────────────────────────

/**
 * Write a completed workout to Apple Health.
 * Requires write permission for Workout type.
 */
export async function writeWorkout(workout: HealthKitWorkoutWrite): Promise<void> {
  ensureIOS();
  const AppleHealthKit = getAppleHealthKit();

  return new Promise<void>((resolve, reject) => {
    const options = {
      type: workout.type,
      startDate: new Date(workout.startDate).toISOString(),
      endDate: new Date(workout.endDate).toISOString(),
      duration: workout.duration * 60, // convert minutes to seconds
      energyBurned: workout.energyBurned,
    };

    (AppleHealthKit as any).saveWorkout(
      options,
      (err: string, result: any) => {
        if (err) {
          reject(new HealthKitError(
            'Failed to write workout to Apple Health',
            'write_failed',
            err,
          ));
        } else {
          resolve();
        }
      },
    );
  });
}

// ── Latest Weight (backward compat) ──────────────────────────────────────────

/**
 * Fetch latest body weight. Preserves the original useHealthKit pattern.
 */
export async function fetchLatestWeight(
  unit: 'kg' | 'lbs',
): Promise<number | null> {
  ensureIOS();
  const AppleHealthKit = getAppleHealthKit();

  const hkUnit: HealthUnit = unit === 'lbs'
    ? ('pound' as HealthUnit)
    : ('gram' as HealthUnit);

  return new Promise((resolve, reject) => {
    AppleHealthKit.getLatestWeight(
      { unit: hkUnit },
      (err: string, result: { value: number }) => {
        if (err) reject(new HealthKitError(err, 'fetch_failed', err));
        else {
          const value = result?.value ?? 0;
          const finalValue = hkUnit === 'gram' ? value / 1000 : value;
          resolve(Math.round(finalValue * 10) / 10);
        }
      },
    );
  });
}

/**
 * lib/importHealthWorkout.ts
 *
 * Converts Apple Health external workouts into LockedInFIT WorkoutSession
 * records, calculates import XP, and tracks which HealthKit workout IDs have
 * already been imported so the same workout can't be counted twice.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WorkoutSession } from './types';
import type { HealthExternalWorkout } from './healthkit/types';

// ── AsyncStorage key ──────────────────────────────────────────────────────────

const IMPORTED_HK_KEY = '@lockedinfit/imported_hk_ids';

// ── Activity type → display name ──────────────────────────────────────────────

const DISPLAY_NAMES: Record<string, string> = {
  Running:                       'Run',
  Walking:                       'Walk',
  Hiking:                        'Hike',
  Cycling:                       'Ride',
  Swimming:                      'Swim',
  Rowing:                        'Row',
  Elliptical:                    'Elliptical',
  StairClimbing:                 'Stair Climb',
  JumpRope:                      'Jump Rope',
  HighIntensityIntervalTraining: 'HIIT',
  CrossTraining:                 'Cross Training',
  Yoga:                          'Yoga',
  Pilates:                       'Pilates',
  Dance:                         'Dance',
  MartialArts:                   'Martial Arts',
  Soccer:                        'Soccer',
  Basketball:                    'Basketball',
  Tennis:                        'Tennis',
  TraditionalStrengthTraining:   'Strength Training',
  FunctionalStrengthTraining:    'Functional Training',
};

export function activityDisplayName(activityType: string): string {
  return (
    DISPLAY_NAMES[activityType] ??
    activityType.replace(/([A-Z])/g, ' $1').trim()
  );
}

// ── Activity type → cardio modality ──────────────────────────────────────────

const TO_MODALITY: Record<string, WorkoutSession['cardioModality']> = {
  Running:      'running',
  Walking:      'walking',
  Hiking:       'walking',
  Cycling:      'cycling',
  Swimming:     'swimming',
  Rowing:       'rowing',
  Elliptical:   'elliptical',
  StairClimbing:'stairclimber',
  JumpRope:     'jump_rope',
};

// ── XP award for imported workouts ────────────────────────────────────────────

/**
 * Calculate XP for an Apple Watch workout imported into the log.
 *
 * Rewards are intentionally modest (10–15 XP) — less than a fully logged
 * strength session — since we have no set/rep data to award per-set XP.
 *
 *   Base:         10 XP  (showing up)
 *   15+ min:     +1 XP
 *   30+ min:     +3 XP
 *   45+ min:     +5 XP  (only highest tier awarded)
 */
export function calcImportXP(durationMinutes: number): {
  amount: number;
  breakdown: { reason: string; amount: number }[];
} {
  const breakdown: { reason: string; amount: number }[] = [];
  let total = 0;

  breakdown.push({ reason: 'Apple Watch workout', amount: 10 });
  total += 10;

  if (durationMinutes >= 45) {
    breakdown.push({ reason: '45+ min session', amount: 5 });
    total += 5;
  } else if (durationMinutes >= 30) {
    breakdown.push({ reason: '30+ min session', amount: 3 });
    total += 3;
  } else if (durationMinutes >= 15) {
    breakdown.push({ reason: '15+ min session', amount: 1 });
    total += 1;
  }

  return { amount: total, breakdown };
}

// ── Session conversion ────────────────────────────────────────────────────────

/**
 * Convert a HealthExternalWorkout into a LockedInFIT cardio WorkoutSession.
 *
 * The resulting session has:
 *   - sessionType: 'cardio'
 *   - empty exercises array (no set/rep data from Apple Health)
 *   - xpClaimed: true  (XP is awarded at import time, not via session screen)
 *   - id prefixed with 'hk-import-' to distinguish from native sessions
 *
 * cardioIntensity is estimated from calories-per-minute:
 *   ≥15 kcal/min → RPE 8 (intense)
 *   ≥10 kcal/min → RPE 6 (moderate)
 *   otherwise    → RPE 5 (light)
 */
export function convertExternalWorkoutToSession(
  workout: HealthExternalWorkout,
): WorkoutSession {
  const durationMs  = workout.duration * 60 * 1000;
  const calPerMin   = workout.duration > 0 ? workout.calories / workout.duration : 0;
  const cardioIntensity = calPerMin >= 15 ? 8 : calPerMin >= 10 ? 6 : 5;
  const modality    = TO_MODALITY[workout.activityType] ?? 'other';
  // One virtual set per 5 minutes — used by the fatigue model (muscleMapping.ts)
  const virtualSets = Math.max(1, Math.round(workout.duration / 5));

  return {
    id:            `hk-import-${workout.id}`,
    name:          `${activityDisplayName(workout.activityType)} (Apple Watch)`,
    date:          workout.startDate.split('T')[0],
    startedAt:     workout.startDate,
    completedAt:   workout.endDate,
    exercises:     [],
    sessionType:   'cardio',
    cardioModality: modality,
    cardioDurationMs: durationMs,
    cardioIntensity,
    virtualSets,
    xpClaimed:     true,
  };
}

// ── Imported ID tracking ──────────────────────────────────────────────────────

/** Load the set of HealthKit workout IDs that have already been imported. */
export async function loadImportedIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(IMPORTED_HK_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set<string>();
  }
}

/** Persist a newly imported HealthKit workout ID so it can't be imported again. */
export async function markAsImported(id: string): Promise<void> {
  try {
    const existing = await loadImportedIds();
    existing.add(id);
    await AsyncStorage.setItem(IMPORTED_HK_KEY, JSON.stringify([...existing]));
  } catch {}
}

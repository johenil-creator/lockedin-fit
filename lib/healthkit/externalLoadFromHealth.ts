/**
 * lib/healthkit/externalLoadFromHealth.ts — External workout detection & ACWR adjustment
 *
 * Detects workouts logged in Apple Health that were NOT done in LockedInFIT,
 * classifies them, estimates their training load contribution, and adjusts
 * the ACWR to account for total external training stress.
 *
 * Workout category → load estimation:
 *   cardio      → duration(min) × intensityFactor (HR zone or default)
 *   strength    → duration(min) × 0.7 (lower confidence, no set/rep data)
 *   hiit        → duration(min) × 1.2 (high systemic stress)
 *   sport       → duration(min) × 0.8
 *   walking     → only if > 45 min, small contribution
 *   flexibility → slight recovery BOOST (negative load)
 *   other       → duration(min) × 0.5
 *
 * Pure functions — no I/O, no HealthKit calls.
 */

import type { HealthKitWorkout } from './types';
import { ACTIVITY_TYPE_MAP } from './constants';

// ── Constants ────────────────────────────────────────────────────────────────

/** Minimum workout duration (minutes) to count as meaningful load. */
const MIN_DURATION_MINUTES = 5;

/** Walking workouts only count if longer than this (minutes). */
const WALKING_MIN_DURATION = 45;

/** External load confidence factor: scales down external load contribution. */
const EXTERNAL_CONFIDENCE = 0.7;

/** Load multipliers per category */
const CATEGORY_MULTIPLIERS: Record<string, number> = {
  cardio: 1.0,
  strength: 0.7,
  hiit: 1.2,
  sport: 0.8,
  walking: 0.3,
  flexibility: -0.1, // Recovery boost (negative load)
  other: 0.5,
};

// ── Types ────────────────────────────────────────────────────────────────────

export type ExternalWorkoutLoad = {
  workout: HealthKitWorkout;
  /** Estimated load contribution (arbitrary units, comparable to session load) */
  estimatedLoad: number;
  /** Simplified category */
  category: string;
};

export type ExternalLoadSummary = {
  /** Total external load across all detected workouts */
  totalExternalLoad: number;
  /** Individual workout load breakdowns */
  workouts: ExternalWorkoutLoad[];
  /** Number of external workouts detected */
  workoutCount: number;
  /** Categories breakdown */
  categoryCounts: Record<string, number>;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Classify a HealthKit activity type into our simplified categories.
 */
function classifyActivity(activityType: string): string {
  return ACTIVITY_TYPE_MAP[activityType] ?? 'other';
}

/**
 * Estimate HR-based intensity factor when heart rate data is available.
 *
 * Uses percentage of estimated max HR (220 - age) or a default max of 190.
 *
 *   < 60% maxHR  → 0.6 (Zone 1, recovery)
 *   60-70%       → 0.8 (Zone 2, aerobic)
 *   70-80%       → 1.0 (Zone 3, tempo)
 *   80-90%       → 1.2 (Zone 4, threshold)
 *   > 90%        → 1.4 (Zone 5, VO2max)
 */
function hrIntensityFactor(avgHR: number | null, maxHR = 190): number {
  if (avgHR == null || avgHR <= 0) return 1.0; // Default when no HR data

  const pct = avgHR / maxHR;
  if (pct < 0.60) return 0.6;
  if (pct < 0.70) return 0.8;
  if (pct < 0.80) return 1.0;
  if (pct < 0.90) return 1.2;
  return 1.4;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Process external workouts from Apple Health and estimate their training load.
 *
 * Filters out workouts that are too short, classifies each by type,
 * and computes a load estimate based on duration × category multiplier × HR factor.
 *
 * @param externalWorkouts - Workouts already filtered to exclude LockedInFIT sessions
 * @param estimatedMaxHR   - User's estimated max HR (220 - age), or 190 default
 */
export function processExternalWorkouts(
  externalWorkouts: HealthKitWorkout[],
  estimatedMaxHR = 190,
): ExternalLoadSummary {
  const workouts: ExternalWorkoutLoad[] = [];
  const categoryCounts: Record<string, number> = {};
  let totalExternalLoad = 0;

  for (const workout of externalWorkouts) {
    const durationMin = workout.durationMinutes;

    // Skip very short workouts
    if (durationMin < MIN_DURATION_MINUTES) continue;

    const category = classifyActivity(workout.activityType);

    // Walking only counts if > 45 min
    if (category === 'walking' && durationMin < WALKING_MIN_DURATION) continue;

    const categoryMultiplier = CATEGORY_MULTIPLIERS[category] ?? 0.5;
    const hrFactor = hrIntensityFactor(workout.averageHeartRate, estimatedMaxHR);

    // Load = duration × category multiplier × HR intensity factor × confidence
    const estimatedLoad = durationMin * categoryMultiplier * hrFactor * EXTERNAL_CONFIDENCE;

    workouts.push({ workout, estimatedLoad, category });
    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
    totalExternalLoad += estimatedLoad;
  }

  return {
    totalExternalLoad: Math.round(totalExternalLoad * 10) / 10,
    workouts,
    workoutCount: workouts.length,
    categoryCounts,
  };
}

/**
 * Adjust ACWR to account for external training load.
 *
 * The external load is added to the acute load (7-day window) before
 * recomputing the ratio. External load is scaled by EXTERNAL_CONFIDENCE
 * to reflect the lower precision of external workout data.
 *
 * @param currentACWR   - ACWR from in-app workouts only
 * @param acuteLoad     - Current 7-day acute load (in-app)
 * @param chronicLoad   - Current 28-day chronic weekly average (in-app)
 * @param externalLoad  - Total external load from processExternalWorkouts
 * @returns Adjusted ACWR
 */
export function adjustACWRForExternalLoad(
  currentACWR: number,
  acuteLoad: number,
  chronicLoad: number,
  externalLoad: number,
): number {
  if (chronicLoad <= 0) return currentACWR;

  // Add external load to acute, scaled by confidence
  const adjustedAcute = acuteLoad + externalLoad;
  return adjustedAcute / chronicLoad;
}

/**
 * Estimate the systemic fatigue contribution from external workouts.
 *
 * Returns a multiplier for recovery rate:
 *   0.85 — heavy external training, significantly slower recovery
 *   0.90 — moderate external training
 *   0.95 — light external training
 *   1.00 — no meaningful external training
 */
export function externalFatigueModifier(externalLoad: number): number {
  if (externalLoad <= 0) return 1.0;
  if (externalLoad < 20) return 0.95;
  if (externalLoad < 50) return 0.90;
  return 0.85;
}

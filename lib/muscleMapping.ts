/**
 * lib/muscleMapping.ts — Muscle-to-exercise mapping and session fatigue calculator
 *
 * Provides two public functions:
 *   getMusclesWorked   — resolves primary + secondary muscles for a given exercise
 *   computeSessionFatigue — accumulates per-muscle fatigue across a completed session
 *
 * Strategy:
 *   1. Exact / fuzzy catalog lookup via findExercise (O(1) exact, capped fuzzy)
 *   2. Pattern-based fallback for exercises not in the catalog
 *
 * Fatigue formula (per working set):
 *   fatiguePerSet = BASE_FATIGUE_PER_SET * (rpe / RPE_NEUTRAL)
 *   Primary muscles   += fatiguePerSet
 *   Secondary muscles += fatiguePerSet * SECONDARY_CREDIT
 *   All values clamped to [0, 100]
 */

import type { MovementPattern } from "./types";
import type { MuscleGroup, MuscleFatigueMap } from "./types";
import type { WorkoutSession } from "./types";
import { findExercise } from "../src/lib/exerciseMatch";

// ── Constants ────────────────────────────────────────────────────────────────

/** Fatigue points a primary muscle accrues per completed working set (0-100 scale). */
const BASE_FATIGUE_PER_SET = 8;

/**
 * Neutral RPE used as the denominator when scaling fatigue.
 * An RPE-7 set produces exactly BASE_FATIGUE_PER_SET points.
 */
const RPE_NEUTRAL = 7;

/**
 * Fraction of primary fatigue credited to secondary muscles.
 * 0.5 = secondary muscles accumulate 50% of primary fatigue.
 */
const SECONDARY_CREDIT = 0.5;

/** All muscle groups in the recovery system — used to initialise MuscleFatigueMap. */
const ALL_MUSCLES: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'forearms',
  'traps',
  'lats',
  'rear_delts',
  'front_delts',
  'side_delts',
];

// ── Pattern-based fallback maps ───────────────────────────────────────────────

/**
 * Default muscle groups per MovementPattern.
 * Used only when the exercise is not found in the catalog.
 * The catalog is authoritative; this is the fallback.
 */
const PATTERN_PRIMARY: Record<MovementPattern, MuscleGroup[]> = {
  squat:            ['quads'],
  hinge:            ['hamstrings', 'glutes'],
  horizontal_push:  ['chest'],
  horizontal_pull:  ['back', 'lats'],
  vertical_push:    ['shoulders'],
  vertical_pull:    ['lats'],
  isolation_upper:  [],   // can't determine without exercise name
  isolation_lower:  [],
  core:             ['core'],
  conditioning:     ['quads', 'glutes'],
  carry:            ['traps', 'core'],
  unknown:          [],
};

const PATTERN_SECONDARY: Record<MovementPattern, MuscleGroup[]> = {
  squat:            ['glutes', 'hamstrings', 'core'],
  hinge:            ['back', 'core'],
  horizontal_push:  ['triceps', 'front_delts'],
  horizontal_pull:  ['biceps', 'rear_delts'],
  vertical_push:    ['triceps', 'front_delts'],
  vertical_pull:    ['biceps'],
  isolation_upper:  [],
  isolation_lower:  [],
  core:             [],
  conditioning:     ['core', 'calves'],
  carry:            ['forearms', 'glutes'],
  unknown:          [],
};

// ── Public API ────────────────────────────────────────────────────────────────

export type MuscleGroups = {
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
};

/**
 * Resolve the primary and secondary muscle groups for a named exercise.
 *
 * Resolution order:
 *   1. Catalog lookup (exact then fuzzy) — uses per-exercise muscle data
 *   2. Pattern fallback — uses coarse movement-pattern defaults
 *
 * The catalog's MuscleGroup values are a strict subset of the recovery
 * system's MuscleGroup union, so the cast is safe.
 *
 * @param exerciseName  - Human-readable exercise name (e.g. "Barbell Back Squat")
 * @param pattern       - MovementPattern from the classifier (used as fallback)
 */
export function getMusclesWorked(
  exerciseName: string,
  pattern: MovementPattern,
): MuscleGroups {
  // ── Step 1: Catalog lookup ───────────────────────────────────────────────
  const entry = findExercise(exerciseName);
  if (entry) {
    return {
      // Safe cast: catalog MuscleGroup is a subset of recovery MuscleGroup
      primary:   entry.primaryMuscles as MuscleGroup[],
      secondary: entry.secondaryMuscles as MuscleGroup[],
    };
  }

  // ── Step 2: Pattern fallback ─────────────────────────────────────────────
  const safePattern = pattern in PATTERN_PRIMARY ? pattern : 'unknown';
  return {
    primary:   PATTERN_PRIMARY[safePattern],
    secondary: PATTERN_SECONDARY[safePattern],
  };
}

/**
 * Compute per-muscle fatigue accumulated across an entire workout session.
 *
 * Algorithm:
 *   For each exercise in the session:
 *     - Resolve primary + secondary muscle groups
 *     - For each completed, non-warm-up set:
 *         intensity = targetRPE / RPE_NEUTRAL  (default RPE 7 → multiplier 1.0)
 *         primary muscles   += BASE_FATIGUE_PER_SET * intensity
 *         secondary muscles += BASE_FATIGUE_PER_SET * intensity * SECONDARY_CREDIT
 *   Clamp all values to [0, 100].
 *
 * @param session - A completed or in-progress WorkoutSession
 * @returns       - MuscleFatigueMap with fatigue 0-100 per muscle group
 */
export function computeSessionFatigue(session: WorkoutSession): MuscleFatigueMap {
  // Initialise all muscles to 0
  const fatigue = Object.fromEntries(
    ALL_MUSCLES.map((m) => [m, 0]),
  ) as MuscleFatigueMap;

  if (session.sessionType === 'cardio') {
    // Cardio sessions don't target specific muscles through resistance;
    // apply a flat conditioning load to the appropriate groups.
    const cardioRPE = session.cardioIntensity ?? 6;
    const intensity = cardioRPE / RPE_NEUTRAL;
    const virtualSets = session.virtualSets ?? 1;
    const cardioLoad = BASE_FATIGUE_PER_SET * intensity * virtualSets;

    fatigue['quads']   = Math.min(100, fatigue['quads']   + cardioLoad * 0.5);
    fatigue['glutes']  = Math.min(100, fatigue['glutes']  + cardioLoad * 0.4);
    fatigue['calves']  = Math.min(100, fatigue['calves']  + cardioLoad * 0.4);
    fatigue['core']    = Math.min(100, fatigue['core']    + cardioLoad * 0.2);
    fatigue['hamstrings'] = Math.min(100, fatigue['hamstrings'] + cardioLoad * 0.3);

    return fatigue;
  }

  for (const exercise of session.exercises) {
    // Classify exercise pattern from name (classifier resolves catalog entry)
    const { primary, secondary } = getMusclesWorked(
      exercise.name,
      // Use the matched pattern stored on the exercise if present, else 'unknown'
      (exercise.matchedPattern as MovementPattern | undefined) ?? 'unknown',
    );

    if (primary.length === 0 && secondary.length === 0) continue;

    // Default RPE per exercise (clamp to [1, 10])
    const rpe = Math.max(1, Math.min(10, exercise.targetRPE ?? 7));
    const intensity = rpe / RPE_NEUTRAL;

    for (const set of exercise.sets) {
      // Skip incomplete sets and warm-up sets
      if (!set.completed || set.isWarmUp) continue;

      const primaryLoad   = BASE_FATIGUE_PER_SET * intensity;
      const secondaryLoad = primaryLoad * SECONDARY_CREDIT;

      for (const muscle of primary) {
        fatigue[muscle] = Math.min(100, fatigue[muscle] + primaryLoad);
      }
      for (const muscle of secondary) {
        fatigue[muscle] = Math.min(100, fatigue[muscle] + secondaryLoad);
      }
    }
  }

  return fatigue;
}

/**
 * Merge two MuscleFatigueMap values, representing accumulated fatigue over
 * multiple sessions.  Fatigue decays between sessions — see recoveryEstimator
 * for the decay model.  This function simply adds the values and clamps to 100.
 *
 * @param base    - Existing fatigue (e.g. from previous sessions after decay)
 * @param session - Fresh fatigue from the latest session
 */
export function mergeFatigue(
  base: MuscleFatigueMap,
  session: MuscleFatigueMap,
): MuscleFatigueMap {
  return Object.fromEntries(
    ALL_MUSCLES.map((m) => [m, Math.min(100, base[m] + session[m])]),
  ) as MuscleFatigueMap;
}

/**
 * Apply exponential fatigue decay to a MuscleFatigueMap.
 *
 * Decay model:  fatigue_t = fatigue_0 * e^(-k * hours)
 *   where k = ln(2) / HALF_LIFE_HOURS (fatigue halves every HALF_LIFE_HOURS)
 *
 * Default half-life: 36 hours (fast-twitch muscles recover faster in practice,
 * but 36 h is a reasonable global average for recreational athletes).
 *
 * @param map              - Current fatigue map
 * @param elapsedHours     - Hours since the map was last updated
 * @param halfLifeHours    - Half-life in hours (default 36)
 */
export function decayFatigue(
  map: MuscleFatigueMap,
  elapsedHours: number,
  halfLifeHours = 36,
): MuscleFatigueMap {
  // k = ln(2) / halfLife — decay constant
  const k = Math.LN2 / halfLifeHours;
  // decay factor for this time period
  const factor = Math.exp(-k * elapsedHours);

  return Object.fromEntries(
    ALL_MUSCLES.map((m) => [m, map[m] * factor]),
  ) as MuscleFatigueMap;
}

/**
 * Return a zeroed MuscleFatigueMap (all muscles at 0 fatigue).
 * Useful for initialising state for a new user or after a full reset.
 */
export function emptyFatigueMap(): MuscleFatigueMap {
  return Object.fromEntries(
    ALL_MUSCLES.map((m) => [m, 0]),
  ) as MuscleFatigueMap;
}

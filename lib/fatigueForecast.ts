// lib/fatigueForecast.ts
//
// Plan-Aware Fatigue Forecast Engine
//
// Predicts per-muscle fatigue after the next planned workout session.
// Used by the recovery dashboard to surface overtraining warnings and
// actionable suggestions BEFORE the session happens.
//
// ── Separation of concerns ─────────────────────────────────────────────────────
//   This engine is PURE MATH. It does NOT navigate the plan or read storage.
//   The calling hook is responsible for resolving which session is next and
//   passing the exercise list + label directly (see ForecastParams).
//
// ── Forward projection model ───────────────────────────────────────────────────
//   1. For each muscle in currentFatigueMap, apply hoursUntilSession of recovery
//      via estimateRecovery to get the post-rest baseline.
//   2. For each exercise in nextExercises, resolve muscles via getMusclesWorked
//      and accumulate fatigue additions per set.
//   3. Merge: post-recovery baseline + session additions = projectedFatigueMap.
//   4. Flag any muscle exceeding FATIGUE_OVERTRAIN_THRESHOLD (80).
//   5. Generate swap / volume-reduction / rest-day suggestions.
//
// ── Cache ──────────────────────────────────────────────────────────────────────
//   Module-level Map with 5-minute TTL.
//   Call clearForecastCache() immediately after writing new session data.

import type {
  Exercise,
  MuscleGroup,
  MuscleFatigueMap,
  ForecastWarning,
  BlockType,
} from './types';
import { getMusclesWorked, emptyFatigueMap } from './muscleMapping';
import { estimateRecovery } from './recoveryEstimator';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Fatigue threshold above which a muscle is flagged as overtrained risk. */
const FATIGUE_OVERTRAIN_THRESHOLD = 80;

/** Default hours between now and the next session ("next morning"). */
const DEFAULT_HOURS_UNTIL_SESSION = 12;

/**
 * Fatigue points per primary muscle per working set.
 * Mirrors BASE_FATIGUE_PER_SET in muscleMapping.ts — must stay in sync.
 */
const BASE_FATIGUE_PER_SET = 8;

/** Neutral RPE denominator: RPE 7 set → 1.0× multiplier. */
const RPE_NEUTRAL = 7;

/** Secondary muscles receive this fraction of primary fatigue per set. */
const SECONDARY_CREDIT = 0.5;

/**
 * When this many or more muscles are projected overtrained, a blanket
 * rest-day suggestion replaces individual exercise suggestions.
 */
const REST_DAY_THRESHOLD = 3;

/** Cache TTL: 5 minutes (forecast is stable unless new session data arrives). */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Default RPE per block type used when projecting session fatigue.
 * Derived from the RPE_TARGETS midpoints in lib/loadEngine/progression.ts.
 */
const BLOCK_DEFAULT_RPE: Readonly<Record<BlockType, number>> = {
  accumulation:    7.0,  // moderate — building volume
  intensification: 8.0,  // heavier loads
  realization:     9.0,  // peak expression
} as const;

// ── Exported Types ────────────────────────────────────────────────────────────

/** Full forecast output for one upcoming session. */
export type ForecastResult = {
  /** Label of the next session as resolved by the caller, e.g. "Day 3 — Push". */
  nextDayLabel: string;
  /** Per-muscle warnings where projected fatigue exceeds FATIGUE_OVERTRAIN_THRESHOLD. */
  warnings: ForecastWarning[];
  /** Full projected fatigue map after the session. */
  projectedFatigueMap: MuscleFatigueMap;
  /** Muscles projected to reach Overtrained status (fatigue > 80) after the session. */
  overtrainedMuscles: MuscleGroup[];
  /** Actionable suggestions: exercise swaps, volume reductions, or rest day. */
  suggestions: string[];
};

/** Inputs to forecastNextSession — all data pre-resolved by the calling hook. */
export type ForecastParams = {
  /** Current per-muscle fatigue, as of right now (0–100). */
  currentFatigueMap: MuscleFatigueMap;
  /** Exercises from the next scheduled plan day (pre-resolved by the hook). */
  nextExercises: Exercise[];
  /** Human-readable label for the next session, e.g. "Day 3 — Push". */
  nextDayLabel: string;
  /**
   * Hours until the next session begins.
   * Defaults to 12 ("next morning").
   */
  hoursUntilSession?: number;
  /**
   * Active periodization block type, used to scale recovery rates and RPE.
   * Defaults to 'accumulation' when not provided.
   */
  blockType?: BlockType;
};

// ── Module-level cache ────────────────────────────────────────────────────────

type CacheEntry = {
  result: ForecastResult;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

/**
 * Invalidate all cached forecast results.
 * Call this immediately after writing new session data to storage.
 */
export function clearForecastCache(): void {
  cache.clear();
}

// ── Internal: Cache key ───────────────────────────────────────────────────────

/**
 * Build a stable cache key from the fatigue map values and exercise names.
 * Rounding fatigue to integers reduces cache misses from floating-point drift.
 */
function buildCacheKey(params: ForecastParams): string {
  const fatigueHash = (Object.values(params.currentFatigueMap) as number[])
    .map((v) => Math.round(v))
    .join(',');
  const exerciseHash = params.nextExercises.map((e) => `${e.exercise}:${e.sets}`).join('|');
  const hours = params.hoursUntilSession ?? DEFAULT_HOURS_UNTIL_SESSION;
  const block = params.blockType ?? 'accumulation';
  return `${fatigueHash}::${exerciseHash}::${hours}::${block}`;
}

// ── Internal: Recovery projection ────────────────────────────────────────────

/**
 * Project the post-recovery fatigue map by running estimateRecovery for each
 * muscle, simulating `hoursUntilSession` hours of rest.
 *
 * Uses neutral defaults for frequency (2×/week) and session intensity
 * (block default RPE) because we're projecting forward in time, not
 * describing a specific past session.
 */
function projectPostRecoveryFatigue(
  currentFatigueMap: MuscleFatigueMap,
  hoursUntilSession: number,
  blockType: BlockType,
): MuscleFatigueMap {
  const result = { ...currentFatigueMap };
  const sessionIntensityProxy = BLOCK_DEFAULT_RPE[blockType];

  for (const muscle of Object.keys(result) as MuscleGroup[]) {
    const estimate = estimateRecovery(muscle, {
      fatigue:               result[muscle],
      hoursSinceLastTrained: hoursUntilSession,
      sevenDayFrequency:     2,                   // neutral two-per-week baseline
      sessionIntensityProxy,
      blockType,
    });
    result[muscle] = estimate.fatigueLevel;
  }

  return result;
}

// ── Internal: Session fatigue projection ─────────────────────────────────────

type ExerciseMuscleMap = {
  exercise: Exercise;
  primary:   MuscleGroup[];
  secondary: MuscleGroup[];
};

/**
 * Accumulate projected fatigue from a list of plan exercises.
 *
 * Resolves muscles once per exercise and returns both the fatigue delta map
 * and a per-exercise breakdown — the breakdown is reused in suggestion
 * generation so getMusclesWorked is only called once per exercise.
 *
 * RPE is block-contextual: heavier blocks project more fatigue per set.
 */
function projectSessionFatigue(
  exercises: Exercise[],
  blockType: BlockType,
): { fatigueMap: MuscleFatigueMap; exerciseMap: ExerciseMuscleMap[] } {
  const fatigueMap  = emptyFatigueMap();
  const exerciseMap: ExerciseMuscleMap[] = [];

  const rpe       = BLOCK_DEFAULT_RPE[blockType];
  const intensity = rpe / RPE_NEUTRAL;

  for (const ex of exercises) {
    const numSets = parseSetCount(ex.sets ?? '3');
    const { primary, secondary } = getMusclesWorked(
      ex.exercise,
      'unknown', // pattern unknown for plan exercises; catalog lookup handles most names
    );

    exerciseMap.push({ exercise: ex, primary, secondary });

    if (primary.length === 0 && secondary.length === 0) continue;

    const primaryLoad   = BASE_FATIGUE_PER_SET * intensity;
    const secondaryLoad = primaryLoad * SECONDARY_CREDIT;

    for (let s = 0; s < numSets; s++) {
      for (const m of primary)   fatigueMap[m] = Math.min(100, fatigueMap[m] + primaryLoad);
      for (const m of secondary) fatigueMap[m] = Math.min(100, fatigueMap[m] + secondaryLoad);
    }
  }

  return { fatigueMap, exerciseMap };
}

/** Parse the first integer from a set string ("3", "3-4", "3×5" → 3). */
function parseSetCount(setsStr: string): number {
  const m = setsStr.match(/(\d+)/);
  return m ? Math.max(1, parseInt(m[1], 10)) : 3;
}

// ── Internal: Warnings ────────────────────────────────────────────────────────

function buildWarning(
  muscle: MuscleGroup,
  currentFatigue: number,
  projectedFatigue: number,
): ForecastWarning {
  const name   = muscle.replace(/_/g, ' ');
  const excess = Math.round(projectedFatigue - FATIGUE_OVERTRAIN_THRESHOLD);

  let recommendation: string;
  if (projectedFatigue >= 95) {
    recommendation =
      `${name} will be critically fatigued (+${excess} over limit). Avoid direct work or take a rest day.`;
  } else if (projectedFatigue >= 85) {
    recommendation =
      `${name} will be overtrained (+${excess}). Swap for a lighter variation or cut 2 sets.`;
  } else {
    recommendation =
      `${name} borderline overtrained (+${excess}). Reduce by 1 working set or drop RPE by 1.`;
  }

  return { muscle, currentFatigue, projectedFatigue, recommendation };
}

// ── Internal: Suggestions ─────────────────────────────────────────────────────

/**
 * Generate user-facing suggestions for exercises contributing to overtrained muscles.
 *
 * Rules:
 *   ≥ REST_DAY_THRESHOLD overtrained muscles → single rest-day suggestion.
 *   Primary driver exercise  → swap for lighter variation or cut sets.
 *   Secondary driver         → drop 1 RPE point.
 *   Catch-all                → for overtrained muscles not targeted by any exercise.
 */
function buildSuggestions(
  exerciseMap:        ExerciseMuscleMap[],
  overtrainedMuscles: MuscleGroup[],
): string[] {
  if (overtrainedMuscles.length === 0) return [];

  if (overtrainedMuscles.length >= REST_DAY_THRESHOLD) {
    const list = overtrainedMuscles.map((m) => m.replace(/_/g, ' ')).join(', ');
    return [
      `Consider a rest day — ${overtrainedMuscles.length} muscle groups (${list}) are projected overtrained.`,
    ];
  }

  const overtrained = new Set(overtrainedMuscles);
  const suggestions: string[] = [];
  const addressed   = new Set<MuscleGroup>();

  for (const { exercise: ex, primary, secondary } of exerciseMap) {
    const hitPrimary   = primary.filter((m) => overtrained.has(m));
    const hitSecondary = secondary.filter((m) => overtrained.has(m));
    const allHit       = Array.from(new Set([...hitPrimary, ...hitSecondary]));

    if (allHit.length === 0) continue;

    const muscleNames = allHit.map((m) => m.replace(/_/g, ' ')).join(' and ');
    allHit.forEach((m) => addressed.add(m));

    if (hitPrimary.length > 0) {
      suggestions.push(
        `Swap "${ex.exercise}" for a cable or machine variation, or drop 1–2 sets, to protect ${muscleNames}.`,
      );
    } else {
      suggestions.push(
        `"${ex.exercise}" adds secondary load to ${muscleNames} — reduce intensity by 1 RPE to stay safe.`,
      );
    }
  }

  // Catch-all for overtrained muscles not driven by any session exercise
  const unaddressed = overtrainedMuscles.filter((m) => !addressed.has(m));
  if (unaddressed.length > 0) {
    const names = unaddressed.map((m) => m.replace(/_/g, ' ')).join(' and ');
    suggestions.push(
      `${names} needs extra recovery — consider an additional rest day before this session.`,
    );
  }

  return suggestions;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Forecast the fatigue impact of the next planned workout session.
 *
 * The caller (hook) is responsible for resolving which session is next and
 * passing `nextExercises` + `nextDayLabel` directly. This function does
 * only math — no plan navigation, no AsyncStorage access.
 *
 * Algorithm:
 *   1. Project `hoursUntilSession` hours of recovery onto each muscle.
 *   2. Accumulate fatigue additions from `nextExercises`.
 *   3. Merge post-recovery + session fatigue into projectedFatigueMap.
 *   4. Flag any muscle exceeding 80 with a contextual ForecastWarning.
 *   5. Generate actionable suggestions for flagged muscles.
 *
 * Edge cases:
 *   - nextExercises is empty  → returns zeroed projection, no warnings.
 *   - All muscles are fresh   → returns full projection, no warnings.
 *
 * Cache: 5-minute TTL keyed on fatigue signature + exercise list.
 * Call clearForecastCache() after writing new session data to storage.
 *
 * This function NEVER modifies the plan. All output is advisory only.
 */
export function forecastNextSession(params: ForecastParams): ForecastResult {
  const {
    currentFatigueMap,
    nextExercises,
    nextDayLabel,
    hoursUntilSession = DEFAULT_HOURS_UNTIL_SESSION,
    blockType         = 'accumulation',
  } = params;

  // ── Cache check ───────────────────────────────────────────────────────────
  const key    = buildCacheKey(params);
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.result;

  // ── Step 1: Project recovery to session time ──────────────────────────────
  const postRecoveryFatigue = projectPostRecoveryFatigue(
    currentFatigueMap,
    hoursUntilSession,
    blockType,
  );

  // ── Step 2: Project session fatigue additions ─────────────────────────────
  const { fatigueMap: sessionFatigue, exerciseMap } = projectSessionFatigue(
    nextExercises,
    blockType,
  );

  // ── Step 3: Merge ─────────────────────────────────────────────────────────
  const projected: MuscleFatigueMap = { ...postRecoveryFatigue };
  for (const muscle of Object.keys(projected) as MuscleGroup[]) {
    projected[muscle] = Math.min(100, projected[muscle] + sessionFatigue[muscle]);
  }

  // ── Step 4: Flag overtrained muscles ─────────────────────────────────────
  const warnings:           ForecastWarning[] = [];
  const overtrainedMuscles: MuscleGroup[]     = [];

  for (const muscle of Object.keys(projected) as MuscleGroup[]) {
    const proj = projected[muscle];
    if (proj > FATIGUE_OVERTRAIN_THRESHOLD) {
      overtrainedMuscles.push(muscle as MuscleGroup);
      warnings.push(buildWarning(
        muscle as MuscleGroup,
        postRecoveryFatigue[muscle],
        proj,
      ));
    }
  }

  // ── Step 5: Generate suggestions ─────────────────────────────────────────
  const suggestions = buildSuggestions(exerciseMap, overtrainedMuscles);

  const result: ForecastResult = {
    nextDayLabel,
    warnings,
    projectedFatigueMap: projected,
    overtrainedMuscles,
    suggestions,
  };

  // ── Cache with TTL ────────────────────────────────────────────────────────
  cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });

  return result;
}

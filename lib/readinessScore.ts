/**
 * lib/readinessScore.ts — Muscle Readiness Score calculator
 *
 * Computes an overall training readiness score (0–100) from five weighted
 * components, providing a deterministic, memoizable snapshot of how prepared
 * the athlete is to train today.
 *
 * Component weights:
 *   muscleFreshness  40% — size-weighted inverse of current fatigue
 *   blockContext     20% — how appropriate fatigue is for the active block
 *   streakModifier   15% — penalty for consecutive training days > 3
 *   forecastScore    15% — inverse of forecast risk for tomorrow's session
 *   acwrScore        10% — ACWR proximity to sweet-spot 0.8–1.3
 *
 * Labels:
 *   80–100 → 'Prime'        (green)
 *   60–79  → 'Ready'        (yellow-green)
 *   40–59  → 'Manage Load'  (orange)
 *   0–39   → 'Recover'      (red)
 *
 * Performance characteristics:
 *   - Pure function — no I/O; accepts pre-loaded data
 *   - Module-level LRU cache keyed by input hash
 *   - Target: <2ms per call, <20ms for full-dashboard computation
 */

import type {
  MuscleGroup,
  MuscleFatigueMap,
  ReadinessScore,
  ReadinessLabel,
  BlockType,
} from "./types";

// ── Muscle size weights ───────────────────────────────────────────────────────

/**
 * Relative size / neurological demand of each muscle group.
 * Larger muscles contribute proportionally more to the weighted fatigue average.
 *
 *   Large  (3): quads, hamstrings, glutes, back, lats, chest
 *   Medium (2): shoulders, triceps, biceps, core, traps
 *   Small  (1): forearms, calves, rear_delts, front_delts, side_delts
 */
const MUSCLE_WEIGHT: Record<MuscleGroup, number> = {
  quads:       3,
  hamstrings:  3,
  glutes:      3,
  back:        3,
  lats:        3,
  chest:       3,
  shoulders:   2,
  triceps:     2,
  biceps:      2,
  core:        2,
  traps:       2,
  forearms:    1,
  calves:      1,
  rear_delts:  1,
  front_delts: 1,
  side_delts:  1,
};

/** Sum of all muscle weights — computed once at import time. */
const TOTAL_WEIGHT = Object.values(MUSCLE_WEIGHT).reduce((s, w) => s + w, 0);

// ── Component calculators ─────────────────────────────────────────────────────

/**
 * Compute the muscle freshness score (0–100).
 *
 * Formula:
 *   weightedFatigue = Σ(fatigue[m] × weight[m]) / Σ(weight[m])
 *   muscleFreshness = 100 − weightedFatigue
 *
 * Large muscles dominate because their fatigue matters more for performance.
 */
function muscleFreshnessScore(fatigueMap: MuscleFatigueMap): number {
  let weightedSum = 0;
  for (const [muscle, weight] of Object.entries(MUSCLE_WEIGHT) as [MuscleGroup, number][]) {
    weightedSum += fatigueMap[muscle] * weight;
  }
  const weightedFatigue = weightedSum / TOTAL_WEIGHT;
  return Math.max(0, 100 - weightedFatigue);
}

/**
 * Compute the block context score (0–100).
 *
 * The score reflects how appropriate the current fatigue level is given
 * the periodisation block in play:
 *
 *   accumulation   → tolerance = 70:  high volume expected, fatigue is normal.
 *                     Score is boosted when fatigue is moderate or high.
 *   intensification→ tolerance = 50:  moderate volume, heavier loads.
 *                     Score is neutral.
 *   realization    → tolerance = 30:  taper/peak — athlete should be fresh.
 *                     Score is penalised if significant fatigue remains.
 *
 * blockContextScore = max(0, 100 − max(0, weightedFatigue − tolerance))
 *
 * Example: accumulation, fatigue = 60 → max(0, 100 − max(0, 60 − 70)) = 100
 *          realization,  fatigue = 60 → max(0, 100 − max(0, 60 − 30)) = 70
 */
function blockContextScore(
  fatigueMap: MuscleFatigueMap,
  blockType: BlockType,
): number {
  const tolerance: Record<BlockType, number> = {
    accumulation:    70,
    intensification: 50,
    realization:     30,
  };

  let weightedSum = 0;
  for (const [muscle, weight] of Object.entries(MUSCLE_WEIGHT) as [MuscleGroup, number][]) {
    weightedSum += fatigueMap[muscle] * weight;
  }
  const weightedFatigue = weightedSum / TOTAL_WEIGHT;
  const excess = Math.max(0, weightedFatigue - tolerance[blockType]);
  return Math.max(0, 100 - excess);
}

/**
 * Compute the streak modifier score (0–100).
 *
 * Formula:
 *   streakScore = max(40, 100 − max(0, streakDays − 3) × STREAK_PENALTY)
 *
 *   STREAK_PENALTY = 5 points per day over the 3-day buffer.
 *   Floor of 40 prevents score from reaching zero on extreme streaks.
 *
 * Examples:
 *   streakDays =  3 → 100 (within buffer — no penalty)
 *   streakDays =  7 → 100 − 4×5 = 80
 *   streakDays = 10 → 100 − 7×5 = 65
 *   streakDays = 14 → 100 − 11×5 = 45 → clamped to 45 (> floor 40)
 *   streakDays = 20 → 100 − 17×5 = 15 → clamped to 40 (floor)
 */
function streakModifierScore(streakDays: number): number {
  const STREAK_BUFFER = 3;
  const STREAK_PENALTY = 5;
  const FLOOR = 40;
  const daysOver = Math.max(0, streakDays - STREAK_BUFFER);
  return Math.max(FLOOR, 100 - daysOver * STREAK_PENALTY);
}

/**
 * Convert forecastRisk (0–100, higher = riskier tomorrow) to a
 * positive score (0–100, higher = safer tomorrow).
 *
 *   forecastScore = 100 − forecastRisk
 */
function forecastContribScore(forecastRisk: number): number {
  return Math.max(0, Math.min(100, 100 - forecastRisk));
}

/**
 * Convert ACWR to a 0–100 readiness contribution.
 *
 * ACWR sweet spot: 0.8–1.3 → score 100
 * Linear ramp-down outside the sweet spot:
 *   0.6–0.8  → 50 to 100  (undertrained ramp)
 *   1.3–1.5  → 100 to 50  (overreaching ramp)
 *   < 0.6 or > 1.5 → 0   (danger zones)
 */
function acwrContribScore(acwr: number): number {
  if (acwr >= 0.8 && acwr <= 1.3) return 100;
  if (acwr >= 0.6 && acwr < 0.8) {
    // Linear: 50 at 0.6 → 100 at 0.8
    return 50 + ((acwr - 0.6) / 0.2) * 50;
  }
  if (acwr > 1.3 && acwr <= 1.5) {
    // Linear: 100 at 1.3 → 50 at 1.5
    return 100 - ((acwr - 1.3) / 0.2) * 50;
  }
  return 0;
}

// ── Label mapping ─────────────────────────────────────────────────────────────

function labelFromScore(score: number): ReadinessLabel {
  if (score >= 80) return 'Prime';
  if (score >= 60) return 'Ready';
  if (score >= 40) return 'Manage Load';
  return 'Recover';
}

// ── Module-level LRU cache ────────────────────────────────────────────────────

/**
 * Simple bounded cache (64 entries) keyed by a hash of all inputs.
 * Prevents recomputation across multiple React renders in the same session.
 */
const CACHE_SIZE = 64;
const scoreCache = new Map<string, ReadinessScore>();

/**
 * Build a deterministic, fast cache key from numeric inputs.
 * Values are quantised to reduce keys from floating-point noise:
 *   fatigue per-muscle rounded to 1 dp, acwr to 2 dp.
 */
function buildCacheKey(
  fatigueMap: MuscleFatigueMap,
  blockType: BlockType,
  streakDays: number,
  forecastRisk: number,
  acwr: number,
): string {
  // Muscle fatigue sum as a fast proxy for map content — collision-tolerant
  // since block/streak/risk/acwr together make false collisions astronomically rare.
  let fatigueSum = 0;
  for (const v of Object.values(fatigueMap)) fatigueSum += v;
  return `${Math.round(fatigueSum * 10)}:${blockType}:${streakDays}:${Math.round(forecastRisk)}:${Math.round(acwr * 100)}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export type ReadinessParams = {
  fatigueMap: MuscleFatigueMap;
  blockType: BlockType;
  /** Consecutive training days in the current streak. */
  streakDays: number;
  /**
   * Forecast risk score (0–100) representing how risky tomorrow's planned
   * session would be given current fatigue levels.
   * Pass 0 when no forecast is available (neutral default).
   */
  forecastRisk: number;
  /** Acute:Chronic Workload Ratio from the adaptation model. */
  acwr: number;
  /**
   * Optional health signal from Apple Health data (0–100).
   * When provided with sufficient confidence, the weight allocation shifts:
   *   muscleFreshness: 35%, blockContext: 17%, streakModifier: 13%,
   *   forecastScore: 13%, acwrScore: 8%, healthSignal: 14%
   *
   * When absent or confidence < 0.3, original weights are preserved.
   */
  healthSignal?: { score: number; confidence: number };
};

/**
 * Compute the overall training readiness score (0–100) with full component
 * breakdown for dashboard display.
 *
 * Weighted composite:
 *   score = muscleFreshness×0.40 + blockContext×0.20 + streakModifier×0.15
 *         + forecastScore×0.15   + acwrScore×0.10
 *
 * All inputs are pure data — no I/O is performed.
 * Results are memoized in a module-level cache (64-entry, keyed by inputs).
 *
 * @param params - Pre-loaded training state (all computed outside this function)
 */
export function computeReadiness(params: ReadinessParams): ReadinessScore {
  const { fatigueMap, blockType, streakDays, forecastRisk, acwr, healthSignal } = params;

  // ── Cache lookup ──────────────────────────────────────────────────────────
  const healthKey = healthSignal
    ? `:hs${Math.round(healthSignal.score)}c${Math.round(healthSignal.confidence * 100)}`
    : '';
  const key = buildCacheKey(fatigueMap, blockType, streakDays, forecastRisk, acwr) + healthKey;
  const cached = scoreCache.get(key);
  if (cached) return cached;

  // ── Compute each component ────────────────────────────────────────────────
  const muscleFreshness = muscleFreshnessScore(fatigueMap);
  const blockContext    = blockContextScore(fatigueMap, blockType);
  const streakModifier  = streakModifierScore(streakDays);
  const forecastScore   = forecastContribScore(forecastRisk);
  const acwrScore       = acwrContribScore(acwr);

  // ── Weighted composite ────────────────────────────────────────────────────
  // When health signal is available with sufficient confidence (≥ 0.3),
  // reallocate weights to include the health component at 14%.
  const useHealthSignal =
    healthSignal != null && healthSignal.confidence >= 0.3;

  let rawScore: number;
  if (useHealthSignal) {
    rawScore =
      muscleFreshness       * 0.35 +
      blockContext          * 0.17 +
      streakModifier        * 0.13 +
      forecastScore         * 0.13 +
      acwrScore             * 0.08 +
      healthSignal!.score   * 0.14;
  } else {
    rawScore =
      muscleFreshness * 0.40 +
      blockContext    * 0.20 +
      streakModifier  * 0.15 +
      forecastScore   * 0.15 +
      acwrScore       * 0.10;
  }

  const score = Math.round(Math.max(0, Math.min(100, rawScore)));

  const result: ReadinessScore = {
    score,
    label: labelFromScore(score),
    components: {
      muscleFreshness,
      blockContext,
      streakModifier,
      forecastScore,
      acwrScore,
      ...(useHealthSignal ? { healthSignal: healthSignal!.score } : {}),
    },
  };

  // ── Cache eviction + store ────────────────────────────────────────────────
  // Evict oldest entry when cache is full (Map iteration order is insertion order)
  if (scoreCache.size >= CACHE_SIZE) {
    scoreCache.delete(scoreCache.keys().next().value as string);
  }
  scoreCache.set(key, result);

  return result;
}

/**
 * Invalidate the readiness score cache.
 * Call after session completion so stale scores aren't served on next open.
 */
export function clearReadinessCache(): void {
  scoreCache.clear();
}

/**
 * Return the dominant contributing factor (label + raw score) from a
 * ReadinessScore for summary display ("Held back by: Muscle Fatigue 52").
 */
export function dominantFactor(readiness: ReadinessScore): { label: string; score: number } {
  const c = readiness.components;
  const entries: [string, number][] = [
    ['Muscle Fatigue',  c.muscleFreshness],
    ['Training Block',  c.blockContext],
    ['Rest Frequency',  c.streakModifier],
    ['Session Risk',    c.forecastScore],
    ['Workload Ratio',  c.acwrScore],
  ];
  // Lowest raw score = biggest drag on readiness
  const [label, score] = entries.reduce(
    (min, cur) => (cur[1] < min[1] ? cur : min),
    entries[0],
  );
  return { label, score: Math.round(score) };
}

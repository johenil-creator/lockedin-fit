/**
 * lib/healthkit/readinessFromHealth.ts — Health-based readiness signal
 *
 * Computes a composite health signal score (0–100) from Apple Health data
 * that extends the existing readiness scoring system.
 *
 * Four factors:
 *   restingHR        (30%) — elevated resting HR = suppressed recovery
 *   hrv              (30%) — lower HRV = higher stress/fatigue
 *   sleep            (25%) — sleep duration affects recovery capacity
 *   backgroundActivity (15%) — high non-training activity adds systemic fatigue
 *
 * Rules:
 *   - Missing data → factor defaults to 70 (neutral, not penalizing)
 *   - Partial data → confidence reduced proportionally
 *   - All scores 0–100 (higher = better readiness)
 *
 * This module is PURE MATH — no I/O, no side effects.
 */

import type { HealthDataSnapshot, HealthSignalResult, HealthSignalFactors } from './types';
import { STEP_THRESHOLDS } from './constants';

// ── Constants ────────────────────────────────────────────────────────────────

/** Factor weights — must sum to 1.0 */
const WEIGHTS = {
  restingHR: 0.30,
  hrv: 0.30,
  sleep: 0.25,
  backgroundActivity: 0.15,
} as const;

/** Neutral default when a factor has no data (don't penalize missing data) */
const NEUTRAL_SCORE = 70;

// ── Factor Calculators ───────────────────────────────────────────────────────

/**
 * Resting HR factor (0–100).
 *
 * Compares today's resting HR against the 7-day average baseline.
 * Elevation indicates sympathetic stress or incomplete recovery.
 *
 *   ≤ baseline      → 100 (rested, parasympathetic dominance)
 *   +5% over        → 90
 *   +10% over       → 80
 *   +15% over       → 60
 *   +20%+ over      → 40
 */
function restingHRFactor(
  todayRHR: number | null,
  baselineRHR: number | null,
): { score: number; available: boolean } {
  if (todayRHR == null || baselineRHR == null || baselineRHR <= 0) {
    return { score: NEUTRAL_SCORE, available: false };
  }

  const deviation = (todayRHR - baselineRHR) / baselineRHR;

  if (deviation <= 0) return { score: 100, available: true };
  if (deviation <= 0.05) return { score: 90, available: true };
  if (deviation <= 0.10) return { score: 80, available: true };
  if (deviation <= 0.15) return { score: 60, available: true };
  if (deviation <= 0.20) return { score: 40, available: true };
  return { score: Math.max(20, 40 - (deviation - 0.20) * 200), available: true };
}

/**
 * HRV factor (0–100).
 *
 * Compares today's HRV (SDNN) against the 7-day average baseline.
 * Lower HRV = higher stress / fatigue.
 *
 *   ≥ baseline      → 100 (well recovered)
 *   -10% below      → 85
 *   -20% below      → 70
 *   -30% below      → 50
 *   -40%+ below     → 30
 */
function hrvFactor(
  todayHRV: number | null,
  baselineHRV: number | null,
): { score: number; available: boolean } {
  if (todayHRV == null || baselineHRV == null || baselineHRV <= 0) {
    return { score: NEUTRAL_SCORE, available: false };
  }

  const deviation = (baselineHRV - todayHRV) / baselineHRV;

  if (deviation <= 0) return { score: 100, available: true };
  if (deviation <= 0.10) return { score: 85, available: true };
  if (deviation <= 0.20) return { score: 70, available: true };
  if (deviation <= 0.30) return { score: 50, available: true };
  if (deviation <= 0.40) return { score: 30, available: true };
  return { score: Math.max(15, 30 - (deviation - 0.40) * 150), available: true };
}

/**
 * Sleep factor (0–100).
 *
 * Based on total sleep hours.
 *
 *   < 5h    → 30 (severely deprived)
 *   5–6h    → 50
 *   6–7h    → 70
 *   7–8h    → 90
 *   8–9h    → 100 (optimal)
 *   > 9h    → 95 (slight oversleep, generally fine)
 */
function sleepFactor(
  sleepHours: number | null,
): { score: number; available: boolean } {
  if (sleepHours == null) {
    return { score: NEUTRAL_SCORE, available: false };
  }

  if (sleepHours < 5) return { score: 30, available: true };
  if (sleepHours < 6) return { score: 50, available: true };
  if (sleepHours < 7) return { score: 70, available: true };
  if (sleepHours < 8) return { score: 90, available: true };
  if (sleepHours <= 9) return { score: 100, available: true };
  return { score: 95, available: true };
}

/**
 * Background activity factor (0–100).
 *
 * High non-training activity (steps) adds systemic fatigue that
 * slows recovery. Low activity aids recovery.
 *
 *   < 5,000 steps   → 95 (sedentary, good for recovery)
 *   5,000–10,000    → 85 (normal activity)
 *   10,000–15,000   → 70 (moderate, slight recovery cost)
 *   > 15,000        → 55 (very active, recovery slowed)
 */
function backgroundActivityFactor(
  steps: number | null,
): { score: number; available: boolean } {
  if (steps == null) {
    return { score: NEUTRAL_SCORE, available: false };
  }

  if (steps < STEP_THRESHOLDS.sedentary) return { score: 95, available: true };
  if (steps < STEP_THRESHOLDS.normal) return { score: 85, available: true };
  if (steps < STEP_THRESHOLDS.active) return { score: 70, available: true };
  return { score: 55, available: true };
}

// ── Label Generator ──────────────────────────────────────────────────────────

function generateLabel(
  score: number,
  factors: HealthSignalFactors,
  confidence: number,
): string {
  if (confidence === 0) return 'No health data available — using baseline readiness.';
  if (confidence < 0.3) return 'Limited health data — readiness estimate has low confidence.';

  // Find the most impactful factor (lowest score)
  const entries: [string, number][] = [
    ['Resting heart rate', factors.restingHR],
    ['HRV', factors.hrv],
    ['Sleep', factors.sleep],
    ['Daily activity', factors.backgroundActivity],
  ];
  const [worstLabel, worstScore] = entries.reduce(
    (min, cur) => (cur[1] < min[1] ? cur : min),
    entries[0],
  );

  if (score >= 85) return 'Health signals indicate excellent recovery — prime for training.';
  if (score >= 70) return 'Health signals look good — ready to train normally.';
  if (score >= 55) {
    return `${worstLabel} is below baseline — consider reducing intensity.`;
  }
  return `${worstLabel} signals poor recovery — lighter session or rest recommended.`;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute the health-based readiness signal from an Apple Health data snapshot.
 *
 * @param snapshot - Combined health data (today + 7-day history)
 * @returns HealthSignalResult with score, confidence, factor breakdown, and label
 */
export function computeHealthSignal(snapshot: HealthDataSnapshot | null): HealthSignalResult {
  // ── No data at all ─────────────────────────────────────────────────────
  if (!snapshot) {
    return {
      score: NEUTRAL_SCORE,
      confidence: 0,
      factors: {
        restingHR: NEUTRAL_SCORE,
        hrv: NEUTRAL_SCORE,
        sleep: NEUTRAL_SCORE,
        backgroundActivity: NEUTRAL_SCORE,
      },
      label: 'No health data available — using baseline readiness.',
    };
  }

  // ── Compute each factor ────────────────────────────────────────────────
  const rhr = restingHRFactor(
    snapshot.restingHR.value,
    snapshot.restingHR.sevenDayAverage,
  );

  const hv = hrvFactor(
    snapshot.hrv.value,
    snapshot.hrv.sevenDayAverage,
  );

  const sl = sleepFactor(snapshot.sleep.totalHours);

  const ba = backgroundActivityFactor(snapshot.activity.steps);

  // ── Confidence: fraction of factors with real data ─────────────────────
  const availableCount = [rhr, hv, sl, ba].filter((f) => f.available).length;
  const confidence = availableCount / 4;

  // ── Weighted composite ─────────────────────────────────────────────────
  const factors: HealthSignalFactors = {
    restingHR: Math.round(rhr.score),
    hrv: Math.round(hv.score),
    sleep: Math.round(sl.score),
    backgroundActivity: Math.round(ba.score),
  };

  const score = Math.round(
    rhr.score * WEIGHTS.restingHR +
    hv.score * WEIGHTS.hrv +
    sl.score * WEIGHTS.sleep +
    ba.score * WEIGHTS.backgroundActivity,
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    confidence,
    factors,
    label: generateLabel(score, factors, confidence),
  };
}

/**
 * lib/healthkit/backgroundFatigue.ts — Systemic fatigue from background activity
 *
 * Estimates how non-training daily activity (steps, active energy, walking
 * distance) affects recovery rate. Higher background activity = slower
 * recovery from training sessions.
 *
 * Returns a recovery rate modifier:
 *   > 1.0 — sedentary day, recovery is slightly aided
 *   = 1.0 — normal activity, no adjustment
 *   < 1.0 — high activity, recovery is slowed
 *
 * Pure function — no I/O.
 */

import { STEP_THRESHOLDS } from './constants';

// ── Types ────────────────────────────────────────────────────────────────────

export type BackgroundFatigueResult = {
  /** Multiplier for recovery rate (0.85–1.05) */
  recoveryModifier: number;
  /** Human-readable activity level */
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  /** Explanation for UI display */
  explanation: string;
};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Estimate the recovery rate modifier from background daily activity.
 *
 * @param steps            - Total steps for the day (null if unavailable)
 * @param activeEnergyKcal - Active energy burned (null if unavailable)
 * @param walkingDistanceKm - Walking + running distance in km (null if unavailable)
 */
export function estimateBackgroundFatigue(
  steps: number | null,
  activeEnergyKcal: number | null,
  walkingDistanceKm: number | null,
): BackgroundFatigueResult {
  // ── No data: return neutral ────────────────────────────────────────────
  if (steps == null && activeEnergyKcal == null) {
    return {
      recoveryModifier: 1.0,
      activityLevel: 'moderate',
      explanation: 'No activity data available — using neutral recovery estimate.',
    };
  }

  // ── Primary signal: step count ─────────────────────────────────────────
  // Fall back to energy-based estimate if steps unavailable
  let effectiveSteps = steps;
  if (effectiveSteps == null && activeEnergyKcal != null) {
    // Rough conversion: ~20 steps per kcal for walking
    effectiveSteps = Math.round(activeEnergyKcal * 20);
  }
  if (effectiveSteps == null) effectiveSteps = 7500; // Neutral default

  // ── Secondary signal: walking distance modifies the estimate ───────────
  // Long-distance walking adds lower-body fatigue even at moderate step count
  let distanceBonus = 0;
  if (walkingDistanceKm != null && walkingDistanceKm > 8) {
    distanceBonus = (walkingDistanceKm - 8) * 500; // Extra "effective steps"
  }

  const adjustedSteps = effectiveSteps + distanceBonus;

  // ── Classify activity level and compute modifier ───────────────────────
  if (adjustedSteps < STEP_THRESHOLDS.sedentary) {
    return {
      recoveryModifier: 1.05,
      activityLevel: 'sedentary',
      explanation: `Low activity day (${formatSteps(effectiveSteps)} steps) — recovery is slightly aided.`,
    };
  }

  if (adjustedSteps < 7500) {
    return {
      recoveryModifier: 1.02,
      activityLevel: 'light',
      explanation: `Light activity day (${formatSteps(effectiveSteps)} steps) — normal recovery.`,
    };
  }

  if (adjustedSteps < STEP_THRESHOLDS.normal) {
    return {
      recoveryModifier: 1.0,
      activityLevel: 'moderate',
      explanation: `Normal activity (${formatSteps(effectiveSteps)} steps) — no recovery adjustment.`,
    };
  }

  if (adjustedSteps < STEP_THRESHOLDS.active) {
    return {
      recoveryModifier: 0.95,
      activityLevel: 'active',
      explanation: `Active day (${formatSteps(effectiveSteps)} steps) — recovery may be slightly slower.`,
    };
  }

  return {
    recoveryModifier: 0.85 + Math.max(0, 0.05 - (adjustedSteps - STEP_THRESHOLDS.active) / 100_000),
    activityLevel: 'very_active',
    explanation: `Very active day (${formatSteps(effectiveSteps)} steps) — recovery will be noticeably slower.`,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatSteps(steps: number): string {
  if (steps >= 1000) {
    return `${(steps / 1000).toFixed(1)}k`;
  }
  return String(steps);
}

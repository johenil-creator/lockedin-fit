import type { MovementPattern, WeekPrescription } from "../types";

// ── 12-Week Compound Tables ─────────────────────────────────────────────────
// Block periodization: 3 blocks × 4 weeks each.
// Block 1 – ACCUMULATION  (W1-4):  higher volume, moderate intensity (8–10 reps)
// Block 2 – INTENSIFICATION (W5-8): strength bias, heavier loads (4–6 reps)
// Block 3 – REALIZATION   (W9-12): peak intensity, low volume (2–4 reps)
// Weeks 4, 8, 12 are always deloads (reduced volume and intensity).

/** Compound intensity as fraction of 1RM. W4/W8 are mini-deloads, W12 is full deload. */
const COMPOUND_INTENSITY: number[] = [
  // B1: Accumulation          B2: Intensification        B3: Realization
  // W1    W2    W3    W4*     W5    W6    W7    W8*     W9    W10   W11   W12**
  0.72, 0.75, 0.78, 0.65,   0.80, 0.83, 0.86, 0.72,   0.88, 0.90, 0.93, 0.60,
];

/** Compound sets per week. */
const COMPOUND_SETS: number[] = [
  // B1 (accumulation — more volume)     B2 (intensity — moderate vol.)   B3 (realization — low vol.)
  4,    4,    5,    3,                   4,    4,    5,    3,             5,    5,    6,    3,
];

/** Compound reps per week. */
const COMPOUND_REPS: number[] = [
  // B1 (8-10 rep range)    B2 (4-6 rep range)    B3 (2-4 rep range)
  10,   9,    8,    12,     6,    5,    4,    8,   4,    3,    2,    5,
];

// ── 12-Week Accessory Tables ────────────────────────────────────────────────
// RPE-driven, no 1RM needed.
// Block 1: 12-15 reps (hypertrophy)
// Block 2: 10-12 reps (moderate)
// Block 3: 8-10 reps (lower volume, higher effort)
// Deload weeks: 2 sets, higher reps (recovery focus)

const ACCESSORY_SETS: number[] = [
  // B1                B2                B3
  3,  3,  4,  2,      3,  3,  4,  2,    3,  3,  3,  2,
];

const ACCESSORY_REPS: number[] = [
  // B1 (12-15 reps)    B2 (10-12 reps)    B3 (8-10 reps)
  15, 14, 12, 15,       12, 11, 10, 12,    10,  9,  8, 10,
];

// ── RPE Targets ─────────────────────────────────────────────────────────────
// Used for history-based (Tier 2) exercises.
// RPE progressively increases across blocks; deload weeks drop to RPE 6.

const RPE_TARGETS: number[] = [
  // B1: moderate       B2: heavier        B3: peak effort
  7,  7,  7.5, 6,      8,  8,  8.5, 6,   9,  9,  9.5, 6,
];

// ── Phase Labels ────────────────────────────────────────────────────────────

function getPhaseLabel(week: number): string {
  if (week <= 4) return "Accumulation";
  if (week <= 8) return "Intensification";
  if (week <= 11) return "Realization";
  return "Deload";
}

function isDeloadWeek(week: number): boolean {
  return week === 4 || week === 8 || week === 12;
}

/**
 * Block-aware intensity multiplier for smart estimation (Tier 3).
 *
 * Mirrors the compound intensity table to keep Tier 3 estimates
 * proportionally consistent with Tier 1 ORM-based loads:
 *   - Accumulation   W1: 0.72, W2: 0.75, W3: 0.78
 *   - Deload         W4: 0.65
 *   - Intensification W5: 0.80, W6: 0.83, W7: 0.86
 *   - Deload         W8: 0.72
 *   - Realization    W9: 0.88, W10: 0.90, W11: 0.93
 *   - Deload         W12: 0.60
 *
 * Used as the `intensity` argument to estimatePatternWeight so that
 * pattern-proxy and bodyweight estimates scale correctly by week.
 */
export function getBlockIntensityMultiplier(weekNumber: number): number {
  const week = ((weekNumber - 1) % 12) + 1;
  // Mirror COMPOUND_INTENSITY table exactly so estimates stay proportional
  const TABLE = [0.72, 0.75, 0.78, 0.65, 0.80, 0.83, 0.86, 0.72, 0.88, 0.90, 0.93, 0.60];
  return TABLE[week - 1];
}

/**
 * Get the prescription for a specific week, exercise type, and movement pattern.
 *
 * @param weekNumber — 1-based week (1-12), cycles modulo 12
 * @param isCompound — compound lifts use 1RM-based intensity; accessories use RPE
 * @param pattern — movement pattern (conditioning gets special treatment)
 */
export function getWeekPrescription(
  weekNumber: number,
  isCompound: boolean,
  pattern: MovementPattern,
): WeekPrescription {
  // Normalize to 1-12 range (cyclic)
  const week = ((weekNumber - 1) % 12) + 1;
  const idx = week - 1; // 0-based index into arrays

  // Conditioning has its own simplified table
  if (pattern === "conditioning") {
    return {
      intensity: 0,
      rpe: RPE_TARGETS[idx],
      sets: ACCESSORY_SETS[idx],
      reps: ACCESSORY_REPS[idx],
      phaseLabel: getPhaseLabel(week),
      isDeload: isDeloadWeek(week),
    };
  }

  if (isCompound) {
    return {
      intensity: COMPOUND_INTENSITY[idx],
      rpe: RPE_TARGETS[idx],
      sets: COMPOUND_SETS[idx],
      reps: COMPOUND_REPS[idx],
      phaseLabel: getPhaseLabel(week),
      isDeload: isDeloadWeek(week),
    };
  }

  // Accessory
  return {
    intensity: 0, // accessories don't use 1RM intensity
    rpe: RPE_TARGETS[idx],
    sets: ACCESSORY_SETS[idx],
    reps: ACCESSORY_REPS[idx],
    phaseLabel: getPhaseLabel(week),
    isDeload: isDeloadWeek(week),
  };
}

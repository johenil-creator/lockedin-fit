import type { MovementPattern, WeekPrescription } from "../types";

// ── 12-Week Compound Tables ─────────────────────────────────────────────────
// Every week is unique in at least one dimension (intensity, sets, reps, or RPE).

/** Compound intensity as fraction of 1RM. W4/W8 are mini-deloads, W12 is full deload. */
const COMPOUND_INTENSITY: number[] = [
  // W1    W2    W3    W4*   W5    W6    W7    W8*   W9    W10   W11   W12**
  0.78, 0.80, 0.82, 0.75, 0.83, 0.85, 0.87, 0.80, 0.88, 0.90, 0.92, 0.65,
];

/** Compound sets per week. */
const COMPOUND_SETS: number[] = [
  4, 4, 5, 3, 4, 4, 5, 3, 5, 5, 6, 3,
];

/** Compound reps per week. */
const COMPOUND_REPS: number[] = [
  8, 7, 6, 10, 6, 5, 4, 8, 3, 3, 2, 5,
];

// ── 12-Week Accessory Tables ────────────────────────────────────────────────
// RPE-driven, no 1RM needed.

const ACCESSORY_SETS: number[] = [
  3, 3, 4, 3, 3, 3, 4, 3, 3, 3, 3, 2,
];

const ACCESSORY_REPS: number[] = [
  12, 11, 10, 15, 10, 10, 8, 12, 8, 8, 8, 12,
];

// ── RPE Targets ─────────────────────────────────────────────────────────────
// Used for history-based (Tier 2) exercises.

const RPE_TARGETS: number[] = [
  7, 7, 7.5, 6, 8, 8, 8.5, 7, 9, 9, 9, 6,
];

// ── Phase Labels ────────────────────────────────────────────────────────────

function getPhaseLabel(week: number): string {
  if (week <= 4) return "Base Volume";
  if (week <= 8) return "Progressive Overload";
  if (week <= 11) return "Intensity Phase";
  return "Deload";
}

function isDeloadWeek(week: number): boolean {
  return week === 4 || week === 8 || week === 12;
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

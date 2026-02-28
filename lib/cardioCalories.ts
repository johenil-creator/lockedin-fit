// lib/cardioCalories.ts — MET-based calorie + distance estimation engine.
//
// Standard exercise science: calories = MET x weight_kg x hours.
// Distance estimated from average speed per modality at given intensity.

import type { CardioModality } from "./cardioSuggestions";

// ── MET values per modality (moderate intensity baseline) ────────────────────

const MET_TABLE: Record<CardioModality, number> = {
  running:      9.8,
  cycling:      7.5,
  rowing:       7.0,
  walking:      3.5,
  swimming:     6.0,
  elliptical:   5.0,
  stairclimber: 9.0,
  jump_rope:    12.3,
  other:        5.0,
};

// ── Intensity modifier: RPE maps to MET multiplier ───────────────────────────

function intensityMultiplier(rpe: number): number {
  if (rpe <= 3) return 0.7;
  if (rpe <= 6) return 1.0;
  if (rpe <= 8) return 1.2;
  return 1.4; // RPE 9-10
}

// ── Average speed (km/h) per modality for distance estimation ────────────────

const SPEED_TABLE: Partial<Record<CardioModality, number>> = {
  running:    9.5,
  cycling:    22,
  walking:    5,
  swimming:   2.5,
  elliptical: 6,
};

const DISTANCE_MODALITIES = new Set<CardioModality>([
  "running",
  "cycling",
  "walking",
  "swimming",
  "elliptical",
]);

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Estimate calories burned for a cardio session.
 *
 * @param modality   - exercise type
 * @param weightKg   - user's body weight in kilograms
 * @param durationMs - elapsed active time in milliseconds
 * @param rpe        - perceived exertion 1-10
 * @returns { active, total } — active kcal and total kcal (active + ~15% resting)
 */
export function estimateCalories(
  modality: CardioModality,
  weightKg: number,
  durationMs: number,
  rpe: number
): { active: number; total: number } {
  const baseMET = MET_TABLE[modality] ?? MET_TABLE.other;
  const adjustedMET = baseMET * intensityMultiplier(rpe);
  const hours = durationMs / 3_600_000;

  const active = Math.round(adjustedMET * weightKg * hours);
  const total = Math.round(active * 1.15); // ~15% resting metabolic overhead

  return { active, total };
}

/**
 * Estimate distance covered during a cardio session.
 *
 * @returns distance in km, or null if the modality doesn't have meaningful
 *          linear distance (e.g. rowing, stairclimber, jump rope).
 */
export function estimateDistance(
  modality: CardioModality,
  durationMs: number,
  rpe: number
): number | null {
  if (!DISTANCE_MODALITIES.has(modality)) return null;

  const baseSpeed = SPEED_TABLE[modality] ?? 0;
  if (baseSpeed === 0) return null;

  // Scale speed by intensity (higher RPE = faster pace)
  const speedMultiplier = intensityMultiplier(rpe);
  const adjustedSpeed = baseSpeed * speedMultiplier;

  const hours = durationMs / 3_600_000;
  const km = adjustedSpeed * hours;

  return Math.round(km * 100) / 100; // 2 decimal places
}

/**
 * Check if a modality supports distance estimation.
 */
export function hasDistance(modality: CardioModality): boolean {
  return DISTANCE_MODALITIES.has(modality);
}

import type { OrmLiftKey, UserProfile, WorkoutSession } from "../types";

/** Warm-up reps descend as percentage increases. */
const WARM_UP_REPS = [10, 8, 5, 3];

/** Round to nearest plate increment based on unit (2.5 for kg, 5 for lbs). */
export function roundToPlate(value: number, unit: 'kg' | 'lbs' = 'kg'): number {
  const increment = unit === 'lbs' ? 5 : 2.5;
  return Math.round(value / increment) * increment;
}

/**
 * Look up the user's best 1RM for a given lift key.
 * Prefers `estimated1RM` (from the test), falls back to `manual1RM`.
 */
export function get1RM(profile: UserProfile, liftKey: OrmLiftKey): number | null {
  const estimated = parseFloat(profile.estimated1RM?.[liftKey] ?? "");
  if (!isNaN(estimated) && estimated > 0) return estimated;

  const manual = parseFloat(profile.manual1RM?.[liftKey] ?? "");
  if (!isNaN(manual) && manual > 0) return manual;

  return null;
}

/**
 * Calculate working weight from 1RM, modifier fraction, and weekly intensity.
 * Returns the rounded plate weight.
 */
export function calculateWorkingWeight(
  profile: UserProfile,
  baseLift: OrmLiftKey,
  modifierFraction: number,
  intensity: number,
): number | null {
  const orm = get1RM(profile, baseLift);
  if (orm === null) return null;

  const unit = profile.weightUnit ?? 'kg';
  const raw = orm * modifierFraction * intensity;
  const rounded = roundToPlate(raw, unit);
  return rounded > 0 ? rounded : null;
}

/**
 * Build graduated warm-up sets from 50% of 1RM up to ~5% below working
 * intensity, stepping in 10% increments. Modifier-aware.
 */
export function buildWarmUpSets(
  orm: number,
  modifierFraction: number,
  workingIntensity: number,
  unit: 'kg' | 'lbs',
): { weight: string; reps: string }[] {
  const warmUps: { weight: string; reps: string }[] = [];
  let pct = 0.50;
  const cap = workingIntensity - 0.05;
  let repIndex = 0;

  while (pct <= cap && repIndex < WARM_UP_REPS.length) {
    const w = roundToPlate(orm * modifierFraction * pct, unit);
    if (w > 0) {
      warmUps.push({ weight: String(w), reps: String(WARM_UP_REPS[repIndex]) });
    }
    pct += 0.10;
    repIndex++;
  }

  return warmUps;
}

/**
 * Scan completed workout history for the most recent weight used
 * for a given exercise name. Returns the weight string or null.
 */
export function getLastUsedWeight(
  exerciseName: string,
  workouts: WorkoutSession[],
): string | null {
  const target = exerciseName.toLowerCase().trim();

  for (const w of workouts) {
    if (!w.completedAt) continue;
    for (const ex of w.exercises) {
      if (ex.name.toLowerCase().trim() !== target) continue;
      const workingSets = ex.sets.filter((s) => s.completed && !s.isWarmUp && s.weight);
      if (workingSets.length > 0) {
        return workingSets[workingSets.length - 1].weight;
      }
    }
  }

  return null;
}

/**
 * Adjust a historical weight by target RPE for progressive overload.
 *
 * RPE multipliers:
 *   6  → 0.85 (deload)
 *   7  → 1.0  (maintain)
 *   8  → 1.025 (slight push)
 *   9  → 1.05  (hard push)
 *   10 → 1.075 (max effort)
 */
export function applyRPEProgression(
  lastWeight: number,
  targetRPE: number,
  unit: 'kg' | 'lbs',
): number {
  let multiplier: number;
  if (targetRPE <= 6) {
    multiplier = 0.85;
  } else if (targetRPE <= 7) {
    multiplier = 1.0;
  } else if (targetRPE <= 8) {
    multiplier = 1.025;
  } else if (targetRPE <= 9) {
    multiplier = 1.05;
  } else {
    multiplier = 1.075;
  }
  return roundToPlate(lastWeight * multiplier, unit);
}

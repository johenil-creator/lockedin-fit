import type { MovementPattern, OrmLiftKey, UserProfile, WorkoutSession } from "../types";

/** Warm-up reps descend as percentage increases. */
const WARM_UP_REPS = [10, 8, 5, 3];

/**
 * Cross-pattern estimation: when no direct 1RM matches the exercise,
 * derive a conservative estimate from whichever lifts the user HAS tested.
 *
 * Rationale for fractions:
 *   - squat → deadlift: most people pull ~15% more than they squat
 *   - deadlift → squat: squat ≈ 85% of deadlift
 *   - bench → ohp: OHP ≈ 65% of bench
 *   - ohp → bench: bench ≈ 155% of OHP
 *   - carry/core estimates use bodyweight fraction
 */
// Only meaningful cross-lift bridges are listed (squat ↔ deadlift, bench ↔ ohp).
// Upper ↔ lower cross-estimation is not reliable enough to include.
const CROSS_LIFT_ESTIMATES: Partial<Record<OrmLiftKey, Partial<Record<OrmLiftKey, number>>>> = {
  squat:    { deadlift: 0.85 },  // if user has DL, squat ≈ 85% of DL
  deadlift: { squat: 1.15 },     // if user has squat, DL ≈ 115% of squat
  bench:    { ohp: 1.55 },       // if user has OHP, bench ≈ 155% of OHP
  ohp:      { bench: 0.65 },     // if user has bench, OHP ≈ 65% of bench
};

/**
 * Baseline working-weight estimates by movement pattern (as fraction of bodyweight).
 * Used when no 1RM at all is available.
 * Conservative "beginner starter" values — users can adjust up.
 */
export const PATTERN_BODYWEIGHT_DEFAULTS: Record<MovementPattern, number> = {
  squat:            0.50, // 50% BW on the bar
  hinge:            0.60,
  horizontal_push:  0.40,
  vertical_push:    0.25,
  horizontal_pull:  0.35,
  vertical_pull:    0.30,
  isolation_upper:  0.10,
  isolation_lower:  0.15,
  core:             0.08, // e.g. cable crunch ~8% BW
  conditioning:     0.00, // time/distance-based — no weight default
  carry:            0.30,
  unknown:          0.00, // unclassified — no default weight
};

/**
 * Per-pattern: which base lift is the best proxy when the exercise
 * doesn't have its own anchorLift but one is inferable from the pattern.
 */
const PATTERN_PROXY_LIFT: Partial<Record<MovementPattern, OrmLiftKey>> = {
  squat:           "squat",
  hinge:           "deadlift",
  horizontal_push: "bench",
  vertical_push:   "ohp",
  horizontal_pull: "deadlift",  // lat/row strength scales with DL
  vertical_pull:   "deadlift",
  isolation_upper: "bench",
  isolation_lower: "squat",
};

/**
 * Pattern-to-proxy modifier: what fraction of the proxy lift's 1RM
 * should this pattern's working weight approximate?
 */
const PATTERN_PROXY_MODIFIER: Partial<Record<MovementPattern, number>> = {
  squat:           0.70,  // working weight ≈ 70% 1RM for unknown squat variant
  hinge:           0.65,
  horizontal_push: 0.55,
  vertical_push:   0.55,
  horizontal_pull: 0.40,
  vertical_pull:   0.35,
  isolation_upper: 0.15,
  isolation_lower: 0.20,
};

/**
 * Estimate working weight from any available 1RM using cross-pattern logic.
 *
 * Priority:
 * 1. Direct pattern proxy (e.g., horizontal_push → bench 1RM)
 * 2. Cross-lift bridge (e.g., has squat but needs deadlift → squat × 1.15)
 * 3. Bodyweight fraction fallback
 *
 * Returns { weight, source } where source describes how it was estimated.
 */
export function estimatePatternWeight(
  profile: UserProfile,
  pattern: MovementPattern,
  intensity: number,
): { weight: number; source: 'pattern-proxy' | 'cross-lift' | 'bodyweight' } | null {
  const unit = profile.weightUnit ?? 'kg';

  // ── Strategy 1: direct pattern proxy ─────────────────────────────────────
  const proxyLift = PATTERN_PROXY_LIFT[pattern];
  const proxyModifier = PATTERN_PROXY_MODIFIER[pattern];

  if (proxyLift && proxyModifier !== undefined) {
    const orm = get1RM(profile, proxyLift);
    if (orm !== null) {
      const raw = orm * proxyModifier * intensity;
      const weight = roundToPlate(raw, unit);
      if (weight > 0) return { weight, source: 'pattern-proxy' };
    }

    // ── Strategy 2: cross-lift bridge ───────────────────────────────────────
    const crossEstimates = CROSS_LIFT_ESTIMATES[proxyLift];
    const liftKeys: OrmLiftKey[] = ['squat', 'deadlift', 'bench', 'ohp'];
    for (const key of liftKeys) {
      if (key === proxyLift) continue;
      const bridgeFactor = crossEstimates?.[key];
      if (!bridgeFactor) continue;
      const sourceOrm = get1RM(profile, key);
      if (sourceOrm !== null) {
        // Convert the source ORM to an estimated proxy ORM, then apply modifier
        const estimatedProxyOrm = sourceOrm * bridgeFactor;
        const raw = estimatedProxyOrm * proxyModifier * intensity;
        const weight = roundToPlate(raw, unit);
        if (weight > 0) return { weight, source: 'cross-lift' };
      }
    }
  }

  // ── Strategy 3: bodyweight fraction ──────────────────────────────────────
  const bwFraction = PATTERN_BODYWEIGHT_DEFAULTS[pattern];
  if (bwFraction <= 0) return null; // conditioning: no weight

  const bodyweight = parseFloat(profile.weight ?? '0');
  if (!isNaN(bodyweight) && bodyweight > 0) {
    const raw = bodyweight * bwFraction * Math.max(intensity, 0.65);
    const weight = roundToPlate(raw, unit);
    if (weight > 0) return { weight, source: 'bodyweight' };
  }

  return null;
}

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
 * intensity. Produces exactly `count` sets, evenly spaced across the range.
 */
export function buildWarmUpSets(
  orm: number,
  modifierFraction: number,
  workingIntensity: number,
  unit: 'kg' | 'lbs',
  count: number = 4,
): { weight: string; reps: string }[] {
  return buildGraduatedWarmUps(orm * modifierFraction, 0.50, workingIntensity - 0.05, count, unit);
}

/**
 * Build graduated warm-up sets from a known working weight (no 1RM needed).
 * Used by Tiers 2 & 3 where we don't have a direct ORM but do have a target weight.
 * Produces exactly `count` sets ramping from 40% to 85% of working weight.
 */
export function buildWarmUpsFromWorkingWeight(
  workingWeight: number,
  unit: 'kg' | 'lbs',
  count: number = 3,
): { weight: string; reps: string }[] {
  return buildGraduatedWarmUps(workingWeight, 0.40, 0.85, count, unit);
}

/**
 * Shared helper: generates exactly `count` warm-up sets evenly spaced
 * between `lowPct` and `highPct` of `baseWeight`, with descending reps.
 */
function buildGraduatedWarmUps(
  baseWeight: number,
  lowPct: number,
  highPct: number,
  count: number,
  unit: 'kg' | 'lbs',
): { weight: string; reps: string }[] {
  if (count <= 0 || baseWeight <= 0) return [];

  // Descending rep scheme: first warm-up is lightest/most reps, last is heaviest/fewest
  const REP_POOL = [12, 10, 8, 6, 5, 3, 2, 1];
  // Pick `count` reps spread across the pool
  const reps: number[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i / Math.max(count - 1, 1)) * (Math.min(count, REP_POOL.length) - 1));
    reps.push(REP_POOL[idx]);
  }

  const step = count === 1 ? 0 : (highPct - lowPct) / (count - 1);
  const warmUps: { weight: string; reps: string }[] = [];

  for (let i = 0; i < count; i++) {
    const pct = lowPct + step * i;
    const w = roundToPlate(baseWeight * pct, unit);
    warmUps.push({ weight: String(Math.max(w, 0)), reps: String(reps[i]) });
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

  // Sort by completedAt descending so we find the most recent first
  const sorted = workouts
    .filter((w) => w.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  for (const w of sorted) {
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

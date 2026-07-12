import type { MovementPattern, OrmLiftKey, UserProfile, WorkoutSession } from "../types";
import { isExerciseTimed, getExerciseEquipment, getTimedTargetSeconds } from "./classifier";

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
  core:             0,    // core exercises are reps/time-based, no weight needed
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

export type WarmUpParams = {
  /** Known working weight (0 or absent for bodyweight/timed). */
  workingWeight: number;
  /** Weight unit for plate rounding. */
  unit: 'kg' | 'lbs';
  /** Number of warmup sets to generate. */
  count: number;
  /** Target reps string for working sets (e.g. "5", "8-10", "AMRAP"). */
  targetReps: string;
  /** Exercise name — used to detect equipment type and timed classification. */
  exerciseName: string;
};

/**
 * Build warmup sets using exercise-type-aware logic.
 *
 * Three code paths:
 * 1. Timed exercises → duration-based warmup (fraction of target seconds)
 * 2. Bodyweight exercises → rep-only activation sets (no weight ramp)
 * 3. Weighted exercises → weight ramp with reps driven by working-set target
 *
 * Reps are never a fixed 12. They are capped by BOTH the working set rep
 * target AND the warmup weight percentage, so heavy compound work gets
 * low-rep warmups (3-5) and light hypertrophy work gets moderate reps (5-6).
 */
export function buildWarmUpSets(params: WarmUpParams): { weight: string; reps: string }[] {
  const { workingWeight, unit, count, targetReps, exerciseName } = params;
  if (count <= 0) return [];

  // ── Path 1: Timed exercises ──────────────────────────────────────────────
  if (isExerciseTimed(exerciseName)) {
    const targetSecs = getTimedTargetSeconds(targetReps);
    return buildTimedWarmUps(targetSecs, count);
  }

  // ── Path 2: Bodyweight exercises ─────────────────────────────────────────
  const equipment = getExerciseEquipment(exerciseName);
  if (equipment === 'bodyweight') {
    const workingReps = parseWorkingReps(targetReps);
    return buildBodyweightWarmUps(workingReps, count);
  }

  // ── Path 3: Weighted exercises ───────────────────────────────────────────
  if (workingWeight <= 0) return [];
  const workingReps = parseWorkingReps(targetReps);
  const percentages = getWarmupPercentages(count);
  return percentages.map((pct) => ({
    weight: String(Math.max(roundToPlate(workingWeight * pct, unit), 0)),
    reps: String(getWarmupReps(workingReps, pct)),
  }));
}

/**
 * Warmup reps driven by BOTH working-set target reps AND warmup weight %.
 * Higher percentage → fewer reps (CNS priming, not fatigue accumulation).
 * Never exceeds the working set rep count.
 */
function getWarmupReps(workingReps: number, warmupPct: number): number {
  let maxByPct: number;
  if (warmupPct >= 0.80)      maxByPct = 2;
  else if (warmupPct >= 0.70) maxByPct = 3;
  else if (warmupPct >= 0.60) maxByPct = 5;
  else                         maxByPct = 8; // below 60%: light movement prep
  return Math.min(workingReps, maxByPct);
}

/**
 * Warmup weight percentages for each set count, ramping from light to
 * heavy and always staying below working weight.
 */
function getWarmupPercentages(count: number): number[] {
  switch (count) {
    case 1: return [0.60];
    case 2: return [0.50, 0.75];
    case 3: return [0.40, 0.60, 0.80];
    case 4: return [0.40, 0.55, 0.70, 0.85];
    case 5: return [0.30, 0.45, 0.60, 0.75, 0.85];
    default: {
      return Array.from({ length: count }, (_, i) =>
        0.30 + (0.55 * i) / Math.max(count - 1, 1));
    }
  }
}

/**
 * Bodyweight exercise warmup: rep-only activation (no weight ramp).
 * Reps descend from easy activation (~50% of working) toward near-working load.
 */
function buildBodyweightWarmUps(
  workingReps: number,
  count: number,
): { weight: string; reps: string }[] {
  const fractionsByCount: Record<number, number[]> = {
    1: [0.50],
    2: [0.40, 0.70],
    3: [0.30, 0.50, 0.75],
  };
  const fractions = fractionsByCount[count] ??
    Array.from({ length: count }, (_, i) => 0.30 + (0.45 * i) / Math.max(count - 1, 1));

  return fractions.map((frac) => ({
    weight: '',
    reps: String(Math.max(Math.round(workingReps * frac), 3)),
  }));
}

/**
 * Timed/isometric exercise warmup: shorter duration holds instead of reps.
 * For open-ended (max) holds, uses fixed short activation durations.
 */
function buildTimedWarmUps(
  targetSeconds: number,
  count: number,
): { weight: string; reps: string }[] {
  // Open-ended (countup / max) holds: fixed activation durations
  if (targetSeconds <= 0) {
    const fixedDurations = [10, 15, 20, 25, 30];
    return Array.from({ length: Math.min(count, fixedDurations.length) }, (_, i) => ({
      weight: '',
      reps: String(fixedDurations[i]),
    }));
  }

  const fractionsByCount: Record<number, number[]> = {
    1: [0.50],
    2: [0.40, 0.70],
    3: [0.30, 0.50, 0.75],
  };
  const fractions = fractionsByCount[count] ??
    Array.from({ length: count }, (_, i) => 0.30 + (0.45 * i) / Math.max(count - 1, 1));

  return fractions.map((frac) => ({
    weight: '',
    reps: String(Math.max(Math.round(targetSeconds * frac), 10)),
  }));
}

/**
 * Parse working reps from a plan reps string.
 * "5" → 5 | "8-10" → 8 (lower bound) | "AMRAP"/"Max" → 5 (conservative)
 */
function parseWorkingReps(repsStr: string): number {
  const s = repsStr.trim().toLowerCase();
  if (s === 'amrap' || s === 'max' || s === '') return 5;
  const rangeMatch = s.match(/^(\d+)\s*[-–]\s*\d+/);
  if (rangeMatch) return parseInt(rangeMatch[1], 10);
  const num = parseInt(s, 10);
  return isNaN(num) || num <= 0 ? 5 : num;
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

import type {
  ExerciseLoadResult,
  UserProfile,
  WorkoutSession,
} from "../types";
import { classifyExercise, getExerciseEquipment } from "./classifier";

/**
 * Dumbbell exercises that use a SINGLE dumbbell held with both hands.
 * These should NOT have their weight halved (they are not paired per-hand exercises).
 */
const SINGLE_DUMBBELL_IDS = new Set([
  "goblet_squat",
  "dumbbell_pullover",
  "db_pullover",
]);

/**
 * Returns true if this exercise is a paired dumbbell exercise
 * (one dumbbell in each hand) and the calculated weight should be
 * divided by 2 to give the per-hand display weight.
 */
function isPairedDumbbell(exerciseName: string, catalogId: string | undefined): boolean {
  const equipment = getExerciseEquipment(exerciseName);
  if (equipment !== 'dumbbell') return false;
  if (catalogId && SINGLE_DUMBBELL_IDS.has(catalogId)) return false;
  return true;
}
import {
  get1RM,
  calculateWorkingWeight,
  buildWarmUpSets,
  getLastUsedWeight,
  applyRPEProgression,
  roundToPlate,
  estimatePatternWeight,
} from "./loadCalculator";
import { getWeekPrescription, getBlockIntensityMultiplier } from "./progression";

export { classifyExercise } from "./classifier";
export { getWeekPrescription, getBlockIntensityMultiplier } from "./progression";
export {
  roundToPlate,
  get1RM,
  getLastUsedWeight,
  estimatePatternWeight,
  PATTERN_BODYWEIGHT_DEFAULTS,
} from "./loadCalculator";

// Re-export cues for convenient single-import access from the load engine barrel
export { EXERCISE_CUES, getExerciseCues } from "../../src/data/exerciseCues";

/** Parse week number from strings like "Week 6", "Week 12", etc. */
function parseWeekNumber(weekStr: string): number {
  const match = weekStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * Determine if an exercise is compound based on its classification confidence
 * and whether it has a baseLift (which means it maps to one of the 4 tested lifts).
 */
function isCompoundExercise(baseLift: string | null, confidence: number): boolean {
  return baseLift !== null && confidence >= 0.5;
}

export type ResolveExerciseLoadParams = {
  exerciseName: string;
  weekStr: string;
  profile: UserProfile;
  workouts: WorkoutSession[];
  workingSetCount?: number;
  targetReps?: string;
  plannedWarmUpCount?: number;
};

/**
 * Single public API that resolves exercise load using a four-tier waterfall:
 *
 * 1. **Tier 1 (ORM)**: baseLift exists + user has 1RM → calculate from 1RM
 * 2. **Tier 2 (History + RPE)**: No 1RM but exercise done before → last weight + RPE adjustment
 * 3. **Tier 3 (Smart Estimate)**: No history → cross-lift or bodyweight-fraction estimate
 * 4. **Tier 4 (Minimal)**: Conditioning/time-based exercises → empty (truly no weight applies)
 */
export function resolveExerciseLoad(params: ResolveExerciseLoadParams): ExerciseLoadResult {
  const {
    exerciseName,
    weekStr,
    profile,
    workouts,
    workingSetCount = 4,
    targetReps = "5",
    plannedWarmUpCount = 0,
  } = params;

  const classification = classifyExercise(exerciseName);
  const weekNumber = parseWeekNumber(weekStr);
  const compound = isCompoundExercise(classification.baseLift, classification.confidence);
  const prescription = getWeekPrescription(weekNumber, compound, classification.pattern);
  const unit = profile.weightUnit ?? "kg";

  // Bodyweight exercises (pull-ups, dips, push-ups, etc.) should never have
  // a weight auto-filled from 1RM or pattern estimates — the weight field stays
  // empty so users can optionally add load (belt, vest) themselves.
  // History (Tier 2) still works so weighted reps from past sessions carry forward.
  const isBodyweight = getExerciseEquipment(exerciseName) === "bodyweight";

  // ── Tier 1: ORM-based ───────────────────────────────────────────────────
  if (!isBodyweight && classification.baseLift && classification.confidence >= 0.5) {
    const orm = get1RM(profile, classification.baseLift);
    if (orm !== null) {
      const workingWeight = calculateWorkingWeight(
        profile,
        classification.baseLift,
        classification.modifier.fraction,
        prescription.intensity,
      );

      if (workingWeight !== null && workingWeight > 0) {
        const paired = isPairedDumbbell(exerciseName, classification.catalogId ?? undefined);
        const displayWeight = paired ? roundToPlate(workingWeight / 2, unit) : workingWeight;

        const warmUps = plannedWarmUpCount > 0
          ? buildWarmUpSets({ workingWeight: displayWeight, unit, count: plannedWarmUpCount, targetReps, exerciseName })
          : [];

        const workingSets = Array.from({ length: workingSetCount }, () => ({
          weight: String(displayWeight),
          reps: targetReps,
        }));

        return {
          workingWeight: displayWeight,
          source: "orm",
          warmUps,
          workingSets,
          targetRPE: prescription.rpe,
          classification,
          perHand: paired || undefined,
        };
      }
    }
  }

  // ── Tier 2: History + RPE ───────────────────────────────────────────────
  const lastWeight = getLastUsedWeight(exerciseName, workouts);
  if (lastWeight) {
    const lastNum = parseFloat(lastWeight);
    if (!isNaN(lastNum) && lastNum > 0) {
      const adjusted = applyRPEProgression(lastNum, prescription.rpe, unit);

      const warmUps = plannedWarmUpCount > 0
        ? buildWarmUpSets({ workingWeight: adjusted, unit, count: plannedWarmUpCount, targetReps, exerciseName })
        : [];

      const workingSets = Array.from({ length: workingSetCount }, () => ({
        weight: String(adjusted),
        reps: targetReps,
      }));

      return {
        workingWeight: adjusted,
        source: "rpe-estimate",
        warmUps,
        workingSets,
        targetRPE: prescription.rpe,
        classification,
      };
    }
  }

  // ── Tier 3: Smart pattern/cross-lift/bodyweight estimation ──────────────
  // Conditioning and bodyweight exercises have no auto-fill weight — skip estimation
  if (!isBodyweight && classification.pattern !== "conditioning") {
    // Use block-aware intensity scaling for the estimate
    const blockMultiplier = getBlockIntensityMultiplier(weekNumber);
    const estimate = estimatePatternWeight(profile, classification.pattern, blockMultiplier);

    if (estimate !== null && estimate.weight > 0) {
      const paired = isPairedDumbbell(exerciseName, classification.catalogId ?? undefined);
      const displayWeight = paired ? roundToPlate(estimate.weight / 2, unit) : estimate.weight;

      const warmUps = plannedWarmUpCount > 0
        ? buildWarmUpSets({ workingWeight: displayWeight, unit, count: plannedWarmUpCount, targetReps, exerciseName })
        : [];

      const workingSets = Array.from({ length: workingSetCount }, () => ({
        weight: String(displayWeight),
        reps: targetReps,
      }));

      return {
        workingWeight: displayWeight,
        source: "rpe-estimate",
        warmUps,
        workingSets,
        targetRPE: prescription.rpe,
        classification,
        perHand: paired || undefined,
      };
    }
  }

  // ── Tier 4: Truly no weight (conditioning/time-based) ───────────────────
  return {
    workingWeight: null,
    source: "none",
    warmUps: [],
    workingSets: Array.from({ length: workingSetCount }, () => ({
      weight: "",
      reps: targetReps,
    })),
    targetRPE: prescription.rpe,
    classification,
  };
}

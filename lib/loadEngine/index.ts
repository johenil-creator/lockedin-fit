import type {
  ExerciseLoadResult,
  UserProfile,
  WorkoutSession,
} from "../types";
import { classifyExercise } from "./classifier";
import {
  get1RM,
  calculateWorkingWeight,
  buildWarmUpSets,
  getLastUsedWeight,
  applyRPEProgression,
  roundToPlate,
} from "./loadCalculator";
import { getWeekPrescription } from "./progression";

export { classifyExercise } from "./classifier";
export { getWeekPrescription } from "./progression";
export {
  roundToPlate,
  get1RM,
  getLastUsedWeight,
} from "./loadCalculator";

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
 * Single public API that resolves exercise load using a three-tier waterfall:
 *
 * 1. **Tier 1 (ORM)**: baseLift exists + user has 1RM → calculate from 1RM
 * 2. **Tier 2 (History + RPE)**: No 1RM but exercise done before → last weight + RPE adjustment
 * 3. **Tier 3 (None)**: No data → empty weights
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

  // ── Tier 1: ORM-based ───────────────────────────────────────────────────
  if (classification.baseLift && classification.confidence >= 0.5) {
    const orm = get1RM(profile, classification.baseLift);
    if (orm !== null) {
      const workingWeight = calculateWorkingWeight(
        profile,
        classification.baseLift,
        classification.modifier.fraction,
        prescription.intensity,
      );

      if (workingWeight !== null && workingWeight > 0) {
        const warmUps = plannedWarmUpCount > 0
          ? buildWarmUpSets(orm, classification.modifier.fraction, prescription.intensity, unit)
          : [];

        const workingSets = Array.from({ length: workingSetCount }, () => ({
          weight: String(workingWeight),
          reps: targetReps,
        }));

        return {
          workingWeight,
          source: "orm",
          warmUps,
          workingSets,
          targetRPE: prescription.rpe,
          classification,
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

      const workingSets = Array.from({ length: workingSetCount }, () => ({
        weight: String(adjusted),
        reps: targetReps,
      }));

      return {
        workingWeight: adjusted,
        source: "rpe-estimate",
        warmUps: [],
        workingSets,
        targetRPE: prescription.rpe,
        classification,
      };
    }
  }

  // ── Tier 3: No data — still populate sets/reps from prescription ────────
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

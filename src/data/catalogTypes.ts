// Type definitions for the exercise catalog
// Extracted so the large data file can use @ts-nocheck without losing type exports.

export type UnitSystem = "lbs" | "kg";
export type BaseLift = "squat" | "deadlift" | "bench" | "ohp";

export type MovementPattern =
  | "squat"
  | "hinge"
  | "horizontal_push"
  | "vertical_push"
  | "horizontal_pull"
  | "vertical_pull"
  | "isolation_upper"
  | "isolation_lower"
  | "core"
  | "conditioning"
  | "carry";

export type MuscleGroup =
  | "glutes"
  | "hamstrings"
  | "quads"
  | "calves"
  | "chest"
  | "back"
  | "lats"
  | "traps"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "core"
  | "forearms";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "kettlebell"
  | "cable"
  | "machine"
  | "band"
  | "bodyweight"
  | "smith"
  | "trap_bar"
  | "other";

export type ExerciseId = string;

export interface ExerciseCatalogEntry {
  id: ExerciseId;
  canonicalName: string;
  aliases: string[];
  movementPattern: MovementPattern;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  anchorLift?: BaseLift;
  modifier?: number;
  cues?: string[];
}

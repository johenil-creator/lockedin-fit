// Canonical exercise catalog lives at src/data/exerciseCatalog.ts
// Re-export for backward compatibility with lib/loadEngine/*.ts
export {
  exerciseCatalog,
  EXERCISE_CATALOG_VERSION,
  type ExerciseCatalogEntry,
  type MuscleGroup,
  type Equipment,
} from "../../src/data/exerciseCatalog";

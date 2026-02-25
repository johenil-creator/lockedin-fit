import type { WorkoutSession } from "./types";

export type ExerciseProgress = {
  sessionId: string;
  sessionName: string;
  date: string;
  maxWeight: number;
  totalReps: number;
  completedSets: number;
};

export function getExerciseProgress(
  workouts: WorkoutSession[],
  exerciseName: string
): ExerciseProgress[] {
  return workouts
    .filter((w) => !w.isActive)
    .map((w) => {
      const ex = w.exercises.find(
        (e) => e.name.toLowerCase() === exerciseName.toLowerCase()
      );
      if (!ex) return null;
      const done = ex.sets.filter((s) => s.completed);
      const weights = done.map((s) => parseFloat(s.weight) || 0);
      const reps = done.map((s) => parseInt(s.reps) || 0);
      return {
        sessionId: w.id,
        sessionName: w.name,
        date: w.date,
        maxWeight: weights.length ? Math.max(...weights) : 0,
        totalReps: reps.reduce((a, b) => a + b, 0),
        completedSets: done.length,
      };
    })
    .filter(Boolean) as ExerciseProgress[];
}

export function getUniqueExerciseNames(workouts: WorkoutSession[]): string[] {
  const names = new Set<string>();
  for (const w of workouts) {
    if (w.isActive) continue;
    for (const ex of w.exercises) names.add(ex.name);
  }
  return Array.from(names).sort();
}

export function getSessionsByDate(
  workouts: WorkoutSession[]
): Record<string, WorkoutSession[]> {
  const map: Record<string, WorkoutSession[]> = {};
  for (const w of workouts) {
    if (w.isActive) continue;
    const dateStr = (w.completedAt ?? w.date).slice(0, 10);
    if (!map[dateStr]) map[dateStr] = [];
    map[dateStr].push(w);
  }
  return map;
}

import { useState, useEffect, useCallback } from "react";
import type { WorkoutSession, Exercise, UserProfile } from "../lib/types";
import { loadWorkouts, saveWorkouts } from "../lib/storage";
import { resolveExerciseLoad } from "../lib/loadEngine";

function makeId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 6);
}

export function useWorkouts() {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkouts().then((data) => {
      setWorkouts(data);
      setLoading(false);
    });
  }, []);

  const persist = useCallback((data: WorkoutSession[]) => {
    saveWorkouts(data);
  }, []);

  const addWorkout = useCallback(
    async (session: WorkoutSession): Promise<void> => {
      const current = await loadWorkouts();
      const updated = [session, ...current];
      await saveWorkouts(updated);
      setWorkouts(updated);
    },
    []
  );

  const deleteWorkout = useCallback(
    (id: string) => {
      setWorkouts((prev) => {
        const updated = prev.filter((w) => w.id !== id);
        persist(updated);
        return updated;
      });
    },
    [persist]
  );

  const updateWorkout = useCallback(
    async (session: WorkoutSession): Promise<void> => {
      let savePromise: Promise<void> = Promise.resolve();
      setWorkouts((prev) => {
        const updated = prev.map((w) => (w.id === session.id ? session : w));
        savePromise = saveWorkouts(updated);
        return updated;
      });
      await savePromise;
    },
    []
  );

  const getActiveSession = useCallback(
    (): WorkoutSession | undefined => {
      return workouts.find((w) => w.isActive);
    },
    [workouts]
  );

  const startSessionFromPlan = useCallback(
    async (planName: string, week: string, day: string, exercises: Exercise[], profile?: UserProfile): Promise<string> => {
      // Load fresh to get accurate history for lastUsedWeight fallback
      const current = await loadWorkouts();

      const id = makeId();
      const session: WorkoutSession = {
        id,
        name: `${planName} — ${week} ${day}`,
        date: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        isActive: true,
        planWeek: week,
        planDay: day,
        exercises: exercises.map((ex) => {
          const plannedWarmUpCount = parseInt(ex.warmUpSets ?? "0", 10) || 0;
          const workingSetCount = parseInt(ex.sets, 10) || 3;
          const targetReps = ex.reps || "5";

          // Resolve load using the three-tier waterfall engine
          const load = profile
            ? resolveExerciseLoad({
                exerciseName: ex.exercise,
                weekStr: week,
                profile,
                workouts: current,
                workingSetCount,
                targetReps,
                plannedWarmUpCount,
              })
            : null;

          let warmUpEntries: { reps: string; weight: string; completed: boolean; isWarmUp: true }[];
          if (load && load.warmUps.length > 0) {
            warmUpEntries = load.warmUps.map((wu) => ({
              reps: wu.reps,
              weight: wu.weight,
              completed: false,
              isWarmUp: true as const,
            }));
          } else {
            warmUpEntries = Array.from({ length: plannedWarmUpCount }, () => ({
              reps: "",
              weight: "",
              completed: false,
              isWarmUp: true as const,
            }));
          }

          let workingSets: { reps: string; weight: string; completed: boolean }[];
          if (load && load.workingSets.length > 0) {
            workingSets = load.workingSets.map((ws) => ({
              reps: ws.reps,
              weight: ex.weight || ws.weight,
              completed: false,
            }));
          } else {
            // No autofill — use plan weight or empty
            workingSets = Array.from({ length: workingSetCount }, () => ({
              reps: targetReps,
              weight: ex.weight || "",
              completed: false,
            }));
          }

          return {
            exerciseId: makeId(),
            name: ex.exercise,
            sets: [...warmUpEntries, ...workingSets],
            warmUpSets: warmUpEntries.length,
            restTime:   parseInt(ex.restTime ?? "90", 10) || 90,
            notes:      ex.notes ?? "",
            loadSource: load?.source,
            targetRPE:  load?.targetRPE,
            catalogId:       load?.classification.catalogId ?? undefined,
            matchedPattern:  load?.classification.pattern,
            matchedAnchor:   load?.classification.baseLift ?? undefined,
            matchedModifier: load?.classification.modifier.fraction,
          };
        }),
      };

      const updatedList = [session, ...current];

      // Write to storage first, then update in-memory state
      await saveWorkouts(updatedList);
      setWorkouts(updatedList);

      return id;
    },
    []
  );

  return { workouts, loading, addWorkout, deleteWorkout, updateWorkout, startSessionFromPlan, getActiveSession };
}

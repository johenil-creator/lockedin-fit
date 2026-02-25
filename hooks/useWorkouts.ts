import { useState, useEffect, useCallback } from "react";
import type { WorkoutSession, Exercise } from "../lib/types";
import { loadWorkouts, saveWorkouts } from "../lib/storage";

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

  const startSessionFromPlan = useCallback(
    async (planName: string, week: string, day: string, exercises: Exercise[]): Promise<string> => {
      const id = makeId();
      const session: WorkoutSession = {
        id,
        name: `${planName} — ${week} ${day}`,
        date: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        isActive: true,
        exercises: exercises.map((ex) => {
          const warmUpCount = parseInt(ex.warmUpSets ?? "0", 10) || 0;
          const warmUpEntries = Array.from({ length: warmUpCount }, () => ({
            reps: "", weight: "", completed: false, isWarmUp: true as const,
          }));
          const workingSets = Array(parseInt(ex.sets, 10) || 3)
            .fill(null)
            .map(() => ({ reps: ex.reps || "", weight: ex.weight || "", completed: false }));
          return {
            exerciseId: makeId(),
            name: ex.exercise,
            sets: [...warmUpEntries, ...workingSets],
            warmUpSets: warmUpCount,
            restTime:   parseInt(ex.restTime ?? "90", 10) || 90,
            notes:      ex.notes ?? "",
          };
        }),
      };

      // Load fresh from storage (avoids stale closure from setWorkouts updater)
      const current = await loadWorkouts();
      const updatedList = [session, ...current];

      // Write to storage first, then update in-memory state
      await saveWorkouts(updatedList);
      setWorkouts(updatedList);

      return id;
    },
    []
  );

  return { workouts, loading, addWorkout, deleteWorkout, updateWorkout, startSessionFromPlan };
}

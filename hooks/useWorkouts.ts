import { useState, useEffect, useCallback, useRef } from "react";
import type { WorkoutSession, Exercise, UserProfile } from "../lib/types";
import { loadWorkouts, saveWorkouts } from "../lib/storage";
import { resolveExerciseLoad } from "../lib/loadEngine";
import { makeId } from "../lib/helpers";

export function useWorkouts() {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  // In-memory ref mirrors state — avoids redundant AsyncStorage reads in writes.
  // Safe because all mutations go through the serial queue below.
  const workoutsRef = useRef<WorkoutSession[]>([]);

  // Serial write queue — each write waits for the previous to finish
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
  function enqueue(fn: () => Promise<void>): Promise<void> {
    const next = writeQueue.current.then(fn, fn);
    writeQueue.current = next;
    return next;
  }

  /** Update both the ref and React state in one step. */
  function commit(updated: WorkoutSession[]) {
    workoutsRef.current = updated;
    setWorkouts(updated);
  }

  useEffect(() => {
    loadWorkouts()
      .then((data) => {
        workoutsRef.current = data;
        setWorkouts(data);
        setLoading(false);
      })
      .catch(() => {
        workoutsRef.current = [];
        setWorkouts([]);
        setLoading(false);
      });
  }, []);

  const addWorkout = useCallback(
    async (session: WorkoutSession): Promise<void> => {
      await enqueue(async () => {
        const updated = [session, ...workoutsRef.current];
        await saveWorkouts(updated);
        commit(updated);
      });
    },
    []
  );

  const deleteWorkout = useCallback(
    async (id: string): Promise<void> => {
      await enqueue(async () => {
        const updated = workoutsRef.current.filter((w) => w.id !== id);
        await saveWorkouts(updated);
        commit(updated);
      });
    },
    []
  );

  const updateWorkout = useCallback(
    async (session: WorkoutSession): Promise<void> => {
      // Optimistic in-memory update — UI reflects the change immediately
      // so TextInputs don't glitch while the async storage write completes.
      const optimistic = workoutsRef.current.map(w => w.id === session.id ? session : w);
      workoutsRef.current = optimistic;
      setWorkouts(optimistic);

      // Persist to storage asynchronously
      enqueue(async () => {
        const updated = workoutsRef.current.map((w) => (w.id === session.id ? session : w));
        await saveWorkouts(updated);
        workoutsRef.current = updated;
      });
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
      let id = "";
      await enqueue(async () => {
        const current = workoutsRef.current;

        // Storage-level guard — prevents duplicate active sessions even when
        // in-memory state is stale (e.g. home tab never remounts between navigations)
        const existingActive = current.find((w) => w.isActive);
        if (existingActive) {
          id = existingActive.id;
          return;
        }

        id = makeId();
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
                weight: ws.weight,
                completed: false,
              }));
            } else {
              // No autofill — load engine will fill when 1RM data is available
              workingSets = Array.from({ length: workingSetCount }, () => ({
                reps: targetReps,
                weight: "",
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
        commit(updatedList);
      });

      return id;
    },
    []
  );

  /** Start a session from a simple exercise list (used by Quick Workout). */
  const startSessionFromExercises = useCallback(
    async (
      name: string,
      exercises: { exercise: string; sets: string; reps: string }[],
      profile?: UserProfile
    ): Promise<string> => {
      let id = "";
      await enqueue(async () => {
        const current = workoutsRef.current;
        id = makeId();

        const session: WorkoutSession = {
          id,
          name,
          date: new Date().toISOString(),
          startedAt: new Date().toISOString(),
          isActive: true,
          // No planWeek / planDay — this is a standalone quick workout
          exercises: exercises.map((ex) => {
            const workingSetCount = parseInt(ex.sets, 10) || 3;
            const targetReps = ex.reps || "8";

            const load = profile
              ? resolveExerciseLoad({
                  exerciseName: ex.exercise,
                  weekStr: "Week 1",
                  profile,
                  workouts: current,
                  workingSetCount,
                  targetReps,
                  plannedWarmUpCount: 0,
                })
              : null;

            const workingSets = load && load.workingSets.length > 0
              ? load.workingSets.map((ws) => ({ reps: ws.reps, weight: ws.weight, completed: false }))
              : Array.from({ length: workingSetCount }, () => ({ reps: targetReps, weight: "", completed: false }));

            return {
              exerciseId: makeId(),
              name: ex.exercise,
              sets: workingSets,
              warmUpSets: 0,
              restTime: 90,
              notes: "",
              loadSource: load?.source,
              targetRPE: load?.targetRPE,
              catalogId: load?.classification.catalogId ?? undefined,
              matchedPattern: load?.classification.pattern,
              matchedAnchor: load?.classification.baseLift ?? undefined,
              matchedModifier: load?.classification.modifier.fraction,
            };
          }),
        };

        const updatedList = [session, ...current];
        await saveWorkouts(updatedList);
        commit(updatedList);
      });

      return id;
    },
    []
  );

  const reload = useCallback(async () => {
    const data = await loadWorkouts();
    commit(data);
  }, []);

  return { workouts, loading, addWorkout, deleteWorkout, updateWorkout, startSessionFromPlan, startSessionFromExercises, getActiveSession, reload };
}

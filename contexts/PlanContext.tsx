import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { Exercise, UserProfile, WorkoutSession } from "../lib/types";
import { loadPlan, savePlan, clearPlan as clearPlanStorage, loadPlanProgress, savePlanProgress } from "../lib/storage";
import { resolveExerciseLoad } from "../lib/loadEngine";

type PlanContextValue = {
  planName: string;
  exercises: Exercise[];
  loading: boolean;
  setPlan: (name: string, data: Exercise[]) => void;
  clearPlan: () => void;
  completedDays: Record<string, string>;
  markDayCompleted: (week: string, day: string) => void;
  isDayCompleted: (week: string, day: string) => boolean;
  isPlanComplete: boolean;
  totalPlanDays: number;
  recalculateWeights: (profile: UserProfile, workouts: WorkoutSession[]) => Promise<number>;
  updateDayExercises: (week: string, day: string, updater: (prev: Exercise[]) => Exercise[]) => void;
};

const PlanCtx = createContext<PlanContextValue>({
  planName: "",
  exercises: [],
  loading: true,
  setPlan: () => {},
  clearPlan: () => {},
  completedDays: {},
  markDayCompleted: () => {},
  isDayCompleted: () => false,
  isPlanComplete: false,
  totalPlanDays: 0,
  recalculateWeights: async () => 0,
  updateDayExercises: () => {},
});

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [planName, setPlanName] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [completedDays, setCompletedDays] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadPlan(), loadPlanProgress()]).then(([plan, progress]) => {
      if (plan) {
        setPlanName(plan.name);
        setExercises(plan.data);
      }
      setCompletedDays(progress.completedDays);
      setLoading(false);
    }).catch(() => { setLoading(false); });
  }, []);

  const setPlan = useCallback((name: string, data: Exercise[]) => {
    setPlanName(name);
    setExercises(data);
    setCompletedDays({});
    savePlan({ name, data });
    savePlanProgress({ completedDays: {} });
  }, []);

  const clearPlan = useCallback(() => {
    setPlanName("");
    setExercises([]);
    setCompletedDays({});
    clearPlanStorage();
    savePlanProgress({ completedDays: {} });
  }, []);

  const markDayCompleted = useCallback((week: string, day: string) => {
    const key = `${week}|${day}`;
    setCompletedDays((prev) => {
      if (prev[key]) return prev; // already marked
      const updated = { ...prev, [key]: new Date().toISOString() };
      // Persist outside the updater to avoid side effects in React strict mode
      queueMicrotask(() => savePlanProgress({ completedDays: updated }));
      return updated;
    });
  }, []);

  const isDayCompleted = useCallback((week: string, day: string): boolean => {
    return !!completedDays[`${week}|${day}`];
  }, [completedDays]);

  const recalculateWeights = useCallback(async (profile: UserProfile, workouts: WorkoutSession[]): Promise<number> => {
    if (exercises.length === 0) return 0;

    let updatedCount = 0;
    const updated = exercises.map((ex) => {
      const weekStr = ex.week || "Week 1";
      const workingSetCount = parseInt(ex.sets, 10) || 3;
      const targetReps = ex.reps || "5";

      const load = resolveExerciseLoad({
        exerciseName: ex.exercise,
        weekStr,
        profile,
        workouts,
        workingSetCount,
        targetReps,
        plannedWarmUpCount: parseInt(ex.warmUpSets ?? "0", 10) || 0,
      });

      if (load.source === 'orm' && load.workingSets.length > 0 && load.workingSets[0].weight) {
        const newWeight = load.workingSets[0].weight;
        if (newWeight !== ex.weight) {
          updatedCount++;
          return { ...ex, weight: newWeight };
        }
      }
      return ex;
    });

    if (updatedCount > 0) {
      setExercises(updated);
      await savePlan({ name: planName, data: updated });
    }
    return updatedCount;
  }, [exercises, planName]);

  const updateDayExercises = useCallback((week: string, day: string, updater: (prev: Exercise[]) => Exercise[]) => {
    setExercises((prev) => {
      const dayExercises = prev.filter((e) => (e.week || "Week 1") === week && (e.day || "Day 1") === day);
      const otherExercises = prev.filter((e) => !((e.week || "Week 1") === week && (e.day || "Day 1") === day));
      const updated = updater(dayExercises);
      const all = [...otherExercises, ...updated];
      queueMicrotask(() => savePlan({ name: planName, data: all }));
      return all;
    });
  }, [planName]);

  // Compute total unique plan days and whether all are complete
  const { isPlanComplete, totalPlanDays } = useMemo(() => {
    if (exercises.length === 0) return { isPlanComplete: false, totalPlanDays: 0 };
    const dayKeys = new Set<string>();
    for (const ex of exercises) {
      dayKeys.add(`${ex.week || "Week 1"}|${ex.day || "Day 1"}`);
    }
    const total = dayKeys.size;
    const allDone = total > 0 && Array.from(dayKeys).every((k) => !!completedDays[k]);
    return { isPlanComplete: allDone, totalPlanDays: total };
  }, [exercises, completedDays]);

  const value = useMemo(
    () => ({ planName, exercises, loading, setPlan, clearPlan, completedDays, markDayCompleted, isDayCompleted, isPlanComplete, totalPlanDays, recalculateWeights, updateDayExercises }),
    [planName, exercises, loading, setPlan, clearPlan, completedDays, markDayCompleted, isDayCompleted, isPlanComplete, totalPlanDays, recalculateWeights, updateDayExercises]
  );

  return (
    <PlanCtx.Provider value={value}>
      {children}
    </PlanCtx.Provider>
  );
}

export function usePlanContext() {
  return useContext(PlanCtx);
}

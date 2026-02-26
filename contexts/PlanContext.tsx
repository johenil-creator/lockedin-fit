import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { Exercise } from "../lib/types";
import { loadPlan, savePlan, clearPlan as clearPlanStorage, loadPlanProgress, savePlanProgress } from "../lib/storage";

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
    });
  }, []);

  const setPlan = useCallback((name: string, data: Exercise[]) => {
    setPlanName(name);
    setExercises(data);
    savePlan({ name, data });
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
      savePlanProgress({ completedDays: updated });
      return updated;
    });
  }, []);

  const isDayCompleted = useCallback((week: string, day: string): boolean => {
    return !!completedDays[`${week}|${day}`];
  }, [completedDays]);

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

  return (
    <PlanCtx.Provider value={{ planName, exercises, loading, setPlan, clearPlan, completedDays, markDayCompleted, isDayCompleted, isPlanComplete, totalPlanDays }}>
      {children}
    </PlanCtx.Provider>
  );
}

export function usePlanContext() {
  return useContext(PlanCtx);
}

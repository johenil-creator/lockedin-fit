import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Exercise } from "../lib/types";
import { loadPlan, savePlan, clearPlan as clearPlanStorage } from "../lib/storage";

type PlanContextValue = {
  planName: string;
  exercises: Exercise[];
  loading: boolean;
  setPlan: (name: string, data: Exercise[]) => void;
  clearPlan: () => void;
};

const PlanCtx = createContext<PlanContextValue>({
  planName: "",
  exercises: [],
  loading: true,
  setPlan: () => {},
  clearPlan: () => {},
});

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [planName, setPlanName] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlan().then((data) => {
      if (data) {
        setPlanName(data.name);
        setExercises(data.data);
      }
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
    clearPlanStorage();
  }, []);

  return (
    <PlanCtx.Provider value={{ planName, exercises, loading, setPlan, clearPlan }}>
      {children}
    </PlanCtx.Provider>
  );
}

export function usePlanContext() {
  return useContext(PlanCtx);
}

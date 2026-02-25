import { useState, useEffect, useCallback } from "react";
import type { Exercise, PlanData } from "../lib/types";
import { loadPlan, savePlan, clearPlan as clearPlanStorage } from "../lib/storage";

export function usePlan() {
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

  return { planName, exercises, loading, setPlan, clearPlan };
}

import { useState, useEffect, useCallback } from "react";
import { loadPerformance, savePerformance } from "../lib/storage";
import type { PerformanceWeek } from "../lib/types";

export function usePerformance() {
  const [performance, setPerformance] = useState<PerformanceWeek[]>([]);

  useEffect(() => {
    loadPerformance().then((data) => setPerformance(data ?? []));
  }, []);

  const savePerformanceRecord = useCallback(async (updated: PerformanceWeek[]) => {
    await savePerformance(updated);
    setPerformance(updated);
  }, []);

  return { performance, savePerformanceRecord };
}

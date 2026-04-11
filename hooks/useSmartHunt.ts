import { useState, useEffect, useCallback, useMemo } from "react";
import { MS_PER_DAY } from "../lib/constants";
import { useRecovery } from "./useRecovery";
import { useWorkouts } from "./useWorkouts";
import type { SmartHuntResult } from "../lib/smartHuntEngine";
import { generateSmartHunt, shuffleSmartHunt } from "../lib/smartHuntEngine";

type UseSmartHuntReturn = {
  hunt: SmartHuntResult | null;
  loading: boolean;
  shuffle: () => void;
};

export function useSmartHunt(): UseSmartHuntReturn {
  const { data: recovery, loading: recoveryLoading } = useRecovery();
  const { workouts, loading: workoutsLoading } = useWorkouts();
  const [hunt, setHunt] = useState<SmartHuntResult | null>(null);

  const loading = recoveryLoading || workoutsLoading;

  // Get recent sessions (last 48h) for the engine
  const recentSessions = useMemo(() => {
    if (!workouts) return [];
    const cutoff = Date.now() - 2 * MS_PER_DAY;
    return workouts.filter(
      (w) => w.completedAt && new Date(w.completedAt).getTime() > cutoff,
    );
  }, [workouts]);

  // Generate hunt when recovery data loads
  useEffect(() => {
    if (!recovery) return;
    const result = generateSmartHunt({
      fatigueMap: recovery.fatigueMap,
      readinessScore: recovery.readiness.score,
      blockType: recovery.blockContext?.blockType,
      deloadTriggered: recovery.deloadTriggered,
      recentSessions,
    });
    setHunt(result);
  }, [recovery, recentSessions]);

  const shuffle = useCallback(() => {
    if (!recovery || !hunt) return;
    const result = shuffleSmartHunt(hunt, {
      fatigueMap: recovery.fatigueMap,
      readinessScore: recovery.readiness.score,
      blockType: recovery.blockContext?.blockType,
      deloadTriggered: recovery.deloadTriggered,
      recentSessions,
    });
    setHunt(result);
  }, [recovery, hunt, recentSessions]);

  return { hunt, loading, shuffle };
}

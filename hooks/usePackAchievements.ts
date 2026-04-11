import { useState, useEffect } from "react";
import { MS_PER_DAY } from "../lib/constants";
import {
  loadPackAchievements,
  PACK_ACHIEVEMENT_DEFS,
} from "../lib/packAchievementService";
import type { PackAchievement, PackAchievementId } from "../lib/types";

type UsePackAchievementsResult = {
  achievements: PackAchievement[];
  newlyUnlocked: PackAchievementId[];
};

export function usePackAchievements(): UsePackAchievementsResult {
  const [achievements, setAchievements] = useState<PackAchievement[]>(
    PACK_ACHIEVEMENT_DEFS
  );
  const [newlyUnlocked, setNewlyUnlocked] = useState<PackAchievementId[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const saved = await loadPackAchievements();
        if (!mounted) return;

        // Detect newly unlocked (unlocked within last 24 hours)
        const oneDayAgo = Date.now() - MS_PER_DAY;
        const recent: PackAchievementId[] = saved
          .filter(
            (a) =>
              a.unlockedAt !== null &&
              new Date(a.unlockedAt).getTime() > oneDayAgo
          )
          .map((a) => a.id);

        setAchievements(saved);
        setNewlyUnlocked(recent);
      } catch {
        // Non-critical — keep defaults
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  return { achievements, newlyUnlocked };
}

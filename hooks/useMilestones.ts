import { useCallback, useRef } from "react";
import {
  checkMilestones,
  loadAchievedMilestones,
  saveAchievedMilestones,
  postMilestoneActivity,
} from "../lib/milestoneService";
import { useAuth } from "../contexts/AuthContext";
import type { RankLevel, MilestoneType } from "../lib/types";

type UseMilestonesResult = {
  /** Check for new milestones and post activity for each. */
  checkAndPost: (
    allWorkouts: number,
    streak: number,
    prCount: number,
    rank: RankLevel
  ) => Promise<MilestoneType[]>;
};

export function useMilestones(): UseMilestonesResult {
  const { user } = useAuth();
  const runningRef = useRef(false);

  const checkAndPost = useCallback(
    async (
      allWorkouts: number,
      streak: number,
      prCount: number,
      rank: RankLevel
    ): Promise<MilestoneType[]> => {
      if (!user || runningRef.current) return [];
      runningRef.current = true;

      try {
        const achieved = await loadAchievedMilestones();
        const newMilestones = checkMilestones(allWorkouts, streak, prCount, rank, achieved);

        if (newMilestones.length === 0) return [];

        // Post activity for each new milestone
        const displayName = user.displayName ?? "Athlete";
        for (const milestone of newMilestones) {
          const value = milestone.startsWith("workout_")
            ? allWorkouts
            : milestone.startsWith("streak_")
            ? streak
            : milestone.startsWith("pr_count_")
            ? prCount
            : 0;

          await postMilestoneActivity(user.uid, displayName, milestone, value);
        }

        // Save updated achieved list
        const updated = [...achieved, ...newMilestones];
        await saveAchievedMilestones(updated);

        return newMilestones;
      } finally {
        runningRef.current = false;
      }
    },
    [user]
  );

  return { checkAndPost };
}

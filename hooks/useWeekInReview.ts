import { useState, useCallback, useEffect } from "react";
import {
  getLastReview,
  generateWeekInReview,
} from "../lib/weekInReviewService";
import type { WeekInReview, WorkoutSession, XPRecord, StreakData } from "../lib/types";

type UseWeekInReviewResult = {
  review: WeekInReview | null;
  loading: boolean;
  generate: (
    workouts: WorkoutSession[],
    xpRecord: XPRecord,
    streakData: StreakData
  ) => Promise<void>;
};

export function useWeekInReview(): UseWeekInReviewResult {
  const [review, setReview] = useState<WeekInReview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLastReview()
      .then(setReview)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const generate = useCallback(
    async (
      workouts: WorkoutSession[],
      xpRecord: XPRecord,
      streakData: StreakData
    ) => {
      const result = await generateWeekInReview(workouts, xpRecord, streakData);
      setReview(result);
    },
    []
  );

  return { review, loading, generate };
}

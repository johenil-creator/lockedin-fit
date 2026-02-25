import { useState, useEffect, useCallback } from "react";
import { loadStreak, saveStreak } from "../lib/storage";
import type { StreakData } from "../lib/types";

const DEFAULT_STREAK: StreakData = {
  current: 0,
  longest: 0,
  lastActivityDate: "",
};

/** "YYYY-MM-DD" for a given Date (or today). */
function toDateStr(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Days between two "YYYY-MM-DD" strings (b - a). */
function daysBetween(a: string, b: string): number {
  if (!a) return Infinity;
  const msPerDay = 86400000;
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / msPerDay
  );
}

export function useStreak() {
  const [streak, setStreak] = useState<StreakData>(DEFAULT_STREAK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStreak().then((data) => {
      setStreak(data ?? DEFAULT_STREAK);
      setLoading(false);
    });
  }, []);

  /**
   * Call this once per completed session (pass today's date or the session date).
   * Returns the updated StreakData so callers can react to milestone crossings.
   */
  const recordActivity = useCallback(
    async (activityDate: Date = new Date()): Promise<StreakData> => {
      const today = toDateStr(activityDate);
      let updated: StreakData = DEFAULT_STREAK;

      setStreak((prev) => {
        const gap = daysBetween(prev.lastActivityDate, today);

        let newCurrent: number;
        if (gap === 0) {
          // Already recorded today — no change
          newCurrent = prev.current || 1;
        } else if (gap === 1) {
          // Consecutive day
          newCurrent = (prev.current || 0) + 1;
        } else {
          // Gap — streak resets
          newCurrent = 1;
        }

        updated = {
          current: newCurrent,
          longest: Math.max(prev.longest, newCurrent),
          lastActivityDate: today,
        };

        saveStreak(updated);
        return updated;
      });

      await Promise.resolve();
      return updated;
    },
    []
  );

  /** Days since last recorded activity (Infinity if never). */
  const daysSinceActivity: number = streak.lastActivityDate
    ? daysBetween(streak.lastActivityDate, toDateStr())
    : Infinity;

  return { streak, loading, recordActivity, daysSinceActivity };
}

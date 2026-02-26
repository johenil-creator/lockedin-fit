import { useState, useEffect, useCallback, useRef } from "react";
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
  const streakRef = useRef<StreakData>(DEFAULT_STREAK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStreak().then((data) => {
      const resolved = data ?? DEFAULT_STREAK;
      streakRef.current = resolved;
      setStreak(resolved);
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
      const prev = streakRef.current;
      const gap = daysBetween(prev.lastActivityDate, today);

      let newCurrent: number;
      if (gap === 0) {
        newCurrent = prev.current || 1;
      } else if (gap === 1) {
        newCurrent = (prev.current || 0) + 1;
      } else {
        newCurrent = 1;
      }

      const updated: StreakData = {
        current: newCurrent,
        longest: Math.max(prev.longest, newCurrent),
        lastActivityDate: today,
      };

      streakRef.current = updated;
      setStreak(updated);
      await saveStreak(updated);
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

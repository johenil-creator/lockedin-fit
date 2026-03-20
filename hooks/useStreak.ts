import { useState, useEffect, useCallback, useRef } from "react";
import { loadStreak, saveStreak } from "../lib/storage";
import type { StreakData } from "../lib/types";

const DEFAULT_STREAK: StreakData = {
  current: 0,
  longest: 0,
  lastActivityDate: "",
};

/** "YYYY-MM-DD" for a given Date (or today) in local time. */
function toDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Days between two "YYYY-MM-DD" strings (b - a), parsed as local dates. */
function daysBetween(a: string, b: string): number {
  if (!a) return Infinity;
  const msPerDay = 86400000;
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round(
    (new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / msPerDay
  );
}

/** Count how many days in the gap [a+1 … b-1] are NOT rest days. */
function missedNonRestDays(a: string, b: string, restDays: number[]): number {
  if (!a || !restDays.length) return daysBetween(a, b) - 1;
  const start = new Date(a);
  const end = new Date(b);
  let missed = 0;
  const d = new Date(start);
  d.setDate(d.getDate() + 1); // start from day after last activity
  while (d < end) {
    if (!restDays.includes(d.getDay())) missed++;
    d.setDate(d.getDate() + 1);
  }
  return missed;
}

/** Return ISO-week string, e.g. "2026-W09". */
export function isoWeek(d: Date = new Date()): string {
  const copy = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  copy.setUTCDate(copy.getUTCDate() + 4 - (copy.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((copy.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${copy.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
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
    }).catch(() => { setLoading(false); });
  }, []);

  /**
   * Call this once per completed session (pass today's date or the session date).
   * @param activityDate  — the date of the activity
   * @param restDays      — array of rest day numbers (0=Sun, 6=Sat) from profile
   * @param freezesRemaining — how many streak freezes the user has left this week
   * Returns the updated StreakData and how many freezes were consumed.
   */
  const recordActivity = useCallback(
    async (
      activityDate: Date = new Date(),
      restDays: number[] = [],
      freezesRemaining: number = 2
    ): Promise<{ streak: StreakData; freezesUsed: number }> => {
      const today = toDateStr(activityDate);
      const prev = streakRef.current;
      const gap = daysBetween(prev.lastActivityDate, today);

      let newCurrent: number;
      let freezesUsed = 0;

      if (gap === 0) {
        // Same day — no change
        newCurrent = prev.current || 1;
      } else if (gap === 1) {
        // Consecutive day
        newCurrent = (prev.current || 0) + 1;
      } else if (gap > 1 && prev.lastActivityDate) {
        // Multi-day gap — check if all missed days were rest days or covered by freezes
        const missed = missedNonRestDays(prev.lastActivityDate, today, restDays);
        if (missed === 0) {
          // All gap days were rest days — streak continues
          newCurrent = (prev.current || 0) + 1;
        } else if (missed <= freezesRemaining) {
          // Freezes cover the gap
          freezesUsed = missed;
          newCurrent = (prev.current || 0) + 1;
        } else {
          // Streak broken
          newCurrent = 1;
        }
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
      return { streak: updated, freezesUsed };
    },
    []
  );

  /**
   * Restore a broken streak (e.g. after watching a rewarded ad).
   * Sets lastActivityDate to today so the streak resumes from where it was.
   */
  const restoreStreak = useCallback(async (): Promise<StreakData> => {
    const prev = streakRef.current;
    const updated: StreakData = {
      ...prev,
      lastActivityDate: toDateStr(),
    };
    streakRef.current = updated;
    setStreak(updated);
    await saveStreak(updated);
    return updated;
  }, []);

  /** Days since last recorded activity (Infinity if never). */
  const daysSinceActivity: number = streak.lastActivityDate
    ? daysBetween(streak.lastActivityDate, toDateStr())
    : Infinity;

  return { streak, loading, recordActivity, restoreStreak, daysSinceActivity };
}

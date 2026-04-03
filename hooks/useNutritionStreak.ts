import { useState, useEffect, useCallback, useRef } from "react";
import type { NutritionStreakData } from "../src/data/mealTypes";
import {
  loadNutritionStreak,
  saveNutritionStreak,
} from "../lib/mealStorage";

const DEFAULT_STREAK: NutritionStreakData = {
  current: 0,
  longest: 0,
  lastLogDate: "",
};

/**
 * Returns true if `b` is exactly 1 calendar day after `a`.
 * Both must be "YYYY-MM-DD" strings.
 */
function isNextDay(a: string, b: string): boolean {
  if (!a) return false;
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const dateA = new Date(ay, am - 1, ad);
  const dateB = new Date(by, bm - 1, bd);
  const diff = dateB.getTime() - dateA.getTime();
  return Math.round(diff / 86400000) === 1;
}

export function useNutritionStreak() {
  const [streak, setStreak] = useState<NutritionStreakData>(DEFAULT_STREAK);
  const [loading, setLoading] = useState(true);
  const streakRef = useRef<NutritionStreakData>(DEFAULT_STREAK);

  // ── Mount: load streak ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    loadNutritionStreak()
      .then((saved) => {
        if (cancelled) return;
        streakRef.current = saved;
        setStreak(saved);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Record a day of food logging ──────────────────────────────────
  const recordDay = useCallback(async (date: string) => {
    const prev = streakRef.current;

    // Same day — no-op
    if (date === prev.lastLogDate) return;

    let newCurrent: number;
    if (isNextDay(prev.lastLogDate, date)) {
      // Consecutive day — increment
      newCurrent = prev.current + 1;
    } else {
      // Gap or first day — reset to 1
      newCurrent = 1;
    }

    const updated: NutritionStreakData = {
      current: newCurrent,
      longest: Math.max(prev.longest, newCurrent),
      lastLogDate: date,
    };

    streakRef.current = updated;
    setStreak(updated);
    await saveNutritionStreak(updated);
  }, []);

  return { streak, loading, recordDay };
}

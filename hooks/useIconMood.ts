import { useEffect, useCallback, useRef } from "react";
import { useStreak } from "./useStreak";
import { useWorkouts } from "./useWorkouts";
import { evaluateIconMood, type IconMoodInput } from "../lib/iconMoodEngine";
import { maybeUpdateIcon, type IconMood } from "../lib/appIcon";

/**
 * Evaluates the current icon mood from streak/workout data and updates the
 * app icon if warranted (throttled to once per 24h, with disappointed override).
 *
 * Call `checkIconMood(overrides)` after session-end events to force re-evaluation
 * with fresh data that may not yet be reflected in hooks.
 */
export function useIconMood() {
  const { streak, daysSinceActivity } = useStreak();
  const { workouts } = useWorkouts();
  const didCheck = useRef(false);

  const buildInput = useCallback(
    (overrides?: Partial<IconMoodInput>): IconMoodInput => {
      const lastWorkout = workouts.find((w) => !!w.completedAt);
      const lastWorkoutAt = lastWorkout?.completedAt ?? null;

      // Streak-break detection: if gap >= 2 days and previous streak > 0
      let streakBrokenAt: string | null = null;
      if (daysSinceActivity >= 2 && streak.current === 0 && streak.longest > 0 && streak.lastActivityDate) {
        const breakDate = new Date(streak.lastActivityDate);
        breakDate.setDate(breakDate.getDate() + 2);
        streakBrokenAt = breakDate.toISOString();
      }

      return {
        isSessionActive: !!workouts.find((w) => w.isActive),
        streakBrokenAt,
        prHitInLast24h: false,
        streakDays: streak.current,
        lastWorkoutAt,
        ...overrides,
      };
    },
    [streak, daysSinceActivity, workouts]
  );

  // Check on mount after hydration
  useEffect(() => {
    if (didCheck.current || !streak.lastActivityDate) return;
    didCheck.current = true;
    const mood = evaluateIconMood(buildInput());
    maybeUpdateIcon(mood);
  }, [streak.lastActivityDate, buildInput]);

  /**
   * Manual trigger — call after session-end / PR / streak events.
   * Pass overrides for data that hasn't propagated to hooks yet.
   */
  const checkIconMood = useCallback(
    (overrides?: Partial<IconMoodInput>) => {
      const mood = evaluateIconMood(buildInput(overrides));
      maybeUpdateIcon(mood);
    },
    [buildInput]
  );

  return { checkIconMood };
}

import type { IconMood } from "./appIcon";

export type IconMoodInput = {
  isSessionActive: boolean;
  streakBrokenAt: string | null; // ISO timestamp
  prHitInLast24h: boolean;
  streakDays: number;
  lastWorkoutAt: string | null; // ISO timestamp
};

function withinHours(isoDate: string | null, hours: number): boolean {
  if (!isoDate) return false;
  return Date.now() - new Date(isoDate).getTime() < hours * 60 * 60 * 1000;
}

/**
 * Pure function: determines which icon mood to show based on user activity.
 * Priority order (first match wins).
 */
export function evaluateIconMood(input: IconMoodInput): IconMood {
  // 1. Session active → no change (return default as no-op signal)
  if (input.isSessionActive) return "icon_default";

  // 2. Streak broken within 24h → disappointed
  if (withinHours(input.streakBrokenAt, 24)) return "icon_disappointed";

  // 3. PR hit in last 24h → motivated
  if (input.prHitInLast24h) return "icon_motivated";

  // 4. 30+ day streak + worked out within 24h → mischievous
  if (input.streakDays >= 30 && withinHours(input.lastWorkoutAt, 24))
    return "icon_mischievous";

  // 5. 7+ day streak + worked out within 24h → focused
  if (input.streakDays >= 7 && withinHours(input.lastWorkoutAt, 24))
    return "icon_focused";

  // 6. Default
  return "icon_default";
}

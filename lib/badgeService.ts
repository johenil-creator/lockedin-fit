import type { WorkoutSession, UserProfile, Badge } from "./types";

// ── Badge definitions ─────────────────────────────────────────────────────────

type BadgeDef = Omit<Badge, "unlockedAt">;

export const BADGE_DEFINITIONS: BadgeDef[] = [
  // Cardio
  {
    id: "first_run",
    name: "First Run",
    description: "Complete your first cardio session",
    icon: "footprint",
  },
  {
    id: "5k_finisher",
    name: "5K Finisher",
    description: "Run 5km in a single session",
    icon: "flag",
  },
  {
    id: "60_min_beast",
    name: "60 Minute Beast",
    description: "Complete a 60-minute cardio session",
    icon: "fire",
  },
  {
    id: "interval_warrior",
    name: "Interval Warrior",
    description: "Complete a 10-round interval session",
    icon: "zap",
  },
  {
    id: "consistent_cardio",
    name: "Consistent Cardio",
    description: "Complete 5 cardio sessions",
    icon: "heart",
  },
  // Strength
  {
    id: "first_lift",
    name: "First Lift",
    description: "Complete your first strength session",
    icon: "dumbbell",
  },
  {
    id: "100_sets_club",
    name: "100 Sets Club",
    description: "Complete 100 total sets",
    icon: "layers",
  },
  {
    id: "1rm_breaker",
    name: "1RM Breaker",
    description: "Test your one rep max",
    icon: "trophy",
  },
  // Consistency
  {
    id: "streak_7",
    name: "7 Day Streak",
    description: "Train 7 days in a row",
    icon: "flame",
  },
  {
    id: "streak_30",
    name: "30 Day Streak",
    description: "Train 30 days in a row",
    icon: "flame",
  },
  {
    id: "streak_100",
    name: "100 Day Streak",
    description: "Train 100 days in a row",
    icon: "award",
  },
];

// ── Badge unlock engine ───────────────────────────────────────────────────────

/**
 * Evaluate all badge conditions and return only newly-unlocked badges.
 * Pure — no storage access, no side effects. Caller handles persistence.
 *
 * @param session      - the just-completed session (included in allWorkouts)
 * @param allWorkouts  - full workout history including the current session
 * @param profile      - user profile (checked for estimated1RM, existing badges)
 * @param streakDays   - current streak length AFTER today is counted
 */
export function checkBadges(input: {
  session: WorkoutSession;
  allWorkouts: WorkoutSession[];
  profile: UserProfile;
  streakDays: number;
}): Badge[] {
  const { allWorkouts, profile, streakDays } = input;

  // Build set of already-unlocked badge IDs
  const existing = profile.badges;
  const alreadyUnlocked = new Set<string>(
    existing?.map((b) => b.id) ?? []
  );

  // Pre-compute aggregate values once
  const cardioSessions = allWorkouts.filter(
    (w) => w.sessionType === "cardio"
  );
  const strengthSessions = allWorkouts.filter(
    (w) => w.sessionType !== "cardio"
  );

  const totalCompletedSets = allWorkouts.reduce((sum, w) => {
    return (
      sum +
      w.exercises.flatMap((e) => e.sets).filter((s) => s.completed).length
    );
  }, 0);

  const has1RM =
    profile.estimated1RM != null &&
    Object.values(profile.estimated1RM).some((v) => v != null && v !== "");

  // Condition evaluators keyed by badge ID
  const conditions: Record<string, () => boolean> = {
    first_run:         () => cardioSessions.length >= 1,
    "5k_finisher":     () => cardioSessions.some((w) => (w.cardioDistanceKm ?? 0) >= 5),
    "60_min_beast":    () =>
      cardioSessions.some(
        (w) => Math.floor((w.cardioDurationMs ?? 0) / 60000) >= 60
      ),
    interval_warrior:  () =>
      cardioSessions.some(
        (w) =>
          w.cardioGoalType === "intervals" &&
          (w.cardioIntervalsCompleted ?? 0) >= 10
      ),
    consistent_cardio: () => cardioSessions.length >= 5,
    first_lift:        () => strengthSessions.length >= 1,
    "100_sets_club":   () => totalCompletedSets >= 100,
    "1rm_breaker":     () => has1RM,
    streak_7:          () => streakDays >= 7,
    streak_30:         () => streakDays >= 30,
    streak_100:        () => streakDays >= 100,
  };

  const now = new Date().toISOString();
  const newBadges: Badge[] = [];

  for (const def of BADGE_DEFINITIONS) {
    if (alreadyUnlocked.has(def.id)) continue;

    const conditionFn = conditions[def.id];
    if (conditionFn && conditionFn()) {
      const badge: Badge = { ...def, unlockedAt: now };
      newBadges.push(badge);
      if (__DEV__) {
        console.log(`[badgeService] NEW badge unlocked: ${def.id} — ${def.name}`);
      }
    }
  }

  return newBadges;
}

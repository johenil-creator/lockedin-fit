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
  {
    id: "streak_365",
    name: "365 Day Streak",
    description: "Train every day for a year",
    icon: "calendar",
  },
  // Cardio (advanced)
  {
    id: "10k_finisher",
    name: "10K Finisher",
    description: "Run 10km in a single session",
    icon: "map",
  },
  {
    id: "marathon_prep",
    name: "Marathon Prep",
    description: "Complete a 45-minute cardio session",
    icon: "stopwatch",
  },
  // Strength (advanced)
  {
    id: "iron_regular",
    name: "Iron Regular",
    description: "Complete 10 strength sessions",
    icon: "body",
  },
  {
    id: "500_sets_club",
    name: "500 Sets Club",
    description: "Complete 500 total sets",
    icon: "fitness",
  },
  // Milestones
  {
    id: "double_threat",
    name: "Double Threat",
    description: "Complete both a cardio and strength session",
    icon: "swap-horizontal",
  },
  {
    id: "quarter_century",
    name: "Quarter Century",
    description: "Complete 25 total workouts",
    icon: "star",
  },
  {
    id: "half_century",
    name: "Half Century",
    description: "Complete 50 total workouts",
    icon: "diamond",
  },
  {
    id: "centurion",
    name: "Centurion",
    description: "Complete 100 total workouts",
    icon: "medal",
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
  const { session, allWorkouts, profile, streakDays } = input;
  const isCardio = session.sessionType === "cardio";

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
    (w) => w.sessionType === "strength" || (w.sessionType !== "cardio" && w.exercises.some((e) => e.sets.some((s) => s.completed)))
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
  // Session-type-specific badges only fire when the current session matches.
  const conditions: Record<string, () => boolean> = {
    first_run:         () => isCardio && cardioSessions.length >= 1,
    "5k_finisher":     () => isCardio && cardioSessions.some((w) => (w.cardioDistanceKm ?? 0) >= 5),
    "60_min_beast":    () =>
      isCardio &&
      cardioSessions.some(
        (w) => Math.floor((w.cardioDurationMs ?? 0) / 60000) >= 60
      ),
    interval_warrior:  () =>
      isCardio &&
      cardioSessions.some(
        (w) =>
          w.cardioGoalType === "intervals" &&
          (w.cardioIntervalsCompleted ?? 0) >= 10
      ),
    consistent_cardio: () => isCardio && cardioSessions.length >= 5,
    first_lift:        () => !isCardio && strengthSessions.length >= 1,
    "100_sets_club":   () => totalCompletedSets >= 100,
    "1rm_breaker":     () => has1RM,
    streak_7:          () => streakDays >= 7,
    streak_30:         () => streakDays >= 30,
    streak_100:        () => streakDays >= 100,
    streak_365:        () => streakDays >= 365,
    "10k_finisher":    () => isCardio && cardioSessions.some((w) => (w.cardioDistanceKm ?? 0) >= 10),
    marathon_prep:     () => isCardio && cardioSessions.some((w) => Math.floor((w.cardioDurationMs ?? 0) / 60000) >= 45),
    iron_regular:      () => !isCardio && strengthSessions.length >= 10,
    "500_sets_club":   () => totalCompletedSets >= 500,
    double_threat:     () => cardioSessions.length >= 1 && strengthSessions.length >= 1,
    quarter_century:   () => allWorkouts.length >= 25,
    half_century:      () => allWorkouts.length >= 50,
    centurion:         () => allWorkouts.length >= 100,
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

// ── Badge progress hints ─────────────────────────────────────────────────────

export type BadgeStats = {
  cardioCount: number;
  strengthCount: number;
  totalWorkouts: number;
  totalSets: number;
  streakDays: number;
  has1RM: boolean;
};

/** Returns a short progress string for a locked badge, e.g. "3 / 5 sessions". */
export function getBadgeProgress(badgeId: string, stats: BadgeStats): string | null {
  const { cardioCount, strengthCount, totalWorkouts, totalSets, streakDays } = stats;
  switch (badgeId) {
    case "first_run":         return cardioCount >= 1 ? null : `${cardioCount} / 1`;
    case "consistent_cardio": return `${Math.min(cardioCount, 5)} / 5 sessions`;
    case "first_lift":        return strengthCount >= 1 ? null : `${strengthCount} / 1`;
    case "iron_regular":      return `${Math.min(strengthCount, 10)} / 10 sessions`;
    case "100_sets_club":     return `${Math.min(totalSets, 100)} / 100 sets`;
    case "500_sets_club":     return `${Math.min(totalSets, 500)} / 500 sets`;
    case "streak_7":          return `${Math.min(streakDays, 7)} / 7 days`;
    case "streak_30":         return `${Math.min(streakDays, 30)} / 30 days`;
    case "streak_100":        return `${Math.min(streakDays, 100)} / 100 days`;
    case "streak_365":        return `${Math.min(streakDays, 365)} / 365 days`;
    case "quarter_century":   return `${Math.min(totalWorkouts, 25)} / 25 workouts`;
    case "half_century":      return `${Math.min(totalWorkouts, 50)} / 50 workouts`;
    case "centurion":         return `${Math.min(totalWorkouts, 100)} / 100 workouts`;
    case "double_threat":
      if (cardioCount >= 1 && strengthCount >= 1) return null;
      return cardioCount >= 1 ? "Need strength" : strengthCount >= 1 ? "Need cardio" : "Need both";
    default: return null;
  }
}

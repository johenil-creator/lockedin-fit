import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WorkoutSession, XPRecord, StreakData, WeekInReview } from "./types";

// ── Storage ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "@lockedinfit/week-in-review";

// ── Helpers ────────────────────────────────────────────────────────────────

function getISOWeekKey(d: Date): string {
  const tmp = new Date(d.getTime());
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(Math.floor((a.getTime() - b.getTime()) / 86400000));
}

// ── Recommendations Engine ─────────────────────────────────────────────────

export function generateRecommendations(
  workoutsCompleted: number,
  streakDays: number,
  avgDuration: number
): string[] {
  const tips: string[] = [];

  if (workoutsCompleted < 3) {
    tips.push("Try to hit at least 3 sessions this week for consistent gains.");
  } else if (workoutsCompleted >= 5) {
    tips.push("Great volume! Make sure you're scheduling rest days for recovery.");
  }

  if (streakDays >= 7) {
    tips.push("Incredible streak! Consider a light deload day to stay fresh.");
  } else if (streakDays < 2) {
    tips.push("Build momentum — even short sessions keep the streak alive.");
  }

  if (avgDuration > 75) {
    tips.push("Your sessions are long. Shorter, focused workouts can be just as effective.");
  } else if (avgDuration > 0 && avgDuration < 30) {
    tips.push("Short sessions are fine, but adding a few more sets could boost results.");
  }

  // Ensure we always return 2-3 tips
  if (tips.length < 2) {
    tips.push("Keep pushing — consistency is the key to long-term progress.");
  }
  if (tips.length < 2) {
    tips.push("Track your PRs to see how far you've come.");
  }

  return tips.slice(0, 3);
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a WeekInReview from current workout data, XP record, and streak info.
 */
export async function generateWeekInReview(
  workouts: WorkoutSession[],
  xpRecord: XPRecord,
  streakData: StreakData
): Promise<WeekInReview> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);
  const weekKey = getISOWeekKey(now);

  // Filter sessions from the last 7 days
  const recentSessions = workouts.filter((w) => {
    if (!w.completedAt) return false;
    const d = new Date(w.completedAt);
    return d >= sevenDaysAgo && d <= now;
  });

  // Filter sessions from previous week (7-14 days ago)
  const prevSessions = workouts.filter((w) => {
    if (!w.completedAt) return false;
    const d = new Date(w.completedAt);
    return d >= fourteenDaysAgo && d < sevenDaysAgo;
  });

  const workoutsCompleted = recentSessions.length;
  const prevWorkoutsCompleted = prevSessions.length;

  // Total sets
  const totalSets = recentSessions.reduce(
    (sum, s) => sum + s.exercises.reduce((es, e) => es + e.sets.filter((st) => st.completed).length, 0),
    0
  );
  const prevTotalSets = prevSessions.reduce(
    (sum, s) => sum + s.exercises.reduce((es, e) => es + e.sets.filter((st) => st.completed).length, 0),
    0
  );

  // XP earned in last 7 days
  const totalXpEarned = (xpRecord.history ?? [])
    .filter((h) => {
      const d = new Date(h.date);
      return d >= sevenDaysAgo && d <= now;
    })
    .reduce((sum, h) => sum + h.amount, 0);

  const prevXpEarned = (xpRecord.history ?? [])
    .filter((h) => {
      const d = new Date(h.date);
      return d >= fourteenDaysAgo && d < sevenDaysAgo;
    })
    .reduce((sum, h) => sum + h.amount, 0);

  // PRs hit (sessions with prAwarded flag)
  const prsHit = recentSessions.filter((s) => s.prAwarded).length;

  // Average session duration
  let avgSessionDurationMin = 0;
  const sessionsWithDuration = recentSessions.filter((s) => s.startedAt && s.completedAt);
  if (sessionsWithDuration.length > 0) {
    const totalMs = sessionsWithDuration.reduce((sum, s) => {
      return sum + (new Date(s.completedAt!).getTime() - new Date(s.startedAt!).getTime());
    }, 0);
    avgSessionDurationMin = Math.round(totalMs / sessionsWithDuration.length / 60000);
  }

  // Top exercise (most completed sets)
  const exerciseCounts: Record<string, number> = {};
  for (const s of recentSessions) {
    for (const e of s.exercises) {
      const completedCount = e.sets.filter((st) => st.completed).length;
      exerciseCounts[e.name] = (exerciseCounts[e.name] ?? 0) + completedCount;
    }
  }
  let topExercise = "—";
  let maxSets = 0;
  for (const [name, count] of Object.entries(exerciseCounts)) {
    if (count > maxSets) {
      maxSets = count;
      topExercise = name;
    }
  }

  const recommendations = generateRecommendations(
    workoutsCompleted,
    streakData.current,
    avgSessionDurationMin
  );

  const review: WeekInReview = {
    weekKey,
    workoutsCompleted,
    totalSets,
    totalXpEarned,
    prsHit,
    streakDays: streakData.current,
    avgSessionDurationMin,
    topExercise,
    socialStats: { reactionsGiven: 0, reactionsReceived: 0, commentsPosted: 0 },
    recommendations,
    comparedToLastWeek: {
      workouts: workoutsCompleted - prevWorkoutsCompleted,
      sets: totalSets - prevTotalSets,
      xp: totalXpEarned - prevXpEarned,
    },
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(review));
  return review;
}

/**
 * Load the last saved week-in-review from local storage.
 */
export async function getLastReview(): Promise<WeekInReview | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    if (__DEV__) console.warn("[weekInReviewService] caught:", e);
    return null;
  }
}

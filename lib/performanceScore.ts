import type { WorkoutSession, PerformanceWeek } from "./types";

// ── ISO week key ──────────────────────────────────────────────────────────────

/** Returns "YYYY-Www" for a given date (e.g. "2026-W08"). */
export function isoWeekKey(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // ISO week: Thursday of the week determines the year
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const year = d.getFullYear();
  const weekNum = Math.ceil(
    ((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7
  );
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

/** Returns the Date of Monday for the ISO week containing `date`. */
export function weekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay() || 7; // treat Sunday as 7
  d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Score formula ─────────────────────────────────────────────────────────────

/**
 * Weekly performance score (0–100).
 *
 * Weights:
 *   60 pts — sets completed  (capped at estimated target)
 *   21 pts — streak          (3 pts/day, max 7 days)
 *   18 pts — PRs             (6 pts each, max 3)
 *    1 pt  — all sessions done bonus (not enforced here; available to callers)
 */
export function calcWeeklyScore(
  setsCompleted: number,
  targetSets: number,
  streakDays: number,
  prsHit: number
): number {
  const safeSets   = targetSets > 0 ? targetSets : setsCompleted || 1;
  const setScore   = Math.min(setsCompleted / safeSets, 1) * 60;
  const streakScore = Math.min(streakDays, 7) * 3;
  const prScore    = Math.min(prsHit, 3) * 6;
  return Math.round(Math.min(setScore + streakScore + prScore, 100));
}

// ── Build / update a PerformanceWeek record ───────────────────────────────────

/**
 * Derive a PerformanceWeek from all completed sessions that fall in the same
 * ISO week as `weekKey`, plus the current streak.
 */
export function buildPerformanceWeek(
  weekKey: string,
  allSessions: WorkoutSession[],
  streakDays: number,
  prsHit: number
): PerformanceWeek {
  const mon = weekStart(weekKeyToDate(weekKey));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);

  const weekSessions = allSessions.filter((s) => {
    if (!s.completedAt) return false;
    const d = new Date(s.date);
    return d >= mon && d <= sun;
  });

  const setsCompleted = weekSessions
    .flatMap((s) => s.exercises.flatMap((e) => e.sets))
    .filter((set) => set.completed).length;

  // Estimate target: average completed sets from prior history × sessions this week
  // Kept simple — callers can pass a more precise target via calcWeeklyScore directly
  const targetSets = Math.max(setsCompleted, weekSessions.length * 15);

  const score = calcWeeklyScore(setsCompleted, targetSets, streakDays, prsHit);

  return {
    weekKey,
    score,
    sessionsCompleted: weekSessions.length,
    setsCompleted,
    prsHit,
    streakDays,
  };
}

/** Parse "YYYY-Www" back to the Monday of that week as a Date. */
function weekKeyToDate(weekKey: string): Date {
  const [yearStr, wStr] = weekKey.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(wStr, 10);
  // Jan 4 is always in week 1
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - (jan4Day - 1) + (week - 1) * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// ── Upsert helper ─────────────────────────────────────────────────────────────

/**
 * Update the performance history array with a new/updated week entry.
 * Keeps the last 12 weeks, sorted ascending by weekKey.
 */
export function upsertPerformanceWeek(
  history: PerformanceWeek[],
  updated: PerformanceWeek
): PerformanceWeek[] {
  const filtered = history.filter((w) => w.weekKey !== updated.weekKey);
  return [...filtered, updated]
    .sort((a, b) => (a.weekKey > b.weekKey ? 1 : -1))
    .slice(-12);
}

/**
 * lib/challengeService.ts — Progress logic for monthly calisthenics challenges.
 *
 * Pure helpers that operate on ChallengeProgress state. Storage I/O lives in
 * lib/storage.ts. The useChallenge hook is the only consumer — it ties this
 * to the workout/XP/streak systems.
 */

import type {
  ChallengeProgress,
  ChallengeDefinition,
  ChallengeDay,
  CompletedChallenge,
} from './types';
import { getChallengeDefinition } from './challengeCatalog';

/** "YYYY-MM-DD" for a given Date (or today) in local time. */
export function toDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Build a fresh progress record when the user joins a challenge. */
export function startChallengeProgress(challengeId: string): ChallengeProgress {
  const now = new Date().toISOString();
  return {
    challengeId,
    startedAt: now,
    completedDays: [],
    skippedRestDays: [],
    lastAdvancedAt: now,
    currentDayNumber: 1,
  };
}

/**
 * Find the current ChallengeDay for a progress record, or null if the
 * challenge has run off the end of the schedule.
 */
export function getCurrentDay(
  progress: ChallengeProgress,
  def: ChallengeDefinition,
): ChallengeDay | null {
  return (
    def.schedule.find((d) => d.dayNumber === progress.currentDayNumber) ?? null
  );
}

/**
 * Advance the progress record past the current day.
 * Returns an updated ChallengeProgress. Does not touch storage.
 */
export function advanceProgress(
  progress: ChallengeProgress,
  def: ChallengeDefinition,
): ChallengeProgress {
  const currentDay = getCurrentDay(progress, def);
  if (!currentDay) return progress;

  const completedDays = currentDay.isRest
    ? progress.completedDays
    : [...progress.completedDays, currentDay.dayNumber];

  const skippedRestDays = currentDay.isRest
    ? [...progress.skippedRestDays, currentDay.dayNumber]
    : progress.skippedRestDays;

  const now = new Date();
  return {
    ...progress,
    completedDays,
    skippedRestDays,
    currentDayNumber: Math.min(progress.currentDayNumber + 1, def.totalDays + 1),
    lastAdvancedAt: now.toISOString(),
    lastCompletedDate: toDateStr(now),
  };
}

/**
 * Speed-run lock: true when the user already advanced THIS challenge today.
 * Prevents logging multiple days of the same challenge in one sitting.
 * Scoped to the progress record so abandoning clears it — the cross-challenge
 * farming case is handled separately via areRewardsLockedToday().
 */
export function isLockedForToday(progress: ChallengeProgress): boolean {
  if (!progress.lastCompletedDate) return false;
  return progress.lastCompletedDate === toDateStr();
}

/**
 * Rewards lock: true when the user already earned challenge rewards today.
 * Checked against a profile-level date that survives abandon/rejoin so a
 * user can't farm XP by looping join → complete → abandon → rejoin on the
 * same calendar day. When true, completions still log and advance the
 * schedule; only XP/fang awarding is skipped.
 */
export function areRewardsLockedToday(
  profileLastCompletedDate?: string,
): boolean {
  if (!profileLastCompletedDate) return false;
  return profileLastCompletedDate === toDateStr();
}

/** True when the progress record has moved past the final day. */
export function isProgressComplete(
  progress: ChallengeProgress,
  def: ChallengeDefinition,
): boolean {
  return progress.currentDayNumber > def.totalDays;
}

/** Build the CompletedChallenge archive record when a user finishes. */
export function buildCompletedRecord(
  progress: ChallengeProgress,
): CompletedChallenge {
  return {
    challengeId: progress.challengeId,
    startedAt: progress.startedAt,
    completedAt: new Date().toISOString(),
    totalDaysCompleted: progress.completedDays.length,
  };
}

/** Convenience: resolve def + current day in a single call. */
export function resolveActiveChallenge(
  progress: ChallengeProgress | null,
): { def: ChallengeDefinition; day: ChallengeDay | null } | null {
  if (!progress) return null;
  const def = getChallengeDefinition(progress.challengeId);
  if (!def) return null;
  return { def, day: getCurrentDay(progress, def) };
}

/**
 * Percentage (0–1) of workout days completed vs total workout days.
 * Rest days are excluded from the denominator so progress feels earned.
 */
export function workDayProgressPct(
  progress: ChallengeProgress,
  def: ChallengeDefinition,
): number {
  const totalWorkoutDays = def.schedule.filter((d) => !d.isRest).length;
  if (totalWorkoutDays === 0) return 0;
  return progress.completedDays.length / totalWorkoutDays;
}

/**
 * Cumulative reps (or seconds, for hold-based challenges) completed to date.
 * Sums `totalReps` from each completed day's entry in the schedule. Rest days
 * contribute zero since they have no sets.
 */
export function totalVolumeCompleted(
  progress: ChallengeProgress,
  def: ChallengeDefinition,
): number {
  return progress.completedDays.reduce((sum, dayNum) => {
    const day = def.schedule.find((d) => d.dayNumber === dayNum);
    return sum + (day?.totalReps ?? 0);
  }, 0);
}

export type ChallengeMilestone = 'quarter' | 'half' | 'three_quarter';

/**
 * Returns the highest milestone newly crossed between two progress percentages.
 * Used after advanceDay() to decide whether to fire an extra celebration.
 * Returns null if no 25/50/75 threshold was crossed in the step.
 */
export function detectMilestoneCrossed(
  beforePct: number,
  afterPct: number,
): ChallengeMilestone | null {
  const thresholds: Array<[number, ChallengeMilestone]> = [
    [0.75, 'three_quarter'],
    [0.5, 'half'],
    [0.25, 'quarter'],
  ];
  for (const [t, name] of thresholds) {
    if (beforePct < t && afterPct >= t) return name;
  }
  return null;
}

/**
 * lib/xpDecay.ts — XP decay engine for the demotion system.
 *
 * After DECAY_GRACE_DAYS of inactivity, XP is reduced by DECAY_PER_DAY
 * once per calendar day. Locke warns at DECAY_WARNING_DAY.
 *
 * All functions are pure — no side effects or storage access.
 */

import type { XPRecord, WorkoutSession } from './types';
import { rankForXP } from './rankService';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Calendar days of inactivity before XP loss begins. */
export const DECAY_GRACE_DAYS = 7;

/** Day inactivity at which Locke starts warning (before decay). */
export const DECAY_WARNING_DAY = 5;

/** XP deducted per calendar day after the grace period. */
export const DECAY_PER_DAY = 50;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Calendar days from fromStr to toStr (positive = toStr is later). */
export function daysBetween(fromStr: string, toStr: string): number {
  const ms = new Date(toStr).getTime() - new Date(fromStr).getTime();
  return Math.floor(ms / 86_400_000);
}

/** Most recent completed workout date as YYYY-MM-DD, or null if none. */
export function getLastWorkoutDate(sessions: WorkoutSession[]): string | null {
  let latest: string | null = null;
  for (const s of sessions) {
    if (!s.completedAt && !s.date) continue;
    const d = (s.completedAt ?? s.date).slice(0, 10);
    if (!latest || d > latest) latest = d;
  }
  return latest;
}

// ── Decay state ───────────────────────────────────────────────────────────────

export type DecayCheck = {
  daysSinceWorkout: number;
  /** Days 5-6: warn the user, decay hasn't started yet. */
  shouldWarn: boolean;
  /** Day 7+: apply DECAY_PER_DAY XP loss today. */
  shouldDecay: boolean;
  /** Decay was already applied today — skip to avoid double-penalising. */
  alreadyAppliedToday: boolean;
  /** Days remaining before decay starts (only meaningful when shouldWarn is true). */
  daysUntilDecay: number;
};

/**
 * Compute what the decay engine should do right now.
 * Pure — no side effects.
 *
 * @param record          Current XP record
 * @param lastWorkoutDate YYYY-MM-DD of the most recent completed workout, or null
 * @param today           YYYY-MM-DD of today
 */
export function computeDecayCheck(
  record: XPRecord,
  lastWorkoutDate: string | null,
  today: string,
): DecayCheck {
  if (!lastWorkoutDate) {
    return {
      daysSinceWorkout: 0,
      shouldWarn: false,
      shouldDecay: false,
      alreadyAppliedToday: false,
      daysUntilDecay: DECAY_GRACE_DAYS,
    };
  }

  const daysSince = daysBetween(lastWorkoutDate, today);

  if (daysSince <= 0) {
    return {
      daysSinceWorkout: 0,
      shouldWarn: false,
      shouldDecay: false,
      alreadyAppliedToday: false,
      daysUntilDecay: DECAY_GRACE_DAYS,
    };
  }

  const shouldWarn          = daysSince >= DECAY_WARNING_DAY && daysSince < DECAY_GRACE_DAYS;
  const shouldDecay         = daysSince >= DECAY_GRACE_DAYS;
  const alreadyAppliedToday = record.lastDecayDate === today;
  const daysUntilDecay      = Math.max(0, DECAY_GRACE_DAYS - daysSince);

  return { daysSinceWorkout: daysSince, shouldWarn, shouldDecay, alreadyAppliedToday, daysUntilDecay };
}

/**
 * Apply one day's XP decay to a record.
 * XP is floored at 0. Rank is recalculated from the new total.
 * Records the deduction in history and stamps lastDecayDate.
 */
export function applyXPDecay(record: XPRecord, today: string): XPRecord {
  const deducted = Math.min(record.total, DECAY_PER_DAY);
  const newTotal = record.total - deducted;

  if (deducted === 0) {
    return { ...record, lastDecayDate: today };
  }

  const entry = {
    date:   new Date().toISOString(),
    amount: -deducted,
    reason: 'Inactivity decay',
  };

  return {
    ...record,
    total:         newTotal,
    rank:          rankForXP(newTotal),
    history:       [...record.history, entry].slice(-200),
    lastDecayDate: today,
  };
}

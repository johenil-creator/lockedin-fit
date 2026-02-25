import type { WorkoutSession, XPRecord, XPHistoryEntry } from "./types";
import { rankForXP, didRankUp } from "./rankService";

// ── XP award amounts ──────────────────────────────────────────────────────────

export const XP_AWARDS = {
  PER_SET_COMPLETED:  1,
  SESSION_COMPLETE:  10,
  PR_HIT:            25,
  STREAK_3_DAYS:     15,
  STREAK_7_DAYS:     40,   // additive on top of 3-day award
  RANK_UP:           50,
} as const;

// ── Default empty record ──────────────────────────────────────────────────────

export function defaultXPRecord(): XPRecord {
  return { total: 0, rank: "Runt", history: [] };
}

// ── Core award function ───────────────────────────────────────────────────────

/**
 * Apply an XP award to an existing record.
 * Returns the updated record (does not mutate the input).
 */
export function applyXP(
  record: XPRecord,
  amount: number,
  reason: string
): XPRecord {
  if (amount <= 0) return record;
  const newTotal = record.total + amount;
  const entry: XPHistoryEntry = {
    date:   new Date().toISOString(),
    amount,
    reason,
  };
  return {
    total:   newTotal,
    rank:    rankForXP(newTotal),
    history: [...record.history, entry],
  };
}

// ── Session-end XP calculation ────────────────────────────────────────────────

export type SessionXPResult = {
  updatedRecord: XPRecord;
  awarded:       number;
  breakdown:     { reason: string; amount: number }[];
  rankedUp:      boolean;
};

/**
 * Calculate and apply all XP earned at the end of a session.
 *
 * @param record     - current XPRecord
 * @param session    - the just-completed WorkoutSession
 * @param isPR       - true if any lift hit a new estimated 1RM this session
 * @param streakDays - current streak length AFTER today is counted
 */
export function awardSessionXP(
  record: XPRecord,
  session: WorkoutSession,
  isPR: boolean,
  streakDays: number
): SessionXPResult {
  const breakdown: { reason: string; amount: number }[] = [];
  const oldTotal = record.total;
  let current = record;

  // 1. XP per completed set
  const completedSets = session.exercises
    .flatMap((e) => e.sets)
    .filter((s) => s.completed).length;

  if (completedSets > 0) {
    const setXP = completedSets * XP_AWARDS.PER_SET_COMPLETED;
    current = applyXP(current, setXP, `${completedSets} sets completed`);
    breakdown.push({ reason: `${completedSets} sets`, amount: setXP });
  }

  // 2. Session completion bonus
  current = applyXP(current, XP_AWARDS.SESSION_COMPLETE, "Session complete");
  breakdown.push({ reason: "Session complete", amount: XP_AWARDS.SESSION_COMPLETE });

  // 3. PR bonus
  if (isPR) {
    current = applyXP(current, XP_AWARDS.PR_HIT, "Personal record");
    breakdown.push({ reason: "Personal record", amount: XP_AWARDS.PR_HIT });
  }

  // 4. Streak bonuses (only award each tier once per streak)
  if (streakDays === 3) {
    current = applyXP(current, XP_AWARDS.STREAK_3_DAYS, "3-day streak");
    breakdown.push({ reason: "3-day streak", amount: XP_AWARDS.STREAK_3_DAYS });
  }
  if (streakDays === 7) {
    current = applyXP(current, XP_AWARDS.STREAK_7_DAYS, "7-day streak");
    breakdown.push({ reason: "7-day streak", amount: XP_AWARDS.STREAK_7_DAYS });
  }

  // 5. Rank-up bonus (applied after all other XP so threshold can be crossed)
  const rankedUp = didRankUp(oldTotal, current.total);
  if (rankedUp) {
    current = applyXP(current, XP_AWARDS.RANK_UP, `Ranked up to ${current.rank}`);
    breakdown.push({ reason: `Rank up — ${current.rank}`, amount: XP_AWARDS.RANK_UP });
  }

  const awarded = current.total - oldTotal;
  return { updatedRecord: current, awarded, breakdown, rankedUp };
}

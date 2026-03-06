import type { WorkoutSession, XPRecord, XPHistoryEntry, RankLevel, Badge } from "./types";
import { rankForXP, didRankUp, rankProgress, xpToNextRank, nextRank } from "./rankService";

// ── XP award amounts ──────────────────────────────────────────────────────────

export const XP_AWARDS = {
  PER_SET_COMPLETED:  2,
  SESSION_BASE:       5,   // minimum session bonus (requires ≥1 completed set)
  SESSION_MAX:       15,   // maximum session bonus (full workout)
  PR_HIT:            25,
  STREAK_3_DAYS:      5,
  STREAK_7_DAYS:     10,
  STREAK_14_DAYS:    30,
  STREAK_30_DAYS:    75,
  STREAK_60_DAYS:   150,
  STREAK_100_DAYS:  300,
  RANK_UP:           20,
} as const;

/** Duration bonus tiers — reward longer sessions */
const DURATION_TIERS: [number, number][] = [
  [45 * 60, 5],  // 45+ min → +5 XP
  [30 * 60, 3],  // 30+ min → +3 XP
  [15 * 60, 1],  // 15+ min → +1 XP
];

/** Streak milestones: [days, xp, label] */
const STREAK_MILESTONES: [number, number, string][] = [
  [3,   XP_AWARDS.STREAK_3_DAYS,   "3-day streak"],
  [7,   XP_AWARDS.STREAK_7_DAYS,   "7-day streak"],
  [14,  XP_AWARDS.STREAK_14_DAYS,  "14-day streak"],
  [30,  XP_AWARDS.STREAK_30_DAYS,  "30-day streak"],
  [60,  XP_AWARDS.STREAK_60_DAYS,  "60-day streak"],
  [100, XP_AWARDS.STREAK_100_DAYS, "100-day streak"],
];

// ── Default empty record ──────────────────────────────────────────────────────

export function defaultXPRecord(): XPRecord {
  return { total: 0, rank: "Runt", history: [], todayXP: 0, todayDate: "" };
}

// ── Core award function ───────────────────────────────────────────────────────

/** Get today's date as YYYY-MM-DD string. */
function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Apply an XP award to an existing record.
 * Returns the updated record (does not mutate the input).
 */
export function applyXP(
  record: XPRecord,
  amount: number,
  reason: string,
  milestone?: string,
): XPRecord {
  if (amount <= 0) return record;
  const newTotal = record.total + amount;
  const entry: XPHistoryEntry = {
    date:   new Date().toISOString(),
    amount,
    reason,
  };

  // Track daily XP — reset if the date rolled over
  const today = todayDateString();
  const prevDayXP = record.todayDate === today ? (record.todayXP ?? 0) : 0;

  return {
    total:   newTotal,
    rank:    rankForXP(newTotal),
    history: [...record.history, entry].slice(-200),
    awardedMilestones: milestone
      ? [...(record.awardedMilestones ?? []), milestone]
      : record.awardedMilestones,
    todayXP:   prevDayXP + amount,
    todayDate: today,
  };
}

// ── Session-end XP calculation ────────────────────────────────────────────────

export type SessionXPResult = {
  updatedRecord: XPRecord;
  awarded:       number;
  breakdown:     { reason: string; amount: number }[];
  rankedUp:      boolean;
  previousRank:  RankLevel;
  previousTotalXP: number;
  newRank:       RankLevel;
  newTotalXP:    number;
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
  const allSets = session.exercises.flatMap((e) => e.sets);
  const completedSets = allSets.filter((s) => s.completed).length;
  const totalSets = allSets.length;

  if (completedSets > 0) {
    const setXP = completedSets * XP_AWARDS.PER_SET_COMPLETED;
    current = applyXP(current, setXP, `${completedSets} sets completed`);
    breakdown.push({ reason: `${completedSets} sets`, amount: setXP });
  }

  // 2. Session completion bonus — scaled by completion % (0 sets = 0 XP)
  if (completedSets > 0) {
    const completionPct = totalSets > 0 ? completedSets / totalSets : 0;
    const sessionXP = Math.round(
      XP_AWARDS.SESSION_BASE + (XP_AWARDS.SESSION_MAX - XP_AWARDS.SESSION_BASE) * completionPct
    );
    current = applyXP(current, sessionXP, "Session complete");
    breakdown.push({ reason: "Session complete", amount: sessionXP });
  }

  // 3. Duration bonus — reward time invested
  const startMs = session.startedAt ? new Date(session.startedAt).getTime() : 0;
  const endMs = session.completedAt ? new Date(session.completedAt).getTime() : Date.now();
  const durationSec = startMs > 0 ? Math.floor((endMs - startMs) / 1000) : 0;

  if (completedSets > 0 && durationSec > 0) {
    for (const [threshold, xp] of DURATION_TIERS) {
      if (durationSec >= threshold) {
        current = applyXP(current, xp, `${Math.floor(threshold / 60)}+ min session`);
        breakdown.push({ reason: `${Math.floor(threshold / 60)}+ min`, amount: xp });
        break; // only award the highest tier
      }
    }
  }

  // 4. PR bonus
  if (isPR) {
    current = applyXP(current, XP_AWARDS.PR_HIT, "Personal record");
    breakdown.push({ reason: "Personal record", amount: XP_AWARDS.PR_HIT });
  }

  // 5. Streak milestones — award any milestone crossed that hasn't been awarded yet.
  // Uses persistent awardedMilestones array (not history, which is truncated to 200).
  const awardedMilestones = new Set(current.awardedMilestones ?? []);
  for (const [days, xp, label] of STREAK_MILESTONES) {
    if (streakDays >= days && !awardedMilestones.has(label)) {
      current = applyXP(current, xp, label, label);
      breakdown.push({ reason: label, amount: xp });
      awardedMilestones.add(label);
    }
  }

  // 6. Rank-up bonus (applied after all other XP so threshold can be crossed)
  const rankedUp = didRankUp(oldTotal, current.total);
  if (rankedUp) {
    current = applyXP(current, XP_AWARDS.RANK_UP, `Ranked up to ${current.rank}`);
    breakdown.push({ reason: `Rank up — ${current.rank}`, amount: XP_AWARDS.RANK_UP });
  }

  const awarded = current.total - oldTotal;
  return {
    updatedRecord: current,
    awarded,
    breakdown,
    rankedUp,
    previousRank: record.rank,
    previousTotalXP: oldTotal,
    newRank: current.rank,
    newTotalXP: current.total,
  };
}

// ── Workout Complete Screen params ───────────────────────────────────────────

export type WorkoutCompleteParams = {
  sessionId:        string;
  sessionName:      string;
  xpAwarded:        number;
  xpBreakdown:      { reason: string; amount: number }[];
  completionPct:    number;  // 0–1
  durationSeconds:  number;
  setsCompleted:    number;
  totalSets:        number;
  exerciseCount:    number;
  rankedUp:         boolean;
  previousRank:     RankLevel;
  newRank:          RankLevel;
  previousTotalXP:  number;
  newTotalXP:       number;
  newProgress:      number;  // 0–1 within current rank band
  xpToNext:         number;
  nextRankName:     string | null;
  isPR:             boolean;
  streakDays:       number;
  // ── Cardio ────────────────────────────────────────────────────────────────
  isCardio?:        boolean;
  virtualSets?:     number;
  cardioCalories?:  number;     // active kcal to display on complete screen
  cardioDistanceKm?: number;    // estimated distance (null for non-linear modalities)
  newPRs?:          string[];   // PR keys to display on complete screen
  newBadges?:       Badge[];
};

export function buildWorkoutCompleteParams(
  session: WorkoutSession,
  xpResult: SessionXPResult,
  isPR: boolean,
  streakDays: number
): WorkoutCompleteParams {
  const allSets = session.exercises.flatMap((e) => e.sets);
  const setsCompleted = allSets.filter((s) => s.completed).length;
  const totalSets = allSets.length;
  const completionPct = totalSets > 0 ? setsCompleted / totalSets : 0;

  const startMs = session.startedAt ? new Date(session.startedAt).getTime() : 0;
  const endMs = session.completedAt ? new Date(session.completedAt).getTime() : Date.now();
  const durationSeconds = startMs > 0 ? Math.max(0, Math.floor((endMs - startMs) / 1000)) : 0;

  const next = nextRank(xpResult.newRank);

  return {
    sessionId:       session.id,
    sessionName:     session.name,
    xpAwarded:       xpResult.awarded,
    xpBreakdown:     xpResult.breakdown,
    completionPct,
    durationSeconds,
    setsCompleted,
    totalSets,
    exerciseCount:   session.exercises.length,
    rankedUp:        xpResult.rankedUp,
    previousRank:    xpResult.previousRank,
    newRank:         xpResult.newRank,
    previousTotalXP: xpResult.previousTotalXP,
    newTotalXP:      xpResult.newTotalXP,
    newProgress:     rankProgress(xpResult.newTotalXP),
    xpToNext:        xpToNextRank(xpResult.newTotalXP),
    nextRankName:    next ? next.rank : null,
    isPR,
    streakDays,
  };
}

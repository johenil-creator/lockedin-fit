import type { WorkoutSession } from "./types";

// ── Cardio XP calculation ─────────────────────────────────────────────────────

/**
 * Convert a cardio session's effort into a virtual set count.
 * Steady/distance sessions: 1 virtual set per 2 active minutes.
 * Interval sessions: 1.5 virtual sets per round completed.
 */
export function calculateVirtualSets(session: WorkoutSession): number {
  const activeMinutes = Math.floor((session.cardioDurationMs ?? 0) / 60000);
  const rounds =
    session.cardioIntervalsCompleted ??
    session.cardioIntervalConfig?.rounds ??
    0;

  const isIntervals =
    session.cardioGoalType === "intervals" && rounds > 0;

  const virtualSets = isIntervals
    ? Math.floor(rounds * 1.5)
    : Math.floor(activeMinutes / 2);

  if (__DEV__) {
    console.log(
      `[cardioXp] virtualSets=${virtualSets} goalType=${session.cardioGoalType} activeMinutes=${activeMinutes} rounds=${rounds}`
    );
  }

  return virtualSets;
}

export type CardioXPResult = {
  baseXP: number;
  intensityMultiplier: number;
  prBonus: number;
  totalXP: number;
  virtualSets: number;
  breakdown: string[];
};

/**
 * Calculate total XP earned for a completed cardio session.
 *
 * Formula:
 *   base        = virtualSets * 2 + 15  (session-complete bonus)
 *   rpeModifier = RPE ≥ 8 → ×1.1 | RPE ≤ 5 → ×0.9 | else ×1.0
 *   prBonus     = min(prCount * 10, 20)
 *   totalXP     = min(round(base * rpeModifier + prBonus), 80)
 *
 * @param session  - completed cardio WorkoutSession
 * @param prCount  - number of new PRs detected for this session
 */
export function calculateCardioXP(
  session: WorkoutSession,
  prCount: number
): CardioXPResult {
  const virtualSets = calculateVirtualSets(session);
  const baseXP = virtualSets * 2 + 15;

  const rpe = session.cardioIntensity ?? 6;
  const intensityMultiplier = rpe >= 8 ? 1.1 : rpe <= 5 ? 0.9 : 1.0;

  const prBonus = Math.min(prCount * 10, 20);

  const raw = baseXP * intensityMultiplier + prBonus;
  const totalXP = Math.min(Math.round(raw), 80);

  const breakdown: string[] = [
    `${virtualSets} virtual sets × 2 = ${virtualSets * 2} XP`,
    `Session bonus: 15 XP`,
  ];
  if (intensityMultiplier !== 1.0) {
    const label = intensityMultiplier > 1 ? `High intensity (RPE ${rpe})` : `Low intensity (RPE ${rpe})`;
    breakdown.push(`${label}: ×${intensityMultiplier}`);
  }
  if (prBonus > 0) {
    breakdown.push(`${prCount} PR(s): +${prBonus} XP`);
  }
  if (Math.round(raw) > 80) {
    breakdown.push(`XP capped at 80`);
  }

  if (__DEV__) {
    console.log(
      `[cardioXp] baseXP=${baseXP} rpe=${rpe} intensityMultiplier=${intensityMultiplier} prBonus=${prBonus} raw=${raw} totalXP=${totalXP}`
    );
    console.log(`[cardioXp] breakdown:`, breakdown);
  }

  return { baseXP, intensityMultiplier, prBonus, totalXP, virtualSets, breakdown };
}

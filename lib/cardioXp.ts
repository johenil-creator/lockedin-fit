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
 *   activeMinutes = cardioDurationMs / 60000
 *   setXP         = virtualSets * 2
 *   sessionBonus  = scaled 5–15 based on duration (0 if < 2 min)
 *   durationBonus = +1 (15 min) | +3 (30 min) | +5 (45 min)
 *   rpeModifier   = RPE ≥ 8 → ×1.1 | RPE ≤ 5 → ×0.9 | else ×1.0
 *   prBonus       = min(prCount * 10, 20)
 *   totalXP       = min(round((setXP + sessionBonus + durationBonus) * rpeModifier + prBonus), 80)
 *
 * @param session  - completed cardio WorkoutSession
 * @param prCount  - number of new PRs detected for this session
 */
export function calculateCardioXP(
  session: WorkoutSession,
  prCount: number
): CardioXPResult {
  const virtualSets = calculateVirtualSets(session);
  const activeMinutes = Math.floor((session.cardioDurationMs ?? 0) / 60000);

  const setXP = virtualSets * 2;

  // Session bonus: requires ≥ 2 min, scales from 5 to 15 over 2–30 min
  const MIN_MINUTES = 2;
  const FULL_MINUTES = 30;
  let sessionBonus = 0;
  if (activeMinutes >= MIN_MINUTES) {
    const pct = Math.min((activeMinutes - MIN_MINUTES) / (FULL_MINUTES - MIN_MINUTES), 1);
    sessionBonus = Math.round(5 + 10 * pct);
  }

  // Duration bonus tiers
  const durationBonus = activeMinutes >= 45 ? 5 : activeMinutes >= 30 ? 3 : activeMinutes >= 15 ? 1 : 0;

  const baseXP = setXP + sessionBonus + durationBonus;

  const rpe = session.cardioIntensity ?? 6;
  const intensityMultiplier = rpe >= 8 ? 1.1 : rpe <= 5 ? 0.9 : 1.0;

  const prBonus = Math.min(prCount * 10, 20);

  const raw = baseXP * intensityMultiplier + prBonus;
  const totalXP = Math.min(Math.round(raw), 80);

  const breakdown: string[] = [];
  if (setXP > 0) breakdown.push(`${virtualSets} virtual sets × 2 = ${setXP} XP`);
  if (sessionBonus > 0) breakdown.push(`Session bonus: ${sessionBonus} XP`);
  if (durationBonus > 0) breakdown.push(`${activeMinutes >= 45 ? "45" : activeMinutes >= 30 ? "30" : "15"}+ min: +${durationBonus} XP`);
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
      `[cardioXp] setXP=${setXP} sessionBonus=${sessionBonus} durationBonus=${durationBonus} baseXP=${baseXP} rpe=${rpe} intensityMultiplier=${intensityMultiplier} prBonus=${prBonus} raw=${raw} totalXP=${totalXP}`
    );
    console.log(`[cardioXp] breakdown:`, breakdown);
  }

  return { baseXP, intensityMultiplier, prBonus, totalXP, virtualSets, breakdown };
}

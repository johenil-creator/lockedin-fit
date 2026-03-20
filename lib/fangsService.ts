import { loadFangs, saveFangs } from "./storage";
import { queueSocialWrite, queueFieldIncrement } from "./socialSync";
import type { FangsRecord } from "./types";

// ── Fang earn rates ─────────────────────────────────────────────────────────

export const FANG_AWARDS = {
  WORKOUT_COMPLETE:  5,
  PER_SET:           1,
  PR_HIT:           10,
  STREAK_7_DAYS:     8,
  STREAK_30_DAYS:   50,
  LEAGUE_PROMOTION: 15,
} as const;

// ── Core functions ──────────────────────────────────────────────────────────

/**
 * Earn fangs — increment local balance and queue Firestore sync.
 */
export async function earnFangs(
  userId: string,
  amount: number,
  reason: string
): Promise<FangsRecord> {
  if (__DEV__) console.log(`[fangs] earned ${amount} for: ${reason}`);

  const current = await loadFangs();
  const updated: FangsRecord = {
    balance: current.balance + amount,
    lastUpdated: new Date().toISOString(),
  };
  await saveFangs(updated);

  // Queue Firestore increment
  await queueFieldIncrement("users", userId, "fangs", amount);

  return updated;
}

/**
 * Spend fangs — decrement local balance and queue Firestore sync.
 * Returns false if insufficient balance.
 */
export async function spendFangs(
  userId: string,
  amount: number,
  itemId: string
): Promise<{ success: boolean; record: FangsRecord }> {
  if (__DEV__) console.log(`[fangs] spent ${amount} on: ${itemId}`);

  const current = await loadFangs();
  if (current.balance < amount) {
    return { success: false, record: current };
  }

  const updated: FangsRecord = {
    balance: current.balance - amount,
    lastUpdated: new Date().toISOString(),
  };
  await saveFangs(updated);

  // Queue Firestore decrement
  await queueFieldIncrement("users", userId, "fangs", -amount);

  return { success: true, record: updated };
}

/**
 * Get current fangs balance from local storage.
 */
export async function getFangsBalance(): Promise<number> {
  const record = await loadFangs();
  return record.balance;
}

/**
 * Calculate fangs earned for a session.
 * Returns total fangs + breakdown.
 */
export function calculateSessionFangs(
  completedSets: number,
  isPR: boolean
): { total: number; breakdown: { reason: string; amount: number }[] } {
  const breakdown: { reason: string; amount: number }[] = [];

  // Base workout complete
  breakdown.push({ reason: "Workout complete", amount: FANG_AWARDS.WORKOUT_COMPLETE });

  // Per completed set
  if (completedSets > 0) {
    breakdown.push({ reason: `${completedSets} sets`, amount: completedSets * FANG_AWARDS.PER_SET });
  }

  // PR bonus
  if (isPR) {
    breakdown.push({ reason: "Personal record", amount: FANG_AWARDS.PR_HIT });
  }

  const total = breakdown.reduce((sum, b) => sum + b.amount, 0);
  return { total, breakdown };
}

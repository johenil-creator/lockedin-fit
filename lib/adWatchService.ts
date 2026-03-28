import { loadAdWatchState, saveAdWatchState } from "./storage";
import type { AdWatchState } from "./types";

// ── Constants ────────────────────────────────────────────────────────────────

export const MAX_DAILY_AD_WATCHES = 3;
export const FANGS_PER_AD_WATCH = 5;

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Get current ad watch state, auto-resetting if the date has rolled over.
 */
export async function getAdWatchState(): Promise<AdWatchState> {
  const state = await loadAdWatchState();
  if (state.date !== todayStr()) {
    return { date: todayStr(), watchCount: 0, lastWatchedAt: "" };
  }
  return state;
}

/**
 * Whether the user can still watch an ad today.
 */
export async function canWatchAd(): Promise<boolean> {
  const state = await getAdWatchState();
  return state.watchCount < MAX_DAILY_AD_WATCHES;
}

/**
 * Record that the user watched an ad. Returns updated state.
 */
export async function recordAdWatch(): Promise<AdWatchState> {
  const state = await getAdWatchState();
  const updated: AdWatchState = {
    date: todayStr(),
    watchCount: state.watchCount + 1,
    lastWatchedAt: new Date().toISOString(),
  };
  await saveAdWatchState(updated);
  return updated;
}

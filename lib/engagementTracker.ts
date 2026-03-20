import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Storage ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "@lockedinfit/engagement-stats";

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Increment a named event counter in local engagement stats.
 */
export async function trackEvent(eventName: string): Promise<void> {
  const stats = await getEngagementStats();
  stats[eventName] = (stats[eventName] ?? 0) + 1;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

/**
 * Load the current engagement stats from AsyncStorage.
 */
export async function getEngagementStats(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    if (__DEV__) console.warn("[engagementTracker] caught:", e);
    return {};
  }
}

/**
 * Clear all engagement stats (weekly reset).
 */
export async function resetWeeklyStats(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({}));
}

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, isFirebaseConfigured } from "./firebase";
import type { GlobalLeaderboardEntry } from "./types";

const CACHE_KEY = "@lockedinfit/global-leaderboard-cache";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function currentWeekKey(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - jan1.getTime()) / 86400000);
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

type CacheEntry = {
  entries: GlobalLeaderboardEntry[];
  period: string;
  cachedAt: string;
};

async function getCached(period: string): Promise<GlobalLeaderboardEntry[] | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    const cache: CacheEntry = JSON.parse(raw);
    if (cache.period !== period) return null;
    if (Date.now() - new Date(cache.cachedAt).getTime() > CACHE_TTL_MS) return null;
    return cache.entries;
  } catch (e) { if (__DEV__) console.warn("[globalLeaderboardService] caught:", e); return null; }
}

async function setCache(entries: GlobalLeaderboardEntry[], period: string): Promise<void> {
  const cache: CacheEntry = { entries, period, cachedAt: new Date().toISOString() };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

/**
 * Get weekly leaderboard.
 * The Cloud Function writes top 100 entries to `globalLeaderboard/{weekKey}`.
 */
export async function getWeeklyLeaderboard(
  weekKey?: string,
  limit = 100
): Promise<GlobalLeaderboardEntry[]> {
  const wk = weekKey ?? currentWeekKey();
  const cacheKey = `weekly-${wk}`;

  const cached = await getCached(cacheKey);
  if (cached) return cached.slice(0, limit);

  if (!isFirebaseConfigured) return [];

  try {
    const docRef = doc(db, "globalLeaderboard", wk);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return [];

    const data = snap.data();
    const entries: GlobalLeaderboardEntry[] = (data.entries ?? []).slice(0, limit);
    await setCache(entries, cacheKey);
    return entries;
  } catch (e) {
    if (__DEV__) console.warn("[globalLeaderboardService] caught:", e);
    return [];
  }
}

/**
 * Get all-time leaderboard from `globalLeaderboard/alltime` doc.
 */
export async function getAllTimeLeaderboard(limit = 100): Promise<GlobalLeaderboardEntry[]> {
  const cached = await getCached("alltime");
  if (cached) return cached.slice(0, limit);

  if (!isFirebaseConfigured) return [];

  try {
    const docRef = doc(db, "globalLeaderboard", "alltime");
    const snap = await getDoc(docRef);
    if (!snap.exists()) return [];

    const data = snap.data();
    const entries: GlobalLeaderboardEntry[] = (data.entries ?? []).slice(0, limit);
    await setCache(entries, "alltime");
    return entries;
  } catch (e) {
    if (__DEV__) console.warn("[globalLeaderboardService] caught:", e);
    return [];
  }
}

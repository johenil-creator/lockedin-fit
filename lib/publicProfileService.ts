import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, isFirebaseConfigured } from "./firebase";
import type { PublicProfile, RankLevel, Badge, LockeCustomization } from "./types";

const CACHE_PREFIX = "@lockedinfit/public-profile-cache";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

type CacheEntry = {
  profile: PublicProfile;
  cachedAt: string;
};

async function getCached(userId: string): Promise<PublicProfile | null> {
  const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}/${userId}`);
  if (!raw) return null;
  try {
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - new Date(entry.cachedAt).getTime() > CACHE_TTL_MS) return null;
    return entry.profile;
  } catch (e) {
    if (__DEV__) console.warn("[publicProfileService] getCached failed:", e);
    return null;
  }
}

async function setCache(profile: PublicProfile): Promise<void> {
  const entry: CacheEntry = { profile, cachedAt: new Date().toISOString() };
  await AsyncStorage.setItem(`${CACHE_PREFIX}/${profile.userId}`, JSON.stringify(entry));
}

/**
 * Get a user's public profile.
 */
export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const cached = await getCached(userId);
  if (cached) return cached;

  if (!isFirebaseConfigured) return null;

  try {
    const docRef = doc(db, "publicProfiles", userId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    const profile: PublicProfile = {
      userId,
      displayName: data.displayName ?? "Unknown",
      rank: (data.rank ?? "Runt") as RankLevel,
      totalXp: data.totalXp ?? 0,
      totalWorkouts: data.totalWorkouts ?? 0,
      streakDays: data.streakDays ?? 0,
      badges: data.badges ?? [],
      lockeCustomization: data.lockeCustomization,
      packName: data.packName,
      isFriend: false, // caller must override
    };

    await setCache(profile);
    return profile;
  } catch (e) {
    if (__DEV__) console.warn("[publicProfileService] getPublicProfile failed:", e);
    return null;
  }
}

/**
 * Update the current user's public profile.
 * Called on profile changes (rank up, workout complete, etc.)
 */
export async function updatePublicProfile(
  userId: string,
  data: {
    displayName?: string;
    rank?: RankLevel;
    totalXp?: number;
    totalWorkouts?: number;
    streakDays?: number;
    badges?: Badge[];
    lockeCustomization?: LockeCustomization;
    packName?: string;
  }
): Promise<void> {
  if (!isFirebaseConfigured) return;

  try {
    await setDoc(
      doc(db, "publicProfiles", userId),
      { ...data, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (e) {
    if (__DEV__) console.warn("[publicProfileService] updatePublicProfile failed:", e);
  }
}

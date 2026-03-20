import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  increment,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, isFirebaseConfigured } from "./firebase";
import type { PackLevel } from "./types";

const STORAGE_KEY = "@lockedinfit/pack-level";

// ── Level Thresholds ─────────────────────────────────────────────────────────

type PackLevelThreshold = {
  level: number;
  xpRequired: number;
  memberCap: number;
  perks: string[];
};

export const PACK_LEVEL_THRESHOLDS: PackLevelThreshold[] = [
  { level: 1,  xpRequired: 0,     memberCap: 10, perks: ["basic_chat"] },
  { level: 2,  xpRequired: 500,   memberCap: 10, perks: ["basic_chat", "custom_banner"] },
  { level: 3,  xpRequired: 1500,  memberCap: 12, perks: ["basic_chat", "custom_banner", "pack_wars"] },
  { level: 5,  xpRequired: 5000,  memberCap: 15, perks: ["basic_chat", "custom_banner", "pack_wars", "boss_fights"] },
  { level: 10, xpRequired: 20000, memberCap: 20, perks: ["basic_chat", "custom_banner", "pack_wars", "boss_fights", "legendary_boss"] },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function cacheLevel(level: PackLevel): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(level));
}

async function loadCachedLevel(): Promise<PackLevel | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    if (__DEV__) console.warn("[packLevelService] caught:", e);
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Get the PackLevel for a given total XP amount.
 */
export function getPackLevel(totalXp: number): PackLevel {
  let matched = PACK_LEVEL_THRESHOLDS[0];
  for (const threshold of PACK_LEVEL_THRESHOLDS) {
    if (totalXp >= threshold.xpRequired) {
      matched = threshold;
    }
  }

  return {
    level: matched.level,
    totalXp,
    memberCap: matched.memberCap,
    unlockedPerks: matched.perks,
  };
}

/**
 * Get the perks unlocked at a given level number.
 */
export function getUnlockedPerks(level: number): string[] {
  let perks: string[] = [];
  for (const threshold of PACK_LEVEL_THRESHOLDS) {
    if (level >= threshold.level) {
      perks = threshold.perks;
    }
  }
  return perks;
}

/**
 * Add XP to a pack, check for level up, and update Firestore + local cache.
 * Returns the updated PackLevel.
 */
export async function addPackXpAndLevel(
  packId: string,
  xpAmount: number
): Promise<PackLevel | null> {
  if (!isFirebaseConfigured) return null;

  try {
    const levelRef = doc(db, "packLevels", packId);
    const levelSnap = await getDoc(levelRef);

    let currentTotalXp = 0;

    if (levelSnap.exists()) {
      currentTotalXp = levelSnap.data().totalXp ?? 0;
      await updateDoc(levelRef, {
        totalXp: increment(xpAmount),
      });
    } else {
      currentTotalXp = 0;
      await setDoc(levelRef, {
        packId,
        totalXp: xpAmount,
      });
    }

    const newTotalXp = currentTotalXp + xpAmount;
    const oldLevel = getPackLevel(currentTotalXp);
    const newLevel = getPackLevel(newTotalXp);

    // If level changed, update the pack document with new member cap
    if (newLevel.level > oldLevel.level) {
      try {
        await updateDoc(doc(db, "packs", packId), {
          memberCap: newLevel.memberCap,
        });
      } catch (e) {
    if (__DEV__) console.warn("[packLevelService] addPackXpAndLevel failed:", e);
  }
    }

    await cacheLevel(newLevel);
    return newLevel;
  } catch (e) {
    if (__DEV__) console.warn("[packLevelService] caught:", e);
    return null;
  }
}

/**
 * Load pack level from local cache or Firestore.
 */
export async function loadPackLevel(packId: string): Promise<PackLevel> {
  // Check cache
  const cached = await loadCachedLevel();
  if (cached) return cached;

  if (!isFirebaseConfigured) return getPackLevel(0);

  try {
    const levelSnap = await getDoc(doc(db, "packLevels", packId));
    if (levelSnap.exists()) {
      const totalXp = levelSnap.data().totalXp ?? 0;
      const level = getPackLevel(totalXp);
      await cacheLevel(level);
      return level;
    }
  } catch (e) {
    if (__DEV__) console.warn("[packLevelService] addPackXpAndLevel inner failed:", e);
  }

  return getPackLevel(0);
}

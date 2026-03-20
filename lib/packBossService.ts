import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, isFirebaseConfigured } from "./firebase";
import { currentWeekKey } from "./packUtils";
import type { PackBoss, PackBossStatus, PackBossContribution, PackChallengeType } from "./types";

const STORAGE_KEY = "@lockedinfit/pack-boss";

// ── Boss Catalog ─────────────────────────────────────────────────────────────

type BossDef = {
  bossName: string;
  bossEmoji: string;
  metric: PackChallengeType;
  hpPerMember: number;
};

export const BOSS_CATALOG: BossDef[] = [
  { bossName: "Iron Golem",   bossEmoji: "\u{1F5FF}", metric: "sets",     hpPerMember: 50  },
  { bossName: "Shadow Wolf",  bossEmoji: "\u{1F43A}", metric: "sessions", hpPerMember: 8   },
  { bossName: "XP Hydra",     bossEmoji: "\u{1F409}", metric: "xp",       hpPerMember: 200 },
  { bossName: "Flame Titan",  bossEmoji: "\u{1F525}", metric: "streak",   hpPerMember: 5   },
  { bossName: "Storm Giant",  bossEmoji: "\u26C8\uFE0F",  metric: "sets",     hpPerMember: 75  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateBossId(): string {
  return `boss_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function cacheBoss(boss: PackBoss): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(boss));
}

async function loadCachedBoss(): Promise<PackBoss | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    if (__DEV__) console.warn("[packBossService] loadCachedBoss failed:", e);
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Spawn a new boss fight for a pack.
 */
export async function spawnBoss(
  packId: string,
  bossIndex: number,
  memberCount: number
): Promise<PackBoss | null> {
  if (!isFirebaseConfigured) return null;

  const def = BOSS_CATALOG[bossIndex];
  if (!def) return null;

  try {
    const bossId = generateBossId();
    const healthTotal = def.hpPerMember * memberCount;

    const boss: PackBoss = {
      id: bossId,
      packId,
      bossName: def.bossName,
      bossEmoji: def.bossEmoji,
      healthTotal,
      healthRemaining: healthTotal,
      metric: def.metric,
      weekKey: currentWeekKey(),
      status: "active",
      rewards: 30,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "packBosses", bossId), {
      ...boss,
      createdAt: serverTimestamp(),
    });

    await cacheBoss(boss);
    return boss;
  } catch (e) {
    if (__DEV__) console.warn("[packBossService] spawnBoss failed:", e);
    return null;
  }
}

/**
 * Deal damage to a boss. Decrements healthRemaining, tracks contributions,
 * and checks if boss is defeated.
 */
export async function dealDamage(
  bossId: string,
  userId: string,
  displayName: string,
  damage: number
): Promise<PackBoss | null> {
  if (!isFirebaseConfigured) return null;

  try {
    const bossRef = doc(db, "packBosses", bossId);
    const bossSnap = await getDoc(bossRef);
    if (!bossSnap.exists()) return null;

    const bossData = bossSnap.data() as PackBoss;
    if (bossData.status !== "active") return bossData;

    // Track contribution in subcollection
    const contribRef = doc(db, "packBosses", bossId, "contributions", userId);
    const contribSnap = await getDoc(contribRef);

    if (contribSnap.exists()) {
      await updateDoc(contribRef, {
        damage: increment(damage),
        displayName,
      });
    } else {
      await setDoc(contribRef, {
        userId,
        displayName,
        damage,
      });
    }

    // Decrement health
    const newHealth = Math.max(0, bossData.healthRemaining - damage);
    const updates: Record<string, any> = {
      healthRemaining: newHealth,
    };

    // Check if defeated
    if (newHealth <= 0) {
      updates.status = "defeated" as PackBossStatus;
    }

    await updateDoc(bossRef, updates);

    const updatedBoss: PackBoss = {
      ...bossData,
      id: bossId,
      healthRemaining: newHealth,
      status: newHealth <= 0 ? "defeated" : "active",
    };

    await cacheBoss(updatedBoss);
    return updatedBoss;
  } catch (e) {
    if (__DEV__) console.warn("[packBossService] dealDamage failed:", e);
    return null;
  }
}

/**
 * Get boss status from local cache or Firestore.
 */
export async function getBossStatus(bossId: string): Promise<PackBoss | null> {
  // Check local cache
  const cached = await loadCachedBoss();
  if (cached && cached.id === bossId) {
    return cached;
  }

  if (!isFirebaseConfigured) return null;

  try {
    const bossSnap = await getDoc(doc(db, "packBosses", bossId));
    if (!bossSnap.exists()) return null;

    const boss: PackBoss = { ...(bossSnap.data() as PackBoss), id: bossSnap.id };
    await cacheBoss(boss);
    return boss;
  } catch (e) {
    if (__DEV__) console.warn("[packBossService] getBossStatus failed:", e);
    return null;
  }
}

/**
 * Get the active boss for a pack. Checks local cache first, then Firestore.
 */
export async function getActiveBoss(packId: string): Promise<PackBoss | null> {
  const cached = await loadCachedBoss();
  if (cached && cached.packId === packId && cached.status === "active") {
    return cached;
  }

  if (!isFirebaseConfigured) return null;

  try {
    const q = query(
      collection(db, "packBosses"),
      where("packId", "==", packId),
      where("status", "==", "active")
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const boss: PackBoss = { ...(snap.docs[0].data() as PackBoss), id: snap.docs[0].id };
    await cacheBoss(boss);
    return boss;
  } catch (e) {
    if (__DEV__) console.warn("[packBossService] getActiveBoss failed:", e);
    return null;
  }
}

/**
 * Load contributions from the Firestore subcollection.
 */
export async function getContributions(bossId: string): Promise<PackBossContribution[]> {
  if (!isFirebaseConfigured) return [];

  try {
    const contribRef = collection(db, "packBosses", bossId, "contributions");
    const snap = await getDocs(contribRef);

    const contributions: PackBossContribution[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        userId: data.userId,
        displayName: data.displayName,
        damage: data.damage ?? 0,
      };
    });

    // Sort by damage descending
    contributions.sort((a, b) => b.damage - a.damage);
    return contributions;
  } catch (e) {
    if (__DEV__) console.warn("[packBossService] getContributions failed:", e);
    return [];
  }
}

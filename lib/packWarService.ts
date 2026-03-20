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
import type { PackWar, PackWarStatus } from "./types";

const STORAGE_KEY = "@lockedinfit/pack-war";

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateWarId(): string {
  return `war_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function cacheWar(war: PackWar): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(war));
}

async function loadCachedWar(): Promise<PackWar | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    if (__DEV__) console.warn("[packWarService] loadCachedWar failed:", e);
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Request a new pack war. Creates a PackWar in 'matchmaking' status and saves
 * to Firestore + local cache.
 */
export async function requestWar(
  packId: string,
  packName: string
): Promise<PackWar | null> {
  if (!isFirebaseConfigured) return null;

  try {
    const warId = generateWarId();
    const war: PackWar = {
      id: warId,
      pack1Id: packId,
      pack1Name: packName,
      pack1Xp: 0,
      pack2Id: "",
      pack2Name: "",
      pack2Xp: 0,
      weekKey: currentWeekKey(),
      status: "matchmaking",
      winnerId: null,
      fangsReward: 50,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "packWars", warId), {
      ...war,
      createdAt: serverTimestamp(),
    });

    await cacheWar(war);
    return war;
  } catch (e) {
    if (__DEV__) console.warn("[packWarService] requestWar failed:", e);
    return null;
  }
}

/**
 * Get the active war for a pack. Checks local cache first, then Firestore.
 */
export async function getActiveWar(packId: string): Promise<PackWar | null> {
  // Check local cache first
  const cached = await loadCachedWar();
  if (
    cached &&
    (cached.pack1Id === packId || cached.pack2Id === packId) &&
    cached.status !== "completed"
  ) {
    return cached;
  }

  if (!isFirebaseConfigured) return null;

  try {
    // Check as pack1
    const q1 = query(
      collection(db, "packWars"),
      where("pack1Id", "==", packId),
      where("status", "in", ["matchmaking", "active"])
    );
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const data = snap1.docs[0].data() as PackWar;
      const war: PackWar = { ...data, id: snap1.docs[0].id };
      await cacheWar(war);
      return war;
    }

    // Check as pack2
    const q2 = query(
      collection(db, "packWars"),
      where("pack2Id", "==", packId),
      where("status", "in", ["matchmaking", "active"])
    );
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      const data = snap2.docs[0].data() as PackWar;
      const war: PackWar = { ...data, id: snap2.docs[0].id };
      await cacheWar(war);
      return war;
    }

    return null;
  } catch (e) {
    if (__DEV__) console.warn("[packWarService] getActiveWar failed:", e);
    return null;
  }
}

/**
 * Increment XP for the correct pack in an active war.
 */
export async function updateWarXp(
  warId: string,
  packId: string,
  xpAmount: number
): Promise<void> {
  if (!isFirebaseConfigured) return;

  try {
    const warRef = doc(db, "packWars", warId);
    const warSnap = await getDoc(warRef);
    if (!warSnap.exists()) return;

    const warData = warSnap.data() as PackWar;

    const field = warData.pack1Id === packId ? "pack1Xp" : "pack2Xp";
    await updateDoc(warRef, { [field]: increment(xpAmount) });

    // Update local cache
    const cached = await loadCachedWar();
    if (cached && cached.id === warId) {
      if (field === "pack1Xp") {
        cached.pack1Xp += xpAmount;
      } else {
        cached.pack2Xp += xpAmount;
      }
      await cacheWar(cached);
    }
  } catch (e) {
    if (__DEV__) console.warn("[packWarService] updateWarXp failed:", e);
  }
}

/**
 * Finalize a war — determine winner, set status to 'completed', award 50 Fangs
 * to members of the winning pack.
 */
export async function finalizeWar(warId: string): Promise<PackWar | null> {
  if (!isFirebaseConfigured) return null;

  try {
    const warRef = doc(db, "packWars", warId);
    const warSnap = await getDoc(warRef);
    if (!warSnap.exists()) return null;

    const warData = warSnap.data() as PackWar;

    // Determine winner
    let winnerId: string | null = null;
    if (warData.pack1Xp > warData.pack2Xp) {
      winnerId = warData.pack1Id;
    } else if (warData.pack2Xp > warData.pack1Xp) {
      winnerId = warData.pack2Id;
    }
    // If tied, winnerId stays null (draw)

    const updatedStatus: PackWarStatus = "completed";
    await updateDoc(warRef, {
      status: updatedStatus,
      winnerId,
    });

    // Award 50 Fangs to winning pack members
    if (winnerId) {
      try {
        const membersQ = query(
          collection(db, "packMembers"),
          where("packId", "==", winnerId)
        );
        const membersSnap = await getDocs(membersQ);
        for (const memberDoc of membersSnap.docs) {
          const memberData = memberDoc.data();
          const userFangsRef = doc(db, "fangs", memberData.userId);
          await updateDoc(userFangsRef, {
            balance: increment(50),
            lastUpdated: new Date().toISOString(),
          }).catch(() => {
            // User fangs doc may not exist — create it
            setDoc(userFangsRef, {
              balance: 50,
              lastUpdated: new Date().toISOString(),
            }).catch(() => {});
          });
        }
      } catch (e) {
        if (__DEV__) console.warn("[packWarService] finalizeWar fangs award failed:", e);
      }
    }

    const finalWar: PackWar = {
      ...warData,
      id: warId,
      status: "completed",
      winnerId,
    };
    await cacheWar(finalWar);
    return finalWar;
  } catch (e) {
    if (__DEV__) console.warn("[packWarService] finalizeWar failed:", e);
    return null;
  }
}

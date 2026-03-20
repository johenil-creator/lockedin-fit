import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { currentWeekKey } from "./packUtils";
import type { PackLeaderboardEntry } from "./types";

/**
 * Get pack leaderboard for a given week.
 */
export async function getPackLeaderboard(
  weekKey?: string,
  limit = 20
): Promise<PackLeaderboardEntry[]> {
  if (!isFirebaseConfigured) return [];

  const wk = weekKey ?? currentWeekKey();

  try {
    const q = query(
      collection(db, "packLeaderboard"),
      where("weekKey", "==", wk),
      orderBy("weeklyXp", "desc"),
      firestoreLimit(limit)
    );

    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        packId: data.packId,
        packName: data.packName,
        memberCount: data.memberCount ?? 0,
        weeklyXp: data.weeklyXp ?? 0,
        weekKey: data.weekKey,
      };
    });
  } catch (e) {
    if (__DEV__) console.warn("[packLeaderboardService] caught:", e);
    return [];
  }
}

/**
 * Denormalize pack data into leaderboard entry.
 * Called whenever addPackXP is called.
 */
export async function updatePackLeaderboardEntry(
  packId: string,
  packName: string,
  memberCount: number,
  weeklyXp: number
): Promise<void> {
  if (!isFirebaseConfigured) return;

  try {
    const weekKey = currentWeekKey();
    const docId = `${weekKey}__${packId}`;
    await setDoc(doc(db, "packLeaderboard", docId), {
      packId,
      packName,
      memberCount,
      weeklyXp,
      weekKey,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    if (__DEV__) console.warn("[packLeaderboardService] updatePackLeaderboardEntry failed:", e);
  }
}

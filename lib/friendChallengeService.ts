import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, isFirebaseConfigured } from "./firebase";
import type { FriendChallenge, FriendChallengeMetric } from "./types";

const CACHE_KEY = "@lockedinfit/friend-challenges";

function currentWeekKey(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - jan1.getTime()) / 86400000);
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function parseChallengeDoc(id: string, data: Record<string, any>): FriendChallenge {
  return {
    id,
    challengerId: data.challengerId,
    challengerName: data.challengerName,
    opponentId: data.opponentId,
    opponentName: data.opponentName,
    metric: data.metric,
    weekKey: data.weekKey,
    status: data.status,
    challengerScore: data.challengerScore ?? 0,
    opponentScore: data.opponentScore ?? 0,
    winnerId: data.winnerId ?? null,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
  };
}

async function cacheAll(challenges: FriendChallenge[]): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(challenges));
}

async function loadCached(): Promise<FriendChallenge[]> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (e) { if (__DEV__) console.warn("[friendChallengeService] caught:", e); return []; }
}

/**
 * Create a 1v1 friend challenge.
 */
export async function createChallenge(
  challengerId: string,
  challengerName: string,
  opponentId: string,
  opponentName: string,
  metric: FriendChallengeMetric
): Promise<FriendChallenge | null> {
  if (!isFirebaseConfigured) return null;

  try {
    const weekKey = currentWeekKey();
    const ref = await addDoc(collection(db, "friendChallenges"), {
      challengerId,
      challengerName,
      opponentId,
      opponentName,
      metric,
      weekKey,
      status: "pending",
      challengerScore: 0,
      opponentScore: 0,
      winnerId: null,
      createdAt: serverTimestamp(),
    });

    const challenge: FriendChallenge = {
      id: ref.id,
      challengerId,
      challengerName,
      opponentId,
      opponentName,
      metric,
      weekKey,
      status: "pending",
      challengerScore: 0,
      opponentScore: 0,
      winnerId: null,
      createdAt: new Date().toISOString(),
    };

    const cached = await loadCached();
    await cacheAll([...cached, challenge]);
    return challenge;
  } catch (e) {
    if (__DEV__) console.warn("[friendChallengeService] caught:", e);
    return null;
  }
}

/**
 * Respond to a pending challenge (accept or decline).
 */
export async function respondToChallenge(
  challengeId: string,
  accept: boolean
): Promise<boolean> {
  if (!isFirebaseConfigured) return false;

  try {
    const ref = doc(db, "friendChallenges", challengeId);
    await updateDoc(ref, { status: accept ? "active" : "declined" });

    const cached = await loadCached();
    const updated = cached.map((c) =>
      c.id === challengeId ? { ...c, status: (accept ? "active" : "declined") as FriendChallenge["status"] } : c
    );
    await cacheAll(updated);
    return true;
  } catch (e) {
    if (__DEV__) console.warn("[friendChallengeService] caught:", e);
    return false;
  }
}

/**
 * Get all active and pending challenges involving a user.
 */
export async function getActiveChallenges(
  userId: string
): Promise<FriendChallenge[]> {
  if (!isFirebaseConfigured) return loadCached();

  try {
    const weekKey = currentWeekKey();
    const results: FriendChallenge[] = [];

    // Challenges where user is challenger
    const q1 = query(
      collection(db, "friendChallenges"),
      where("challengerId", "==", userId),
      where("weekKey", "==", weekKey)
    );
    const snap1 = await getDocs(q1);
    for (const d of snap1.docs) {
      results.push(parseChallengeDoc(d.id, d.data()));
    }

    // Challenges where user is opponent
    const q2 = query(
      collection(db, "friendChallenges"),
      where("opponentId", "==", userId),
      where("weekKey", "==", weekKey)
    );
    const snap2 = await getDocs(q2);
    for (const d of snap2.docs) {
      if (!results.find((r) => r.id === d.id)) {
        results.push(parseChallengeDoc(d.id, d.data()));
      }
    }

    // Filter to active/pending only
    const active = results.filter((c) => c.status === "active" || c.status === "pending");
    await cacheAll(active);
    return active;
  } catch (e) {
    if (__DEV__) console.warn("[friendChallengeService] caught:", e);
    return loadCached();
  }
}

/**
 * Update score for the current user on all active challenges.
 * Fire-and-forget from workout-complete.
 */
export async function updateChallengeScore(
  userId: string,
  metric: FriendChallengeMetric,
  amount: number
): Promise<void> {
  if (!isFirebaseConfigured) return;

  try {
    const challenges = await getActiveChallenges(userId);
    const matching = challenges.filter((c) => c.status === "active" && c.metric === metric);

    for (const challenge of matching) {
      const ref = doc(db, "friendChallenges", challenge.id);
      const field = challenge.challengerId === userId ? "challengerScore" : "opponentScore";
      await updateDoc(ref, { [field]: increment(amount) });
    }
  } catch (e) {
    if (__DEV__) console.warn("[friendChallengeService] loadCached failed:", e);
  }
}

/**
 * Finalize completed challenges — determine winner.
 */
export async function finalizeChallenges(userId: string): Promise<void> {
  if (!isFirebaseConfigured) return;

  try {
    const challenges = await getActiveChallenges(userId);
    for (const c of challenges) {
      if (c.status !== "active") continue;

      // Check if week has ended
      if (c.weekKey !== currentWeekKey()) {
        const winnerId =
          c.challengerScore > c.opponentScore ? c.challengerId :
          c.opponentScore > c.challengerScore ? c.opponentId : null;

        const ref = doc(db, "friendChallenges", c.id);
        await updateDoc(ref, { status: "completed", winnerId });
      }
    }
  } catch (e) {
    if (__DEV__) console.warn("[friendChallengeService] finalizeChallenges failed:", e);
  }
}

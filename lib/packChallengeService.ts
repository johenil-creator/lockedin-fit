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
import { currentWeekKey } from "./packUtils";
import type { PackChallenge, PackChallengeType } from "./types";

const CACHE_KEY = "@lockedinfit/pack-challenge";

/**
 * Create a new weekly pack challenge (leader only).
 */
export async function createPackChallenge(
  packId: string,
  createdBy: string,
  type: PackChallengeType,
  target: number
): Promise<PackChallenge | null> {
  if (!isFirebaseConfigured) return null;

  try {
    const weekKey = currentWeekKey();

    // Check for existing active challenge this week
    const existing = await getActiveChallenge(packId);
    if (existing) return null; // only one active challenge per week

    const ref = await addDoc(collection(db, "packChallenges"), {
      packId,
      type,
      target,
      current: 0,
      weekKey,
      status: "active",
      createdBy,
      createdAt: serverTimestamp(),
    });

    const challenge: PackChallenge = {
      id: ref.id,
      packId,
      type,
      target,
      current: 0,
      weekKey,
      status: "active",
      createdBy,
      createdAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(challenge));
    return challenge;
  } catch (e) {
    if (__DEV__) console.warn("[packChallengeService] createPackChallenge failed:", e);
    return null;
  }
}

/**
 * Get the active pack challenge for the current week.
 */
export async function getActiveChallenge(
  packId: string
): Promise<PackChallenge | null> {
  if (!isFirebaseConfigured) {
    // Try cache
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed: PackChallenge = JSON.parse(cached);
        if (parsed.packId === packId && parsed.weekKey === currentWeekKey() && parsed.status === "active") {
          return parsed;
        }
      } catch (e) {
        if (__DEV__) console.warn("[packChallengeService] corrupt cache:", e);
      }
    }
    return null;
  }

  try {
    const weekKey = currentWeekKey();
    const q = query(
      collection(db, "packChallenges"),
      where("packId", "==", packId),
      where("weekKey", "==", weekKey),
      where("status", "==", "active")
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const d = snap.docs[0];
    const data = d.data();
    const challenge: PackChallenge = {
      id: d.id,
      packId: data.packId,
      type: data.type,
      target: data.target,
      current: data.current ?? 0,
      weekKey: data.weekKey,
      status: data.status,
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    };

    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(challenge));
    return challenge;
  } catch (e) {
    if (__DEV__) console.warn("[packChallengeService] getActiveChallenge failed:", e);
    return null;
  }
}

/**
 * Update progress on the active pack challenge.
 * Called fire-and-forget from workout-complete.
 */
export async function updateChallengeProgress(
  packId: string,
  metric: PackChallengeType,
  amount: number
): Promise<void> {
  if (!isFirebaseConfigured) return;

  try {
    const challenge = await getActiveChallenge(packId);
    if (!challenge || challenge.type !== metric) return;

    const ref = doc(db, "packChallenges", challenge.id);
    await updateDoc(ref, { current: increment(amount) });

    // Update cache
    const updated = { ...challenge, current: challenge.current + amount };
    if (updated.current >= updated.target) {
      updated.status = "completed";
      await updateDoc(ref, { status: "completed" });
    }
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  } catch (e) {
    if (__DEV__) console.warn("[packChallengeService] updateChallengeProgress failed:", e);
  }
}

/**
 * Finalize challenges at week end — mark incomplete as failed.
 */
export async function finalizeChallenge(challengeId: string): Promise<void> {
  if (!isFirebaseConfigured) return;

  try {
    const ref = doc(db, "packChallenges", challengeId);
    await updateDoc(ref, { status: "failed" });
  } catch (e) {
    if (__DEV__) console.warn("[packChallengeService] finalizeChallenge failed:", e);
  }
}

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import type { ReactionType } from "./types";

// Client-side throttle: 1 reaction per user per 5 seconds
let lastReactionTime = 0;
const THROTTLE_MS = 5000;

/**
 * Send a reaction on an activity event.
 */
export async function sendReaction(
  fromUserId: string,
  toUserId: string,
  activityId: string,
  reactionType: ReactionType
): Promise<boolean> {
  if (!isFirebaseConfigured) return false;

  const now = Date.now();
  if (now - lastReactionTime < THROTTLE_MS) return false;
  lastReactionTime = now;

  try {
    await addDoc(collection(db, "reactions"), {
      fromUserId,
      toUserId,
      activityId,
      reactionType,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    if (__DEV__) console.warn("[reactionService] sendReaction failed:", e);
    return false;
  }
}

/**
 * Get reaction counts for an activity.
 */
export async function getReactionCounts(
  activityId: string
): Promise<Record<ReactionType, number>> {
  const counts: Record<ReactionType, number> = { howl: 0, fire: 0, flex: 0, crown: 0 };
  if (!isFirebaseConfigured) return counts;

  try {
    const reactionsRef = collection(db, "reactions");
    const q = query(reactionsRef, where("activityId", "==", activityId));
    const snap = await getDocs(q);

    for (const doc of snap.docs) {
      const type = doc.data().reactionType as ReactionType;
      if (type in counts) counts[type]++;
    }
  } catch (e) {
    if (__DEV__) console.warn("[reactionService] getReactionCounts failed:", e);
  }

  return counts;
}

/**
 * Get reaction counts for multiple activities in one batch.
 */
export async function getReactionCountsBatch(
  activityIds: string[]
): Promise<Record<string, Record<ReactionType, number>>> {
  const result: Record<string, Record<ReactionType, number>> = {};
  if (!isFirebaseConfigured || activityIds.length === 0) return result;

  // Initialize all
  for (const id of activityIds) {
    result[id] = { howl: 0, fire: 0, flex: 0, crown: 0 };
  }

  try {
    // Batch in groups of 30
    for (let i = 0; i < activityIds.length; i += 30) {
      const batch = activityIds.slice(i, i + 30);
      const reactionsRef = collection(db, "reactions");
      const q = query(reactionsRef, where("activityId", "in", batch));
      const snap = await getDocs(q);

      for (const doc of snap.docs) {
        const data = doc.data();
        const type = data.reactionType as ReactionType;
        if (result[data.activityId] && type in result[data.activityId]) {
          result[data.activityId][type]++;
        }
      }
    }
  } catch (e) {
    if (__DEV__) console.warn("[reactionService] getReactionCountsBatch failed:", e);
  }

  return result;
}

// ── Reaction display ────────────────────────────────────────────────────────

export const REACTION_EMOJI: Record<ReactionType, string> = {
  howl: "\uD83D\uDE3A",  // placeholder — wolf howl
  fire: "\uD83D\uDD25",
  flex: "\uD83D\uDCAA",
  crown: "\uD83D\uDC51",
};

export const REACTION_LABELS: Record<ReactionType, string> = {
  howl: "Howl",
  fire: "Fire",
  flex: "Flex",
  crown: "Crown",
};

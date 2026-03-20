import {
  collection,
  query,
  getDocs,
  addDoc,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import type { Comment } from "./types";

// ── Throttle map: userId -> last comment timestamp ──────────────────────────
const lastCommentTime = new Map<string, number>();
const THROTTLE_MS = 30_000;
const STALE_MS = 60 * 60 * 1000; // 1 hour

/** Remove entries older than 1 hour to prevent unbounded growth. */
function pruneStaleEntries(): void {
  const cutoff = Date.now() - STALE_MS;
  for (const [key, ts] of lastCommentTime) {
    if (ts < cutoff) lastCommentTime.delete(key);
  }
}

/**
 * Post a comment to an activity's subcollection.
 * Throttled to one comment per user per 30 seconds.
 */
export async function postComment(
  activityId: string,
  userId: string,
  displayName: string,
  text: string
): Promise<void> {
  if (!isFirebaseConfigured) return;

  pruneStaleEntries();
  const now = Date.now();
  const lastTime = lastCommentTime.get(userId) ?? 0;
  if (now - lastTime < THROTTLE_MS) return;

  try {
    lastCommentTime.set(userId, now);
    await addDoc(collection(db, "activityFeed", activityId, "comments"), {
      activityId,
      userId,
      displayName,
      text,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    if (__DEV__) console.warn("[commentService] postComment failed:", e);
  }
}

/**
 * Get comments for an activity, ordered by createdAt ascending.
 */
export async function getComments(
  activityId: string,
  maxItems = 20
): Promise<Comment[]> {
  if (!isFirebaseConfigured) return [];

  try {
    const commentsRef = collection(db, "activityFeed", activityId, "comments");
    const q = query(commentsRef, orderBy("createdAt", "asc"), limit(maxItems));
    const snap = await getDocs(q);

    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        activityId: data.activityId ?? activityId,
        userId: data.userId,
        displayName: data.displayName,
        text: data.text,
        createdAt:
          data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    });
  } catch (e) {
    if (__DEV__) console.warn("[commentService] getComments failed:", e);
    return [];
  }
}

/**
 * Get comment counts for a batch of activity IDs.
 */
export async function getCommentCounts(
  activityIds: string[]
): Promise<Record<string, number>> {
  if (!isFirebaseConfigured || activityIds.length === 0) return {};

  const counts: Record<string, number> = {};

  try {
    await Promise.all(
      activityIds.map(async (activityId) => {
        const commentsRef = collection(
          db,
          "activityFeed",
          activityId,
          "comments"
        );
        const snap = await getDocs(commentsRef);
        counts[activityId] = snap.size;
      })
    );
  } catch (e) {
    if (__DEV__) console.warn("[commentService] getCommentCounts failed:", e);
  }

  return counts;
}

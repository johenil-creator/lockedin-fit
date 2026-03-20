import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import type { ActivityEvent, ActivityType } from "./types";

/**
 * Get the current ISO week key (e.g. "2026-W11").
 */
function currentWeekKey(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - jan1.getTime()) / 86400000);
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/**
 * Post an activity event to the feed.
 */
export async function postActivity(
  userId: string,
  displayName: string,
  type: ActivityType,
  payload: Record<string, any>
): Promise<void> {
  if (!isFirebaseConfigured) {
    if (__DEV__) console.log("[postActivity] Firebase not configured, skipping");
    return;
  }

  try {
    if (__DEV__) console.log("[postActivity] writing to activityFeed:", { userId, type });
    await addDoc(collection(db, "activityFeed"), {
      userId,
      displayName,
      type,
      payload,
      weekKey: currentWeekKey(),
      createdAt: serverTimestamp(),
    });
    if (__DEV__) console.log("[postActivity] success");
  } catch (err) {
    if (__DEV__) console.warn("[postActivity] error:", err);
  }
}

/**
 * Fetch friend activity feed.
 * Batches friend IDs in groups of 30 (Firestore `in` limit).
 */
export async function getFriendActivity(
  friendIds: string[],
  maxItems = 20
): Promise<ActivityEvent[]> {
  if (!isFirebaseConfigured || friendIds.length === 0) return [];

  try {
    const allEvents: ActivityEvent[] = [];

    // Batch in groups of 30 for Firestore `in` limit
    for (let i = 0; i < friendIds.length; i += 30) {
      const batch = friendIds.slice(i, i + 30);
      const feedRef = collection(db, "activityFeed");
      // orderBy ensures each batch returns the most recent items,
      // so the client-side merge across batches is correct.
      // Composite index (userId ASC, createdAt DESC) defined in firestore.indexes.json.
      const q = query(
        feedRef,
        where("userId", "in", batch),
        orderBy("createdAt", "desc"),
        limit(maxItems)
      );

      if (__DEV__) console.log("[getFriendActivity] querying for", batch.length, "users");
      const snap = await getDocs(q);
      if (__DEV__) console.log("[getFriendActivity] got", snap.docs.length, "docs");
      for (const doc of snap.docs) {
        const data = doc.data();
        allEvents.push({
          id: doc.id,
          userId: data.userId,
          displayName: data.displayName,
          type: data.type,
          payload: data.payload ?? {},
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
          weekKey: data.weekKey,
        });
      }
    }

    // Sort all events by time descending and take top maxItems
    return allEvents
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, maxItems);
  } catch (err) {
    if (__DEV__) console.warn("[getFriendActivity] error:", err);
    return [];
  }
}

/**
 * Get a human-readable description for an activity event.
 */
export function getActivityDescription(event: ActivityEvent): string {
  switch (event.type) {
    case "workout_complete":
      return `completed ${event.payload.sessionName ?? "a workout"}`;
    case "rank_up":
      return `ranked up to ${event.payload.newRank ?? "a new rank"}`;
    case "pr_hit":
      return `hit a PR${event.payload.exercise ? ` on ${event.payload.exercise}` : ""}`;
    case "streak_milestone":
      return `reached a ${event.payload.days ?? ""}${event.payload.days ? "-day" : ""} streak`;
    case "pack_joined":
      return `joined ${event.payload.packName ?? "a pack"}`;
    case "user_post":
      return event.payload.text ?? "shared a thought";
    case "milestone":
      return `achieved ${event.payload.milestoneLabel ?? "a milestone"}`;
    default:
      return "did something awesome";
  }
}

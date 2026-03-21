import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ContentType = "message" | "comment" | "post";
export type ReportReason = "spam" | "harassment" | "inappropriate" | "other";
export type ReportStatus = "pending" | "reviewed" | "dismissed";

export type Report = {
  id: string;
  reporterId: string;
  contentType: ContentType;
  contentId: string;
  reason: ReportReason;
  reasonText?: string;
  status: ReportStatus;
  createdAt: string;
};

export type Block = {
  userId: string;
  blockedUserId: string;
  createdAt: string;
};

// ── Reporting ──────────────────────────────────────────────────────────────────

/**
 * Report a piece of content (message, comment, or post).
 */
export async function reportContent(
  reporterId: string,
  contentType: ContentType,
  contentId: string,
  reason: ReportReason,
  reasonText?: string
): Promise<boolean> {
  if (!isFirebaseConfigured) return false;

  try {
    const data: Record<string, any> = {
      reporterId,
      contentType,
      contentId,
      reason,
      status: "pending" as ReportStatus,
      createdAt: serverTimestamp(),
    };
    if (reasonText && reasonText.trim()) {
      data.reasonText = reasonText.trim().slice(0, 500);
    }

    await addDoc(collection(db, "reports"), data);
    if (__DEV__) console.log("[moderation] reported:", contentType, contentId);
    return true;
  } catch (e) {
    if (__DEV__) console.warn("[moderation] reportContent failed:", e);
    return false;
  }
}

// ── Blocking ───────────────────────────────────────────────────────────────────

/** Deterministic doc ID for a block relationship. */
function blockDocId(userId: string, blockedUserId: string): string {
  return `${userId}_${blockedUserId}`;
}

/**
 * Block another user.
 */
export async function blockUser(
  userId: string,
  blockedUserId: string
): Promise<boolean> {
  if (!isFirebaseConfigured || userId === blockedUserId) return false;

  try {

    const docRef = doc(db, "blocks", blockDocId(userId, blockedUserId));
    await setDoc(docRef, {
      userId,
      blockedUserId,
      createdAt: serverTimestamp(),
    });
    if (__DEV__) console.log("[moderation] blocked:", blockedUserId);
    return true;
  } catch (e) {
    if (__DEV__) console.warn("[moderation] blockUser failed:", e);
    return false;
  }
}

/**
 * Unblock a previously blocked user.
 */
export async function unblockUser(
  userId: string,
  blockedUserId: string
): Promise<boolean> {
  if (!isFirebaseConfigured) return false;

  try {
    const docRef = doc(db, "blocks", blockDocId(userId, blockedUserId));
    await deleteDoc(docRef);
    if (__DEV__) console.log("[moderation] unblocked:", blockedUserId);
    return true;
  } catch (e) {
    if (__DEV__) console.warn("[moderation] unblockUser failed:", e);
    return false;
  }
}

/**
 * Get all user IDs that `userId` has blocked.
 */
export async function getBlockedUsers(userId: string): Promise<string[]> {
  if (!isFirebaseConfigured) return [];

  try {
    const q = query(
      collection(db, "blocks"),
      where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data().blockedUserId as string);
  } catch (e) {
    if (__DEV__) console.warn("[moderation] getBlockedUsers failed:", e);
    return [];
  }
}

/**
 * Check if either user has blocked the other (bidirectional).
 */
export async function isBlocked(
  userId: string,
  otherUserId: string
): Promise<boolean> {
  if (!isFirebaseConfigured) return false;

  try {


    // Check both directions
    const [forwardSnap, reverseSnap] = await Promise.all([
      getDoc(doc(db, "blocks", blockDocId(userId, otherUserId))),
      getDoc(doc(db, "blocks", blockDocId(otherUserId, userId))),
    ]);

    return forwardSnap.exists() || reverseSnap.exists();
  } catch (e) {
    if (__DEV__) console.warn("[moderation] isBlocked failed:", e);
    return false;
  }
}

// ── Filtering helper ───────────────────────────────────────────────────────────

/**
 * Filter an array of items that have a `userId` field, removing any from
 * blocked users. Works for messages, comments, activity events, etc.
 */
export function filterBlockedContent<T extends { userId: string }>(
  items: T[],
  blockedUserIds: Set<string>
): T[] {
  if (blockedUserIds.size === 0) return items;
  return items.filter((item) => !blockedUserIds.has(item.userId));
}

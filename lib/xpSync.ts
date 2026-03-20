import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SYNC_QUEUE_KEY = "@lockedinfit/xp-sync-queue";

type QueuedSync = {
  userId: string;
  weekKey: string;
  xpAmount: number;
  queuedAt: string;
};

// ── Queue helpers ───────────────────────────────────────────────────────────

async function loadQueue(): Promise<QueuedSync[]> {
  const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    if (__DEV__) console.warn("[xpSync] caught:", e);
    return [];
  }
}

async function saveQueue(queue: QueuedSync[]): Promise<void> {
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

// ── Core sync functions ─────────────────────────────────────────────────────

/**
 * Upsert weekly XP to Firestore. If offline, queues for later.
 */
export async function syncWeeklyXP(
  userId: string,
  weekKey: string,
  xpAmount: number
): Promise<void> {
  if (!isFirebaseConfigured) return;

  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    const queue = await loadQueue();
    queue.push({ userId, weekKey, xpAmount, queuedAt: new Date().toISOString() });
    await saveQueue(queue);
    return;
  }

  try {
    await syncWeeklyXPDirect(userId, weekKey, xpAmount);
  } catch (e) {
    if (__DEV__) console.warn("[xpSync] caught:", e);
    const queue = await loadQueue();
    queue.push({ userId, weekKey, xpAmount, queuedAt: new Date().toISOString() });
    await saveQueue(queue);
  }
}

/**
 * Register or update a friend code in the users doc.
 */
export async function syncFriendCode(
  userId: string,
  friendCode: string
): Promise<void> {
  if (!isFirebaseConfigured) return;
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return;

  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { friendCode });
}

/**
 * Look up a user by friend code and add them as a friend.
 * Returns the friend's display name, or null if not found.
 */
export async function lookupFriend(
  currentUserId: string,
  friendCode: string
): Promise<{ userId: string; displayName: string } | null> {
  if (!isFirebaseConfigured) return null;

  const usersRef = collection(db, "users");
  const q = query(
    usersRef,
    where("friendCode", "==", friendCode.toUpperCase())
  );
  const snap = await getDocs(q);

  const friendDoc = snap.docs.find((d) => d.id !== currentUserId);
  if (!friendDoc) return null;

  // Add bidirectional friendship
  const friendshipsRef = collection(db, "friendships");
  const id1 = `${currentUserId}__${friendDoc.id}`;
  const id2 = `${friendDoc.id}__${currentUserId}`;

  await setDoc(doc(friendshipsRef, id1), {
    userId: currentUserId,
    friendId: friendDoc.id,
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(friendshipsRef, id2), {
    userId: friendDoc.id,
    friendId: currentUserId,
    createdAt: serverTimestamp(),
  });

  return {
    userId: friendDoc.id,
    displayName: friendDoc.data().displayName ?? "Unknown",
  };
}

/**
 * Add a friend by their userId directly (bidirectional).
 * Used when viewing a public profile where userId is already known.
 */
export async function addFriendById(
  currentUserId: string,
  friendUserId: string
): Promise<boolean> {
  if (!isFirebaseConfigured) return false;
  if (currentUserId === friendUserId) return false;

  try {
    const friendshipsRef = collection(db, "friendships");
    const id1 = `${currentUserId}__${friendUserId}`;
    const id2 = `${friendUserId}__${currentUserId}`;

    await setDoc(doc(friendshipsRef, id1), {
      userId: currentUserId,
      friendId: friendUserId,
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(friendshipsRef, id2), {
      userId: friendUserId,
      friendId: currentUserId,
      createdAt: serverTimestamp(),
    });

    return true;
  } catch (e) {
    if (__DEV__) console.warn("[xpSync] caught:", e);
    return false;
  }
}

/**
 * Get all friend user IDs for the current user.
 */
export async function getFriendIds(userId: string): Promise<string[]> {
  if (!isFirebaseConfigured) return [];

  const friendshipsRef = collection(db, "friendships");
  const q = query(friendshipsRef, where("userId", "==", userId));
  const snap = await getDocs(q);

  return snap.docs.map((d) => d.data().friendId);
}

/**
 * Flush any queued syncs. Called when the app comes back online.
 */
export async function flushSyncQueue(): Promise<void> {
  if (!isFirebaseConfigured) return;

  const queue = await loadQueue();
  if (queue.length === 0) return;

  // Aggregate XP by user+week to minimize writes
  const aggregated = new Map<string, QueuedSync>();
  for (const item of queue) {
    const key = `${item.userId}|${item.weekKey}`;
    const existing = aggregated.get(key);
    if (existing) {
      existing.xpAmount += item.xpAmount;
    } else {
      aggregated.set(key, { ...item });
    }
  }

  const failures: QueuedSync[] = [];
  for (const item of aggregated.values()) {
    try {
      await syncWeeklyXPDirect(item.userId, item.weekKey, item.xpAmount);
    } catch (e) {
    if (__DEV__) console.warn("[xpSync] caught:", e);
      failures.push(item);
    }
  }

  await saveQueue(failures);
}

/** Direct sync without offline check — used by flush. */
async function syncWeeklyXPDirect(
  userId: string,
  weekKey: string,
  xpAmount: number
): Promise<void> {
  // Use composite doc ID for upsert semantics
  const docId = `${userId}__${weekKey}`;
  const xpRef = collection(db, "weeklyXp");

  // Check if a doc already exists
  const q = query(
    xpRef,
    where("userId", "==", userId),
    where("weekKey", "==", weekKey)
  );
  const snap = await getDocs(q);

  if (!snap.empty) {
    const existingDoc = snap.docs[0];
    const current = existingDoc.data().xpEarned ?? 0;
    await updateDoc(existingDoc.ref, {
      xpEarned: current + xpAmount,
      updatedAt: serverTimestamp(),
    });
  } else {
    await addDoc(xpRef, {
      userId,
      weekKey,
      xpEarned: xpAmount,
      updatedAt: serverTimestamp(),
    });
  }
}

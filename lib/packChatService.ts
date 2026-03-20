import {
  collection,
  query,
  orderBy,
  limit as firestoreLimit,
  addDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import type { PackMessage } from "./types";

/**
 * Send a message to the pack chat.
 */
export async function sendMessage(
  packId: string,
  userId: string,
  displayName: string,
  text: string
): Promise<PackMessage | null> {
  if (!isFirebaseConfigured || !text.trim()) return null;

  try {
    if (__DEV__) console.log("[packChat] sending to", packId);
    const ref = await addDoc(
      collection(db, "packMessages", packId, "messages"),
      {
        packId,
        userId,
        displayName,
        text: text.trim().slice(0, 500),
        createdAt: serverTimestamp(),
      }
    );
    if (__DEV__) console.log("[packChat] sent:", ref.id);

    return {
      id: ref.id,
      packId,
      userId,
      displayName,
      text: text.trim().slice(0, 500),
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
    if (__DEV__) console.warn("[packChat] error:", err);
    return null;
  }
}

/**
 * Get recent messages (one-time fetch).
 */
export async function getMessages(
  packId: string,
  limit = 50
): Promise<PackMessage[]> {
  if (!isFirebaseConfigured) return [];

  try {
    const { getDocs } = await import("firebase/firestore");
    const q = query(
      collection(db, "packMessages", packId, "messages"),
      orderBy("createdAt", "desc"),
      firestoreLimit(limit)
    );

    const snap = await getDocs(q);
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          packId: data.packId,
          userId: data.userId,
          displayName: data.displayName,
          text: data.text,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        };
      })
      .reverse(); // oldest first for display
  } catch (e) {
    if (__DEV__) console.warn("[packChatService] getMessages failed:", e);
    return [];
  }
}

/**
 * Subscribe to new messages in real-time.
 * Returns unsubscribe function.
 */
export function onNewMessages(
  packId: string,
  callback: (messages: PackMessage[]) => void
): Unsubscribe {
  if (!isFirebaseConfigured) return () => {};

  const q = query(
    collection(db, "packMessages", packId, "messages"),
    orderBy("createdAt", "desc"),
    firestoreLimit(50)
  );

  return onSnapshot(q, (snap) => {
    const messages: PackMessage[] = snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          packId: data.packId,
          userId: data.userId,
          displayName: data.displayName,
          text: data.text,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        };
      })
      .reverse();
    callback(messages);
  });
}

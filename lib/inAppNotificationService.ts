import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, isFirebaseConfigured } from "./firebase";
import type { InAppNotification, NotificationType } from "./types";

const CACHE_KEY = "@lockedinfit/notifications-cache";

/**
 * Get notifications for a user.
 */
export async function getNotifications(
  userId: string,
  limit = 30
): Promise<InAppNotification[]> {
  if (!isFirebaseConfigured) {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) try { return JSON.parse(raw); } catch (e) { if (__DEV__) console.warn("[inAppNotificationService] getNotifications cache parse failed:", e); }
    return [];
  }

  try {
    const q = query(
      collection(db, "inAppNotifications", userId, "items"),
      orderBy("createdAt", "desc"),
      firestoreLimit(limit)
    );

    const snap = await getDocs(q);
    const notifs: InAppNotification[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        type: data.type as NotificationType,
        title: data.title ?? "",
        body: data.body ?? "",
        read: data.read ?? false,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        data: data.data,
      };
    });

    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(notifs));
    return notifs;
  } catch (e) {
    if (__DEV__) console.warn("[inAppNotificationService] getNotifications failed:", e);
    return [];
  }
}

/**
 * Mark a notification as read.
 */
export async function markRead(userId: string, notificationId: string): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    await updateDoc(
      doc(db, "inAppNotifications", userId, "items", notificationId),
      { read: true }
    );
  } catch (e) {
    if (__DEV__) console.warn("[inAppNotificationService] markRead failed:", e);
  }
}

/**
 * Mark all notifications as read.
 */
export async function markAllRead(userId: string): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    const q = query(
      collection(db, "inAppNotifications", userId, "items"),
      where("read", "==", false)
    );
    const snap = await getDocs(q);
    const promises = snap.docs.map((d) =>
      updateDoc(d.ref, { read: true })
    );
    await Promise.all(promises);
  } catch (e) {
    if (__DEV__) console.warn("[inAppNotificationService] markAllRead failed:", e);
  }
}

/**
 * Get unread count — uses onSnapshot for real-time badge updates.
 */
export function getUnreadCount(
  userId: string,
  callback: (count: number) => void
): Unsubscribe {
  if (!isFirebaseConfigured) {
    callback(0);
    return () => {};
  }

  const q = query(
    collection(db, "inAppNotifications", userId, "items"),
    where("read", "==", false)
  );

  return onSnapshot(q, (snap) => {
    callback(snap.size);
  });
}

/**
 * Create a notification for a user.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  if (!isFirebaseConfigured) return;

  try {
    await addDoc(collection(db, "inAppNotifications", userId, "items"), {
      type,
      title,
      body,
      read: false,
      createdAt: serverTimestamp(),
      data: data ?? null,
    });
  } catch (e) {
    if (__DEV__) console.warn("[inAppNotificationService] createNotification failed:", e);
  }
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import type { AccountabilityPartner } from "./types";

const STORAGE_KEY = "@lockedinfit/accountability-partner";
const NUDGE_THROTTLE_KEY = "@lockedinfit/last-nudge-sent";
const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Pair with an accountability partner.
 */
export async function pairPartner(
  userId: string,
  partnerId: string,
  partnerName: string
): Promise<AccountabilityPartner> {
  const partner: AccountabilityPartner = {
    partnerId,
    partnerName,
    pairedAt: new Date().toISOString(),
    mutualStreakDays: 0,
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(partner));

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, "accountabilityPartners", userId), {
        userId,
        partnerId,
        partnerName,
        pairedAt: serverTimestamp(),
        mutualStreakDays: 0,
      });
    } catch (e) {
      if (__DEV__) console.warn("[accountabilityService] pairPartner failed:", e);
    }
  }

  return partner;
}

/**
 * Remove accountability partner.
 */
export async function unpairPartner(userId: string): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);

  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, "accountabilityPartners", userId));
    } catch (e) {
      if (__DEV__) console.warn("[accountabilityService] unpairPartner failed:", e);
    }
  }
}

/**
 * Get current accountability partner from local storage.
 */
export async function getPartner(): Promise<AccountabilityPartner | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    if (__DEV__) console.warn("[accountabilityService] getPartner failed:", e);
    return null;
  }
}

/**
 * Increment mutual streak days and save.
 */
export async function updateMutualStreak(
  userId: string
): Promise<void> {
  const partner = await getPartner();
  if (!partner) return;

  partner.mutualStreakDays += 1;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(partner));

  if (isFirebaseConfigured) {
    try {
      await setDoc(
        doc(db, "accountabilityPartners", userId),
        { mutualStreakDays: partner.mutualStreakDays },
        { merge: true }
      );
    } catch (e) {
      if (__DEV__) console.warn("[accountabilityService] updateMutualStreak failed:", e);
    }
  }
}

/**
 * Check if a nudge can be sent to a specific user (24h throttle).
 */
export async function canNudge(toUserId: string): Promise<boolean> {
  try {
    const key = `${NUDGE_THROTTLE_KEY}:${toUserId}`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return true;
    const lastSent = parseInt(raw, 10);
    return Date.now() - lastSent >= NUDGE_COOLDOWN_MS;
  } catch (e) {
    if (__DEV__) console.warn("[accountabilityService] canNudge failed:", e);
    return true;
  }
}

/**
 * Send a nudge notification to the partner.
 */
export async function sendNudge(
  fromUserId: string,
  fromDisplayName: string,
  toUserId: string
): Promise<boolean> {
  const allowed = await canNudge(toUserId);
  if (!allowed) return false;

  // Record throttle timestamp
  const key = `${NUDGE_THROTTLE_KEY}:${toUserId}`;
  await AsyncStorage.setItem(key, Date.now().toString());

  if (isFirebaseConfigured) {
    try {
      await addDoc(collection(db, "inAppNotifications", toUserId, "items"), {
        type: "nudge_received",
        fromUserId,
        fromDisplayName,
        toUserId,
        title: "You got nudged!",
        body: `${fromDisplayName} nudged you — time to work out!`,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      if (__DEV__) console.warn("[accountabilityService] sendNudge failed:", e);
    }
  }

  return true;
}

/**
 * lib/accountDeletion.ts — Full account and data deletion.
 *
 * Removes all user data from Firebase (Auth + Firestore) and local storage.
 */

import { deleteUser } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "./firebase";
import { signOut as googleSignOut } from "./googleAuth";

// ── Firestore Cleanup ────────────────────────────────────────────────────────

async function deleteFirestoreData(userId: string): Promise<void> {
  const batch = writeBatch(db);
  let ops = 0;

  // Helper: query a collection and add all matching docs to the batch
  async function addDeletes(col: string, field: string, value: string) {
    const snap = await getDocs(
      query(collection(db, col), where(field, "==", value))
    );
    for (const d of snap.docs) {
      batch.delete(d.ref);
      ops++;
    }
  }

  // User profile doc
  batch.delete(doc(db, "users", userId));
  ops++;

  // Weekly XP entries
  await addDeletes("weeklyXp", "userId", userId);

  // Friendships (both directions)
  await addDeletes("friendships", "userId", userId);
  await addDeletes("friendships", "friendId", userId);

  // League memberships
  await addDeletes("leagueMembers", "userId", userId);

  if (ops > 0) await batch.commit();
}

// ── Local Data Cleanup ───────────────────────────────────────────────────────

export async function clearLocalData(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const appKeys = allKeys.filter((k) => k.startsWith("@lockedinfit/"));
    if (appKeys.length > 0) await AsyncStorage.multiRemove(appKeys);
  } catch {
    // Best-effort — local data will be gone when the app is uninstalled anyway
  }
}

async function clearHealthCache(): Promise<void> {
  try {
    const { invalidateAll } = await import("./healthkit/cache");
    await invalidateAll();
  } catch {
    // HealthKit module may not be available on Android
  }
}

async function clearGoogleTokens(): Promise<void> {
  try {
    await googleSignOut();
  } catch {
    // Best-effort
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

/**
 * Delete the user's account and all associated data.
 *
 * Order: Firestore → local storage → health cache → Google tokens → Firebase Auth.
 * Firebase Auth deletion is last because it invalidates the auth token needed
 * for Firestore operations.
 */
export async function deleteAccount(userId: string): Promise<void> {
  // 1. Delete Firestore data (needs valid auth token)
  await deleteFirestoreData(userId);

  // 2. Clear local data (parallel — independent)
  await Promise.all([clearLocalData(), clearHealthCache(), clearGoogleTokens()]);

  // 3. Delete Firebase Auth account (last — invalidates session)
  const user = auth.currentUser;
  if (user) {
    await deleteUser(user);
  }
}

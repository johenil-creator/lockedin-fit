/**
 * lib/accountDeletion.ts — Full account and data deletion (GDPR Art. 17).
 *
 * Flow:
 * 1. Call `deleteUserData` Cloud Function (server-side Firestore + Auth erasure)
 * 2. Clear local storage, health cache, Google tokens (parallel)
 * 3. Firebase Auth user deletion happens server-side in the Cloud Function,
 *    but we also attempt client-side deletion as a fallback.
 *
 * The Cloud Function handles ALL Firestore collections and deletes the
 * Firebase Auth account with Admin SDK, so even if the client crashes
 * after step 1, the user's data is fully erased.
 */

import { deleteUser } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, isFirebaseConfigured } from "./firebase";
import { functions } from "./firebase";
import { signOut as googleSignOut } from "./googleAuth";

// ── Cloud Function call ─────────────────────────────────────────────────────

type DeleteResult = {
  success: boolean;
  totalDeleted: number;
  totalAnonymized: number;
  errors: { collection: string; error: string }[];
};

async function callDeleteUserData(): Promise<DeleteResult> {
  const deleteFn = httpsCallable<void, DeleteResult>(functions, "deleteUserData");
  const result = await deleteFn();
  return result.data;
}

// ── Local Data Cleanup ───────────────────────────────────────────────────────

export async function clearLocalData(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const appKeys = allKeys.filter((k) => k.startsWith("@lockedinfit/"));
    if (appKeys.length > 0) await AsyncStorage.multiRemove(appKeys);
  } catch (e) {
    if (__DEV__) console.warn("[accountDeletion] clearLocalData caught:", e);
    // Best-effort — local data will be gone when the app is uninstalled anyway
  }
}

async function clearHealthCache(): Promise<void> {
  try {
    const { invalidateAll } = await import("./healthkit/cache");
    await invalidateAll();
  } catch (e) {
    if (__DEV__) console.warn("[accountDeletion] clearHealthCache caught:", e);
    // HealthKit module may not be available on Android
  }
}

async function clearGoogleTokens(): Promise<void> {
  try {
    await googleSignOut();
  } catch (e) {
    if (__DEV__) console.warn("[accountDeletion] clearGoogleTokens caught:", e);
    // Best-effort
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

/**
 * Delete the user's account and all associated data.
 *
 * Order:
 * 1. Cloud Function deletes all Firestore data + Auth account (server-side)
 * 2. Clear local storage, health cache, Google tokens (parallel)
 * 3. Client-side Auth deletion as fallback (in case Cloud Function's Admin SDK
 *    deletion didn't fully propagate to the client session)
 */
export async function deleteAccount(userId: string): Promise<void> {
  // 1. Server-side: delete ALL Firestore data + Auth account via Cloud Function
  if (isFirebaseConfigured) {
    try {
      const result = await callDeleteUserData();

      if (__DEV__) {
        console.log("[accountDeletion] Cloud Function result:", {
          deleted: result.totalDeleted,
          anonymized: result.totalAnonymized,
          errors: result.errors.length,
        });
        if (result.errors.length > 0) {
          console.warn("[accountDeletion] Partial errors:", result.errors);
        }
      }
    } catch (e: any) {
      // If the Cloud Function fails entirely, we still want to clean up
      // what we can locally. Log the error but don't throw yet.
      if (__DEV__) console.error("[accountDeletion] Cloud Function failed:", e);

      // Re-throw if it's not a network error — the user should know their
      // server data may not have been deleted.
      const code = e?.code ?? "";
      if (!code.includes("unavailable") && !code.includes("deadline-exceeded")) {
        throw new Error(
          "Could not delete your account data from our servers. " +
          "Please check your internet connection and try again."
        );
      }
    }
  }

  // 2. Clear local data (parallel — independent operations)
  await Promise.all([clearLocalData(), clearHealthCache(), clearGoogleTokens()]);

  // 3. Fallback: attempt client-side Auth deletion
  //    The Cloud Function already deleted the Auth account via Admin SDK,
  //    but this ensures the client session is invalidated immediately.
  const user = auth.currentUser;
  if (user) {
    try {
      await deleteUser(user);
    } catch (e: any) {
      // auth/user-not-found is expected if Cloud Function already deleted it
      if (e?.code !== "auth/user-not-found") {
        if (__DEV__) console.warn("[accountDeletion] client-side auth delete caught:", e);
      }
    }
  }
}

/**
 * lib/cloudBackup.ts — Automatic cloud backup & restore.
 *
 * How it works:
 *   - A device UUID is stored in the iOS Keychain via expo-secure-store.
 *     The Keychain survives app deletion, so the ID persists across reinstalls.
 *   - All AsyncStorage data is backed up to Firestore under deviceBackups/{deviceId}.
 *   - On startup, if AsyncStorage has no profile (fresh install / deleted app),
 *     we fetch the backup using the Keychain ID and restore everything silently.
 *
 * Trigger points:
 *   - On app backgrounding (catches all saves automatically)
 *   - Explicit triggerBackup() call after workout complete (instant safety net)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth, isFirebaseConfigured } from "./firebase";

// ── Device ID ────────────────────────────────────────────────────────────────

const DEVICE_ID_KEY = "lockedinfit_device_id";

// Large keys get their own Firestore document to avoid the 1MB doc limit.
const LARGE_KEY_BUCKET = "workouts";
const LARGE_KEYS = new Set(["@lockedinfit/workouts"]);

// Cached so we can check "did it exist before this launch" after getDeviceId creates one
let _hadExistingId: boolean | null = null;

/**
 * Returns true if the Keychain already had a device ID before this launch.
 * Call this BEFORE getDeviceId() / attemptRestore() to detect reinstalls vs new installs.
 */
export async function hadExistingDeviceId(): Promise<boolean> {
  if (_hadExistingId !== null) return _hadExistingId;
  try {
    const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    _hadExistingId = !!existing;
  } catch {
    _hadExistingId = false;
  }
  return _hadExistingId;
}

async function getDeviceId(): Promise<string> {
  try {
    let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
      _hadExistingId = false; // confirm it was new
    }
    return id;
  } catch {
    return "simulator-fallback";
  }
}

/**
 * Returns the backup key to use:
 *   - Firebase UID when signed in (follows the account across devices)
 *   - Device ID from Keychain when not signed in (survives reinstall on same device)
 */
async function getBackupKey(): Promise<string | null> {
  const uid = auth.currentUser?.uid;
  if (uid) return `user_${uid}`;
  const deviceId = await getDeviceId();
  if (deviceId === "simulator-fallback") return null;
  return `device_${deviceId}`;
}

// ── Upload ───────────────────────────────────────────────────────────────────

export async function uploadBackup(): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    const backupKey = await getBackupKey();
    if (!backupKey) return;

    const keys = await AsyncStorage.getAllKeys();
    const appKeys = keys.filter((k) => k.startsWith("@lockedinfit/"));
    if (appKeys.length === 0) return;

    const stores = await AsyncStorage.multiGet(appKeys);

    const coreData: Record<string, unknown> = {};
    const largeData: Record<string, unknown> = {};

    for (const [key, value] of stores) {
      if (!value) continue;
      try {
        const parsed = JSON.parse(value);
        if (LARGE_KEYS.has(key)) {
          largeData[key] = parsed;
        } else {
          coreData[key] = parsed;
        }
      } catch {
        coreData[key] = value;
      }
    }

    const base = `backups/${backupKey}`;
    const writes: Promise<void>[] = [
      setDoc(doc(db, base, "core"), { data: coreData, updatedAt: serverTimestamp() }),
    ];
    if (Object.keys(largeData).length > 0) {
      writes.push(
        setDoc(doc(db, base, LARGE_KEY_BUCKET), { data: largeData, updatedAt: serverTimestamp() })
      );
    }

    await Promise.all(writes);
    if (__DEV__) console.log("[cloudBackup] uploaded", appKeys.length, "keys for", backupKey);
  } catch (e) {
    if (__DEV__) console.warn("[cloudBackup] upload failed:", e);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the device already has local app data (not a fresh install). */
export async function hasLocalData(): Promise<boolean> {
  const raw = await AsyncStorage.getItem("@lockedinfit/profile");
  return !!raw;
}

// ── Restore ──────────────────────────────────────────────────────────────────

/**
 * Called during app startup. Restores data from Firestore if AsyncStorage
 * has no profile (fresh install / app was deleted).
 * Returns true if data was restored.
 */
export async function attemptRestore(): Promise<boolean> {
  if (!isFirebaseConfigured) return false;
  try {
    const profileRaw = await AsyncStorage.getItem("@lockedinfit/profile");
    if (profileRaw) return false; // Already have data — nothing to do

    const backupKey = await getBackupKey();
    if (!backupKey) return false;

    const base = `backups/${backupKey}`;
    const [coreSnap, workoutsSnap] = await Promise.all([
      getDoc(doc(db, base, "core")),
      getDoc(doc(db, base, LARGE_KEY_BUCKET)),
    ]);

    if (!coreSnap.exists() && !workoutsSnap.exists()) return false;

    const pairs: [string, string][] = [];

    const addData = (data: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(data)) {
        if (!key.startsWith("@lockedinfit/")) continue;
        pairs.push([key, typeof value === "string" ? value : JSON.stringify(value)]);
      }
    };

    if (coreSnap.exists()) addData(coreSnap.data().data ?? {});
    if (workoutsSnap.exists()) addData(workoutsSnap.data().data ?? {});

    if (pairs.length === 0) return false;

    await AsyncStorage.multiSet(pairs);
    if (__DEV__) console.log("[cloudBackup] restored", pairs.length, "keys");
    return true;
  } catch (e) {
    if (__DEV__) console.warn("[cloudBackup] restore failed:", e);
    return false;
  }
}

// ── Debounced trigger ─────────────────────────────────────────────────────────

let _timer: ReturnType<typeof setTimeout> | null = null;

/** Fire-and-forget backup with a 4-second debounce. Safe to call frequently. */
export function triggerBackup(): void {
  if (_timer) clearTimeout(_timer);
  _timer = setTimeout(() => {
    _timer = null;
    uploadBackup();
  }, 4000);
}

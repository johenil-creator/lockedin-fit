/**
 * lib/dataExportService.ts — GDPR-compliant full data export.
 *
 * Combines cloud data (via exportUserData Cloud Function) with local
 * AsyncStorage data into a single structured JSON file, then opens
 * the system share sheet.
 */

import { Share } from "react-native";
import { httpsCallable } from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { functions, isFirebaseConfigured } from "./firebase";

// ── Types ───────────────────────────────────────────────────────────────────

type CloudExportResult = {
  exportedAt: string;
  userId: string;
  cloudData: Record<string, any>;
  errors?: { section: string; error: string }[];
};

type FullExport = {
  exportedAt: string;
  userId: string | null;
  localData: Record<string, any>;
  cloudData: Record<string, any> | null;
  cloudErrors?: { section: string; error: string }[];
};

// ── Local data export ───────────────────────────────────────────────────────

async function exportLocalData(): Promise<Record<string, any>> {
  const keys = await AsyncStorage.getAllKeys();
  const appKeys = keys.filter((k) => k.startsWith("@lockedinfit/"));
  const stores = await AsyncStorage.multiGet(appKeys);

  const data: Record<string, any> = {};
  for (const [key, value] of stores) {
    try {
      data[key] = value ? JSON.parse(value) : null;
    } catch {
      data[key] = value;
    }
  }
  return data;
}

// ── Cloud data export ───────────────────────────────────────────────────────

async function exportCloudData(): Promise<CloudExportResult> {
  const exportFn = httpsCallable<void, CloudExportResult>(
    functions,
    "exportUserData"
  );
  const result = await exportFn();
  return result.data;
}

// ── Combined export ─────────────────────────────────────────────────────────

/**
 * Export all user data (local + cloud) and return the combined JSON.
 * If the user is not signed in or Firebase is not configured, only
 * local data is returned.
 */
export async function exportAllData(
  userId: string | null
): Promise<FullExport> {
  const [localData, cloudResult] = await Promise.allSettled([
    exportLocalData(),
    userId && isFirebaseConfigured ? exportCloudData() : Promise.resolve(null),
  ]);

  const local =
    localData.status === "fulfilled" ? localData.value : {};
  const cloud =
    cloudResult.status === "fulfilled" ? cloudResult.value : null;

  return {
    exportedAt: new Date().toISOString(),
    userId,
    localData: local,
    cloudData: cloud?.cloudData ?? null,
    cloudErrors: cloud?.errors,
  };
}

// ── Share as file ───────────────────────────────────────────────────────────

/**
 * Export all data and open the system share sheet with the JSON file.
 * Writes to a temp file and shares the file URI on iOS/Android for a
 * proper file attachment in the share sheet.
 */
export async function exportAndShare(userId: string | null): Promise<void> {
  const data = await exportAllData(userId);
  const json = JSON.stringify(data, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `LockedInFIT-export-${dateStr}.json`;

  // Write to a temp file and share as URL (iOS/Android both support this)
  if (FileSystem.cacheDirectory) {
    const fileUri = FileSystem.cacheDirectory + filename;
    await FileSystem.writeAsStringAsync(fileUri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    await Share.share({
      url: fileUri,
      title: "LockedInFIT Data Export",
    });
    return;
  }

  // Fallback: share as text (no file system available)
  await Share.share({
    message: json,
    title: "LockedInFIT Data Export",
  });
}

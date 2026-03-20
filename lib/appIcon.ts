import { NativeModules, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { AppIconModule } = NativeModules;

export type IconMood =
  | "icon_default"
  | "icon_focused"
  | "icon_motivated"
  | "icon_mischievous"
  | "icon_disappointed";

const STORAGE_KEYS = {
  lastMood: "@lockedinfit/lastAppliedIconMood",
  lastChanged: "@lockedinfit/lastIconChangeAt",
} as const;

const THROTTLE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Call the native module to change the app icon.
 * Pass null for default, icon name string for alternates.
 * No-op on Android.
 */
export async function setAppIcon(mood: IconMood): Promise<void> {
  if (Platform.OS !== "ios" || !AppIconModule) return;
  const name = mood === "icon_default" ? null : mood;
  await AppIconModule.setIcon(name);
}

/**
 * Throttled icon change: skips if same mood or changed within 24h.
 * Exception: icon_disappointed gets one streak-break override.
 *
 * NOTE: Disabled pre-release — alternate icon assets must be verified
 * in a production build before enabling. iOS shows an intrusive system
 * alert on every call and falls back to a blank icon if assets are missing.
 */
export async function maybeUpdateIcon(_mood: IconMood): Promise<void> {
  // Disabled until alternate icon assets are confirmed in production build
  return;
  if (Platform.OS !== "ios" || !AppIconModule) return;

  const [lastMood, lastChangedStr] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.lastMood),
    AsyncStorage.getItem(STORAGE_KEYS.lastChanged),
  ]);

  // Same mood — skip
  if (lastMood === mood) return;

  // Throttle: within 24h, only allow icon_disappointed as override
  if (lastChangedStr) {
    const elapsed = Date.now() - parseInt(lastChangedStr, 10);
    if (elapsed < THROTTLE_MS && mood !== "icon_disappointed") return;
  }

  try {
    await setAppIcon(mood);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.lastMood, mood),
      AsyncStorage.setItem(STORAGE_KEYS.lastChanged, String(Date.now())),
    ]);
  } catch (e) {
    if (__DEV__) console.warn("[appIcon] caught:", e);
    // Swallow — icon change is non-critical
  }
}

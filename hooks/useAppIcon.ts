import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import {
  setAlternateAppIcon,
  resetAppIcon,
  getAppIconName,
} from "expo-alternate-app-icons";

type IconName =
  | "icon_disappointed"
  | "icon_focused"
  | "icon_mischievous"
  | "icon_motivated";

/**
 * Picks the right app icon based on streak & activity, Duolingo-style.
 *
 * - 3+ days inactive  → disappointed (Locke is let down)
 * - streak ≥ 14       → motivated (Locke is fired up)
 * - streak ≥ 3        → focused (Locke is locked in)
 * - streak ≥ 1        → mischievous (Locke is playful)
 * - default           → reset to default icon
 */
function resolveIcon(
  streak: number,
  daysSinceActivity: number,
): IconName | null {
  if (daysSinceActivity >= 3 && daysSinceActivity !== Infinity)
    return "icon_disappointed";
  if (streak >= 14) return "icon_motivated";
  if (streak >= 3) return "icon_focused";
  if (streak >= 1) return "icon_mischievous";
  return null; // use default
}

export function useAppIcon(streak: number, daysSinceActivity: number) {
  const lastIcon = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    const target = resolveIcon(streak, daysSinceActivity);
    const current = getAppIconName();

    // Don't swap if already showing the right icon
    if (target === current || (target === null && current === null)) return;
    // Avoid re-triggering the system alert for same icon
    if (lastIcon.current === (target ?? "DEFAULT")) return;

    lastIcon.current = target ?? "DEFAULT";

    if (target === null) {
      resetAppIcon();
    } else {
      setAlternateAppIcon(target);
    }
  }, [streak, daysSinceActivity]);
}

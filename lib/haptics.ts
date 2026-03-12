/**
 * Centralized haptics wrapper that respects the user's hapticsEnabled preference.
 * All haptic feedback in the app should go through these functions.
 *
 * Call setHapticsEnabled() from ProfileContext once the profile loads.
 */
import * as Haptics from "expo-haptics";

let enabled = true;

/** Called by ProfileContext when profile loads or changes. */
export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light): void {
  if (enabled) Haptics.impactAsync(style);
}

export function notification(type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success): void {
  if (enabled) Haptics.notificationAsync(type);
}

export function selection(): void {
  if (enabled) Haptics.selectionAsync();
}

// Re-export enums for convenience
export const ImpactStyle = Haptics.ImpactFeedbackStyle;
export const NotificationType = Haptics.NotificationFeedbackType;

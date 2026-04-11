/**
 * lib/sounds.ts — Audio alerts via local notifications.
 *
 * Uses expo-notifications to play the default system sound.
 * Works without a native rebuild and plays even when the phone
 * is locked or the user is on another screen.
 */

import * as Notifications from "expo-notifications";

const REST_COMPLETE_ID = "rest-timer-complete";

/**
 * Fire an immediate local notification with sound when the rest timer ends.
 * The system notification sound plays even in silent mode on most devices.
 */
export async function playRestComplete(): Promise<void> {
  try {
    // Cancel any previous rest-complete notification to avoid stacking
    await Notifications.dismissNotificationAsync(REST_COMPLETE_ID).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: REST_COMPLETE_ID,
      content: {
        title: "Rest Over",
        body: "Time to hunt. Next set is ready.",
        sound: "default",
      },
      trigger: null, // Fires immediately
    });
  } catch {
    // Swallow — audio alert is non-critical
  }
}

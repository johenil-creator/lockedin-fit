import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// ── Configure notification handler ────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Permission ────────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ── Schedule workout reminder ─────────────────────────────────────────────────

const REMINDER_ID = "workout-reminder";
const STREAK_RISK_ID = "streak-risk";

/**
 * Schedule a daily workout reminder at the given hour.
 * Replaces any previous reminder.
 */
export async function scheduleWorkoutReminder(hour: number, minute: number = 0): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: "Time to train",
      body: "Your workout is waiting. Lock in.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/**
 * Schedule a "streak at risk" notification at 8pm daily.
 * Should be cancelled if the user completes a workout today.
 */
export async function scheduleStreakRiskReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(STREAK_RISK_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_RISK_ID,
    content: {
      title: "Streak at risk",
      body: "No workout logged today. Don't break your streak.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
}

/** Cancel the streak-at-risk notification (call after completing a session). */
export async function cancelStreakRiskReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(STREAK_RISK_ID).catch(() => {});
}

/** Cancel all scheduled notifications. */
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

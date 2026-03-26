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

// ── Notification IDs ──────────────────────────────────────────────────────────

const REMINDER_ID = "workout-reminder";
const STREAK_RISK_ID = "streak-risk";
const INACTIVITY_NUDGE_ID = "inactivity-nudge";

// ── Locke-themed message pools ────────────────────────────────────────────────

const WORKOUT_REMINDER_TITLES = [
  "Time to hunt.",
  "The pack is rallying.",
  "Today's your day.",
  "Lock in.",
  "Ready to level up?",
  "The hunt begins.",
  "Let's build something.",
];

const WORKOUT_REMINDER_BODIES = [
  "A session today keeps the momentum going.",
  "The pack trains today. You in?",
  "Another day, another chance to level up.",
  "Your next PR could be waiting. Let's go.",
  "One session closer to the top.",
  "Consistency is your superpower. Keep it rolling.",
  "Show up and surprise yourself.",
];

const STREAK_RISK_TITLES = [
  "Keep the streak alive!",
  "Still time today",
  "Locke believes in you.",
  "Your streak is going strong",
  "One more day to add",
];

const STREAK_RISK_BODIES = [
  "A quick session today keeps the streak rolling.",
  "You've built something great. Keep it going!",
  "One session. That's all it takes.",
  "The pack keeps moving forward. Join the hunt.",
  "Your streak is worth protecting. You've got this.",
];

const INACTIVITY_NUDGE_TITLES = [
  "Ready to get back in it?",
  "The pack is here for you.",
  "Fresh start waiting.",
  "Your next session is calling.",
  "Locke is ready when you are.",
];

const INACTIVITY_NUDGE_BODIES = [
  "Whenever you're ready, the pack is here.",
  "A fresh session could feel great right now.",
  "Your strength is still there. Come tap into it.",
  "Even one session can reignite the momentum.",
  "The wolf inside you is ready to hunt again.",
];

/** Pick a random element from an array. */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Schedule workout reminder ─────────────────────────────────────────────────

/**
 * Schedule a daily workout reminder at the given hour.
 * Replaces any previous reminder. Uses rotating Locke-themed messages.
 */
export async function scheduleWorkoutReminder(hour: number, minute: number = 0): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: pickRandom(WORKOUT_REMINDER_TITLES),
      body: pickRandom(WORKOUT_REMINDER_BODIES),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

// ── Streak risk reminder ──────────────────────────────────────────────────────

/**
 * Schedule a "streak at risk" notification at 8pm TODAY (one-time).
 * Should be cancelled if the user completes a workout today.
 * Re-schedule each day on app focus via scheduleStreakRiskIfNeeded().
 * Uses rotating Locke-themed messages.
 */
export async function scheduleStreakRiskReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(STREAK_RISK_ID).catch(() => {});

  // Build a one-time trigger for today at 8pm
  const now = new Date();
  const target = new Date(now);
  target.setHours(20, 0, 0, 0);

  // If it's already past 8pm today, don't schedule
  if (target.getTime() <= now.getTime()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_RISK_ID,
    content: {
      title: pickRandom(STREAK_RISK_TITLES),
      body: pickRandom(STREAK_RISK_BODIES),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: target,
    },
  });
}

/**
 * Schedule streak-risk reminder only if the user hasn't worked out today.
 * Call on app focus / home screen mount.
 */
export async function scheduleStreakRiskIfNeeded(
  hasWorkedOutToday: boolean,
): Promise<void> {
  if (hasWorkedOutToday) {
    await cancelStreakRiskReminder();
  } else {
    await scheduleStreakRiskReminder();
  }
}

/** Cancel the streak-at-risk notification (call after completing a session). */
export async function cancelStreakRiskReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(STREAK_RISK_ID).catch(() => {});
}

// ── Inactivity nudge ──────────────────────────────────────────────────────────

/**
 * Schedule a weekly inactivity nudge at 10am.
 * Fires every 7 days to re-engage users who haven't worked out in 3+ days.
 * Uses rotating Locke-themed messages.
 */
export async function scheduleInactivityNudge(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(INACTIVITY_NUDGE_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: INACTIVITY_NUDGE_ID,
    content: {
      title: pickRandom(INACTIVITY_NUDGE_TITLES),
      body: pickRandom(INACTIVITY_NUDGE_BODIES),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 4, // Wednesday — mid-week nudge
      hour: 10,
      minute: 0,
    },
  });
}

/** Cancel the inactivity nudge notification. */
export async function cancelInactivityNudge(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(INACTIVITY_NUDGE_ID).catch(() => {});
}

// ── Cancel all ────────────────────────────────────────────────────────────────

/** Cancel all scheduled notifications. */
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

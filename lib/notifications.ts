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
  "Locke is watching.",
  "Time to hunt.",
  "No excuses today.",
  "The pack awaits.",
  "Rise and grind.",
  "Lock in.",
  "Prove yourself today.",
];

const WORKOUT_REMINDER_BODIES = [
  "Your workout is waiting. Lock in.",
  "The pack trains today. You in?",
  "Another day, another chance to level up.",
  "Weights don't lift themselves. Let's go.",
  "One session closer to the top.",
  "Locke doesn't skip days. Neither should you.",
  "Show up. That's step one.",
];

const STREAK_RISK_TITLES = [
  "Streak in danger",
  "Don't break the chain",
  "Locke is disappointed.",
  "Your streak is fading",
  "Warning from the pack",
];

const STREAK_RISK_BODIES = [
  "No workout logged today. Don't break your streak.",
  "You've come too far to stop now.",
  "One session. That's all it takes.",
  "The pack doesn't quit. Neither do you.",
  "Your streak is on the line. Lock in.",
];

const INACTIVITY_NUDGE_TITLES = [
  "It's been a while...",
  "Locke misses you.",
  "Come back to the pack.",
  "Where did you go?",
  "The den is empty without you.",
];

const INACTIVITY_NUDGE_BODIES = [
  "It's been a while... Locke misses you.",
  "Come back. The pack needs you.",
  "Your gains are waiting. Don't let them fade.",
  "Even one session makes a difference. Come back.",
  "The wolf inside you is still hungry. Feed it.",
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
 * Schedule a "streak at risk" notification at 8pm daily.
 * Should be cancelled if the user completes a workout today.
 * Uses rotating Locke-themed messages.
 */
export async function scheduleStreakRiskReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(STREAK_RISK_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_RISK_ID,
    content: {
      title: pickRandom(STREAK_RISK_TITLES),
      body: pickRandom(STREAK_RISK_BODIES),
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

import { Alert } from "react-native";
import { hasBeenPromptedForNotifications, markNotificationPrompted } from "./storage";
import {
  requestNotificationPermission,
  scheduleWorkoutReminder,
  scheduleStreakRiskReminder,
  scheduleInactivityNudge,
} from "./notifications";

type PromptContext = "workout" | "pack";

const PROMPT_COPY: Record<PromptContext, { title: string; message: string }> = {
  workout: {
    title: "Stay on Track?",
    message:
      "Locke can send you friendly reminders to keep the momentum going. Enable notifications?",
  },
  pack: {
    title: "Pack Alerts",
    message:
      "Get notified about pack challenges, wars, and wins. Enable notifications?",
  },
};

/**
 * Show a contextual notification permission prompt if the user hasn't been
 * asked before. On grant, schedules default reminders (daily at 9am,
 * streak risk at 8pm, weekly inactivity nudge).
 *
 * Call this fire-and-forget — it silently no-ops if already prompted.
 */
export async function maybePromptNotifications(context: PromptContext): Promise<void> {
  const alreadyPrompted = await hasBeenPromptedForNotifications();
  if (alreadyPrompted) return;

  await markNotificationPrompted();

  const { title, message } = PROMPT_COPY[context];

  return new Promise<void>((resolve) => {
    Alert.alert(title, message, [
      { text: "Not Now", style: "cancel", onPress: () => resolve() },
      {
        text: "Enable",
        onPress: async () => {
          const granted = await requestNotificationPermission();
          if (granted) {
            scheduleWorkoutReminder(9, 0).catch(() => {});
            scheduleStreakRiskReminder().catch(() => {});
            scheduleInactivityNudge().catch(() => {});
          }
          resolve();
        },
      },
    ]);
  });
}

import * as Haptics from "expo-haptics";

/** Quick tick for completing a set */
export function hapticSetComplete(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/** Double-tap celebration for workout complete */
export async function hapticWorkoutComplete(): Promise<void> {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  await delay(100);
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  await delay(100);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Triple crescendo for rank up */
export async function hapticRankUp(): Promise<void> {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  await delay(120);
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  await delay(120);
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  await delay(150);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Quick success buzz for PR detection */
export function hapticPR(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Warning buzz for streak at risk */
export function hapticStreakRisk(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/** Soft tick for badge unlock */
export async function hapticBadgeUnlock(): Promise<void> {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  await delay(80);
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/** Light tap for UI interactions */
export function hapticTap(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

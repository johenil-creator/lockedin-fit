import { impact, notification, ImpactStyle, NotificationType } from "./haptics";

/** Quick tick for completing a set */
export function hapticSetComplete(): void {
  impact(ImpactStyle.Medium);
}

/** Double-tap celebration for workout complete */
export async function hapticWorkoutComplete(): Promise<void> {
  impact(ImpactStyle.Heavy);
  await delay(100);
  impact(ImpactStyle.Heavy);
  await delay(100);
  notification(NotificationType.Success);
}

/** Triple crescendo for rank up */
export async function hapticRankUp(): Promise<void> {
  impact(ImpactStyle.Light);
  await delay(120);
  impact(ImpactStyle.Medium);
  await delay(120);
  impact(ImpactStyle.Heavy);
  await delay(150);
  notification(NotificationType.Success);
}

/** Quick success buzz for PR detection */
export function hapticPR(): void {
  notification(NotificationType.Success);
}

/** Warning buzz for streak at risk */
export function hapticStreakRisk(): void {
  notification(NotificationType.Warning);
}

/** Soft tick for badge unlock */
export async function hapticBadgeUnlock(): Promise<void> {
  impact(ImpactStyle.Light);
  await delay(80);
  impact(ImpactStyle.Medium);
}

/** Light tap for UI interactions */
export function hapticTap(): void {
  impact(ImpactStyle.Light);
}

/** Success ding for receiving fangs */
export async function hapticFangReceived(): Promise<void> {
  impact(ImpactStyle.Light);
  await delay(100);
  notification(NotificationType.Success);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

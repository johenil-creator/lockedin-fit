/**
 * Dev Date Override
 *
 * Allows time-travelling the meal system for testing week transitions,
 * expiry logic, etc. Only active in __DEV__ mode.
 *
 * Usage: import { getDevNow } from "./devDateOverride" and use instead of new Date().
 */

let _offsetDays = 0;

/** Get the current (possibly overridden) date. */
export function getDevNow(): Date {
  if (!__DEV__ || _offsetDays === 0) return new Date();
  const d = new Date();
  d.setDate(d.getDate() + _offsetDays);
  return d;
}

/** Shift the simulated date by N days (positive = future, negative = past). */
export function shiftDevDate(days: number): void {
  _offsetDays += days;
}

/** Reset to real date. */
export function resetDevDate(): void {
  _offsetDays = 0;
}

/** Get the current offset in days. */
export function getDevOffset(): number {
  return _offsetDays;
}

/**
 * Shared utilities for pack service modules.
 */

/**
 * Returns an ISO 8601 week key for the current week, e.g. "2026-W12".
 * ISO weeks start on Monday and Week 1 contains the first Thursday of the year.
 */
export function currentWeekKey(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  // Adjust to nearest Thursday: current date + 4 - day number (Mon=1 … Sun=7)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

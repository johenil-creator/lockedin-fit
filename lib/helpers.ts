/** Format a date string as MM/DD/YY. Handles both YYYY-MM-DD and full ISO timestamps. */
export function fmtDate(iso: string): string {
  // For date-only strings (YYYY-MM-DD), append noon to avoid UTC midnight timezone shift
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + "T12:00:00" : iso;
  const d = new Date(safe);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
}

/** Generate a unique ID from timestamp + random suffix. */
export function makeId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 6);
}

/**
 * Check if a plan day was completed today (same calendar date).
 * @param completedDays - Record<"week|day", ISO timestamp>
 */
export function wasCompletedToday(
  completedDays: Record<string, string>,
  week: string,
  day: string
): boolean {
  const iso = completedDays[`${week}|${day}`];
  if (!iso) return false;
  const completed = new Date(iso);
  const now = new Date();
  return (
    completed.getFullYear() === now.getFullYear() &&
    completed.getMonth() === now.getMonth() &&
    completed.getDate() === now.getDate()
  );
}

import type { WorkoutSession, CardioPRs, CardioPRKey } from "./types";

// ── PR name formatting ─────────────────────────────────────────────────────────

const PR_NAMES: Record<CardioPRKey, string> = {
  longestSteady:         "Longest Steady Session",
  longestZone2:          "Longest Zone 2 Session",
  longestDistance:       "Longest Distance",
  fastest1mi:            "Fastest Mile",
  fastest1km:            "Fastest Kilometer",
  fastest5km:            "Fastest 5K",
  mostIntervals:         "Most Intervals",
  longestIntervalSession:"Longest Interval Session",
};

/** Return a human-readable label for a CardioPRKey. */
export function formatPRName(key: CardioPRKey): string {
  return PR_NAMES[key] ?? key;
}

// ── PR detection ──────────────────────────────────────────────────────────────

export type NewPR = {
  key: CardioPRKey;
  previous: number | null;
  current: number;
};

export type DetectPRResult = {
  newPRs: NewPR[];
  updatedRecord: CardioPRs;
};

/**
 * Check a completed cardio session against the existing PR record.
 * Returns any new PRs found and the updated record.
 * Pure — does not mutate inputs, does not access storage.
 *
 * PR types checked:
 *   longestSteady          — non-interval session, active minutes
 *   longestZone2           — non-interval + RPE ≤ 6, active minutes
 *   longestDistance        — cardioDistanceKm
 *   fastest1mi             — seconds per mile (lower = faster)
 *   fastest1km             — seconds per km (lower = faster)
 *   fastest5km             — projected 5 km time in seconds (lower = faster)
 *   mostIntervals          — rounds completed in an interval session
 *   longestIntervalSession — interval session, active minutes
 */
export function detectCardioPRs(
  session: WorkoutSession,
  record: CardioPRs
): DetectPRResult {
  if (session.sessionType !== "cardio") {
    return { newPRs: [], updatedRecord: record };
  }

  const newPRs: NewPR[] = [];
  const updated: CardioPRs = { ...record };

  const activeMinutes = Math.floor((session.cardioDurationMs ?? 0) / 60000);
  const distanceKm = session.cardioDistanceKm ?? 0;
  const rpe = session.cardioIntensity ?? 6;
  const rounds = session.cardioIntervalsCompleted ?? 0;
  const isIntervals = session.cardioGoalType === "intervals";
  const now = new Date().toISOString();

  // Helper: check a "higher is better" PR
  function checkHigher(key: CardioPRKey, value: number): void {
    if (value <= 0) return;
    const existing = record[key]?.value ?? null;
    if (existing === null || value > existing) {
      newPRs.push({ key, previous: existing, current: value });
      updated[key] = { value, date: now };
      if (__DEV__) {
        console.log(`[prService] NEW PR ${key}: ${existing ?? "none"} → ${value}`);
      }
    }
  }

  // Helper: check a "lower is better" PR (e.g. pace / time)
  function checkLower(key: CardioPRKey, value: number): void {
    if (value <= 0) return;
    const existing = record[key]?.value ?? null;
    if (existing === null || value < existing) {
      newPRs.push({ key, previous: existing, current: value });
      updated[key] = { value, date: now };
      if (__DEV__) {
        console.log(`[prService] NEW PR ${key}: ${existing ?? "none"} → ${value}`);
      }
    }
  }

  // ── Steady PRs ─────────────────────────────────────────────────────────────
  if (!isIntervals && activeMinutes > 0) {
    checkHigher("longestSteady", activeMinutes);
    if (rpe <= 6) {
      checkHigher("longestZone2", activeMinutes);
    }
  }

  // ── Distance PR ────────────────────────────────────────────────────────────
  if (distanceKm > 0) {
    checkHigher("longestDistance", distanceKm);
  }

  // ── Pace PRs (derived from distance + duration) ────────────────────────────
  const durationSec = (session.cardioDurationMs ?? 0) / 1000;
  if (distanceKm > 0 && durationSec > 0) {
    const pace1km = durationSec / distanceKm;          // sec per km
    const pace1mi = pace1km * 1.60934;                 // sec per mile

    checkLower("fastest1km", Math.round(pace1km));
    checkLower("fastest1mi", Math.round(pace1mi));

    // Projected 5 km time — only meaningful when distance ≥ 1 km
    if (distanceKm >= 1) {
      const proj5km = Math.round(pace1km * 5);
      checkLower("fastest5km", proj5km);
    }
  }

  // ── Interval PRs ───────────────────────────────────────────────────────────
  if (isIntervals) {
    if (rounds > 0) {
      checkHigher("mostIntervals", rounds);
    }
    if (activeMinutes > 0) {
      checkHigher("longestIntervalSession", activeMinutes);
    }
  }

  return { newPRs, updatedRecord: updated };
}

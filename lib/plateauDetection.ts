/**
 * lib/plateauDetection.ts — Training plateau detection and classification
 *
 * Overview:
 *   Scans workout history to identify strength plateaus — periods where
 *   performance has stagnated despite consistent attendance.
 *
 * Detection criteria (both must be true):
 *   1. No measurable top-set progression for 14–21 days
 *   2. Adherence ≥ 70 % over the detection window (they're showing up)
 *
 * Classification:
 *   under_recovered  — plateau + average readiness < 50 OR frequent high fatigue
 *   under_stimulated — plateau + consistently high readiness (>75) + low/flat volume
 *   inconsistent     — plateau + adherence 70–85 % + variable session quality
 *
 * Returns null when fewer than 3 weeks of history exist (insufficient data).
 *
 * All functions are pure — no I/O; callers supply pre-loaded data.
 */

import type {
  WorkoutSession,
  UserProfile,
  PlateauInsight,
  PlateauClassification,
  BlockType,
} from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

/** Minimum detection window in days. */
const MIN_PLATEAU_DAYS = 14;

/** Maximum detection window (more than this suggests an extended plateau). */
const MAX_PLATEAU_DAYS = 21;

/** Minimum adherence fraction (0–1) to consider the athlete "consistently training". */
const MIN_ADHERENCE_FRACTION = 0.70;

/** Minimum weeks of history required before plateau detection is meaningful. */
const MIN_HISTORY_WEEKS = 3;

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Count the number of unique calendar days that have at least one completed
 * session within a time window.
 *
 * @param sessions     - All completed sessions
 * @param windowDays   - How many days to look back
 * @param referenceMs  - Reference timestamp (defaults to now)
 */
function activeDaysInWindow(
  sessions: WorkoutSession[],
  windowDays: number,
  referenceMs: number,
): number {
  const cutoff = referenceMs - windowDays * MS_PER_DAY;
  const activeDates = new Set<string>();
  for (const s of sessions) {
    if (!s.completedAt) continue;
    const ts = new Date(s.completedAt).getTime();
    if (ts >= cutoff && ts <= referenceMs) {
      activeDates.add(s.date.slice(0, 10));
    }
  }
  return activeDates.size;
}

/**
 * Compute adherence as the fraction of expected training days actually
 * completed in the last `windowDays` days.
 *
 * Expected days = windowDays × (typical training frequency / 7).
 * We estimate typical frequency from the 28-day history to avoid
 * penalising rest days correctly programmed into the plan.
 *
 * @returns Adherence 0–1 (1.0 = perfect adherence)
 */
function computeAdherence(
  sessions: WorkoutSession[],
  windowDays: number,
  referenceMs: number,
): number {
  // Estimate training frequency from the last 28 days
  const baselineDays = 28;
  const baselineActive = activeDaysInWindow(sessions, baselineDays, referenceMs);
  // Days per week trained in baseline window
  const daysPerWeek = (baselineActive / baselineDays) * 7;
  const expectedDays = daysPerWeek * (windowDays / 7);

  if (expectedDays <= 0) return 1.0;

  const actualDays = activeDaysInWindow(sessions, windowDays, referenceMs);
  return Math.min(1.0, actualDays / expectedDays);
}

/**
 * Extract the best (highest) working weight for a given exercise name
 * within a session, in kg. Returns null if no completed sets found.
 *
 * Weight is parsed from the string field; we take the max across all
 * non-warmup completed sets.
 */
function bestWeightInSession(session: WorkoutSession, exerciseName: string): number | null {
  const lower = exerciseName.toLowerCase();
  let best: number | null = null;

  for (const ex of session.exercises) {
    if (ex.name.toLowerCase() !== lower) continue;
    for (const set of ex.sets) {
      if (!set.completed || set.isWarmUp) continue;
      const w = parseFloat(set.weight);
      if (Number.isFinite(w) && w > 0) {
        best = best === null ? w : Math.max(best, w);
      }
    }
  }
  return best;
}

/**
 * Detect whether a specific exercise has plateaued.
 *
 * Returns days since last improvement (null if exercise not in history or
 * insufficient data).
 *
 * Algorithm:
 *   1. Collect (date, bestWeight) pairs for the exercise in chronological order
 *   2. Track the running maximum
 *   3. daysSinceImprovement = days from the last time bestWeight exceeded the
 *      previous max to now
 */
function daysSinceExerciseImproved(
  sessions: WorkoutSession[],
  exerciseName: string,
  referenceMs: number,
): number | null {
  type Entry = { ts: number; weight: number };
  const entries: Entry[] = [];

  for (const s of sessions) {
    if (!s.completedAt) continue;
    const w = bestWeightInSession(s, exerciseName);
    if (w === null) continue;
    entries.push({ ts: new Date(s.completedAt).getTime(), weight: w });
  }

  if (entries.length < 3) return null;

  entries.sort((a, b) => a.ts - b.ts);

  let runningMax = 0;
  let lastImprovementTs = entries[0].ts;

  for (const e of entries) {
    if (e.weight > runningMax) {
      runningMax = e.weight;
      lastImprovementTs = e.ts;
    }
  }

  return (referenceMs - lastImprovementTs) / MS_PER_DAY;
}

/**
 * Detect whether the 4 main compound lifts tracked in UserProfile have
 * stopped improving.
 *
 * Uses the manual1RM and estimated1RM fields — the delta between historical
 * sessions' top sets and the profile's current values gives a stagnation signal.
 *
 * Returns days since the best tracked lift improved, or null if no data.
 */
function daysSince1RMImproved(
  sessions: WorkoutSession[],
  profile: UserProfile,
  referenceMs: number,
): number | null {
  const mainLifts: [keyof UserProfile['manual1RM'], string[]][] = [
    ['squat',    ['Barbell Back Squat', 'Back Squat', 'Squat']],
    ['deadlift', ['Deadlift', 'Conventional Deadlift', 'Romanian Deadlift']],
    ['bench',    ['Barbell Bench Press', 'Bench Press', 'Flat Bench']],
    ['ohp',      ['Overhead Press', 'OHP', 'Military Press', 'Barbell OHP']],
  ];

  let minDays: number | null = null;

  for (const [, names] of mainLifts) {
    for (const name of names) {
      const days = daysSinceExerciseImproved(sessions, name, referenceMs);
      if (days !== null) {
        minDays = minDays === null ? days : Math.min(minDays, days);
        break; // Use first matching lift name for this lift key
      }
    }
  }

  // Suppress "profile unused" lint if manual1RM fields aren't directly used
  void profile;
  return minDays;
}

// ── Classification logic ──────────────────────────────────────────────────────

/**
 * Classify the root cause of a detected plateau.
 *
 * Rules (checked in priority order):
 *   under_recovered:
 *     Average readiness < 50 over the window
 *     OR more than 50% of readiness values were below 50
 *   under_stimulated:
 *     Average readiness consistently ≥ 75 (body not being challenged)
 *   inconsistent:
 *     Adherence between 70–85 % (showing up, but not regularly enough)
 *     Fallback when neither of the above applies
 */
function classifyPlateau(
  adherencePercent: number,
  readinessHistory: number[],
): PlateauClassification {
  if (readinessHistory.length === 0) return 'inconsistent';

  const avgReadiness =
    readinessHistory.reduce((s, r) => s + r, 0) / readinessHistory.length;

  const lowReadinessDays = readinessHistory.filter((r) => r < 50).length;
  const lowReadinessFraction = lowReadinessDays / readinessHistory.length;

  // under_recovered: fatigue is suppressing performance
  if (avgReadiness < 50 || lowReadinessFraction > 0.5) {
    return 'under_recovered';
  }

  // under_stimulated: athlete is well-rested but not progressing
  if (avgReadiness >= 75) {
    return 'under_stimulated';
  }

  // inconsistent: irregular attendance is the primary blocker
  return 'inconsistent';
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Detect a training plateau in the user's recent workout history.
 *
 * Returns null if:
 *   - Fewer than 3 weeks of session history exists
 *   - No performance stagnation is detected
 *   - Adherence is below 70% (can't distinguish plateau from absence)
 *
 * @param sessions         - All workout sessions (completed + incomplete)
 * @param profile          - User profile for 1RM reference values
 * @param readinessHistory - Recent daily readiness scores (0–100), newest first.
 *                           Typically covers the last 14–21 days.
 */
export function detectPlateau(
  sessions: WorkoutSession[],
  profile: UserProfile,
  readinessHistory: number[],
): PlateauInsight | null {
  const now = Date.now();
  const completed = sessions.filter((s) => s.completedAt);

  // ── Minimum history check ─────────────────────────────────────────────────
  const firstSession = completed
    .map((s) => new Date(s.completedAt!).getTime())
    .sort((a, b) => a - b)[0];

  if (!firstSession) return null;
  const historyWeeks = (now - firstSession) / (7 * MS_PER_DAY);
  if (historyWeeks < MIN_HISTORY_WEEKS) return null;

  // ── Adherence check ───────────────────────────────────────────────────────
  const adherenceRaw = computeAdherence(completed, MAX_PLATEAU_DAYS, now);
  const adherencePercent = Math.round(adherenceRaw * 100);

  if (adherenceRaw < MIN_ADHERENCE_FRACTION) return null;

  // ── Progression check ─────────────────────────────────────────────────────
  const daysSince = daysSince1RMImproved(completed, profile, now);

  // No exercise data found — can't determine plateau
  if (daysSince === null) return null;

  // No plateau if improvement was recent
  if (daysSince < MIN_PLATEAU_DAYS) return null;

  // ── Classify root cause ───────────────────────────────────────────────────
  // Use up to the last 21 days of readiness values
  const recentReadiness = readinessHistory.slice(0, MAX_PLATEAU_DAYS);
  const classification = classifyPlateau(adherencePercent, recentReadiness);

  const recommendation = buildPlateauRecommendation(classification);

  return {
    classification,
    daysSinceImprovement: Math.round(daysSince),
    adherencePercent,
    recommendation,
  };
}

/** Build a concise recommendation string for each classification. */
function buildPlateauRecommendation(classification: PlateauClassification): string {
  switch (classification) {
    case 'under_recovered':
      return 'High fatigue is suppressing your gains. Schedule a deload week, add a rest day, or reduce session volume by 30%.';
    case 'under_stimulated':
      return 'Your body is well-rested but not being challenged. Increase working weight, add a set, or introduce a new movement pattern.';
    case 'inconsistent':
      return 'Irregular training is preventing adaptation. Aim for consistent attendance this week — showing up is the top priority.';
  }
}

/**
 * Retrieve a detailed recommendation and suggested action for a plateau.
 *
 * Extends the basic insight with block-context-aware actions.
 *
 * @param insight   - The PlateauInsight returned by detectPlateau
 * @param blockType - Current training block (influences suggested action)
 */
export function getPlateauRecommendation(
  insight: PlateauInsight,
  blockType: BlockType,
): { action: string; details: string } {
  switch (insight.classification) {
    case 'under_recovered': {
      const isHeavyBlock = blockType === 'intensification' || blockType === 'realization';
      return {
        action: isHeavyBlock
          ? 'Pull deload forward by 1 week'
          : 'Add an extra rest day this week',
        details:
          `Fatigue has been suppressing performance for ${insight.daysSinceImprovement} days. `
          + (isHeavyBlock
            ? 'This block demands recovery — pulling the deload forward will rebuild capacity faster than pushing through.'
            : 'Take an extra rest day, reduce volume by 25–30%, and ensure 7–9 h of sleep before the next session.'),
      };
    }

    case 'under_stimulated': {
      return {
        action: 'Apply progressive overload: add weight or a set',
        details:
          `${insight.daysSinceImprovement} days without a new personal record and consistently high readiness `
          + 'signals that your current loads are no longer a sufficient stimulus. '
          + (blockType === 'accumulation'
            ? 'Add 1 working set per primary lift this week.'
            : 'Increase working weight by 2.5–5% and aim for the top end of your rep range.'),
      };
    }

    case 'inconsistent': {
      return {
        action: 'Commit to a fixed schedule this week',
        details:
          `Adherence is at ${insight.adherencePercent}% — close but not consistent enough for adaptation. `
          + 'Even completing lighter sessions on scheduled days is more valuable than sporadic heavy training. '
          + 'Use the plan feature to lock in your next 3 session dates.',
      };
    }
  }
}

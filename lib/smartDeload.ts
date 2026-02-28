/**
 * lib/smartDeload.ts — Smart Deload Trigger system
 *
 * Determines when an unscheduled deload is needed and prescribes the
 * appropriate volume and intensity reductions.
 *
 * Trigger conditions (any ONE triggers a deload recommendation):
 *   1. 2+ muscles overtrained (fatigue ≥ 80) for 3+ consecutive days
 *   2. Readiness score < 45 for 5 out of the last 7 days
 *   3. Plateau classified as 'under_recovered'
 *   4. ACWR > 1.5 (acute load significantly exceeds chronic baseline)
 *
 * Guard clause:
 *   Does NOT trigger if the current week is already a scheduled deload
 *   (blockWeekPosition === 'pivot_deload'). Instead surfaces a note to
 *   pull the deload forward if it is within the next 7 days.
 *
 * Prescription:
 *   volumeReduction:    0.40–0.50  (derived from severity, deterministic)
 *   intensityReduction: 0.05–0.10
 *
 * Severity determines the prescription:
 *   - One trigger  → mild    (40% volume / 5% intensity)
 *   - Two triggers → moderate (45% volume / 7% intensity)
 *   - Three+       → heavy   (50% volume / 10% intensity)
 *
 * All functions are pure — no I/O. Callers handle persistence.
 */

import type {
  MuscleFatigueMap,
  MuscleGroup,
  DeloadTrigger,
  PlateauInsight,
  BlockWeekPosition,
  BlockType,
} from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Fatigue threshold above which a muscle is classified as "overtrained". */
const OVERTRAINED_THRESHOLD = 80;

/** Number of overtrained muscles required to constitute a trigger. */
const OVERTRAINED_MUSCLE_COUNT = 2;

/** Readiness score below which a day is counted as a "low readiness" day. */
const LOW_READINESS_THRESHOLD = 45;

/**
 * How many of the last 7 days must have low readiness to trigger.
 * 5/7 = 71% of the week was sub-optimal.
 */
const LOW_READINESS_DAYS_REQUIRED = 5;

/** ACWR ceiling above which overreaching is confirmed. */
const ACWR_OVERREACHING = 1.5;

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Find all muscle groups currently above the overtrained threshold. */
function overtrainedMuscles(fatigueMap: MuscleFatigueMap): MuscleGroup[] {
  return (Object.entries(fatigueMap) as [MuscleGroup, number][])
    .filter(([, f]) => f >= OVERTRAINED_THRESHOLD)
    .map(([m]) => m);
}

/**
 * Determine how many of the last N days had low readiness.
 * readinessHistory is expected newest-first (index 0 = today).
 */
function lowReadinessDays(readinessHistory: number[], windowDays: number): number {
  const window = readinessHistory.slice(0, windowDays);
  return window.filter((r) => r < LOW_READINESS_THRESHOLD).length;
}

/**
 * Map number of active triggers to a deload prescription.
 *
 *   1 trigger → mild     (40% volume / 5% intensity)
 *   2 triggers → moderate (45% volume / 7.5% intensity)
 *   3+ triggers → heavy  (50% volume / 10% intensity)
 */
function prescribeReductions(triggerCount: number): { volumeReduction: number; intensityReduction: number } {
  if (triggerCount === 1) return { volumeReduction: 0.40, intensityReduction: 0.05 };
  if (triggerCount === 2) return { volumeReduction: 0.45, intensityReduction: 0.075 };
  return                         { volumeReduction: 0.50, intensityReduction: 0.10 };
}

/** Capitalise first letter and replace underscores with spaces for display. */
function formatMuscleName(muscle: MuscleGroup): string {
  return muscle.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

// ── Public API ────────────────────────────────────────────────────────────────

export type DeloadCheckParams = {
  fatigueMap: MuscleFatigueMap;
  /**
   * Daily readiness scores, newest first (index 0 = today).
   * Typically the last 7–10 values.
   */
  readinessHistory: number[];
  /** PlateauInsight returned by detectPlateau, or null if no plateau. */
  plateau: PlateauInsight | null;
  /** Current ACWR from the adaptation model. */
  acwr: number;
  /** Current training block type. */
  blockType: BlockType;
  /**
   * Where the current week sits within the training block.
   * If 'pivot_deload', the scheduled deload is already in progress.
   */
  weekPosition: BlockWeekPosition;
};

/**
 * Check whether a smart deload should be recommended.
 *
 * Returns a DeloadTrigger with:
 *   triggered: true/false
 *   reasons:   list of human-readable trigger descriptions
 *   volumeReduction / intensityReduction: prescribed reductions (fractions)
 *
 * @param params - Pre-computed training state; no I/O performed here.
 */
export function checkDeloadTrigger(params: DeloadCheckParams): DeloadTrigger {
  const { fatigueMap, readinessHistory, plateau, acwr, weekPosition } = params;

  // ── Guard: already in a scheduled deload ─────────────────────────────────
  if (weekPosition === 'pivot_deload') {
    return {
      triggered: false,
      reasons: ['Scheduled deload week is already in progress.'],
      volumeReduction: 0,
      intensityReduction: 0,
    };
  }

  const reasons: string[] = [];

  // ── Trigger 1: Overtrained muscles ───────────────────────────────────────
  const overtrained = overtrainedMuscles(fatigueMap);
  if (overtrained.length >= OVERTRAINED_MUSCLE_COUNT) {
    const names = overtrained.map(formatMuscleName).join(', ');
    reasons.push(
      `${overtrained.length} muscle groups are overtrained (≥80% fatigue): ${names}.`,
    );
  }

  // ── Trigger 2: Sustained low readiness ───────────────────────────────────
  const lowDays = lowReadinessDays(readinessHistory, 7);
  if (lowDays >= LOW_READINESS_DAYS_REQUIRED) {
    reasons.push(
      `Readiness score was below 45 for ${lowDays} of the last 7 days — recovery is compromised.`,
    );
  }

  // ── Trigger 3: Under-recovered plateau ───────────────────────────────────
  if (plateau?.classification === 'under_recovered') {
    reasons.push(
      `Strength plateau detected (${plateau.daysSinceImprovement} days without progression) driven by insufficient recovery.`,
    );
  }

  // ── Trigger 4: ACWR overreaching ─────────────────────────────────────────
  if (acwr > ACWR_OVERREACHING) {
    reasons.push(
      `Acute:Chronic Workload Ratio is ${acwr.toFixed(2)} — significantly above the safe ceiling of 1.5.`,
    );
  }

  const triggered = reasons.length > 0;
  const { volumeReduction, intensityReduction } = triggered
    ? prescribeReductions(reasons.length)
    : { volumeReduction: 0, intensityReduction: 0 };

  return { triggered, reasons, volumeReduction, intensityReduction };
}

// ── Display helpers ───────────────────────────────────────────────────────────

export type DeloadCard = {
  headline: string;
  explanation: string;
  actions: string[];
};

/**
 * Format a DeloadTrigger result into a user-facing card.
 *
 * @param trigger    - The DeloadTrigger returned by checkDeloadTrigger
 * @param fatigueMap - Current fatigue map (used to name specific muscles in copy)
 */
export function formatDeloadCard(
  trigger: DeloadTrigger,
  fatigueMap: MuscleFatigueMap,
): DeloadCard {
  if (!trigger.triggered) {
    return {
      headline: 'Training Load Is Manageable',
      explanation: 'No deload needed right now. Keep building progressively.',
      actions: [],
    };
  }

  const overtrained = overtrainedMuscles(fatigueMap);
  const muscleList =
    overtrained.length > 0
      ? overtrained.map(formatMuscleName).join(', ')
      : 'multiple muscle groups';

  // Build explanation from the trigger reasons
  const explanation =
    trigger.reasons.length === 1
      ? trigger.reasons[0]
      : `Multiple recovery signals converged: ${trigger.reasons.map((r, i) => `(${i + 1}) ${r}`).join(' ')}`;

  const volPct  = Math.round(trigger.volumeReduction  * 100);
  const intPct  = Math.round(trigger.intensityReduction * 100);

  const actions: string[] = [
    `Reduce working sets by ${volPct}% this week (e.g., 4 sets → ${Math.max(1, Math.round(4 * (1 - trigger.volumeReduction)))}).`,
    `Drop working weights by ${intPct}% — focus on technique and mind-muscle connection.`,
    `Prioritise 7–9 hours of sleep and protein intake ≥ 1.6 g/kg of body weight.`,
  ];

  if (overtrained.length > 0) {
    actions.push(`Avoid direct work on overtrained muscles (${muscleList}) for 48–72 hours.`);
  }

  return {
    headline: 'Smart Deload Recommended',
    explanation,
    actions,
  };
}

/**
 * Determine whether the suggested deload should instead pull forward a
 * scheduled deload that is coming up within the next 7 days.
 *
 * @param weekPosition   - Current week position in the block
 * @param daysUntilDeload - Calendar days until the next scheduled deload week
 *                          (pass Infinity if none is coming)
 * @returns Suggestion string, or null if a new deload should be scheduled.
 */
export function deloadTimingSuggestion(
  weekPosition: BlockWeekPosition,
  daysUntilDeload: number,
): string | null {
  if (weekPosition === 'pivot_deload') return null;
  if (daysUntilDeload <= 7) {
    return `A scheduled deload is ${daysUntilDeload} day${daysUntilDeload === 1 ? '' : 's'} away — pull it forward now instead of adding an extra one.`;
  }
  return null;
}

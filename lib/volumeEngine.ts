// lib/volumeEngine.ts
//
// Volume Auto-Periodization Engine
//
// Analyses training history to compute weekly set volumes per muscle group,
// then recommends evidence-based adjustments calibrated to:
//   - The athlete's readiness score trend
//   - The current periodization block
//   - Training experience level (derived from training age in weeks)
//
// ── Core rules ─────────────────────────────────────────────────────────────────
//   readiness ≥ 70  → increase volume 5–10% (beginner more, advanced less)
//   readiness 50–69 → maintain current volume
//   readiness < 50  → reduce volume 10–20%
//
//   Block modifiers (from blockPeriodization.getVolumeCapModifier):
//     Accumulation peak : up to +15% from baseline (1.10× cap)
//     Realization       : hard ceiling — max –10% from current
//     Intensification   : volume stable, intensity drives progress
//
// ── Design principles ──────────────────────────────────────────────────────────
//   Pure functions: no AsyncStorage, no plan mutations.
//   Recommendations only: user must confirm before any change takes effect.
//   Pre-sort sessions once in computeVolumeHistory — no re-sorting per call.
//   Deterministic: same inputs always produce the same output.

import type { MuscleGroup, WorkoutSession, VolumeAdjustment, BlockType } from './types';
import { getMusclesWorked } from './muscleMapping';
import { getCurrentBlock } from './blockPeriodization';
import { getVolumeCapModifier } from './blockPeriodization';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Pre-sorted session history — sorted ascending by date once at the
 * computeVolumeHistory call site so downstream functions never re-sort.
 */
type SortedSessions = WorkoutSession[] & { __sorted: true };

/** Summary card structure for the UI to display volume adjustment recommendations. */
export type AdjustmentCard = {
  /** Short headline, e.g. "Volume Adjustment — Week 7". */
  title: string;
  /**
   * Human-readable summary of what changed and why.
   * One sentence per significant adjustment.
   */
  body: string;
  /**
   * Action items for the UI to render as tappable buttons.
   * Each action describes one specific change; UI decides how to surface them.
   */
  actions: AdjustmentAction[];
};

export type AdjustmentAction = {
  /** Short button label, e.g. "Add 1 set — chest". */
  label: string;
  /** The underlying adjustment this action would apply. */
  adjustment: VolumeAdjustment;
};

// ── Constants ─────────────────────────────────────────────────────────────────

/** Readiness score above which volume increase is appropriate. */
const READINESS_INCREASE_THRESHOLD = 70;
/** Readiness score below which volume reduction is warranted. */
const READINESS_REDUCE_THRESHOLD   = 50;

/**
 * Volume change percentages by training level for the increase case (readiness ≥ 70).
 * Advanced athletes are closer to their maximum adaptive capacity, so
 * smaller increments reduce overreaching risk.
 */
const INCREASE_PCT: Record<'beginner' | 'intermediate' | 'advanced', number> = {
  beginner:     10,
  intermediate:  7,
  advanced:      5,
};

/**
 * Volume reduction percentages when readiness is low (readiness < 50).
 * Advanced athletes are better at reading their body and can make larger
 * targeted reductions without losing adaptation.
 */
const REDUCE_PCT: Record<'beginner' | 'intermediate' | 'advanced', number> = {
  beginner:     10,
  intermediate: 15,
  advanced:     20,
};

/** Minimum meaningful weekly working set count per muscle group. */
const MIN_SETS_PER_MUSCLE = 2;

/** Maximum recommended weekly working set count per muscle group. */
const MAX_SETS_PER_MUSCLE = 25;

// ── Training level classification ────────────────────────────────────────────

type TrainingLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Classify training experience from session history age.
 *   < 12 weeks  → beginner
 *   12–51 weeks → intermediate
 *   ≥ 52 weeks  → advanced
 */
function classifyLevel(trainingAgeWeeks: number): TrainingLevel {
  if (trainingAgeWeeks < 12)  return 'beginner';
  if (trainingAgeWeeks < 52)  return 'intermediate';
  return 'advanced';
}

// ── Volume history computation ────────────────────────────────────────────────

/**
 * Parse an ISO date string (YYYY-MM-DD or full ISO timestamp) into
 * a Date object, returning epoch-0 on failure to avoid throwing.
 */
function parseDate(dateStr: string): Date {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

/**
 * Return the start-of-day timestamp (UTC midnight) N calendar weeks ago.
 * Week boundaries are Sunday → Saturday.
 */
function weekStartMsAgo(weeksAgo: number, referenceMs: number): number {
  // Snap reference to the most recent Sunday (ISO week-based would differ slightly,
  // but Sunday is simpler and consistent across locales)
  const ref = new Date(referenceMs);
  const dayOfWeek = ref.getUTCDay(); // 0=Sun
  const thisSundayMs = referenceMs - dayOfWeek * 86_400_000;
  return thisSundayMs - weeksAgo * 7 * 86_400_000;
}

/**
 * Compute per-muscle weekly working set counts over a rolling window.
 *
 * Sessions are pre-sorted ascending by date before indexing into weeks,
 * so the inner loop is a single O(n) scan — no re-sorting per muscle.
 *
 * @param sessions  Completed workout sessions (any order — sorted internally once).
 * @param weeks     Number of past weeks to analyse (default 4).
 * @returns         Map: MuscleGroup → number[] where index 0 = oldest week,
 *                  index (weeks-1) = most recent completed week.
 *                  Muscles with zero sets across all weeks are omitted.
 */
export function computeVolumeHistory(
  sessions: WorkoutSession[],
  weeks = 4,
): Map<MuscleGroup, number[]> {
  const nowMs = Date.now();

  // ── Sort once ascending (oldest → newest) ─────────────────────────────────
  const sorted = [...sessions].sort(
    (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime(),
  ) as SortedSessions;

  // ── Build week boundary timestamps (oldest first) ─────────────────────────
  // weekStarts[0] = start of (weeks) weeks ago, weekStarts[weeks-1] = this week
  const weekStarts: number[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    weekStarts.push(weekStartMsAgo(w, nowMs));
  }
  const windowStart = weekStarts[0];

  // ── Accumulator: muscle → [sets per week] ─────────────────────────────────
  const history = new Map<MuscleGroup, number[]>();

  function getMuscleBucket(muscle: MuscleGroup): number[] {
    if (!history.has(muscle)) history.set(muscle, new Array(weeks).fill(0));
    return history.get(muscle)!;
  }

  // ── Single O(n) scan through sorted sessions ──────────────────────────────
  for (const session of sorted) {
    const sessionMs = parseDate(session.date).getTime();

    // Skip sessions outside the analysis window
    if (sessionMs < windowStart) continue;

    // Determine which week bucket this session falls in
    let weekIdx = weeks - 1; // default to most recent week
    for (let w = 0; w < weeks - 1; w++) {
      if (sessionMs >= weekStarts[w] && sessionMs < weekStarts[w + 1]) {
        weekIdx = w;
        break;
      }
    }

    if (session.sessionType === 'cardio') continue; // cardio doesn't track muscle sets

    for (const exercise of session.exercises) {
      const { primary, secondary } = getMusclesWorked(
        exercise.name,
        (exercise.matchedPattern as Parameters<typeof getMusclesWorked>[1]) ?? 'unknown',
      );

      // Count only completed, non-warm-up sets
      const completedSets = exercise.sets.filter((s) => s.completed && !s.isWarmUp).length;
      if (completedSets === 0) continue;

      for (const m of primary) {
        getMuscleBucket(m)[weekIdx] += completedSets;
      }
      // Secondary muscles count at half a set each (they share the training stimulus)
      for (const m of secondary) {
        getMuscleBucket(m)[weekIdx] += completedSets * 0.5;
      }
    }
  }

  // ── Drop muscles with zero history across entire window ───────────────────
  for (const [muscle, counts] of history) {
    if (counts.every((c) => c === 0)) history.delete(muscle);
  }

  return history;
}

// ── Volume adjustment recommendation ─────────────────────────────────────────

/**
 * Recommend weekly set count adjustments per muscle group.
 *
 * Deterministic rule-based engine — same inputs always produce the same output.
 * All returned adjustments are advisory; the UI must gate them behind user confirmation.
 *
 * @param history          Output of computeVolumeHistory (muscle → weekly set arrays).
 * @param readinessScore   Athlete's current readiness score (0–100).
 * @param blockType        Active periodization block type.
 * @param trainingAgeWeeks Approximate training age in weeks (used for level classification).
 * @returns                Array of VolumeAdjustment records (empty if no changes needed).
 */
export function recommendVolumeAdjustment(
  history:          Map<MuscleGroup, number[]>,
  readinessScore:   number,
  blockType:        BlockType,
  trainingAgeWeeks: number,
): VolumeAdjustment[] {
  const level        = classifyLevel(trainingAgeWeeks);
  const adjustments: VolumeAdjustment[] = [];

  for (const [muscle, weekCounts] of history) {
    // Use the most recent week's sets as the baseline
    const currentSets = weekCounts[weekCounts.length - 1] ?? 0;
    if (currentSets <= 0) continue;

    // ── Determine readiness direction ────────────────────────────────────────
    let rawChangePct = 0;
    let reason       = '';

    if (readinessScore >= READINESS_INCREASE_THRESHOLD) {
      rawChangePct = INCREASE_PCT[level];
      reason = `Readiness ${Math.round(readinessScore)}/100 is optimal — increase stimulus for ${level} athlete.`;
    } else if (readinessScore < READINESS_REDUCE_THRESHOLD) {
      rawChangePct = -REDUCE_PCT[level];
      reason = `Readiness ${Math.round(readinessScore)}/100 is low — reduce load to allow recovery.`;
    } else {
      // 50–69: stable — no change needed
      continue;
    }

    // ── Apply block-specific volume cap ──────────────────────────────────────
    // weekPosition 'intro' used as a neutral proxy when we only have the block type;
    // the volume cap modifier at intro is the conservative/baseline value for the block.
    const capModifier = getVolumeCapModifier(blockType, 'intro');

    let finalChangePct = rawChangePct;

    if (blockType === 'realization') {
      // Realization is a taper — never increase volume, cap any reduction at –10%
      finalChangePct = Math.min(0, Math.max(rawChangePct, -10));
      if (rawChangePct > 0) {
        reason = `Realization block: hold volume steady — do not increase during taper.`;
        finalChangePct = 0;
      }
    } else if (blockType === 'intensification') {
      // Intensification: volume is stable; intensity drives progress
      finalChangePct = 0;
      reason = `Intensification block: maintain volume — increase load (intensity), not sets.`;
    } else {
      // Accumulation: allow full increase up to capModifier ceiling
      const maxIncreasePct = (capModifier - 1.0) * 100; // e.g. 1.10 → 10%
      if (finalChangePct > maxIncreasePct) {
        finalChangePct = maxIncreasePct;
        reason += ` (capped at +${Math.round(maxIncreasePct)}% by accumulation block limit)`;
      }
    }

    if (finalChangePct === 0) {
      // Intensification or realization holds — still emit record so UI can show explanation
      adjustments.push({
        muscleGroup:      muscle,
        currentSets:      Math.round(currentSets),
        recommendedSets:  Math.round(currentSets),
        changePercent:    0,
        reason,
      });
      continue;
    }

    // ── Compute recommended set count ────────────────────────────────────────
    const multiplier     = 1 + finalChangePct / 100;
    const rawRecommended = currentSets * multiplier;
    const recommendedSets = Math.round(
      Math.max(MIN_SETS_PER_MUSCLE, Math.min(MAX_SETS_PER_MUSCLE, rawRecommended)),
    );

    if (recommendedSets === Math.round(currentSets)) continue; // no meaningful change

    adjustments.push({
      muscleGroup:   muscle,
      currentSets:   Math.round(currentSets),
      recommendedSets,
      changePercent: Math.round(((recommendedSets - currentSets) / currentSets) * 100),
      reason,
    });
  }

  // Sort: reductions first (most urgent), then increases
  return adjustments.sort((a, b) => a.changePercent - b.changePercent);
}

// ── UI formatting ─────────────────────────────────────────────────────────────

/**
 * Format an array of VolumeAdjustment records into a display card for the UI.
 *
 * The card has:
 *   title   — short headline (includes block context when relevant)
 *   body    — paragraph summarising the overall recommendation
 *   actions — one tappable action per adjustment (user must confirm each)
 *
 * Returns null when adjustments is empty (nothing to show).
 */
export function formatAdjustmentCard(
  adjustments: VolumeAdjustment[],
  blockType?:  BlockType,
): AdjustmentCard | null {
  if (adjustments.length === 0) return null;

  const increases = adjustments.filter((a) => a.changePercent > 0);
  const reductions = adjustments.filter((a) => a.changePercent < 0);
  const holds      = adjustments.filter((a) => a.changePercent === 0);

  // ── Title ─────────────────────────────────────────────────────────────────
  const blockLabel = blockType
    ? ` — ${blockType.charAt(0).toUpperCase() + blockType.slice(1)}`
    : '';
  const title = `Volume Recommendation${blockLabel}`;

  // ── Body ──────────────────────────────────────────────────────────────────
  const parts: string[] = [];

  if (reductions.length > 0) {
    const muscleList = reductions.map((a) => a.muscleGroup.replace(/_/g, ' ')).join(', ');
    parts.push(
      `Reduce volume for ${muscleList} — readiness is below optimal and these muscles need more recovery.`,
    );
  }
  if (increases.length > 0) {
    const muscleList = increases.map((a) => a.muscleGroup.replace(/_/g, ' ')).join(', ');
    parts.push(
      `Readiness is strong — add volume for ${muscleList} to drive further adaptation.`,
    );
  }
  if (holds.length > 0 && reductions.length === 0 && increases.length === 0) {
    // Only holds (intensification / realization stable)
    parts.push(
      adjustments[0]?.reason ??
        'Maintain current volume this week — block phase calls for stable sets.',
    );
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  const actions: AdjustmentAction[] = adjustments
    .filter((a) => a.changePercent !== 0)
    .map((a) => {
      const muscleName = a.muscleGroup.replace(/_/g, ' ');
      const direction  = a.changePercent > 0 ? `+${a.changePercent}%` : `${a.changePercent}%`;
      const sets       = `${a.recommendedSets} sets (from ${a.currentSets})`;
      return {
        label:      `${direction} ${muscleName} → ${sets}`,
        adjustment: a,
      };
    });

  return {
    title,
    body: parts.join(' '),
    actions,
  };
}

// ── Convenience wrapper ───────────────────────────────────────────────────────

/**
 * One-shot helper: compute volume history, generate recommendations, and
 * format them as a display card in a single call.
 *
 * Equivalent to calling the three functions individually.
 * Returns null when no adjustments are needed.
 *
 * @param sessions         Completed workout sessions.
 * @param readinessScore   Current readiness score (0–100).
 * @param planWeek         Current plan week number (for block detection).
 * @param planTotalWeeks   Total weeks in the plan (default 12).
 * @param trainingAgeWeeks Athlete's approximate training age in weeks.
 * @param analysisWeeks    Number of recent weeks to analyse (default 4).
 */
export function buildVolumeCard(
  sessions:          WorkoutSession[],
  readinessScore:    number,
  planWeek:          number,
  planTotalWeeks    = 12,
  trainingAgeWeeks   = 12,
  analysisWeeks      = 4,
): AdjustmentCard | null {
  const { blockType } = getCurrentBlock(planWeek, planTotalWeeks);
  const history       = computeVolumeHistory(sessions, analysisWeeks);
  const adjustments   = recommendVolumeAdjustment(history, readinessScore, blockType, trainingAgeWeeks);
  return formatAdjustmentCard(adjustments, blockType);
}

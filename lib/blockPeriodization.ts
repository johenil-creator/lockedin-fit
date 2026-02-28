// lib/blockPeriodization.ts
//
// Adaptive Block Periodization System
//
// Augments the existing 12-week progression tables in lib/loadEngine/progression.ts
// with block-aware modifiers. This system does NOT replace getWeekPrescription() —
// it provides surrounding context (fatigue rates, recovery, readiness thresholds,
// Locke tone) so higher-level engines can adapt behaviour per block and week.
//
// ── Block Structure (standard 12-week plan) ────────────────────────────────────
//   Block 1 — Accumulation  (W1-4):  volume bias, moderate intensity (8–10 reps)
//   Block 2 — Intensification (W5-8): load bias, strength emphasis (4–6 reps)
//   Block 3 — Realization   (W9-12): expression bias, peak intensity (2–4 reps)
//
// ── Week Positions within each 4-week block ────────────────────────────────────
//   intro  (W1/W5/W9)  : moderate introduction, establish the block pattern
//   build  (W2/W6/W10) : ramping load or volume above intro baseline
//   peak   (W3/W7/W11) : highest demand week — maximum stress stimulus
//   deload (W4/W8/W12) : planned recovery pivot, always structurally present
//
// Non-12-week plans are handled by dividing totalWeeks into thirds. The canonical
// deload is always the last week of each third.

// ── Exported Types ────────────────────────────────────────────────────────────

/** Which training phase the current plan week falls into. */
export type BlockType = 'accumulation' | 'intensification' | 'realization';

/** Where within the 4-week block the current week falls. */
export type WeekPosition = 'intro' | 'build' | 'peak' | 'deload';

/** Full block context returned by getCurrentBlock. */
export type BlockContext = {
  /** Phase of the overall plan (accumulation / intensification / realization). */
  blockType: BlockType;
  /** Position within the 4-week sub-block. */
  weekPosition: WeekPosition;
  /** 1-based block number (1 = accumulation, 2 = intensification, 3 = realization). */
  blockNumber: 1 | 2 | 3;
};

/**
 * Readiness score thresholds calibrated to the current training block.
 * All values are on a 0–100 readiness score scale.
 */
export type ReadinessThresholds = {
  /** Score ≥ prime → green light, optimal conditions for prescribed training. */
  prime: number;
  /** Score ≥ ready → proceed as planned. */
  ready: number;
  /** Score ≥ manage → train with caution; reduce intensity by ~10-15%. */
  manage: number;
  /** Score < recover → prioritise recovery; a deload is warranted. */
  recover: number;
};

// ── Internal constants ────────────────────────────────────────────────────────

// Exported so getCurrentBlock can reference the ordered list for index → string mapping.
const BLOCK_TYPES: readonly BlockType[] = [
  'accumulation',
  'intensification',
  'realization',
] as const;

// O(1) record lookups — avoids .indexOf() linear scan on every modifier call.
// These are the only index resolution paths; all table access goes through bi/pi.
const BLOCK_INDEX: Readonly<Record<BlockType, number>> = {
  accumulation:   0,
  intensification: 1,
  realization:    2,
} as const;

const POSITION_INDEX: Readonly<Record<WeekPosition, number>> = {
  intro:  0,
  build:  1,
  peak:   2,
  deload: 3,
} as const;

/** O(1) block → table row index. */
function bi(blockType: BlockType): number {
  return BLOCK_INDEX[blockType];
}

/** O(1) week position → table column index. */
function pi(weekPosition: WeekPosition): number {
  return POSITION_INDEX[weekPosition];
}

// ── Fatigue Multipliers ───────────────────────────────────────────────────────
//
// Dimensionless scaling factor applied to the base fatigue accumulation rate.
// A value of 1.0 represents an average training week's fatigue burden.
//
// Design rationale:
//   Accumulation generates the most systemic fatigue — high training volume
//     creates significant metabolic and structural stress. Peak week of
//     accumulation (W3) is the highest sustained-volume week of the whole plan.
//
//   Intensification shifts stress toward CNS fatigue; lower reps and longer
//     rest reduce metabolic accumulation even as loads rise. Fatigue
//     multipliers are modestly below accumulation.
//
//   Realization uses a pronounced taper — volume drops sharply so fatigue
//     accumulates slowly, allowing the athlete to express peak performance.
//     Even W11 (the "peak" of the realization block) produces less systemic
//     fatigue than mid-accumulation because set counts are low.
//
//   Deload weeks suppress fatigue accumulation to ~0.45–0.50 regardless of
//     block, allowing full clearance of the preceding stress cycle.
//
//   Indexed [blockIndex][positionIndex]:
//     rows:    0=accumulation, 1=intensification, 2=realization
//     columns: 0=intro, 1=build, 2=peak, 3=deload
const FATIGUE_MULTIPLIERS: readonly (readonly number[])[] = [
  //   intro   build   peak   deload
  [0.90,  1.10,  1.25,  0.50],  // accumulation
  [0.85,  1.05,  1.15,  0.50],  // intensification
  [0.80,  0.95,  1.00,  0.45],  // realization
] as const;

// ── Recovery Scaling ──────────────────────────────────────────────────────────
//
// Multiplier for inter-session recovery rate. Values > 1.0 = faster recovery.
//
// Design rationale:
//   Accumulation produces significant structural muscle damage through high
//     eccentric volume → slower recovery (multiplier < 1.0 across most of the block).
//
//   Intensification creates primarily CNS and connective tissue stress; actual
//     muscle breakdown is lower → moderate recovery rates, rising toward deload.
//
//   Realization is a taper phase — volume is deliberately low so recovery is
//     rapid. By peak week (W11/W3 of the final block) the athlete should be
//     super-compensating. Deload at W12 accelerates full clearance.
//
//   The deload column reflects accelerated recovery due to reduced training
//     stimulus: athletes can absorb and consolidate adaptation here.
const RECOVERY_SCALING: readonly (readonly number[])[] = [
  //   intro   build   peak   deload
  [0.80,  0.78,  0.75,  1.00],  // accumulation  (slowest — high volume damage)
  [0.88,  0.85,  0.82,  1.05],  // intensification
  [1.00,  1.05,  1.10,  1.20],  // realization   (fastest — taper effect)
] as const;

// ── Volume Cap Modifiers ──────────────────────────────────────────────────────
//
// Scale factor applied to the athlete's computed maximum weekly volume cap.
// Used by volumeEngine.ts when generating auto-periodisation recommendations.
//
//   1.0  = full volume capacity
//   > 1.0 = additional volume is appropriate (accumulation peak only)
//   < 1.0 = volume should be reduced relative to the athlete's maximum
//
// Design rationale:
//   Accumulation deliberately pushes volume toward the athlete's maximum
//     tolerable weekly load (MTW). Peak week of accumulation exceeds the
//     baseline because it is the strategic over-reach week.
//
//   Intensification moderates volume while loads rise — the volume cap
//     decreases each week as intensity goes up.
//
//   Realization employs a progressive taper: volume drops to 50–85% of
//     capacity, allowing fatigue to clear and fitness to express.
const VOLUME_CAP_MODIFIERS: readonly (readonly number[])[] = [
  //   intro   build   peak   deload
  [0.90,  1.00,  1.10,  0.60],  // accumulation
  [0.85,  0.90,  0.95,  0.55],  // intensification
  [0.75,  0.80,  0.85,  0.50],  // realization
] as const;

// ── Readiness Thresholds (per block only — position invariant) ────────────────
//
// Design rationale:
//   Accumulation tolerates more fatigue — the goal is volume stimulus, not
//     maximal output. An athlete at 60/100 readiness can still benefit from
//     an accumulation session; it is better to train somewhat fatigued than
//     to skip and lose the volume stress.
//
//   Intensification requires reasonable freshness — heavier loads under
//     fatigue increase injury risk and degrade movement quality. Threshold
//     moves up by ~5 points vs. accumulation.
//
//   Realization demands high readiness — the explicit goal is to express
//     maximal performance. A fatigued athlete cannot peak. Thresholds are
//     the most conservative here.
const READINESS_THRESHOLDS: readonly ReadinessThresholds[] = [
  { prime: 75, ready: 60, manage: 45, recover: 30 },  // accumulation
  { prime: 80, ready: 65, manage: 50, recover: 35 },  // intensification
  { prime: 85, ready: 70, manage: 55, recover: 40 },  // realization
] as const;

// ── Locke Coach Tone Tokens ───────────────────────────────────────────────────
//
// String tokens consumed by the Locke messaging layer (lockeMessages.ts) to
// select block-appropriate coaching communication. Each token maps to a
// distinct message register, urgency level, and wolf persona flavour.
//
// Token meaning reference:
//   acc_intro   → "Foundation phase — consistency is the whole job."
//   acc_build   → "Volume is climbing. Trust the grind."
//   acc_peak    → "Hardest week of the block. This is where packs separate."
//   acc_deload  → "Back off. Smart wolves recover with purpose."
//   int_intro   → "Loads go up from here. New block, new demands."
//   int_build   → "Get comfortable with heavy weight. Technique is your armour."
//   int_peak    → "Push the bar. Strength is built in the dark."
//   int_deload  → "Deload. Let your body absorb what you've earned."
//   real_intro  → "Final block. Everything has been building to this."
//   real_build  → "Express your strength — don't leave anything in the tank."
//   real_peak   → "This is what we trained for. Go."
//   real_deload → "Plan complete. Let it all consolidate."
const LOCKE_TONES: readonly (readonly string[])[] = [
  //    intro          build          peak           deload
  ['acc_intro',   'acc_build',   'acc_peak',    'acc_deload'],   // accumulation
  ['int_intro',   'int_build',   'int_peak',    'int_deload'],   // intensification
  ['real_intro',  'real_build',  'real_peak',   'real_deload'],  // realization
] as const;

// ── Core Block Detection ──────────────────────────────────────────────────────

/**
 * Determine the periodization block context for the current plan week.
 *
 * Supports plans of any length by dividing totalWeeks into three equal phases.
 * The final week of each phase is always treated as the structural deload.
 *
 * For the canonical 12-week plan:
 *   Block 1 (accumulation):   W1=intro, W2=build, W3=peak, W4=deload
 *   Block 2 (intensification): W5=intro, W6=build, W7=peak, W8=deload
 *   Block 3 (realization):    W9=intro, W10=build, W11=peak, W12=deload
 *
 * @param planWeek    Current 1-based week number within the plan.
 * @param totalWeeks  Total number of weeks in the plan (default 12).
 * @returns           BlockContext with blockType, weekPosition, blockNumber.
 */
export function getCurrentBlock(
  planWeek: number,
  totalWeeks: number = 12,
): BlockContext {
  // Clamp week to valid range
  const week = Math.max(1, Math.min(Math.round(planWeek), totalWeeks));

  // Exact block size as a float — used for boundary calculations
  const blockSizeExact = totalWeeks / 3;

  // Which 3-phase block this week falls in (0-based)
  const blockNum = Math.min(Math.floor((week - 1) / blockSizeExact), 2) as 0 | 1 | 2;

  // First and last week of this block (1-based, inclusive)
  const blockStart = Math.floor(blockNum * blockSizeExact) + 1;
  const blockEnd =
    blockNum < 2
      ? Math.floor((blockNum + 1) * blockSizeExact)
      : totalWeeks;
  const blockLength = blockEnd - blockStart + 1;

  // 1-based offset within this block
  const weekInBlock = week - blockStart + 1;

  // Map offset to position: last week = deload, first = intro, penultimate = peak, others = build
  let weekPosition: WeekPosition;
  if (weekInBlock >= blockLength) {
    weekPosition = 'deload';
  } else if (weekInBlock === 1) {
    weekPosition = 'intro';
  } else if (weekInBlock === blockLength - 1) {
    weekPosition = 'peak';
  } else {
    weekPosition = 'build';
  }

  return {
    blockType: BLOCK_TYPES[blockNum],
    weekPosition,
    blockNumber: (blockNum + 1) as 1 | 2 | 3,
  };
}

// ── Exported Modifier Functions ───────────────────────────────────────────────

/**
 * Fatigue accumulation rate multiplier for the given block and week position.
 *
 * Multiply this against a base per-session fatigue increment to scale
 * how quickly systemic fatigue builds during the current training week.
 *
 *   Values > 1.0 → above-average fatigue accumulation (high volume / peak weeks)
 *   Values < 1.0 → suppressed accumulation (taper / deload)
 *
 * Accumulation block carries the highest multipliers because training volume
 * is the primary stressor. Realization uses a taper, so even peak week
 * accumulates less fatigue than accumulation build/peak weeks.
 */
export function getFatigueMultiplier(
  blockType: BlockType,
  weekPosition: WeekPosition,
): number {
  return FATIGUE_MULTIPLIERS[bi(blockType)][pi(weekPosition)];
}

/**
 * Inter-session recovery rate scaling for the given block and week position.
 *
 * Applied as a multiplier to the base recovery model used by fatigueForecast.ts.
 * Higher values indicate faster recovery (e.g. taper weeks, deloads).
 *
 * Realization block returns the highest values because low training volume
 * allows the athlete to super-compensate between sessions. Accumulation
 * block returns the lowest values because high eccentric volume slows
 * structural repair.
 */
export function getRecoveryScaling(
  blockType: BlockType,
  weekPosition: WeekPosition,
): number {
  return RECOVERY_SCALING[bi(blockType)][pi(weekPosition)];
}

/**
 * Readiness score thresholds calibrated to the current training block.
 *
 * Realization demands the highest readiness — athletes must be fresh to
 * express peak performance. Accumulation tolerates more fatigue because
 * the objective is volume stimulus, not maximal output expression.
 *
 * Thresholds are block-wide (not week-position-specific) because the
 * fundamental goal of each phase does not change within the block.
 *
 * Usage example:
 *   const { prime, ready, manage, recover } = getReadinessThresholds(blockType);
 *   if (readinessScore >= prime) { ... }
 */
export function getReadinessThresholds(blockType: BlockType): ReadinessThresholds {
  return { ...READINESS_THRESHOLDS[bi(blockType)] };
}

/**
 * Volume cap modifier for the current block and week position.
 *
 * Applied by volumeEngine.ts to scale the athlete's computed maximum weekly
 * volume cap. The baseline cap derives from training history; this modifier
 * raises or lowers it according to the periodization phase:
 *
 *   Accumulation peak (W3)    : 1.10 — strategic over-reach above typical max
 *   Accumulation intro (W1)   : 0.90 — ramp in gently at block start
 *   Intensification            : 0.85–0.95 — volume recedes as load rises
 *   Realization                : 0.50–0.85 — progressive taper
 *   Any deload week            : 0.50–0.60 — minimum stimulus for recovery
 */
export function getVolumeCapModifier(
  blockType: BlockType,
  weekPosition: WeekPosition,
): number {
  return VOLUME_CAP_MODIFIERS[bi(blockType)][pi(weekPosition)];
}

/**
 * Locke coaching tone token for the current block and week position.
 *
 * The returned string token is passed to the Locke messaging layer to select
 * block-appropriate communication style, urgency, and wolf persona register.
 *
 * Possible tokens:
 *   'acc_intro'  | 'acc_build'  | 'acc_peak'  | 'acc_deload'
 *   'int_intro'  | 'int_build'  | 'int_peak'  | 'int_deload'
 *   'real_intro' | 'real_build' | 'real_peak' | 'real_deload'
 *
 * See LOCKE_TONES constant above for the coaching message register each
 * token maps to.
 */
export function getLockeCoachTone(
  blockType: BlockType,
  weekPosition: WeekPosition,
): string {
  return LOCKE_TONES[bi(blockType)][pi(weekPosition)];
}

/**
 * Returns `true` when the current week is a structurally planned deload week
 * (W4, W8, or W12 in a 12-week plan).
 *
 * Use this as a guard before triggering any fatigue-driven deload recommendation.
 * If the plan already prescribes a deload at this position, adding a second
 * deload would create an unintended training gap and reduce adaptation stimulus.
 *
 * Pattern:
 *   const { blockType, weekPosition } = getCurrentBlock(planWeek, totalWeeks);
 *   if (!shouldTriggerDeload(blockType, weekPosition)) {
 *     // safe to evaluate fatigue-based deload logic here
 *   }
 *
 * Note: blockType is accepted for API symmetry and forward-compatibility
 * (future versions may treat realization deloads differently). The current
 * determination is purely position-based.
 */
export function shouldTriggerDeload(
  blockType: BlockType,    // reserved for future block-specific deload logic
  weekPosition: WeekPosition,
): boolean {
  void blockType; // intentional — deload is structural position, not block-specific
  return weekPosition === 'deload';
}

/**
 * lib/recoveryEstimator.ts — Deterministic muscle recovery estimation engine
 *
 * Core model:
 *   Recovery is modelled as an exponential decay of fatigue, accelerated or
 *   slowed by frequency, intensity, and periodisation block context.
 *
 *   adjustedRate = BASE_RATE_PER_HOUR
 *                × frequencyModifier(sevenDayFrequency)
 *                × intensityModifier(sessionIntensityProxy)
 *                × blockModifier(blockType)
 *
 *   estimatedHoursToRecover = max(fatigue − alreadyRecovered, 0) / adjustedRate
 *
 *   where alreadyRecovered = fatigue × (1 − e^(−k × hoursSinceLastTrained))
 *   and k = adjustedRate / 100   (normalised decay constant)
 *
 * Status thresholds:
 *   0–25  → Fresh
 *   26–50 → Warming Up
 *   51–79 → Fatigued
 *   80–100→ Overtrained
 *
 * Caching:
 *   Results are cached for CACHE_TTL_MS (5 minutes) to avoid redundant
 *   recalculation when the same inputs arrive multiple times in a session.
 */

import type {
  MuscleGroup,
  MuscleFatigueMap,
  RecoveryEstimate,
  RecoveryStatus,
  BlockType,
} from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Base rate at which fatigue recovers per hour of complete rest, expressed as
 * fatigue points (0–100 scale) per hour.
 * At 4 pts/hr a muscle at fatigue=100 would fully recover in 25 hours.
 */
const BASE_RATE_PER_HOUR = 4;

/**
 * Fatigue threshold below which a muscle is considered fully recovered
 * for practical purposes (residual 5 points is negligible).
 */
const RECOVERY_FLOOR = 5;

/** Cache entry TTL in milliseconds (5 minutes). */
const CACHE_TTL_MS = 5 * 60 * 1000;

// ── Cache ─────────────────────────────────────────────────────────────────────

type CacheEntry = {
  result: RecoveryEstimate;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

/** Generate a deterministic cache key from estimation inputs. */
function cacheKey(
  muscle: string,
  fatigue: number,
  hoursSince: number,
  freq: number,
  intensity: number,
  block: BlockType,
): string {
  // Round continuous inputs to reduce cache misses from floating-point noise
  return `${muscle}:${Math.round(fatigue)}:${Math.round(hoursSince)}:${freq}:${Math.round(intensity * 10)}:${block}`;
}

// ── Modifier functions (all return dimensionless multipliers) ────────────────

/**
 * Frequency modifier: more frequent training of a muscle = slower recovery.
 *
 * Rationale: repeated micro-trauma accumulates faster than repair when
 * frequency exceeds 3× / week for a given muscle group.
 *
 *   freq 0–1 → 1.10  (rare training = rapid recovery)
 *   freq 2   → 1.00  (baseline, twice a week)
 *   freq 3   → 0.85  (moderate overreaching)
 *   freq 4+  → 0.70  (high-frequency training = significantly slower recovery)
 */
function frequencyModifier(sevenDayFrequency: number): number {
  if (sevenDayFrequency <= 1) return 1.10;
  if (sevenDayFrequency === 2) return 1.00;
  if (sevenDayFrequency === 3) return 0.85;
  return 0.70;
}

/**
 * Intensity modifier: higher-RPE sessions cause greater structural damage,
 * requiring more time for repair.
 *
 * Proxy is average session RPE (1–10) or fractional 1RM (0–1, multiplied by 10
 * before passing).
 *
 *   RPE ≤ 5  → 1.20  (sub-maximal, recovers quickly)
 *   RPE 6    → 1.10
 *   RPE 7    → 1.00  (moderate — baseline)
 *   RPE 8    → 0.85
 *   RPE 9    → 0.75
 *   RPE 10   → 0.65  (all-out effort — recovery is significantly prolonged)
 */
function intensityModifier(sessionIntensityProxy: number): number {
  const rpe = Math.max(1, Math.min(10, sessionIntensityProxy));
  if (rpe <= 5) return 1.20;
  if (rpe <= 6) return 1.10;
  if (rpe <= 7) return 1.00;
  if (rpe <= 8) return 0.85;
  if (rpe <= 9) return 0.75;
  return 0.65;
}

/**
 * Block modifier: the training block context affects total weekly stress.
 *
 *   accumulation   → 1.00  (moderate volume, normal recovery)
 *   intensification→ 0.80  (heavy loads, recovery is slower)
 *   realization    → 1.30  (peak/taper phase — low volume, rapid recovery)
 */
function blockModifier(blockType: BlockType): number {
  switch (blockType) {
    case 'accumulation':    return 1.00;
    case 'intensification': return 0.80;
    case 'realization':     return 1.30;
  }
}

// ── Status & recommendation helpers ──────────────────────────────────────────

function statusFromFatigue(fatigue: number): RecoveryStatus {
  if (fatigue <= 25) return 'Fresh';
  if (fatigue <= 50) return 'Warming Up';
  if (fatigue <= 79) return 'Fatigued';
  return 'Overtrained';
}

/** Build a concise, context-aware recommendation string. */
function buildRecommendation(
  muscle: MuscleGroup,
  status: RecoveryStatus,
  hoursToRecover: number,
  blockType: BlockType,
): string {
  const muscleName = muscle.replace(/_/g, ' ');
  const hrs = Math.ceil(hoursToRecover);

  switch (status) {
    case 'Fresh':
      return `${muscleName} is fully recovered — ideal time to train hard.`;

    case 'Warming Up':
      if (blockType === 'accumulation') {
        return `${muscleName} is warming up. Light volume today, heavy tomorrow.`;
      }
      return `${muscleName} still has ~${hrs}h of recovery remaining — train at moderate intensity.`;

    case 'Fatigued':
      if (blockType === 'intensification') {
        return `${muscleName} is fatigued (~${hrs}h to recover). Consider swapping for a lighter variation.`;
      }
      return `${muscleName} is fatigued — reduce volume or rest ${hrs}h before targeting it again.`;

    case 'Overtrained':
      return `${muscleName} is overtrained (~${hrs}h to recover). Avoid direct work — swap or deload.`;
  }
}

// ── Core estimation logic ─────────────────────────────────────────────────────

export type RecoveryInputs = {
  /** Current fatigue level for this muscle (0–100). */
  fatigue: number;
  /** Hours since this muscle was last trained. */
  hoursSinceLastTrained: number;
  /** How many times this muscle was trained in the last 7 days. */
  sevenDayFrequency: number;
  /**
   * Intensity proxy — average RPE (1–10) of the sessions that hit this muscle.
   * Pass 7 when unknown.
   */
  sessionIntensityProxy: number;
  /** Current training block type. */
  blockType: BlockType;
};

/**
 * Estimate recovery status for a single muscle given its current fatigue
 * and training context.
 *
 * Math:
 *   adjustedRate = BASE_RATE_PER_HOUR × freqMod × intensityMod × blockMod
 *
 *   Fatigue already recovered since last session:
 *     k = adjustedRate / 100
 *     recovered = fatigue × (1 − e^(−k × hoursSinceLastTrained))
 *
 *   Remaining fatigue:
 *     remaining = max(fatigue − recovered, 0)
 *
 *   Time to reach RECOVERY_FLOOR from remaining:
 *     hoursToRecover = max(remaining − RECOVERY_FLOOR, 0) / adjustedRate
 *
 * @param muscle - The muscle group being estimated (used for recommendation text)
 * @param inputs - Training context inputs
 */
export function estimateRecovery(
  muscle: MuscleGroup,
  inputs: RecoveryInputs,
): RecoveryEstimate {
  const { fatigue, hoursSinceLastTrained, sevenDayFrequency, sessionIntensityProxy, blockType } = inputs;

  // ── Cache check ──────────────────────────────────────────────────────────
  const key = cacheKey(muscle, fatigue, hoursSinceLastTrained, sevenDayFrequency, sessionIntensityProxy, blockType);
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.result;
  }

  // ── Adjusted recovery rate (fatigue points per hour) ────────────────────
  const adjustedRate =
    BASE_RATE_PER_HOUR
    * frequencyModifier(sevenDayFrequency)
    * intensityModifier(sessionIntensityProxy)
    * blockModifier(blockType);

  // ── Fatigue already recovered since last session ─────────────────────────
  // Exponential decay: f(t) = fatigue × e^(−k×t) where k = adjustedRate/100
  // Already recovered = fatigue − f(t) = fatigue × (1 − e^(−k×t))
  const k = adjustedRate / 100;
  const alreadyRecovered = fatigue * (1 - Math.exp(-k * hoursSinceLastTrained));
  const remainingFatigue = Math.max(fatigue - alreadyRecovered, 0);

  // ── Time to reach recovery floor from remaining fatigue ─────────────────
  // Linear approximation from this point: hoursToRecover = excess / rate
  const excessFatigue = Math.max(remainingFatigue - RECOVERY_FLOOR, 0);
  const estimatedHoursToRecover = adjustedRate > 0 ? excessFatigue / adjustedRate : 0;

  // ── Status is based on the current (post-decay) fatigue level ───────────
  const status = statusFromFatigue(remainingFatigue);

  const result: RecoveryEstimate = {
    estimatedHoursToRecover: Math.max(0, estimatedHoursToRecover),
    status,
    recommendation: buildRecommendation(muscle, status, estimatedHoursToRecover, blockType),
    fatigueLevel: remainingFatigue,
  };

  // ── Store in cache ───────────────────────────────────────────────────────
  cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });

  return result;
}

/**
 * Estimate recovery for every muscle group in a MuscleFatigueMap.
 *
 * @param fatigueMap         - Current fatigue levels per muscle
 * @param hoursSince         - Hours since the last session that targeted each muscle
 *                             (pass a single value; per-muscle differentiation is a
 *                              future enhancement)
 * @param sevenDayFrequency  - Average training frequency per muscle in last 7 days
 * @param sessionIntensity   - Average RPE of recent sessions (1–10)
 * @param blockType          - Current training block
 * @returns Map from MuscleGroup → RecoveryEstimate
 */
export function estimateAllMuscles(
  fatigueMap: MuscleFatigueMap,
  hoursSince: number,
  sevenDayFrequency: number,
  sessionIntensity: number,
  blockType: BlockType,
): Map<MuscleGroup, RecoveryEstimate> {
  const result = new Map<MuscleGroup, RecoveryEstimate>();

  for (const [muscle, fatigue] of Object.entries(fatigueMap) as [MuscleGroup, number][]) {
    result.set(
      muscle,
      estimateRecovery(muscle, {
        fatigue,
        hoursSinceLastTrained: hoursSince,
        sevenDayFrequency,
        sessionIntensityProxy: sessionIntensity,
        blockType,
      }),
    );
  }

  return result;
}

/**
 * Invalidate all cached recovery estimates.
 * Call this after saving new session data so stale estimates are not served.
 */
export function clearRecoveryCache(): void {
  cache.clear();
}

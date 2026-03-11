/**
 * lib/healthkit/cardioEffort.ts — HR-based cardio effort estimation
 *
 * Uses heart rate data from Apple Health/Watch to classify cardio workout
 * intensity more accurately than RPE alone.
 *
 * Implements a simplified TRIMP (Training Impulse) model:
 *   TRIMP = duration(min) × ΔHR_ratio × zone_weight
 *
 *   where ΔHR_ratio = (avgHR - restingHR) / (maxHR - restingHR)
 *   and zone_weight scales exponentially with intensity
 *
 * HR Zones (based on % max HR):
 *   Zone 1: < 60%   — Recovery
 *   Zone 2: 60-70%  — Aerobic base
 *   Zone 3: 70-80%  — Tempo
 *   Zone 4: 80-90%  — Threshold
 *   Zone 5: > 90%   — VO2max
 *
 * Pure functions — no I/O.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type HRZone = 1 | 2 | 3 | 4 | 5;

export type CardioEffortResult = {
  /** TRIMP score (arbitrary units, higher = more stress) */
  trimp: number;
  /** Primary HR zone during the workout */
  primaryZone: HRZone;
  /** Zone label */
  zoneLabel: string;
  /** Average HR as percentage of max */
  avgHRPercent: number;
  /** Mapped to existing cardioIntensity scale (1–10) */
  cardioIntensity: number;
  /** Time in each zone (minutes), if per-sample data available */
  timeInZones: Record<HRZone, number>;
};

// ── Constants ────────────────────────────────────────────────────────────────

const ZONE_LABELS: Record<HRZone, string> = {
  1: 'Recovery',
  2: 'Aerobic',
  3: 'Tempo',
  4: 'Threshold',
  5: 'VO2max',
};

/**
 * TRIMP zone weights — exponential scaling to reflect that higher
 * intensity zones produce disproportionately more training stress.
 */
const ZONE_WEIGHTS: Record<HRZone, number> = {
  1: 1.0,
  2: 1.5,
  3: 2.0,
  4: 3.0,
  5: 4.5,
};

/** Default estimated max HR when age is unknown. */
const DEFAULT_MAX_HR = 190;

/** Default resting HR when not available from HealthKit. */
const DEFAULT_RESTING_HR = 65;

// ── Zone Classification ──────────────────────────────────────────────────────

/**
 * Classify a heart rate value into an HR zone based on % of max HR.
 */
function classifyZone(hr: number, maxHR: number): HRZone {
  const pct = hr / maxHR;
  if (pct < 0.60) return 1;
  if (pct < 0.70) return 2;
  if (pct < 0.80) return 3;
  if (pct < 0.90) return 4;
  return 5;
}

/**
 * Map an HR zone to the existing cardioIntensity scale (1–10)
 * used by `lib/adaptationModel.ts`.
 *
 *   Zone 1 → intensity 3
 *   Zone 2 → intensity 5
 *   Zone 3 → intensity 6
 *   Zone 4 → intensity 8
 *   Zone 5 → intensity 10
 */
function zoneToCardioIntensity(zone: HRZone): number {
  const map: Record<HRZone, number> = {
    1: 3,
    2: 5,
    3: 6,
    4: 8,
    5: 10,
  };
  return map[zone];
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Estimate cardio effort from heart rate data.
 *
 * @param heartRateSamples - Array of { value: number; startDate: string } samples
 * @param restingHR        - User's resting HR (from HealthKit or default)
 * @param durationMinutes  - Total workout duration in minutes
 * @param maxHR            - Estimated max HR (220 - age, or default 190)
 */
export function estimateCardioEffort(
  heartRateSamples: Array<{ value: number; startDate: string }>,
  restingHR: number | null,
  durationMinutes: number,
  maxHR = DEFAULT_MAX_HR,
): CardioEffortResult {
  const rhr = restingHR ?? DEFAULT_RESTING_HR;
  const hrReserve = Math.max(1, maxHR - rhr);

  // ── No HR data: return default estimate ────────────────────────────────
  if (!heartRateSamples || heartRateSamples.length === 0) {
    return {
      trimp: durationMinutes * 1.5, // Moderate default
      primaryZone: 2,
      zoneLabel: 'Aerobic',
      avgHRPercent: 65,
      cardioIntensity: 5,
      timeInZones: { 1: 0, 2: durationMinutes, 3: 0, 4: 0, 5: 0 },
    };
  }

  // ── Compute average HR and zone distribution ───────────────────────────
  let totalHR = 0;
  const timeInZones: Record<HRZone, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  // Approximate time per sample: total duration / sample count
  const timePerSample = durationMinutes / heartRateSamples.length;

  for (const sample of heartRateSamples) {
    totalHR += sample.value;
    const zone = classifyZone(sample.value, maxHR);
    timeInZones[zone] += timePerSample;
  }

  const avgHR = totalHR / heartRateSamples.length;
  const avgHRPercent = Math.round((avgHR / maxHR) * 100);
  const primaryZone = classifyZone(avgHR, maxHR);

  // ── TRIMP calculation ──────────────────────────────────────────────────
  // Simplified TRIMP: duration × ΔHR_ratio × zone_weight
  const deltaHRRatio = Math.max(0, (avgHR - rhr) / hrReserve);
  const trimp = Math.round(
    durationMinutes * deltaHRRatio * ZONE_WEIGHTS[primaryZone] * 10,
  ) / 10;

  return {
    trimp,
    primaryZone,
    zoneLabel: ZONE_LABELS[primaryZone],
    avgHRPercent,
    cardioIntensity: zoneToCardioIntensity(primaryZone),
    timeInZones: {
      1: Math.round(timeInZones[1] * 10) / 10,
      2: Math.round(timeInZones[2] * 10) / 10,
      3: Math.round(timeInZones[3] * 10) / 10,
      4: Math.round(timeInZones[4] * 10) / 10,
      5: Math.round(timeInZones[5] * 10) / 10,
    },
  };
}

/**
 * Estimate max HR from age using the standard formula.
 * Returns DEFAULT_MAX_HR if age is not available.
 */
export function estimateMaxHR(age: number | null): number {
  if (age == null || age <= 0 || age > 120) return DEFAULT_MAX_HR;
  return 220 - age;
}

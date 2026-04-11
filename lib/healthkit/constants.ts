/**
 * lib/healthkit/constants.ts — Permission sets, cache TTLs, and thresholds
 *
 * Defines the three permission tiers (minimum → enhanced → full) and
 * the write permission set. All constants are typed arrays of HealthKit
 * permission strings from react-native-health.
 */

// ── Permission Tiers ─────────────────────────────────────────────────────────

/**
 * Minimum permissions for MVP functionality.
 * Weight (existing), workouts (external detection), steps (activity).
 */
export const MINIMUM_READ_PERMISSIONS = [
  'BodyMass',
  'Workout',
  'StepCount',
  'Height',
  'DateOfBirth',
  'BiologicalSex',
] as const;

/**
 * Enhanced permissions for improved readiness scoring.
 * Adds heart rate, resting HR, and active energy.
 */
export const ENHANCED_READ_PERMISSIONS = [
  'HeartRate',
  'RestingHeartRate',
  'ActiveEnergyBurned',
] as const;

/**
 * Full permissions for complete health integration.
 * Adds HRV and sleep analysis.
 */
export const FULL_READ_PERMISSIONS = [
  'HeartRateVariability',
  'SleepAnalysis',
] as const;

/**
 * All read permissions combined.
 */
export const ALL_READ_PERMISSIONS = [
  ...MINIMUM_READ_PERMISSIONS,
  ...ENHANCED_READ_PERMISSIONS,
  ...FULL_READ_PERMISSIONS,
] as const;

/**
 * Write permissions — workout write only.
 * Requested separately from read permissions.
 */
export const WRITE_PERMISSIONS = [
  'Workout',
] as const;

// ── Cache TTLs (ms) ──────────────────────────────────────────────────────────

/**
 * Per-type cache TTLs. More volatile data types refresh more frequently.
 *
 *   Heart rate:       5 min  — changes frequently during/after exercise
 *   Resting HR:       5 min  — Apple computes this periodically
 *   HRV:              5 min  — sampled during sleep/rest
 *   Steps:           15 min  — accumulates throughout the day
 *   Active energy:   15 min  — accumulates throughout the day
 *   Sleep:            1 hour — doesn't change once morning arrives
 *   Daily snapshot:  15 min  — composite of the above
 *   Weekly snapshots: 15 min — historical, mostly stable
 *   External workouts: 30 min — new workouts arrive infrequently
 */
export const CACHE_TTLS = {
  'heart-rate':        5 * 60_000,
  'resting-hr':        5 * 60_000,
  'hrv':               5 * 60_000,
  'steps':            15 * 60_000,
  'active-energy':    15 * 60_000,
  'sleep':            60 * 60_000,
  'daily-snapshot':   15 * 60_000,
  'weekly-snapshots': 15 * 60_000,
  'external-workouts': 30 * 60_000,
} as const;

// ── Stale Data Thresholds ────────────────────────────────────────────────────

/**
 * Maximum age (in hours) before health data is considered "stale"
 * and confidence is downgraded.
 *
 *   < STALE_MEDIUM_HOURS  → confidence: high
 *   < STALE_LOW_HOURS     → confidence: medium
 *   >= STALE_LOW_HOURS    → confidence: low
 */
export const STALE_MEDIUM_HOURS = 12;
export const STALE_LOW_HOURS = 24;

// ── Readiness Integration Constants ──────────────────────────────────────────

/**
 * Minimum confidence threshold for the health signal to influence
 * the readiness score. Below this, original weights are used.
 */
export const HEALTH_SIGNAL_MIN_CONFIDENCE = 0.3;

/**
 * Weight allocated to the health signal component when confidence
 * is above the minimum threshold.
 */
export const HEALTH_SIGNAL_WEIGHT = 0.14;

// ── Background Activity Thresholds ───────────────────────────────────────────

export const STEP_THRESHOLDS = {
  sedentary: 5_000,
  normal: 10_000,
  active: 15_000,
} as const;

// ── External Workout Classification ──────────────────────────────────────────

/**
 * Map HealthKit activity type names to our simplified categories.
 */
export const ACTIVITY_TYPE_MAP: Record<string, string> = {
  Running:                        'cardio',
  Cycling:                        'cardio',
  Swimming:                       'cardio',
  Rowing:                         'cardio',
  Elliptical:                     'cardio',
  StairClimbing:                  'cardio',
  JumpRope:                       'cardio',
  Walking:                        'walking',
  Hiking:                         'walking',
  TraditionalStrengthTraining:    'strength',
  FunctionalStrengthTraining:     'strength',
  HighIntensityIntervalTraining:  'hiit',
  CrossTraining:                  'hiit',
  Yoga:                           'flexibility',
  Pilates:                        'flexibility',
  Soccer:                         'sport',
  Basketball:                     'sport',
  Tennis:                         'sport',
  MartialArts:                    'sport',
  Dance:                          'sport',
} as const;

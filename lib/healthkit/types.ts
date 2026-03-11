/**
 * lib/healthkit/types.ts — TypeScript types for HealthKit integration
 *
 * All types used by the HealthKit service layer, hooks, and integration
 * modules. Mirrors Apple HealthKit data structures mapped to our domain.
 */

// ── Confidence ───────────────────────────────────────────────────────────────

/**
 * How much trust to place in a health data value.
 *
 *   high   — direct Apple Watch sensor reading with recent timestamp
 *   medium — derived or aggregated value, or data > 12h old
 *   low    — estimated, extrapolated, or data > 24h old
 *   none   — no data available; value should be treated as neutral
 */
export type HealthDataConfidence = 'high' | 'medium' | 'low' | 'none';

// ── Heart Rate ───────────────────────────────────────────────────────────────

export type HealthKitHeartRateSample = {
  /** BPM value */
  value: number;
  /** ISO-8601 timestamp */
  startDate: string;
  endDate: string;
  /** Source device or app */
  sourceName?: string;
};

export type HealthKitHeartRateData = {
  samples: HealthKitHeartRateSample[];
  /** Average BPM across all samples in the window */
  average: number | null;
  /** Min BPM */
  min: number | null;
  /** Max BPM */
  max: number | null;
};

// ── Resting Heart Rate ───────────────────────────────────────────────────────

export type HealthKitRestingHRData = {
  /** Today's resting HR in BPM (null if unavailable) */
  value: number | null;
  /** 7-day average for baseline comparison */
  sevenDayAverage: number | null;
  /** Percent deviation from baseline (positive = elevated) */
  deviationPercent: number | null;
  confidence: HealthDataConfidence;
};

// ── HRV ──────────────────────────────────────────────────────────────────────

export type HealthKitHRVSample = {
  /** SDNN value in milliseconds */
  value: number;
  startDate: string;
  endDate: string;
  sourceName?: string;
};

export type HealthKitHRVData = {
  /** Most recent HRV reading (SDNN, ms) */
  value: number | null;
  /** 7-day average SDNN for baseline */
  sevenDayAverage: number | null;
  /** Percent deviation from baseline (negative = suppressed) */
  deviationPercent: number | null;
  confidence: HealthDataConfidence;
};

// ── Sleep ────────────────────────────────────────────────────────────────────

export type SleepStage = 'awake' | 'rem' | 'core' | 'deep' | 'inBed' | 'asleep';

export type HealthKitSleepSample = {
  value: SleepStage;
  startDate: string;
  endDate: string;
  sourceName?: string;
};

export type HealthKitSleepData = {
  /** Total hours of sleep (all stages except awake/inBed) */
  totalHours: number | null;
  /** Breakdown by stage in hours */
  stages: Partial<Record<SleepStage, number>>;
  /** Bed-in to bed-out duration in hours */
  inBedHours: number | null;
  /** Sleep efficiency: totalSleep / inBed (0–1) */
  efficiency: number | null;
  confidence: HealthDataConfidence;
};

// ── Activity ─────────────────────────────────────────────────────────────────

export type HealthKitActivityData = {
  /** Total steps for the day */
  steps: number | null;
  /** Walking + running distance in km */
  walkingRunningDistanceKm: number | null;
  /** Active energy burned in kcal */
  activeEnergyKcal: number | null;
  confidence: HealthDataConfidence;
};

// ── External Workouts ────────────────────────────────────────────────────────

/**
 * Workout activity types from Apple HealthKit.
 * Not exhaustive — covers the most common types we care about.
 */
export type HealthKitActivityType =
  | 'Running'
  | 'Cycling'
  | 'Swimming'
  | 'Walking'
  | 'Hiking'
  | 'Yoga'
  | 'TraditionalStrengthTraining'
  | 'FunctionalStrengthTraining'
  | 'HighIntensityIntervalTraining'
  | 'CrossTraining'
  | 'Elliptical'
  | 'Rowing'
  | 'StairClimbing'
  | 'Soccer'
  | 'Basketball'
  | 'Tennis'
  | 'MartialArts'
  | 'Dance'
  | 'Pilates'
  | 'JumpRope'
  | 'Other';

export type HealthKitWorkout = {
  /** Unique identifier from HealthKit */
  id: string;
  /** HealthKit activity type string */
  activityType: string;
  /** Mapped activity type */
  activityCategory: 'cardio' | 'strength' | 'hiit' | 'sport' | 'flexibility' | 'walking' | 'other';
  /** ISO-8601 start */
  startDate: string;
  /** ISO-8601 end */
  endDate: string;
  /** Duration in minutes */
  durationMinutes: number;
  /** Active calories burned (kcal), null if unavailable */
  caloriesBurned: number | null;
  /** Average heart rate during workout, null if no HR data */
  averageHeartRate: number | null;
  /** Source app or device name */
  sourceName: string;
  /** Whether this workout overlaps with a LockedInFIT session */
  isExternal: boolean;
};

export type HealthExternalWorkout = {
  id: string;
  activityType: string;
  startDate: string;
  endDate: string;
  duration: number;
  calories: number;
  source: string;
};

// ── Workout Write ────────────────────────────────────────────────────────────

export type HealthKitWorkoutWrite = {
  /** HealthKit activity type string */
  type: string;
  /** ISO-8601 start */
  startDate: string;
  /** ISO-8601 end */
  endDate: string;
  /** Duration in minutes */
  duration: number;
  /** Active energy burned in kcal */
  energyBurned: number;
  /** Optional metadata */
  metadata?: Record<string, string>;
};

// ── Daily Snapshot ────────────────────────────────────────────────────────────

/**
 * Combined daily health data snapshot.
 * Used by readiness scoring, recovery dashboard, and fatigue models.
 */
export type HealthDailySnapshot = {
  /** ISO-8601 date string (start of day) */
  date: string;
  /** Total steps */
  steps: number | null;
  /** Average heart rate (BPM) */
  heartRate: number | null;
  /** Resting heart rate (BPM) */
  restingHeartRate: number | null;
  /** HRV SDNN (ms) */
  hrv: number | null;
  /** Active energy burned (kcal) */
  activeEnergy: number | null;
  /** Total sleep hours */
  sleepHours: number | null;
};

/**
 * Full health data snapshot with trend data, used by the readiness engine.
 */
export type HealthDataSnapshot = {
  /** Today's data */
  today: HealthDailySnapshot;
  /** 7-day history (index 0 = yesterday, index 6 = 7 days ago) */
  history: HealthDailySnapshot[];
  /** Resting HR analysis */
  restingHR: HealthKitRestingHRData;
  /** HRV analysis */
  hrv: HealthKitHRVData;
  /** Sleep analysis */
  sleep: HealthKitSleepData;
  /** Activity data */
  activity: HealthKitActivityData;
  /** Overall data completeness (0–1) */
  dataCompleteness: number;
};

// ── Health Signal (output of readiness computation) ──────────────────────────

export type HealthSignalFactors = {
  restingHR: number;   // 0–100 contribution
  hrv: number;         // 0–100 contribution
  sleep: number;       // 0–100 contribution
  backgroundActivity: number; // 0–100 contribution
};

export type HealthSignalResult = {
  /** Composite health signal score (0–100) */
  score: number;
  /** Data confidence (0–1.0) */
  confidence: number;
  /** Per-factor breakdown */
  factors: HealthSignalFactors;
  /** Human-readable explanation */
  label: string;
};

// ── Error ────────────────────────────────────────────────────────────────────

export class HealthKitError extends Error {
  constructor(
    message: string,
    public readonly code: 'not_available' | 'permission_denied' | 'not_linked' | 'fetch_failed' | 'write_failed',
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'HealthKitError';
  }
}

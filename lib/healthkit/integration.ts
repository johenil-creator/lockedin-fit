/**
 * lib/healthkit/integration.ts — Glue connecting health data to existing systems.
 *
 * Provides high-level functions that the UI layer calls to get
 * health-enhanced readiness, adjusted training load, and workout sync.
 */

import type { HealthDataSnapshot } from './types';
import type { ReadinessParams } from '../readinessScore';
import { computeReadiness } from '../readinessScore';
import type { ReadinessScore } from '../types';
import { computeHealthSignal } from './readinessFromHealth';
import {
  processExternalWorkouts,
  adjustACWRForExternalLoad,
} from './externalLoadFromHealth';
import { estimateBackgroundFatigue } from './backgroundFatigue';
import { updateTrainingLoad } from '../adaptationModel';
import type { WorkoutSession, TrainingLoadRecord } from '../types';
import type { HealthKitWorkout, HealthKitWorkoutWrite } from './types';
import { writeWorkout, checkAvailability } from './HealthKitService';
import { loadProfile } from '../storage';
import { estimateCalories } from '../cardioCalories';
import type { CardioModality } from '../cardioSuggestions';

// ── Enhanced Readiness ───────────────────────────────────────────────────────

/**
 * Compute readiness score with optional health signal enhancement.
 *
 * If healthSnapshot is available, computes the health signal and
 * passes it to the readiness engine. Otherwise falls back to the
 * original 5-component scoring.
 */
export function getEnhancedReadiness(
  baseParams: ReadinessParams,
  healthSnapshot: HealthDataSnapshot | null,
): ReadinessScore {
  const healthSignal = computeHealthSignal(healthSnapshot);

  return computeReadiness({
    ...baseParams,
    healthSignal:
      healthSignal.confidence > 0
        ? { score: healthSignal.score, confidence: healthSignal.confidence }
        : undefined,
  });
}

// ── Adjusted Training Load ───────────────────────────────────────────────────

/**
 * Compute training load that includes external workout contributions.
 *
 * External workouts are detected from Apple Health and their estimated
 * load is folded into the ACWR calculation.
 */
export function getAdjustedTrainingLoad(
  sessions: WorkoutSession[],
  externalWorkouts: HealthKitWorkout[],
  readiness = 50,
  estimatedMaxHR = 190,
): TrainingLoadRecord {
  // Compute base training load from in-app sessions
  const baseLoad = updateTrainingLoad(sessions, readiness);

  // Process external workouts
  if (externalWorkouts.length === 0) return baseLoad;

  const externalSummary = processExternalWorkouts(externalWorkouts, estimatedMaxHR);

  if (externalSummary.totalExternalLoad <= 0) return baseLoad;

  // Adjust ACWR to include external load
  const adjustedACWR = adjustACWRForExternalLoad(
    baseLoad.acwr,
    baseLoad.acuteLoad,
    baseLoad.chronicLoad,
    externalSummary.totalExternalLoad,
  );

  return {
    ...baseLoad,
    acwr: adjustedACWR,
    acuteLoad: baseLoad.acuteLoad + externalSummary.totalExternalLoad,
  };
}

// ── Background Fatigue Modifier ──────────────────────────────────────────────

/**
 * Get the recovery rate modifier based on today's background activity.
 * Multiplier < 1.0 means recovery is slowed.
 */
export function getRecoveryModifier(
  steps: number | null,
  activeEnergy: number | null,
  walkingDistance: number | null,
): number {
  const result = estimateBackgroundFatigue(steps, activeEnergy, walkingDistance);
  return result.recoveryModifier;
}

// ── Workout Sync ─────────────────────────────────────────────────────────────

/**
 * Write a completed LockedInFIT session to Apple Health.
 *
 * Reads auto-sync preference from cache. If disabled or unavailable,
 * returns false silently. Fire-and-forget — never throws.
 *
 * @param session  - The completed WorkoutSession
 * @param force    - If true, skip the auto-sync preference check
 */
export async function syncCompletedSession(
  session: WorkoutSession,
  force = false,
): Promise<boolean> {
  if (!checkAvailability()) return false;

  if (!force) {
    const { getCached } = await import('./cache');
    const autoSync = await getCached<boolean>('auto-sync-enabled');
    if (!autoSync) return false;
  }

  try {
    const startDate = session.startedAt ?? session.date;
    const endDate = session.completedAt ?? new Date().toISOString();
    const durationMs = new Date(endDate).getTime() - new Date(startDate).getTime();
    const durationMin = durationMs / 60_000;

    // Resolve body weight in kg for MET-based calorie estimation
    const profile = await loadProfile();
    const weightKg = profile ? profileWeightKg(profile.weight, profile.weightUnit) : 75;

    let energyBurned: number;
    let distanceMeters: number | undefined;

    if (session.sessionType === 'cardio') {
      const modality = (session.cardioModality ?? 'other') as CardioModality;
      const activeMs = session.cardioDurationMs ?? durationMs;
      const rpe = session.cardioIntensity ?? 5;
      const { active } = estimateCalories(modality, weightKg, activeMs, rpe);
      energyBurned = active;
      if (session.cardioDistanceKm && session.cardioDistanceKm > 0) {
        distanceMeters = Math.round(session.cardioDistanceKm * 1000);
      }
    } else {
      // Strength: MET ≈ 5 (resistance training, moderate) × weight × hours
      energyBurned = Math.round(5 * weightKg * (durationMin / 60));
    }

    const workout: HealthKitWorkoutWrite = {
      type:
        session.sessionType === 'cardio'
          ? mapCardioType(session.cardioModality)
          : 'TraditionalStrengthTraining',
      startDate,
      endDate,
      duration: durationMin,
      energyBurned,
      distanceMeters,
      metadata: { source: 'LockedInFIT', sessionId: session.id },
    };

    await writeWorkout(workout);
    return true;
  } catch (e) {
    if (__DEV__) console.warn("[healthIntegration] caught:", e);
    return false;
  }
}

/** Parse UserProfile.weight (string) into kilograms. */
function profileWeightKg(weight: string, unit: 'kg' | 'lbs'): number {
  const n = parseFloat(weight);
  if (!Number.isFinite(n) || n <= 0) return 75;
  return unit === 'lbs' ? n * 0.453592 : n;
}

function mapCardioType(modality?: string): string {
  const map: Record<string, string> = {
    running: 'Running',
    cycling: 'Cycling',
    rowing: 'Rowing',
    walking: 'Walking',
    swimming: 'Swimming',
    elliptical: 'Elliptical',
    stairclimber: 'StairClimbing',
  };
  return map[modality ?? ''] ?? 'Other';
}

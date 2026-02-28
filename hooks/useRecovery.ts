/**
 * hooks/useRecovery.ts — Recovery dashboard data orchestrator.
 *
 * Loads all recovery-related data in a single Promise.all on mount:
 *   RecoveryBundle  (fatigueState + dailySnapshots) — single multiGet
 *   StreakData       — for streak modifier in readiness
 *   TrainingLoad     — for ACWR / adaptation score
 *   PlanData         — for block context and forecast exercises
 *   WorkoutSessions  — for plateau detection
 *   UserProfile      — for 1RM plateau baseline
 *
 * Computes (in dependency order):
 *   1. Decayed fatigue map     (exponential half-life model → full MuscleFatigueMap)
 *   2. Block context           (getCurrentBlock from blockPeriodization)
 *   3. Readiness history       (from dailySnapshots, newest-first)
 *   4. Fatigue forecast        (forecastNextSession → forecastRisk)
 *   5. Readiness score         (computeReadiness)
 *   6. Plateau detection       (detectPlateau)
 *   7. Deload trigger          (checkDeloadTrigger)
 *   8. Deload card content     (formatDeloadCard)
 *   9. Coach output            (getCoachOutput)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadPlan,
  loadProfile,
  loadRecoveryBundle,
  loadStreak,
  loadTrainingLoad,
  loadWorkouts,
} from '../lib/storage';
import {
  getCurrentBlock,
  type BlockContext,
} from '../lib/blockPeriodization';
import {
  getCoachOutput,
  type CoachOutput,
} from '../lib/lockeCoachEngine';
import { computeReadiness } from '../lib/readinessScore';
import { detectPlateau } from '../lib/plateauDetection';
import { checkDeloadTrigger, formatDeloadCard, type DeloadCard } from '../lib/smartDeload';
import { forecastNextSession, type ForecastResult } from '../lib/fatigueForecast';
import { emptyFatigueMap } from '../lib/muscleMapping';
import type {
  BlockWeekPosition,
  DailySnapshot,
  DeloadTrigger,
  ForecastWarning,
  MuscleGroup,
  MuscleFatigueMap,
  PlateauInsight,
  ReadinessScore,
  StreakData,
  TrainingLoadRecord,
} from '../lib/types';

// ── Fatigue decay ─────────────────────────────────────────────────────────────
function applyDecay(
  rawFatigueMap: MuscleFatigueMap,
  computedAt: string,
  halfLifeHours: number,
): MuscleFatigueMap {
  const elapsedHours = (Date.now() - new Date(computedAt).getTime()) / 3_600_000;
  const k = Math.LN2 / halfLifeHours;
  const result = { ...rawFatigueMap };
  for (const muscle of Object.keys(result) as MuscleGroup[]) {
    result[muscle] = Math.max(0, result[muscle] * Math.exp(-k * elapsedHours));
  }
  return result;
}

// ── WeekPosition → BlockWeekPosition bridge ───────────────────────────────────
// blockPeriodization.ts uses 'deload'; lockeCoachEngine expects 'pivot_deload'.
function toBlockWeekPosition(wp: string): BlockWeekPosition {
  return wp === 'deload' ? 'pivot_deload' : (wp as BlockWeekPosition);
}

// ── Public types ──────────────────────────────────────────────────────────────
export type RecoveryData = {
  fatigueMap: MuscleFatigueMap;
  readiness: ReadinessScore;
  blockContext: BlockContext | null;
  /** True when the deload engine recommends a deload this week. */
  deloadTriggered: boolean;
  /** Full deload trigger output (reasons + prescription fractions). */
  deloadTrigger: DeloadTrigger | null;
  /** Formatted card content for the DeloadCard UI section. */
  deloadCard: DeloadCard | null;
  coach: CoachOutput;
  snapshots: DailySnapshot[];
  trainingLoad: TrainingLoadRecord | null;
  streak: StreakData | null;
  plateau: PlateauInsight | null;
  /** Per-muscle forecast warnings for the next planned session. */
  forecast: ForecastWarning[];
  /** Full forecast result (projected map + suggestions). */
  forecastResult: ForecastResult | null;
};

export type UseRecoveryReturn = {
  loading: boolean;
  data: RecoveryData | null;
  refresh: () => void;
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useRecovery(): UseRecoveryReturn {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RecoveryData | null>(null);
  // Prevent double-load on StrictMode double-invoke
  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      // Single Promise.all — all storage reads fire in parallel
      const [bundle, streak, trainingLoad, plan, workouts, profile] = await Promise.all([
        loadRecoveryBundle(),
        loadStreak(),
        loadTrainingLoad(),
        loadPlan(),
        loadWorkouts(),
        loadProfile(),
      ]);

      // ── 1. Apply fatigue decay → full MuscleFatigueMap ─────────────────────
      const decayed: MuscleFatigueMap = bundle.fatigueState
        ? applyDecay(
            bundle.fatigueState.rawFatigueMap,
            bundle.fatigueState.computedAt,
            bundle.fatigueState.halfLifeHours,
          )
        : emptyFatigueMap();
      // Merge over a zero-filled base so all 16 muscle keys are always present
      const fatigueMap: MuscleFatigueMap = { ...emptyFatigueMap(), ...decayed };

      // ── 2. Block context ────────────────────────────────────────────────────
      const planWeek   = plan?.currentWeek ?? 1;
      const totalWeeks = plan?.totalWeeks ?? 12;
      const blockContext: BlockContext | null = plan
        ? getCurrentBlock(planWeek, totalWeeks)
        : null;
      const blockType    = blockContext?.blockType ?? 'accumulation';
      const weekPosition = toBlockWeekPosition(blockContext?.weekPosition ?? 'build');

      // ── 3. Readiness history (newest-first from snapshots) ─────────────────
      const readinessHistory = bundle.dailySnapshots.map((s) => s.readinessScore.score);

      // ── 4. Fatigue forecast for next session ───────────────────────────────
      const nextExercises = plan?.data ?? [];
      let forecastResult: ForecastResult | null = null;
      if (nextExercises.length > 0) {
        forecastResult = forecastNextSession({
          currentFatigueMap: fatigueMap,
          nextExercises,
          nextDayLabel:      plan?.name ?? 'Next Session',
          hoursUntilSession: 12,
          blockType,
        });
      }
      // forecastRisk: 0–100 representing % of muscle groups projected overtrained
      const overtrainedCount = forecastResult?.overtrainedMuscles.length ?? 0;
      const forecastRisk = Math.min(100, Math.round((overtrainedCount / 16) * 100));

      // ── 5. Readiness score ─────────────────────────────────────────────────
      const readiness = computeReadiness({
        fatigueMap,
        blockType,
        streakDays:  streak?.current ?? 0,
        forecastRisk,
        acwr:        trainingLoad?.acwr ?? 1.0,
      });

      // ── 6. Plateau detection ────────────────────────────────────────────────
      let plateau: PlateauInsight | null = null;
      if (profile && workouts.length > 0) {
        plateau = detectPlateau(workouts, profile, readinessHistory);
      }

      // ── 7. Deload trigger ───────────────────────────────────────────────────
      const deloadTrigger = checkDeloadTrigger({
        fatigueMap,
        readinessHistory,
        plateau,
        acwr:        trainingLoad?.acwr ?? 1.0,
        blockType,
        weekPosition,
      });
      const deloadTriggered = deloadTrigger.triggered;

      // ── 8. Deload card content ──────────────────────────────────────────────
      const deloadCard = deloadTrigger.triggered
        ? formatDeloadCard(deloadTrigger, fatigueMap)
        : null;

      // ── 9. Coach output ─────────────────────────────────────────────────────
      const fatiguedMuscles = (Object.entries(fatigueMap) as [MuscleGroup, number][])
        .filter(([, v]) => v >= 50)
        .map(([m]) => m);
      const isOvertrained = (Object.values(fatigueMap) as number[]).some((v) => v >= 80);

      const coach = getCoachOutput({
        readinessScore:  readiness.score,
        fatiguedMuscles,
        isOvertrained,
        plateauInsight:  plateau,
        deloadTriggered,
        streakDays:      streak?.current ?? 0,
        hasPR:           false,
        blockType,
        weekPosition,
      });

      setData({
        fatigueMap,
        readiness,
        blockContext,
        deloadTriggered,
        deloadTrigger,
        deloadCard,
        coach,
        snapshots: bundle.dailySnapshots,
        trainingLoad,
        streak,
        plateau,
        forecast:       forecastResult?.warnings ?? [],
        forecastResult: forecastResult ?? null,
      });
    } catch (err) {
      // Surface nothing — data stays null, screen shows empty state
      console.warn('[useRecovery] load error', err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, data, refresh: load };
}

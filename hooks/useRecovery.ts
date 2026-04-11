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
  loadXP,
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
import {
  checkDeloadTrigger,
  formatDeloadCard,
  deloadTimingSuggestion as getDeloadTimingSuggestion,
  type DeloadCard,
} from '../lib/smartDeload';
import { forecastNextSession, type ForecastResult } from '../lib/fatigueForecast';
import { emptyFatigueMap } from '../lib/muscleMapping';
import {
  computeMuscleReadiness,
  type MuscleReadinessResult,
} from '../lib/muscleReadinessScore';
import {
  getRecoveryCommentary,
  type RecoveryCommentary,
} from '../lib/lockeRecoveryCommentary';
import type { MuscleEnergyState } from '../lib/muscleEnergyStates';
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

// ── Dominant state classifier (mirrors muscleEnergyStates.classifyState) ──────
function classifyDominantState(avgFatigue: number): MuscleEnergyState {
  if (avgFatigue <= 0)  return 'dormant';
  if (avgFatigue <= 20) return 'primed';
  if (avgFatigue <= 45) return 'charged';
  if (avgFatigue <= 65) return 'strained';
  if (avgFatigue <= 84) return 'overloaded';
  return 'peak';
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
  /** Upper/lower/total region readiness scores derived from the fatigue map. */
  muscleReadiness: MuscleReadinessResult;
  /** Context-aware Locke commentary for the muscle energy grid. */
  commentary: RecoveryCommentary;
  /**
   * When deload is triggered AND a scheduled deload is within 7 days, a suggestion
   * to pull it forward instead of adding an extra one. Otherwise null.
   */
  deloadTimingSuggestion: string | null;
};

export type UseRecoveryReturn = {
  loading: boolean;
  data: RecoveryData | null;
  refresh: () => void;
  /** Non-null when the last load/refresh failed. Cleared on next success. */
  error: string | null;
  /** True during a pull-to-refresh (not initial mount). */
  isRefreshing: boolean;
  /** Epoch ms of the last successful data load. */
  lastUpdated: number | null;
  /** True when the most recent workout session is older than 7 days. */
  staleData: boolean;
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useRecovery(): UseRecoveryReturn {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RecoveryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [staleData, setStaleData] = useState(false);
  // Prevent double-load on StrictMode double-invoke
  const loadingRef = useRef(false);
  // Track whether the initial load has completed
  const hasLoadedOnce = useRef(false);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    // Distinguish initial mount from pull-to-refresh
    if (hasLoadedOnce.current) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Single Promise.all — all storage reads fire in parallel
      const [bundle, streak, trainingLoad, plan, workouts, profile, xp] = await Promise.all([
        loadRecoveryBundle(),
        loadStreak(),
        loadTrainingLoad(),
        loadPlan(),
        loadWorkouts(),
        loadProfile(),
        loadXP(),
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
      let readiness = computeReadiness({
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
        acwr:              trainingLoad?.acwr ?? 1.0,
        blockType,
        weekPosition,
        trainingAgeWeeks:  trainingLoad?.trainingAgeWeeks ?? 0,
        chronicLoad:       trainingLoad?.chronicLoad ?? 0,
      });
      const deloadTriggered = deloadTrigger.triggered;

      // ── 7b. Cap readiness label when deload is triggered ────────────────────
      // The numeric score stays (it reflects component math), but the label
      // should never say "Ready" or "Prime" when a deload is active — that
      // creates a contradictory "Ready" + "Deload Recommended" situation.
      // Clone to avoid mutating the cached readiness object.
      if (deloadTriggered && (readiness.label === 'Ready' || readiness.label === 'Prime')) {
        readiness = { ...readiness, label: 'Manage Load' };
      }

      // ── 8. Deload card content ──────────────────────────────────────────────
      const deloadCard = deloadTrigger.triggered
        ? formatDeloadCard(deloadTrigger, fatigueMap)
        : null;

      // ── 8b. Deload timing suggestion ────────────────────────────────────────
      // Compute days until next scheduled deload week from plan position.
      // deloadTimingSuggestion returns non-null only if daysUntilDeload <= 7.
      const blockLength = Math.ceil(totalWeeks / 3);
      const blockNum    = Math.floor((planWeek - 1) / blockLength);
      const deloadWeek  = (blockNum + 1) * blockLength;
      const weeksUntilDeload = Math.max(0, deloadWeek - planWeek);
      const deloadTimingSuggestionText = deloadTrigger.triggered
        ? getDeloadTimingSuggestion(weekPosition, weeksUntilDeload * 7)
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

      // ── 10. Muscle readiness (upper / lower / total region scores) ──────────
      const muscleReadiness = computeMuscleReadiness(fatigueMap);

      // ── 11. Recovery commentary ─────────────────────────────────────────────
      // Dominant state: classify average fatigue across all 16 muscles
      const fatigueValues = Object.values(fatigueMap) as number[];
      const avgFatigue    = fatigueValues.reduce((s, v) => s + v, 0) / fatigueValues.length;
      const dominantState = classifyDominantState(avgFatigue);

      // Counts for special-case commentary paths
      const peakMuscleCount    = fatigueValues.filter((v) => v >= 85).length;
      const chargedMuscleCount = fatigueValues.filter((v) => v >= 21 && v <= 45).length;

      // Days since last session derived from most recent daily snapshot
      const lastSnapshotMs      = bundle.dailySnapshots.length > 0
        ? new Date(bundle.dailySnapshots[0].date).getTime()
        : null;
      const daysSinceLastSession = lastSnapshotMs !== null
        ? Math.floor((Date.now() - lastSnapshotMs) / (24 * 3_600_000))
        : 99;

      // Suppress supercomp/attack commentary when coach is in rest_day or
      // concerned mood to prevent contradictory messages (e.g., "Rest day.
      // Non-negotiable." alongside "This is a rare window — attack.").
      const suppressPositiveCommentary =
        coach.mood === 'rest_day' || coach.mood === 'concerned';

      const commentary = getRecoveryCommentary({
        dominantState,
        peakMuscleCount,
        chargedMuscleCount: suppressPositiveCommentary ? 0 : chargedMuscleCount,
        rank:                xp?.rank ?? 'Scout',
        daysSinceLastSession,
        upperReadiness:      muscleReadiness.upper.score,
        lowerReadiness:      muscleReadiness.lower.score,
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
        forecast:                 forecastResult?.warnings ?? [],
        forecastResult:           forecastResult ?? null,
        muscleReadiness,
        commentary,
        deloadTimingSuggestion:   deloadTimingSuggestionText,
      });

      // ── Success: clear error, record timestamp, detect stale data ────────
      setError(null);
      setLastUpdated(Date.now());

      // Stale if the most recent workout is older than 7 days (or no workouts)
      const STALE_THRESHOLD_MS = 7 * 24 * 3_600_000;
      if (workouts.length === 0) {
        setStaleData(true);
      } else {
        const mostRecent = workouts.reduce((latest, w) => {
          const t = new Date(w.date ?? w.completedAt ?? 0).getTime();
          return t > latest ? t : latest;
        }, 0);
        setStaleData(Date.now() - mostRecent > STALE_THRESHOLD_MS);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Recovery data failed to load';
      console.error('[useRecovery] load error', err);
      setError(message);
      if (__DEV__) {
        // In dev, rethrow so the error overlay shows the root cause
        throw err;
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      loadingRef.current = false;
      hasLoadedOnce.current = true;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, data, refresh: load, error, isRefreshing, lastUpdated, staleData };
}

/**
 * app/cardio-session.tsx — Active cardio session screen.
 *
 * Open-ended timer with live calorie + distance estimates.
 * LockedInFIT branded: themed dark surface, viridian accents, Locke mascot.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
  AppState,
  AppStateStatus,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { impact, ImpactStyle } from "../lib/haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useWorkouts } from "../hooks/useWorkouts";
import { useXP } from "../hooks/useXP";
import { useStreak, isoWeek } from "../hooks/useStreak";
import { useProfileContext } from "../contexts/ProfileContext";
import { useAppTheme } from "../contexts/ThemeContext";
import CountdownRing from "../components/cardio/CountdownRing";
import { MetricRow } from "../components/cardio/MetricRow";
import { WorkoutControls } from "../components/cardio/WorkoutControls";
import { LockeTipCard } from "../components/cardio/LockeTipCard";
import { LockeMascot } from "../components/Locke/LockeMascot";
import type { LockeMascotMood } from "../components/Locke/LockeMascot";
import { spacing } from "../lib/theme";
import { makeId } from "../lib/helpers";
import { watchSession } from "../lib/watchSession";
import { calculateCardioXP, calculateVirtualSets } from "../lib/cardioXp";
import { estimateCalories, estimateDistance, hasDistance } from "../lib/cardioCalories";
import { detectCardioPRs } from "../lib/prService";
import { checkBadges } from "../lib/badgeService";
import { applyXP, XP_AWARDS } from "../lib/xpService";
import { calculateSessionFangs } from "../lib/fangsService";
import { didRankUp, rankProgress, xpToNextRank, nextRank as getNextRank } from "../lib/rankService";
import type { WorkoutCompleteParams } from "../lib/xpService";
import type { WorkoutSession } from "../lib/types";
import type { CardioModality } from "../lib/cardioSuggestions";
import { useIconMood } from "../hooks/useIconMood";
import { syncCompletedSession } from "../lib/healthkit/integration";
import { cancelStreakRiskReminder } from "../lib/notifications";
import {
  loadActiveCardioSession,
  saveActiveCardioSession,
  clearActiveCardioSession,
  type ActiveCardioSnapshot,
} from "../lib/storage";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Color for the session based on RPE intensity. */
function intensityColor(rpe: number): string {
  if (rpe <= 3) return "#00875A"; // Easy — green
  if (rpe <= 5) return "#D9A100"; // Moderate — gold
  if (rpe <= 7) return "#E07A3F"; // Hard — orange
  return "#E63946";               // Very Hard — red
}

function intensityLabel(rpe: number): string {
  if (rpe <= 3) return "EASY";
  if (rpe <= 5) return "MODERATE";
  if (rpe <= 7) return "HARD";
  return "VERY HARD";
}

/** Format a pace value (sec/km) as "m:ss". */
function formatPaceValue(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Pace string (min:ss /km). Returns null until enough distance has accumulated. */
function formatPace(distKm: number | null, elapsedSec: number): string | null {
  if (!distKm || distKm < 0.05 || elapsedSec < 15) return null;
  return formatPaceValue(elapsedSec / distKm);
}

/** Pick Locke's mood based on session intensity, state, and elapsed time. */
function sessionMood(isPaused: boolean, elapsedSec: number, rpe: number): LockeMascotMood {
  if (isPaused) return "disappointed";
  // High-intensity sessions start intense immediately
  if (rpe >= 8) return elapsedSec >= 600 ? "savage" : "intense";
  // Recovery/easy sessions stay encouraging longer
  if (rpe <= 3) return elapsedSec >= 1800 ? "proud" : "encouraging";
  // Moderate-hard: escalate over time
  if (elapsedSec >= 1800) return "savage";
  if (elapsedSec >= 600) return "intense";
  return "encouraging";
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CardioSessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { workouts, addWorkout } = useWorkouts();
  const { xp, setXPRecord } = useXP();
  const { recordActivity } = useStreak();
  const { checkIconMood } = useIconMood();
  const { profileRef, updateProfile } = useProfileContext();

  // ── Parse params ──────────────────────────────────────────────────────────
  const params = useLocalSearchParams<{
    modality: string;
    intensity: string;
    name?: string;
  }>();

  const VALID_MODALITIES: CardioModality[] = [
    "running", "cycling", "rowing", "walking", "swimming",
    "elliptical", "stairclimber", "jump_rope", "other",
  ];
  const rawModality = params.modality ?? "other";
  const modality: CardioModality = VALID_MODALITIES.includes(rawModality as CardioModality)
    ? (rawModality as CardioModality)
    : "other";
  const intensity = Math.max(1, Math.min(10, parseInt(params.intensity ?? "5") || 5));
  const sessionName = params.name ?? modality.replace("_", " ");

  // ── Weight for calorie estimation ─────────────────────────────────────────
  const weightKg = useMemo(() => {
    const p = profileRef.current;
    const raw = parseFloat(p.weight) || 70;
    return p.weightUnit === "lbs" ? raw * 0.453592 : raw;
  }, []);

  const showDist = hasDistance(modality);
  // Walking and running use Watch CMPedometer — suppress the MET estimate for these
  // so there's no discontinuity when real data arrives (estimate starts non-zero,
  // pedometer starts from 0, causing a visible "reset").
  const isPedometerModality = modality === "walking" || modality === "running";

  // ── Wall-clock elapsed tracking (no accumulating counter = no drift) ────
  // accumulatedMs = total elapsed ms in completed run intervals
  // runSinceMs    = Date.now() when timer last started (null if paused/stopped)
  // elapsed = floor((accumulatedMs + (runSinceMs ? now - runSinceMs : 0)) / 1000)
  const accumulatedMsRef = useRef(0);
  const runSinceRef = useRef<number | null>(null);

  function computeElapsedSec(): number {
    const acc = accumulatedMsRef.current;
    const since = runSinceRef.current;
    return Math.floor((acc + (since !== null ? Date.now() - since : 0)) / 1000);
  }

  // ── Apple Watch sync helpers ──────────────────────────────────────────────
  const caloriesActiveRef = useRef(0);
  const distanceKmRef = useRef<number | null>(null);

  // Real distance from Watch CMPedometer — overrides the estimate when available.
  // null = Watch not streaming yet (e.g., non-walking modality or Watch not paired).
  const [realDistanceKm, setRealDistanceKm] = useState<number | null>(null);
  const realDistanceKmRef = useRef<number | null>(null);
  useEffect(() => { realDistanceKmRef.current = realDistanceKm; }, [realDistanceKm]);

  // Apple Watch currentPace (s/km), smoothed internally by CMPedometer.
  // null = stationary or pedometer not yet active. Overrides computed average pace.
  const [watchPaceSecPerKm, setWatchPaceSecPerKm] = useState<number | null>(null);

  useEffect(() => { watchSession.endWorkout(); return () => { watchSession.endWorkout(); }; }, []);

  // ── Countdown / session start ─────────────────────────────────────────────
  const [showCountdown, setShowCountdown] = useState(true);
  const sessionStartRef = useRef("");

  function startSession() {
    const nowMs = Date.now();
    runSinceRef.current = nowMs;
    accumulatedMsRef.current = 0;
    sessionStartRef.current = new Date(nowMs).toISOString();
    setShowCountdown(false);
    setIsRunning(true);
    setIsPaused(false);

    // virtualStartAt = now - elapsed = now - 0 = now (elapsed is 0 at start)
    // cardioModality tells Watch which CMPedometer-supported activity to track.
    watchSession.sendWorkoutState({
      exerciseName: sessionName.charAt(0).toUpperCase() + sessionName.slice(1),
      setIndex: 0, totalSets: 0, targetReps: '', targetWeight: 0,
      weightUnit: (profileRef.current.weightUnit as 'lb' | 'kg') ?? 'lb',
      isCardio: true,
      cardioVirtualStartAt: nowMs / 1000,
      cardioElapsedSec: 0,
      cardioCalories: 0,
      cardioDistanceKm: 0,
      cardioIsPaused: false,
      cardioModality: modality,
    });

    saveActiveCardioSession({
      modality, intensity, sessionName,
      startedAt: sessionStartRef.current,
      elapsedSec: 0, isPaused: false, savedAt: nowMs,
    }).catch(() => {});
  }

  // ── Restore session after force-quit ─────────────────────────────────────
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    loadActiveCardioSession().then((snap) => {
      if (!snap) return;
      if (snap.modality !== modality) { clearActiveCardioSession(); return; }
      const secSinceSave = Math.floor((Date.now() - snap.savedAt) / 1000);
      const totalElapsed = snap.isPaused ? snap.elapsedSec : snap.elapsedSec + secSinceSave;

      // Seed wall-clock refs from restored state
      accumulatedMsRef.current = totalElapsed * 1000;
      runSinceRef.current = snap.isPaused ? null : Date.now();

      sessionStartRef.current = snap.startedAt;
      setElapsedSec(totalElapsed);
      setIsPaused(snap.isPaused);
      setIsRunning(true);
      setShowCountdown(false);
    });
  }, []);

  // ── Timer state ───────────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  // ── Lock state ────────────────────────────────────────────────────────────
  const [isLocked, setIsLocked] = useState(false);
  const lockTouchRef = useRef(0);

  // ── Tick refs ─────────────────────────────────────────────────────────────
  const isRunningRef = useRef(isRunning);
  const isPausedRef = useRef(isPaused);

  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  const persistSnapshot = useCallback(() => {
    if (!isRunningRef.current) return;
    saveActiveCardioSession({
      modality, intensity, sessionName,
      startedAt: sessionStartRef.current,
      elapsedSec: computeElapsedSec(),
      isPaused: isPausedRef.current,
      savedAt: Date.now(),
    }).catch(() => {});
  }, [modality, intensity, sessionName]);

  // ── Periodic save (every 5s while running) ──────────────────────────────
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(persistSnapshot, 5000);
    return () => clearInterval(id);
  }, [isRunning, persistSnapshot]);

  // ── AppState — save snapshot on background (elapsed is wall-clock, no catch-up needed) ──
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "background" || state === "inactive") {
        persistSnapshot();
      } else if (state === "active") {
        // Wall-clock refs already account for background time — just refresh display
        if (isRunningRef.current) setElapsedSec(computeElapsedSec());
      }
    });
    return () => sub.remove();
  }, [persistSnapshot]);

  // ── Display tick (250 ms for snappy updates; elapsed derived from wall clock) ──
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setElapsedSec(computeElapsedSec());
    }, 250);
    return () => clearInterval(id);
  }, [isRunning]);

  // ── Live calorie + distance estimates ─────────────────────────────────────
  const durationMs = elapsedSec * 1000;

  const calories = useMemo(() => {
    const raw = estimateCalories(modality, weightKg, durationMs, intensity);
    // For pedometer modalities: scale by real/estimated distance ratio so calories
    // stay near 0 while stationary and ramp up proportionally to actual movement.
    if (isPedometerModality && realDistanceKm !== null && estimatedDistanceKm !== null && estimatedDistanceKm > 0) {
      const ratio = Math.min(1, realDistanceKm / estimatedDistanceKm);
      return { active: Math.round(raw.active * ratio), total: Math.round(raw.total * ratio) };
    }
    return raw;
  }, [modality, weightKg, durationMs, intensity, isPedometerModality, realDistanceKm, estimatedDistanceKm]);

  // MET-based estimate — used for non-pedometer modalities only.
  const estimatedDistanceKm = useMemo(
    () => estimateDistance(modality, durationMs, intensity),
    [modality, durationMs, intensity]
  );

  // For walking/running: only show real pedometer distance (null = still loading → "—").
  // For other modalities: use the MET estimate as before.
  const distanceKm = isPedometerModality ? realDistanceKm : estimatedDistanceKm;

  // ── Keep Watch sync refs current ─────────────────────────────────────────
  useEffect(() => { caloriesActiveRef.current = calories.active; }, [calories.active]);
  useEffect(() => { distanceKmRef.current = distanceKm; }, [distanceKm]);

  // ── Periodic Watch sync (10 s) ───────────────────────────────────────────
  // IMPORTANT: deps must NOT include calories/distanceKm — those change every
  // second and would reset the interval before it fires (Bug: sync never runs).
  // Use refs inside the callback instead.
  useEffect(() => {
    if (!isRunning || isPaused) return;
    const id = setInterval(() => {
      const nowMs = Date.now();
      const elapsedMs = accumulatedMsRef.current +
        (runSinceRef.current !== null ? nowMs - runSinceRef.current : 0);
      watchSession.sendWorkoutState({
        exerciseName: sessionName.charAt(0).toUpperCase() + sessionName.slice(1),
        setIndex: 0, totalSets: 0, targetReps: '', targetWeight: 0,
        weightUnit: (profileRef.current.weightUnit as 'lb' | 'kg') ?? 'lb',
        isCardio: true,
        cardioVirtualStartAt: nowMs / 1000 - elapsedMs / 1000,
        cardioElapsedSec: Math.floor(elapsedMs / 1000),
        cardioCalories: caloriesActiveRef.current,
        cardioDistanceKm: distanceKmRef.current ?? 0,
        cardioIsPaused: false,
      });
    }, 10_000);
    return () => clearInterval(id);
  }, [isRunning, isPaused]); // ← fixed: no calories/distance deps

  // ── Watch → iPhone cardio controls ──────────────────────────────────────
  // handlePause/handleResume are plain functions — hoisting makes them safe to
  // reference here. finishSession is a useCallback defined below; we use a ref
  // updated on every render so the listener always calls the latest version.
  const finishSessionRef = useRef<(() => void) | null>(null);
  useEffect(() => { finishSessionRef.current = finishSession; }, [finishSession]);

  useEffect(() => {
    const unsubPause  = watchSession.onCardioPause(handlePause);
    const unsubResume = watchSession.onCardioResume(handleResume);
    const unsubEnd    = watchSession.onCardioEnd(() => finishSessionRef.current?.());
    // Real step-based distance + smoothed current pace from Watch CMPedometer.
    // paceSecPerKm is absent when stationary — we set to null so "—:—" shows.
    const unsubPedometer = watchSession.onPedometerUpdate(({ distanceKm, paceSecPerKm }) => {
      setRealDistanceKm(distanceKm);
      realDistanceKmRef.current = distanceKm;
      // Also keep distanceKmRef in sync so Watch syncs send real data.
      distanceKmRef.current = distanceKm;
      setWatchPaceSecPerKm(paceSecPerKm ?? null);
    });
    return () => { unsubPause(); unsubResume(); unsubEnd(); unsubPedometer(); };
  }, []);

  // ── Pause / Resume ────────────────────────────────────────────────────────
  function handlePause() {
    if (isPausedRef.current) return; // guard: ignore if already paused (dedup Watch double-fire)
    // Freeze wall-clock accumulated ms
    if (runSinceRef.current !== null) {
      accumulatedMsRef.current += Date.now() - runSinceRef.current;
      runSinceRef.current = null;
    }
    isPausedRef.current = true;
    setIsPaused(true);
    impact(ImpactStyle.Light);

    const frozen = Math.floor(accumulatedMsRef.current / 1000);
    // Send directly — no useEffect intermediary, no stale value risk.
    // cardioElapsedMs carries ms-accurate elapsed so Watch can resume from the
    // exact sub-second position (prevents the Watch being 0-1 s behind iPhone).
    watchSession.sendWorkoutState({
      exerciseName: sessionName.charAt(0).toUpperCase() + sessionName.slice(1),
      setIndex: 0, totalSets: 0, targetReps: '', targetWeight: 0,
      weightUnit: (profileRef.current.weightUnit as 'lb' | 'kg') ?? 'lb',
      isCardio: true,
      cardioIsPaused: true,
      cardioElapsedSec: frozen,
      cardioElapsedMs: accumulatedMsRef.current,
      cardioCalories: caloriesActiveRef.current,
      cardioDistanceKm: distanceKmRef.current ?? 0,
    });

    saveActiveCardioSession({
      modality, intensity, sessionName,
      startedAt: sessionStartRef.current,
      elapsedSec: frozen, isPaused: true, savedAt: Date.now(),
    }).catch(() => {});
  }

  function handleResume() {
    if (!isPausedRef.current) return; // guard: ignore if not paused
    runSinceRef.current = Date.now();
    isPausedRef.current = false;
    setIsPaused(false);
    impact(ImpactStyle.Light);

    const elapsed = Math.floor(accumulatedMsRef.current / 1000); // for display (whole seconds)
    // cardioVirtualStartAt uses ms-accurate division so Watch and iPhone cross each
    // whole second at the same instant (floor rounding caused up to 1 s of skew).
    watchSession.sendWorkoutState({
      exerciseName: sessionName.charAt(0).toUpperCase() + sessionName.slice(1),
      setIndex: 0, totalSets: 0, targetReps: '', targetWeight: 0,
      weightUnit: (profileRef.current.weightUnit as 'lb' | 'kg') ?? 'lb',
      isCardio: true,
      cardioIsPaused: false,
      cardioVirtualStartAt: Date.now() / 1000 - accumulatedMsRef.current / 1000,
      cardioElapsedSec: elapsed,
      cardioCalories: caloriesActiveRef.current,
      cardioDistanceKm: distanceKmRef.current ?? 0,
    });
  }

  // ── End session ───────────────────────────────────────────────────────────
  function handleEnd() {
    if (elapsedSec < 30) {
      Alert.alert(
        "End session?",
        "You've been going less than 30 seconds. Are you sure?",
        [
          { text: "Keep going", style: "cancel" },
          { text: "End", style: "destructive", onPress: finishSession },
        ]
      );
    } else {
      finishSession();
    }
  }

  const finishSession = useCallback(async () => {
    // Read final elapsed from wall-clock refs — not from stale elapsedSec state
    const finalElapsed = runSinceRef.current !== null
      ? Math.floor((accumulatedMsRef.current + Date.now() - runSinceRef.current) / 1000)
      : Math.floor(accumulatedMsRef.current / 1000);
    // Freeze refs so any lingering interval reads the stopped value
    accumulatedMsRef.current = finalElapsed * 1000;
    runSinceRef.current = null;

    setIsRunning(false);
    setIsPaused(false);
    await clearActiveCardioSession();

    const now = new Date().toISOString();
    const modalityLabel = modality.charAt(0).toUpperCase() + modality.slice(1).replace("_", " ");

    const session: WorkoutSession = {
      id: makeId(),
      name: `${modalityLabel} — Cardio`,
      date: now,
      startedAt: sessionStartRef.current || now,
      completedAt: now,
      isActive: false,
      exercises: [],
      sessionType: "cardio",
      cardioModality: modality as WorkoutSession["cardioModality"],
      cardioGoalType: "time",
      cardioGoalValue: finalElapsed,
      cardioIntensity: intensity,
      cardioDurationMs: finalElapsed * 1000,
      cardioDistanceKm: distanceKmRef.current ?? undefined,
    };

    const virtualSets = calculateVirtualSets(session);
    session.virtualSets = virtualSets;

    await addWorkout(session);

    // ── Sync to Apple Health (fire-and-forget) ──────────────────────────
    void syncCompletedSession(session);

    // ── Streak (with freeze + rest-day support) ──────────────────────────
    const currentProfile = profileRef.current;
    const restDays = currentProfile.restDays ?? [];
    const week = isoWeek();
    const freezesLeft =
      currentProfile.freezesResetWeek === week
        ? (currentProfile.freezesRemaining ?? 2)
        : 2;
    const { streak: newStreak, freezesUsed } = await recordActivity(
      new Date(),
      restDays,
      freezesLeft
    );
    if (freezesUsed > 0 || currentProfile.freezesResetWeek !== week) {
      updateProfile({
        freezesRemaining: freezesLeft - freezesUsed,
        freezesResetWeek: week,
      });
    }

    const { newPRs, updatedRecord: newPRRecord } = detectCardioPRs(
      session,
      currentProfile.cardioPRs ?? {}
    );

    const newBadges = checkBadges({
      session,
      allWorkouts: [...workouts, session],
      profile: currentProfile,
      streakDays: newStreak.current,
    });

    const cardioXP = calculateCardioXP(session, newPRs.length);
    const previousRank = xp.rank;
    const previousTotalXP = xp.total;
    let currentXP = xp;

    currentXP = applyXP(currentXP, cardioXP.totalXP, "Cardio session");
    const breakdown: { reason: string; amount: number }[] = [
      { reason: "Cardio session", amount: cardioXP.totalXP },
    ];

    const STREAK_MILESTONES: [number, number, string][] = [
      [3, XP_AWARDS.STREAK_3_DAYS, "3-day streak"],
      [7, XP_AWARDS.STREAK_7_DAYS, "7-day streak"],
      [14, XP_AWARDS.STREAK_14_DAYS, "14-day streak"],
      [30, XP_AWARDS.STREAK_30_DAYS, "30-day streak"],
      [60, XP_AWARDS.STREAK_60_DAYS, "60-day streak"],
      [100, XP_AWARDS.STREAK_100_DAYS, "100-day streak"],
    ];
    for (const [days, xpAmt, label] of STREAK_MILESTONES) {
      if (newStreak.current === days) {
        currentXP = applyXP(currentXP, xpAmt, label);
        breakdown.push({ reason: label, amount: xpAmt });
      }
    }

    const rankedUp = didRankUp(previousTotalXP, currentXP.total);
    if (rankedUp) {
      currentXP = applyXP(currentXP, XP_AWARDS.RANK_UP, `Ranked up to ${currentXP.rank}`);
      breakdown.push({ reason: `Rank up — ${currentXP.rank}`, amount: XP_AWARDS.RANK_UP });
    }

    const totalAwarded = currentXP.total - previousTotalXP;
    await setXPRecord(currentXP);

    const profilePatch: Partial<typeof currentProfile> = {};
    if (newPRs.length > 0) {
      profilePatch.cardioPRs = newPRRecord;
    }
    if (newBadges.length > 0) {
      profilePatch.badges = [...(currentProfile.badges ?? []), ...newBadges];
    }
    if (Object.keys(profilePatch).length > 0) {
      await updateProfile(profilePatch);
    }

    // ── Icon mood ──────────────────────────────────────────
    checkIconMood({
      isSessionActive: false,
      prHitInLast24h: newPRs.length > 0,
      streakDays: newStreak.current,
      lastWorkoutAt: now,
    });

    // ── Cancel streak-at-risk notification ───────────────
    void cancelStreakRiskReminder();

    // ── Fangs ─────────────────────────────────────────────
    const { total: fangsEarned } = calculateSessionFangs(virtualSets, newPRs.length > 0);

    const next = getNextRank(currentXP.rank);
    const completeParams: WorkoutCompleteParams = {
      sessionId: session.id,
      sessionName: session.name,
      xpAwarded: totalAwarded,
      xpBreakdown: breakdown,
      completionPct: 1,
      durationSeconds: finalElapsed,
      setsCompleted: virtualSets,
      totalSets: virtualSets,
      exerciseCount: 0,
      rankedUp,
      previousRank,
      newRank: currentXP.rank,
      previousTotalXP,
      newTotalXP: currentXP.total,
      newProgress: rankProgress(currentXP.total),
      xpToNext: xpToNextRank(currentXP.total),
      nextRankName: next ? next.rank : null,
      isPR: newPRs.length > 0,
      streakDays: newStreak.current,
      isCardio: true,
      virtualSets,
      cardioCalories: caloriesActiveRef.current,
      cardioDistanceKm: distanceKmRef.current ?? undefined,
      newPRs: newPRs.map((pr) => pr.key),
      newBadges,
      fangsEarned,
    };

    router.replace({
      pathname: "/workout-complete",
      params: { data: JSON.stringify(completeParams) },
    });
  }, [modality, intensity, workouts, xp]); // elapsed/distance/calories read from refs

  // ── Paused blink animation ────────────────────────────────────────────────
  const pausedOpacity = useSharedValue(1);
  useEffect(() => {
    if (isPaused) {
      pausedOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false
      );
    } else {
      pausedOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [isPaused]);

  const pausedBlinkStyle = useAnimatedStyle(() => ({
    opacity: pausedOpacity.value,
  }));

  // ── Locke mood ─────────────────────────────────────────────────────────────
  const lockeMood = sessionMood(isPaused, elapsedSec, intensity);

  // ── Derived display values ─────────────────────────────────────────────────
  const accentColor = intensityColor(intensity);
  const intLabel = intensityLabel(intensity);
  // Pedometer modalities: use Apple's smoothed currentPace (null = stationary → "—:—").
  // Other modalities: fall back to average pace from MET estimate.
  const paceStr = isPedometerModality
    ? (watchPaceSecPerKm !== null ? formatPaceValue(watchPaceSecPerKm) : null)
    : formatPace(estimatedDistanceKm, elapsedSec);

  // ── Control state ─────────────────────────────────────────────────────────
  const controlState: "running" | "paused" = isPaused ? "paused" : "running";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      {/* Top bar — session name + intensity badge + lock icon */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={[styles.sessionNameLabel, { color: theme.colors.text }]}>
            {sessionName.toUpperCase()}
          </Text>
          <View style={[styles.intensityBadge, { backgroundColor: accentColor + "18", borderColor: accentColor + "45" }]}>
            <Text style={[styles.intensityBadgeText, { color: accentColor }]}>
              RPE {intensity} · {intLabel}
            </Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          {isRunning && !isPaused && (
            <Pressable
              onPress={() => {
                setIsLocked(true);
                impact(ImpactStyle.Light);
              }}
              style={styles.lockBtn}
              accessibilityRole="button"
              accessibilityLabel="Lock screen"
            >
              <Ionicons name="lock-closed" size={18} color={theme.colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Main content area — vertically centered */}
      <View style={styles.centerArea}>
        {/* PAUSED indicator */}
        {isPaused && (
          <Animated.Text
            style={[styles.pausedLabel, { color: theme.colors.primary }, pausedBlinkStyle]}
          >
            PAUSED
          </Animated.Text>
        )}

        {/* Hero timer — color reflects session intensity */}
        <MetricRow label="ELAPSED TIME" value={formatTime(elapsedSec)} color={accentColor} size="hero" />

        {/* Secondary metrics — distance modalities show distance + pace + cals */}
        <View style={styles.metricsRow}>
          {showDist ? (
            <>
              <MetricRow
                label="DISTANCE"
                value={distanceKm !== null ? `${distanceKm.toFixed(2)} km` : "—"}
                color={theme.colors.accent}
                size="compact"
              />
              <MetricRow
                label="PACE"
                value={paceStr ?? "—:—"}
                color={theme.colors.text}
                size="compact"
              />
              <MetricRow
                label="CALORIES"
                value={`${calories.active}`}
                color={theme.colors.success}
                size="compact"
              />
            </>
          ) : (
            <>
              <MetricRow label="ACTIVE CAL" value={`${calories.active}`} color={theme.colors.success} size="compact" />
              <MetricRow label="TOTAL CAL" value={`${calories.total}`} color={theme.colors.text} size="compact" />
            </>
          )}
        </View>

        {/* Locke tip card — collapsed by default */}
        {isRunning && (
          <View style={styles.tipCardWrap}>
            <LockeTipCard modality={modality} />
          </View>
        )}
      </View>

      {/* Bottom controls — absolutely pinned to bottom */}
      {isRunning && (
        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
          <WorkoutControls
            state={controlState}
            onPause={handlePause}
            onResume={handleResume}
            onEnd={handleEnd}
            onFinish={finishSession}
          />
        </View>
      )}

      {/* Lock overlay */}
      {isLocked && (
        <View
          style={[styles.lockOverlay, { backgroundColor: "rgba(13,17,23,0.92)" }]}
          onTouchStart={(e) => { lockTouchRef.current = e.nativeEvent.pageY; }}
          onTouchEnd={(e) => {
            const delta = lockTouchRef.current - e.nativeEvent.pageY;
            if (delta > 100) {
              impact(ImpactStyle.Light);
              setIsLocked(false);
            }
          }}
        >
          <View style={styles.lockContent}>
            <LockeMascot size={64} mood="neutral" />
            <Ionicons name="lock-closed" size={32} color={theme.colors.muted} style={{ marginTop: spacing.md }} />
            <Text style={[styles.lockedLabel, { color: theme.colors.muted }]}>LOCKED</Text>
          </View>
          <Text style={[styles.swipeUnlock, { color: theme.colors.muted }]}>Swipe up to unlock</Text>
        </View>
      )}

      {/* Countdown ring */}
      <CountdownRing visible={showCountdown} onComplete={startSession} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  topBarLeft: {
    flex: 1,
    gap: 6,
  },
  sessionNameLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  intensityBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  intensityBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 2,
  },
  lockBtn: { padding: 10 },

  // Center area
  centerArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 20,
  },

  // Paused label
  pausedLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 3,
  },

  // Metrics row
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },

  // Tip card
  tipCardWrap: {
    width: "100%",
  },

  // Bottom controls — absolute so they never get pushed off
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 16,
  },

  // Lock overlay
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 80,
  },
  lockContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: spacing.sm,
  },
  swipeUnlock: {
    fontSize: 13,
    fontWeight: "500",
  },
});

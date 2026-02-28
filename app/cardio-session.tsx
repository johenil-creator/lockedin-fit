/**
 * app/cardio-session.tsx — Active cardio session screen.
 *
 * Open-ended timer with live calorie + distance estimates.
 * Apple Workout-style: pure black, left-aligned colored metrics, dual controls.
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
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useWorkouts } from "../hooks/useWorkouts";
import { useXP } from "../hooks/useXP";
import { useStreak } from "../hooks/useStreak";
import { useProfileContext } from "../contexts/ProfileContext";
import { CountdownRing } from "../components/cardio/CountdownRing";
import { MetricRow } from "../components/cardio/MetricRow";
import { WorkoutControls } from "../components/cardio/WorkoutControls";
import { makeId } from "../lib/helpers";
import { calculateCardioXP, calculateVirtualSets } from "../lib/cardioXp";
import { estimateCalories, estimateDistance, hasDistance } from "../lib/cardioCalories";
import { detectCardioPRs } from "../lib/prService";
import { checkBadges } from "../lib/badgeService";
import { applyXP, XP_AWARDS } from "../lib/xpService";
import { didRankUp, rankProgress, xpToNextRank, nextRank as getNextRank } from "../lib/rankService";
import type { WorkoutCompleteParams } from "../lib/xpService";
import type { WorkoutSession } from "../lib/types";
import type { CardioModality } from "../lib/cardioSuggestions";
import { useIconMood } from "../hooks/useIconMood";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CardioSessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const modality = (params.modality ?? "other") as CardioModality;
  const intensity = parseInt(params.intensity ?? "5");
  const sessionName = params.name ?? modality.replace("_", " ");

  // ── Weight for calorie estimation ─────────────────────────────────────────
  const weightKg = useMemo(() => {
    const p = profileRef.current;
    const raw = parseFloat(p.weight) || 70;
    return p.weightUnit === "lbs" ? raw * 0.453592 : raw;
  }, []);

  const showDist = hasDistance(modality);

  // ── Countdown / session start ─────────────────────────────────────────────
  const [showCountdown, setShowCountdown] = useState(true);
  const sessionStartRef = useRef("");

  function startSession() {
    sessionStartRef.current = new Date().toISOString();
    setShowCountdown(false);
    setIsRunning(true);
    setIsPaused(false);
  }

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

  // ── AppState background catch-up ──────────────────────────────────────────
  const bgTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "background" || state === "inactive") {
        if (isRunningRef.current && !isPausedRef.current) {
          bgTimestampRef.current = Date.now();
        }
      } else if (state === "active" && bgTimestampRef.current !== null) {
        const elapsed = Math.floor((Date.now() - bgTimestampRef.current) / 1000);
        bgTimestampRef.current = null;
        if (isRunningRef.current && !isPausedRef.current) {
          setElapsedSec((e) => e + elapsed);
        }
      }
    });
    return () => sub.remove();
  }, []);

  // ── Main tick (1 Hz) ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      if (isPausedRef.current) return;
      setElapsedSec((e) => e + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  // ── Live calorie + distance estimates ─────────────────────────────────────
  const durationMs = elapsedSec * 1000;

  const calories = useMemo(
    () => estimateCalories(modality, weightKg, durationMs, intensity),
    [modality, weightKg, durationMs, intensity]
  );

  const distanceKm = useMemo(
    () => estimateDistance(modality, durationMs, intensity),
    [modality, durationMs, intensity]
  );

  // ── Pause / Resume ────────────────────────────────────────────────────────
  function handlePause() {
    setIsPaused(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleResume() {
    setIsPaused(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    setIsRunning(false);
    setIsPaused(false);

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
      cardioGoalValue: elapsedSec,
      cardioIntensity: intensity,
      cardioDurationMs: elapsedSec * 1000,
      cardioDistanceKm: distanceKm ?? undefined,
    };

    const virtualSets = calculateVirtualSets(session);
    session.virtualSets = virtualSets;

    await addWorkout(session);
    const { streak: newStreak } = await recordActivity();

    const currentProfile = profileRef.current;
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

    // ── Icon mood ──────────────────────────────────────────────
    checkIconMood({
      isSessionActive: false,
      prHitInLast24h: newPRs.length > 0,
      streakDays: newStreak.current,
      lastWorkoutAt: now,
    });

    const next = getNextRank(currentXP.rank);
    const completeParams: WorkoutCompleteParams = {
      sessionId: session.id,
      sessionName: session.name,
      xpAwarded: totalAwarded,
      xpBreakdown: breakdown,
      completionPct: 1,
      durationSeconds: elapsedSec,
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
      cardioCalories: calories.active,
      cardioDistanceKm: distanceKm ?? undefined,
      newPRs: newPRs.map((pr) => pr.key),
      newBadges,
    };

    router.replace({
      pathname: "/workout-complete",
      params: { data: JSON.stringify(completeParams) },
    });
  }, [elapsedSec, distanceKm, modality, intensity, workouts, xp]);

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

  // ── Control state ─────────────────────────────────────────────────────────
  const controlState: "running" | "paused" = isPaused ? "paused" : "running";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.modalityLabel}>
          {modality.replace("_", " ").toUpperCase()}
        </Text>

        {isRunning && !isPaused && (
          <Pressable
            onPress={() => {
              setIsLocked(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={styles.lockBtn}
            accessibilityRole="button"
            accessibilityLabel="Lock screen"
          >
            <Ionicons name="lock-closed" size={18} color="#98989D" />
          </Pressable>
        )}
      </View>

      {/* Metrics stack */}
      <View style={styles.metricsStack}>
        {/* PAUSED indicator */}
        {isPaused && (
          <Animated.Text style={[styles.pausedLabel, pausedBlinkStyle]}>
            PAUSED
          </Animated.Text>
        )}

        <MetricRow label="ELAPSED TIME" value={formatTime(elapsedSec)} color="#FFD60A" size="hero" />
        <MetricRow label="ACTIVE CAL" value={`${calories.active} cal`} color="#30D158" size="secondary" />
        <MetricRow label="TOTAL CAL" value={`${calories.total} cal`} color="#FFFFFF" size="tertiary" />
        {showDist && distanceKm !== null && (
          <MetricRow label="DISTANCE" value={`${distanceKm.toFixed(2)} km`} color="#64D2FF" size="tertiary" />
        )}
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 32 }]}>
        {isRunning && (
          <WorkoutControls
            state={controlState}
            onPause={handlePause}
            onResume={handleResume}
            onEnd={handleEnd}
            onFinish={finishSession}
          />
        )}
      </View>

      {/* Lock overlay */}
      {isLocked && (
        <View
          style={styles.lockOverlay}
          onTouchStart={(e) => { lockTouchRef.current = e.nativeEvent.pageY; }}
          onTouchEnd={(e) => {
            const delta = lockTouchRef.current - e.nativeEvent.pageY;
            if (delta > 100) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsLocked(false);
            }
          }}
        >
          <Ionicons name="lock-closed" size={32} color="#98989D" style={{ marginTop: 80 }} />
          <Text style={styles.lockedLabel}>LOCKED</Text>
          <Text style={styles.swipeUnlock}>Swipe up to unlock</Text>
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
    backgroundColor: "#000000",
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalityLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: "#98989D",
  },
  lockBtn: { padding: 13, marginRight: -5 },

  // Metrics stack
  metricsStack: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 12,
  },

  // Paused label
  pausedLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 3,
    color: "#FFD60A",
    marginBottom: 4,
  },

  // Bottom controls
  bottomControls: {
    alignItems: "center",
    paddingTop: 24,
  },

  // Lock overlay
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 80,
  },
  lockedLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#98989D",
  },
  swipeUnlock: {
    fontSize: 13,
    fontWeight: "500",
    color: "#98989D",
  },
});

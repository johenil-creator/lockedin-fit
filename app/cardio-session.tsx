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
import { CountdownRing } from "../components/cardio/CountdownRing";
import { MetricRow } from "../components/cardio/MetricRow";
import { WorkoutControls } from "../components/cardio/WorkoutControls";
import { LockeTipCard } from "../components/cardio/LockeTipCard";
import { LockeMascot } from "../components/Locke/LockeMascot";
import type { LockeMascotMood } from "../components/Locke/LockeMascot";
import { spacing } from "../lib/theme";
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
import { cancelStreakRiskReminder } from "../lib/notifications";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Pick Locke's mood based on session state and elapsed time. */
function sessionMood(isPaused: boolean, elapsedSec: number): LockeMascotMood {
  if (isPaused) return "disappointed";
  if (elapsedSec >= 1800) return "savage";      // 30+ min
  if (elapsedSec >= 600) return "intense";       // 10+ min
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
    impact(ImpactStyle.Light);
  }

  function handleResume() {
    setIsPaused(false);
    impact(ImpactStyle.Light);
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

  // ── Locke mood ─────────────────────────────────────────────────────────────
  const lockeMood = sessionMood(isPaused, elapsedSec);

  // ── Control state ─────────────────────────────────────────────────────────
  const controlState: "running" | "paused" = isPaused ? "paused" : "running";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      {/* Top bar — modality + Locke + lock icon */}
      <View style={styles.topBar}>
        <Text style={[styles.modalityLabel, { color: theme.colors.muted }]}>
          {modality.replace("_", " ").toUpperCase()}
        </Text>

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

        {/* Hero timer */}
        <MetricRow label="ELAPSED TIME" value={formatTime(elapsedSec)} color={theme.colors.primary} size="hero" />

        {/* Secondary metrics row */}
        <View style={styles.metricsRow}>
          <MetricRow label="ACTIVE CAL" value={`${calories.active}`} color={theme.colors.success} size="compact" />
          <MetricRow label="TOTAL CAL" value={`${calories.total}`} color={theme.colors.text} size="compact" />
          {showDist && distanceKm !== null && (
            <MetricRow label="DISTANCE" value={`${distanceKm.toFixed(2)} km`} color={theme.colors.accent} size="compact" />
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  modalityLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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

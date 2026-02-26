import { useState, useCallback, useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  FlatList,
  Alert,
  Image,
  AppState,
  AppStateStatus,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useWorkouts } from "../../hooks/useWorkouts";
import { usePlanContext } from "../../contexts/PlanContext";
import { useXP } from "../../hooks/useXP";
import { useStreak } from "../../hooks/useStreak";
import { usePerformance } from "../../hooks/usePerformance";
import { buildPerformanceWeek, upsertPerformanceWeek, isoWeekKey } from "../../lib/performanceScore";
import { awardSessionXP, buildWorkoutCompleteParams } from "../../lib/xpService";
import { resolveExerciseLoad } from "../../lib/loadEngine";
import { findExercise, addCustomEntry } from "../../src/lib/exerciseMatch";
import type { ExerciseCatalogEntry } from "../../src/lib/exerciseMatch";
import { loadCustomCatalog, saveCustomCatalog } from "../../lib/storage";
import { EXERCISE_CUES } from "../../src/data/exerciseCues";
import { RANK_IMAGES } from "../../components/RankEvolutionPath";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import { BackButton } from "../../components/BackButton";
import { Skeleton } from "../../components/Skeleton";
import { AppBottomSheet } from "../../components/AppBottomSheet";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useProfileContext } from "../../contexts/ProfileContext";
import type { WorkoutSession, SessionExercise, SetEntry } from "../../lib/types";

function makeId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 6);
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatRestTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ── Progress Bar ────────────────────────────────────────────────────────────

// ── Pause Overlay ──────────────────────────────────────────────────────────

function PauseOverlay({
  visible,
  onResume,
}: {
  visible: boolean;
  onResume: () => void;
}) {
  const { theme } = useAppTheme();
  if (!visible) return null;

  return (
    <View style={pauseStyles.overlay}>
      <View style={[pauseStyles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[pauseStyles.title, { color: theme.colors.text }]}>
          Session Paused
        </Text>
        <Text style={[pauseStyles.subtitle, { color: theme.colors.muted }]}>
          Welcome back! Your progress has been saved.
        </Text>
        <Pressable
          style={[pauseStyles.resumeBtn, { backgroundColor: theme.colors.primary }]}
          onPress={onResume}
        >
          <Text style={[pauseStyles.resumeBtnText, { color: theme.colors.primaryText }]}>
            Resume Session
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { workouts, loading: workoutsLoading, updateWorkout } = useWorkouts();
  const { exercises: planExercises, markDayCompleted } = usePlanContext();
  const { xp, setXPRecord, rank } = useXP();
  const { recordActivity } = useStreak();
  const { performance, savePerformanceRecord } = usePerformance();
  const { profile } = useProfileContext();
  const sessionUnit = profile.weightUnit === "lbs" ? "lbs" : "kg";
  const [pickerVisible, setPickerVisible] = useState(false);
  const [manualName, setManualName] = useState("");
  const [elapsed, setElapsed] = useState(0);

  // Classify exercise modal state
  const [classifyVisible, setClassifyVisible] = useState(false);
  const [classifyName, setClassifyName] = useState("");
  const [classifyPattern, setClassifyPattern] = useState("squat");
  const [classifyAnchor, setClassifyAnchor] = useState("none");
  const [showCues, setShowCues] = useState(false);

  // Rest timers: key = `${exerciseId}-${setIdx}`, value = seconds remaining
  const [restTimers, setRestTimers] = useState<Record<string, number>>({});
  const intervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // Per-exercise note editing: key = exerciseId
  const [editingNotes, setEditingNotes] = useState<Record<string, boolean>>({});
  // Tracks in-progress note text while the TextInput is focused
  const [pendingNotes, setPendingNotes] = useState<Record<string, string>>({});

  // Session notes editing

  // Exercise list / focused view state
  const [activeExerciseId, _setActiveExerciseId] = useState<string | null>(null);
  const setActiveExerciseId = useCallback((id: string | null) => {
    _setActiveExerciseId(id);
    setShowCues(false);
  }, []);

  // ── Auto-pause state ──────────────────────────────────────────────────────
  const [paused, setPaused] = useState(false);
  const backgroundTimestampRef = useRef<number | null>(null);
  const totalBackgroundMsRef = useRef(0);

  const session = workouts.find((w) => w.id === id);

  // ── Auto-save on app background / restore on foreground ───────────────────
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (!session?.isActive) return;

      if (nextState === "background" || nextState === "inactive") {
        backgroundTimestampRef.current = Date.now();
      } else if (nextState === "active" && backgroundTimestampRef.current) {
        const bgDuration = Date.now() - backgroundTimestampRef.current;
        backgroundTimestampRef.current = null;

        // Accumulate background time so elapsed timer excludes it
        totalBackgroundMsRef.current += bgDuration;

        // Advance rest timers by the time spent in background
        if (bgDuration > 1000) {
          const elapsedSec = Math.floor(bgDuration / 1000);
          setRestTimers((prev) => {
            const updated: Record<string, number> = {};
            for (const [key, remaining] of Object.entries(prev)) {
              const adjusted = remaining - elapsedSec;
              if (adjusted > 0) {
                updated[key] = adjusted;
              } else {
                // Timer expired while in background — clean up interval
                if (intervalsRef.current[key]) {
                  clearInterval(intervalsRef.current[key]);
                  delete intervalsRef.current[key];
                }
              }
            }
            return updated;
          });
        }

        setPaused(true);
      }
    };

    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, [session?.isActive]);

  const handleResumePause = useCallback(() => {
    setPaused(false);
  }, []);

  useEffect(() => {
    if (!session?.isActive || !session?.startedAt) return;
    const start = new Date(session.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start - totalBackgroundMsRef.current) / 1000));
    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [session?.isActive, session?.startedAt]);

  // Cleanup all rest timer intervals on unmount
  useEffect(() => {
    const refs = intervalsRef.current;
    return () => {
      Object.values(refs).forEach(clearInterval);
    };
  }, []);

  // Load custom catalog entries into the matcher on mount
  useEffect(() => {
    loadCustomCatalog().then((entries) => {
      entries.forEach((e: ExerciseCatalogEntry) => addCustomEntry(e));
    });
  }, []);

  // If the active exercise was removed, reset to list view
  useEffect(() => {
    if (activeExerciseId && session && !session.exercises.some((ex) => ex.exerciseId === activeExerciseId)) {
      setActiveExerciseId(null);
    }
  }, [activeExerciseId, session]);

  const update = useCallback(
    (updated: WorkoutSession) => {
      updateWorkout(updated);
    },
    [updateWorkout]
  );

  if (workoutsLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg, alignItems: "center", paddingTop: 80 }]}>
        <Skeleton.Circle size={120} />
        <View style={{ height: 16 }} />
        <Skeleton.Rect width="60%" height={20} />
        <View style={{ height: 16 }} />
        <Skeleton.Card />
        <Skeleton.Card />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        <BackButton />
        <Text style={[styles.notFound, { color: theme.colors.muted }]}>Workout not found.</Text>
      </View>
    );
  }

  function startRestTimer(exId: string, setIdx: number, restTime: number) {
    const key = `${exId}-${setIdx}`;
    const duration = restTime || 90;

    // Enforce single active rest timer — dismiss any existing ones first
    Object.keys(intervalsRef.current).forEach((existingKey) => {
      if (existingKey !== key) {
        clearInterval(intervalsRef.current[existingKey]);
        delete intervalsRef.current[existingKey];
      }
    });
    setRestTimers((_prev) => {
      // Clear all other timers, keep only the new one
      return { [key]: duration };
    });

    // Clear any existing interval for this key
    if (intervalsRef.current[key]) clearInterval(intervalsRef.current[key]);

    intervalsRef.current[key] = setInterval(() => {
      setRestTimers((prev) => {
        const next = (prev[key] ?? 0) - 1;
        if (next <= 0) {
          clearInterval(intervalsRef.current[key]);
          delete intervalsRef.current[key];
          const { [key]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [key]: next };
      });
    }, 1000);
  }

  function dismissRestTimer(key: string) {
    if (intervalsRef.current[key]) {
      clearInterval(intervalsRef.current[key]);
      delete intervalsRef.current[key];
    }
    setRestTimers((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }

  function addExerciseWithLoad(name: string, planSets?: string, planReps?: string) {
    if (!session) return;
    const weekMatch = session.name.match(/Week\s*(\d+)/i);
    const weekStr = weekMatch ? `Week ${weekMatch[1]}` : "Week 1";
    const workingSetCount = parseInt(planSets || "3", 10) || 3;
    const targetReps = planReps || "8";

    const load = resolveExerciseLoad({
      exerciseName: name,
      weekStr,
      profile,
      workouts,
      workingSetCount,
      targetReps,
      plannedWarmUpCount: 0,
    });

    const sets = load.workingSets.map((ws) => ({
      reps: ws.reps,
      weight: ws.weight,
      completed: false,
    }));

    const newEx: SessionExercise = {
      exerciseId: makeId(),
      name,
      sets,
      loadSource: load.source,
      targetRPE: load.targetRPE,
      catalogId:       load.classification.catalogId ?? undefined,
      matchedPattern:  load.classification.pattern,
      matchedAnchor:   load.classification.baseLift ?? undefined,
      matchedModifier: load.classification.modifier.fraction,
    };
    update({ ...session, exercises: [...session.exercises, newEx] });
    setPickerVisible(false);
    setManualName("");
    setClassifyVisible(false);
  }

  function addExercise(name: string, planSets?: string, planReps?: string) {
    if (!name.trim() || !session) return;
    const trimmed = name.trim();
    const match = findExercise(trimmed);

    if (!match) {
      // No catalog match — show classify modal
      setClassifyName(trimmed);
      setClassifyPattern("squat");
      setClassifyAnchor("none");
      setClassifyVisible(true);
      setPickerVisible(false);
      setManualName("");
      return;
    }

    addExerciseWithLoad(trimmed, planSets, planReps);
  }

  async function handleClassifyAndAdd() {
    const entry: ExerciseCatalogEntry = {
      id: `custom_${Date.now()}`,
      canonicalName: classifyName,
      aliases: [],
      movementPattern: classifyPattern as any,
      primaryMuscles: ["core"],
      secondaryMuscles: [],
      equipment: "other" as any,
      anchorLift: classifyAnchor !== "none" ? (classifyAnchor as any) : undefined,
      modifier: classifyAnchor !== "none" ? 0.7 : undefined,
    };

    addCustomEntry(entry);

    const existing = await loadCustomCatalog();
    await saveCustomCatalog([...existing, entry]);

    addExerciseWithLoad(classifyName);
  }

  function addSet(exId: string) {
    if (!session) return;
    const updated = session.exercises.map((ex) =>
      ex.exerciseId === exId
        ? { ...ex, sets: [...ex.sets, { reps: "", weight: "", completed: false }] }
        : ex
    );
    update({ ...session, exercises: updated });
  }

  function removeSet(exId: string, setIndex: number) {
    if (!session) return;
    const updated = session.exercises.map((ex) => {
      if (ex.exerciseId !== exId) return ex;
      const target = ex.sets[setIndex];
      if (!target || target.completed) return ex;
      const newSets = ex.sets.filter((_, i) => i !== setIndex);
      const warmUpAdj = target.isWarmUp ? { warmUpSets: Math.max(0, (ex.warmUpSets ?? 0) - 1) } : {};
      return { ...ex, sets: newSets, ...warmUpAdj };
    });
    update({ ...session, exercises: updated });
  }

  function updateSet(exId: string, setIdx: number, patch: Partial<SetEntry>) {
    if (!session) return;

    // Cap reps to 2 digits, weight to 3 digits
    if (patch.reps !== undefined && typeof patch.reps === "string") {
      patch = { ...patch, reps: patch.reps.replace(/[^0-9]/g, "").slice(0, 2) };
    }
    if (patch.weight !== undefined && typeof patch.weight === "string") {
      patch = { ...patch, weight: patch.weight.replace(/[^0-9]/g, "").slice(0, 3) };
    }

    const ex = session.exercises.find((e) => e.exerciseId === exId);
    if (!ex) return;

    // Sequential enforcement: prevent unchecking a set if later sets are completed
    if (patch.completed === false) {
      const hasLaterCompleted = ex.sets.some((s, i) => i > setIdx && s.completed);
      if (hasLaterCompleted) return; // can't uncheck — later sets depend on it
    }

    // If marking completed (transitioning from false to true), start rest timer
    if (patch.completed === true) {
      const wasCompleted = ex.sets[setIdx]?.completed;
      if (!wasCompleted) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        startRestTimer(exId, setIdx, ex.restTime ?? 90);
      }
    }

    const updated = session.exercises.map((e) =>
      e.exerciseId === exId
        ? {
            ...e,
            sets: e.sets.map((s, i) => (i === setIdx ? { ...s, ...patch } : s)),
          }
        : e
    );
    update({ ...session, exercises: updated });
  }

  function removeExercise(exId: string) {
    if (!session) return;
    const ex = session.exercises.find((e) => e.exerciseId === exId);
    Alert.alert(
      "Delete Exercise?",
      `Remove "${ex?.name ?? "this exercise"}" and all its sets from this session?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // Clean up any rest timers for this exercise
            const keysToClean = Object.keys(restTimers).filter((k) => k.startsWith(exId + "-"));
            keysToClean.forEach((k) => dismissRestTimer(k));
            // If focused on this exercise, go back to list
            if (activeExerciseId === exId) setActiveExerciseId(null);
            update({ ...session, exercises: session.exercises.filter((e) => e.exerciseId !== exId) });
          },
        },
      ]
    );
  }

  function addWarmUpSet(exId: string) {
    if (!session) return;
    const updated = session.exercises.map((ex) => {
      if (ex.exerciseId !== exId) return ex;
      // Try to resolve a warm-up weight via the load engine
      const weekMatch = session.name.match(/Week\s*(\d+)/i);
      const weekStr = weekMatch ? `Week ${weekMatch[1]}` : "Week 1";
      const load = resolveExerciseLoad({
        exerciseName: ex.name,
        weekStr,
        profile,
        workouts,
        plannedWarmUpCount: 1,
      });
      // Use the last warm-up weight from the engine, or empty
      const warmUpWeight = load.warmUps.length > 0
        ? load.warmUps[load.warmUps.length - 1].weight
        : "";
      // Insert warm-up set before the first working set
      const firstWorkingIdx = ex.sets.findIndex((s) => !s.isWarmUp);
      const insertIdx = firstWorkingIdx === -1 ? ex.sets.length : firstWorkingIdx;
      const newSets = [...ex.sets];
      newSets.splice(insertIdx, 0, { reps: "", weight: warmUpWeight, completed: false, isWarmUp: true });
      return { ...ex, sets: newSets, warmUpSets: (ex.warmUpSets ?? 0) + 1 };
    });
    update({ ...session, exercises: updated });
  }


  function updateExerciseNote(exId: string, note: string) {
    if (!session) return;
    const updated = session.exercises.map((ex) =>
      ex.exerciseId === exId ? { ...ex, notes: note } : ex
    );
    update({ ...session, exercises: updated });
    setEditingNotes((prev) => ({ ...prev, [exId]: false }));
  }

  // ── Sequential set enforcement helpers ────────────────────────────────────
  // Returns the index of the first incomplete set for an exercise (the "current" set)
  function getCurrentSetIndex(ex: SessionExercise): number {
    const idx = ex.sets.findIndex((s) => !s.completed);
    return idx === -1 ? ex.sets.length : idx; // all done = past end
  }


  // Check if a specific exercise has an active rest timer
  function exerciseHasActiveRestTimer(ex: SessionExercise): boolean {
    return Object.keys(restTimers).some((key) => key.startsWith(ex.exerciseId));
  }

  // Check if a specific set is the "current" (next to complete) set for its exercise
  function isCurrentSet(ex: SessionExercise, setIdx: number): boolean {
    return getCurrentSetIndex(ex) === setIdx;
  }

  // Check if a set is locked (cannot be interacted with yet)
  // Scoped per-exercise: resting on bench doesn't lock squat sets
  function isSetLocked(ex: SessionExercise, setIdx: number): boolean {
    const currentIdx = getCurrentSetIndex(ex);
    if (setIdx < currentIdx) return false; // already completed
    if (setIdx === currentIdx) {
      // Current set is locked only if THIS exercise has an active rest timer
      return exerciseHasActiveRestTimer(ex);
    }
    return true; // future set
  }

  const completedSets = session.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );
  const totalSets = session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);


  // Focused exercise view
  const activeExercise = activeExerciseId
    ? session.exercises.find((ex) => ex.exerciseId === activeExerciseId)
    : null;
  const activeExerciseIndex = activeExerciseId
    ? session.exercises.findIndex((ex) => ex.exerciseId === activeExerciseId)
    : -1;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => {
          if (activeExerciseId) {
            setActiveExerciseId(null);
          } else if (session.isActive) {
            Alert.alert(
              "Leave session?",
              "Your progress is saved.",
              [
                { text: "Stay", style: "cancel" },
                { text: "Leave", style: "destructive", onPress: () => router.back() },
              ]
            );
          } else {
            router.back();
          }
        }} />
        <View style={styles.headerCenter}>
          <Text style={[styles.sessionName, { color: theme.colors.text }]} numberOfLines={1}>{session.name}</Text>
        </View>
      </View>


      {/* Rank mascot + how-to cues */}
      {activeExercise?.catalogId && EXERCISE_CUES[activeExercise.catalogId] ? (
        <View style={{ marginVertical: 8 }}>
          <Pressable
            onPress={() => setShowCues((v) => !v)}
            style={styles.lockeCuesToggle}
          >
            <Image source={RANK_IMAGES[rank] ?? RANK_IMAGES["Scout"]} style={{ width: 120, height: 120, marginTop: -28 }} resizeMode="contain" />
            <Text style={{ color: theme.colors.accent, fontSize: 13, fontWeight: "700", marginLeft: 8 }}>
              {showCues ? "▾ Hide Tips" : "▸ How do I do this?"}
            </Text>
          </Pressable>
          {showCues && (
            <View style={[styles.lockeCuesBody, { borderLeftColor: theme.colors.accent }]}>
              {EXERCISE_CUES[activeExercise.catalogId]!.map((cue, i) => (
                <View key={i} style={styles.lockeCueRow}>
                  <Text style={{ color: theme.colors.accent, fontSize: 12, fontWeight: "700", width: 18 }}>{i + 1}.</Text>
                  <Text style={{ color: theme.colors.text, fontSize: 13, flex: 1, lineHeight: 18 }}>{cue}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={{ alignItems: "center", marginVertical: 8 }}>
          <Image source={RANK_IMAGES[rank] ?? RANK_IMAGES["Scout"]} style={{ width: 120, height: 120, marginTop: -28 }} resizeMode="contain" />
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {activeExercise ? (
          /* ── Focused Exercise View ─────────────────────────────────── */
          <View>
            <Text style={[styles.focusedTitle, { color: theme.colors.text }]}>{activeExercise.name}</Text>


            <View style={styles.focusedContent}>
              {/* Set headers */}
              <View style={styles.setHeaderRow}>
                <Text style={[styles.setHeaderCell, styles.setColNum, { color: theme.colors.text, opacity: 0.6 }]}>SET</Text>
                <Text style={[styles.setHeaderCell, styles.setColWeight, { color: theme.colors.text, opacity: 0.6 }]}>WEIGHT</Text>
                <Text style={[styles.setHeaderCell, styles.setColReps, { color: theme.colors.text, opacity: 0.6 }]}>REPS</Text>
                <View style={styles.setColCheck} />
              </View>

              {/* All sets (warm-up + working) */}
              {activeExercise.sets.map((s, i) => {
                const timerKey = `${activeExercise.exerciseId}-${i}`;
                const restRemaining = restTimers[timerKey];
                const isWarmUp = !!s.isWarmUp;
                const warmUpIndex = isWarmUp
                  ? activeExercise.sets.slice(0, i).filter((prev) => !!prev.isWarmUp).length + 1
                  : 0;
                const workingIndex = isWarmUp
                  ? 0
                  : activeExercise.sets.slice(0, i).filter((prev) => !prev.isWarmUp).length + 1;
                const isCurrent = isCurrentSet(activeExercise, i);
                const locked = isSetLocked(activeExercise, i);
                const isFutureSet = i > getCurrentSetIndex(activeExercise);
                const isCurrentIncomplete = isCurrent && !s.completed;
                const setContent = (
                  <View>
                    <View style={[
                      styles.setRow,
                      {
                        backgroundColor: isCurrentIncomplete ? theme.colors.primary + "15" : theme.colors.surface,
                        borderWidth: isCurrentIncomplete ? 1.5 : 1,
                        borderColor: isCurrentIncomplete ? theme.colors.primary : theme.colors.border,
                      },
                      isWarmUp && { opacity: 0.85 },
                      isFutureSet && { opacity: 0.4 },
                    ]}>
                      <View style={styles.setColNum}>
                        {isWarmUp ? (
                          <View style={[styles.warmUpBadge, { backgroundColor: isFutureSet ? theme.colors.muted : theme.colors.accent }]}>
                            <Text style={[styles.warmUpBadgeText, { color: theme.colors.accentText }]}>W{warmUpIndex}</Text>
                          </View>
                        ) : (
                          <Text style={[styles.setNum, { color: isCurrent && !s.completed ? theme.colors.primary : theme.colors.text }]}>{workingIndex}</Text>
                        )}
                      </View>
                      <TextInput
                        style={[styles.setInput, styles.setColWeight, { backgroundColor: theme.colors.mutedBg, color: isFutureSet ? theme.colors.muted : theme.colors.text }]}
                        placeholder={sessionUnit}
                        placeholderTextColor="#B0B8C4"
                        value={s.weight}
                        onChangeText={(v) => updateSet(activeExercise.exerciseId, i, { weight: v })}
                        keyboardType="numeric"
                        maxLength={3}
                        editable={!isFutureSet}
                      />
                      <TextInput
                        style={[styles.setInput, styles.setColReps, { backgroundColor: theme.colors.mutedBg, color: isFutureSet ? theme.colors.muted : theme.colors.text }]}
                        placeholder="reps"
                        placeholderTextColor="#B0B8C4"
                        value={s.reps}
                        onChangeText={(v) => updateSet(activeExercise.exerciseId, i, { reps: v })}
                        keyboardType="number-pad"
                        maxLength={2}
                        editable={!isFutureSet}
                      />
                      <Pressable
                        style={[
                          styles.checkBtn,
                          styles.setColCheck,
                          {
                            backgroundColor: s.completed
                              ? theme.colors.primary
                              : locked
                              ? theme.colors.border
                              : "transparent",
                            borderWidth: s.completed ? 0 : 1.5,
                            borderColor: s.completed ? "transparent" : theme.colors.border,
                          },
                        ]}
                        onPress={() => {
                          if (locked && !s.completed) return; // blocked
                          updateSet(activeExercise.exerciseId, i, { completed: !s.completed });
                        }}
                        disabled={locked && !s.completed}
                      >
                        <Text style={{
                          color: s.completed
                            ? theme.colors.primaryText
                            : locked
                            ? theme.colors.muted + "66"
                            : theme.colors.muted,
                          fontSize: 14,
                        }}>
                          {isFutureSet ? "🔒" : "✓"}
                        </Text>
                      </Pressable>
                    </View>
                    {/* Rest timer pill */}
                    {restRemaining != null && restRemaining > 0 && (
                      <Pressable
                        onPress={() => dismissRestTimer(timerKey)}
                        style={[styles.restPill, { backgroundColor: theme.colors.accent + "22" }]}
                      >
                        <Text style={[styles.restPillText, { color: theme.colors.accent }]}>
                          Rest: {formatRestTime(restRemaining)}
                        </Text>
                        <Text style={{ color: theme.colors.muted, fontSize: 11, marginLeft: 8 }}>tap to skip</Text>
                      </Pressable>
                    )}
                  </View>
                );

                return s.completed ? (
                  <View key={i}>{setContent}</View>
                ) : (
                  <Swipeable
                    key={i}
                    renderRightActions={() => (
                      <Pressable
                        style={[styles.deleteAction, { backgroundColor: theme.colors.danger }]}
                        onPress={() => removeSet(activeExercise.exerciseId, i)}
                      >
                        <Text style={{ color: theme.colors.dangerText, fontWeight: "700", fontSize: 13 }}>Delete</Text>
                      </Pressable>
                    )}
                  >
                    {setContent}
                  </Swipeable>
                );
              })}

              <View style={styles.setActionsGroup}>
                <View style={styles.setActionsRow}>
                  <Pressable
                    style={[styles.setActionPill, { borderColor: theme.colors.accent }]}
                    onPress={() => addWarmUpSet(activeExercise.exerciseId)}
                  >
                    <Text style={[styles.setActionPillText, { color: theme.colors.accent }]}>+ Warm-Up</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.setActionPill, { borderColor: theme.colors.accent }]}
                    onPress={() => addSet(activeExercise.exerciseId)}
                  >
                    <Text style={[styles.setActionPillText, { color: theme.colors.accent }]}>+ Working Set</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Continue / Next Exercise / All Exercises */}
            {(() => {
              const allSetsComplete = activeExercise.sets.length > 0 && activeExercise.sets.every((s) => s.completed);
              const isLastExercise = activeExerciseIndex >= session.exercises.length - 1;

              if (allSetsComplete) {
                return (
                  <View style={{ marginTop: 12 }}>
                    <Button
                      label={isLastExercise ? "All Exercises" : "Next Exercise"}
                      onPress={() => {
                        if (!isLastExercise) {
                          setActiveExerciseId(session.exercises[activeExerciseIndex + 1].exerciseId);
                        } else {
                          setActiveExerciseId(null);
                        }
                      }}
                    />
                  </View>
                );
              }

              const nextSetIdx = activeExercise.sets.findIndex((s) => !s.completed);
              const nextSet = activeExercise.sets[nextSetIdx];
              const label = nextSet.isWarmUp
                ? `Log Warm-Up ${activeExercise.sets.slice(0, nextSetIdx).filter((s) => !!s.isWarmUp).length + 1}`
                : `Log Set ${activeExercise.sets.slice(0, nextSetIdx).filter((s) => !s.isWarmUp).length + 1}`;
              const resting = exerciseHasActiveRestTimer(activeExercise);
              return (
                <View style={{ marginTop: 12 }}>
                  <Button
                    label={resting ? "Resting…" : label}
                    onPress={() => {
                      updateSet(activeExercise.exerciseId, nextSetIdx, { completed: true });
                    }}
                    variant={undefined}
                    disabled={resting}
                  />
                </View>
              );
            })()}

            <Pressable
              onPress={() =>
                Alert.alert("Remove Exercise", `Remove "${activeExercise.name}" from this session?`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Remove", style: "destructive", onPress: () => removeExercise(activeExercise.exerciseId) },
                ])
              }
              style={styles.removeExBtn}
            >
              <Text style={{ color: theme.colors.danger, fontSize: 13, fontWeight: "600" }}>Remove Exercise</Text>
            </Pressable>
          </View>
        ) : (
          /* ── Exercise List View ────────────────────────────────────── */
          <View>
            {session.exercises.length === 0 && (
              <Text style={[styles.emptyHint, { color: theme.colors.muted }]}>No exercises yet. Tap "Add Exercise" to start.</Text>
            )}

            {session.exercises.length > 0 && (
              <Card style={{ marginBottom: 20, paddingVertical: 4 }}>
                {session.exercises.map((ex, idx) => {
                  const done = ex.sets.filter((s) => s.completed).length;
                  const total = ex.sets.length;
                  const allDone = total > 0 && done === total;
                  return (
                    <View key={ex.exerciseId}>
                      <Pressable
                        style={[styles.exerciseListRow, { opacity: allDone ? 0.6 : 1 }]}
                        onPress={() => setActiveExerciseId(ex.exerciseId)}
                        onLongPress={() => removeExercise(ex.exerciseId)}
                      >
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[styles.exerciseListName, { color: theme.colors.text, flex: 0 }]} numberOfLines={1}>{ex.name}</Text>
                          {ex.loadSource === "orm" && (
                            <Text style={{ color: theme.colors.primary, fontSize: 10, fontWeight: "600", marginTop: 2 }}>Auto-filled from 1RM</Text>
                          )}
                          {ex.loadSource === "rpe-estimate" && (
                            <Text style={{ color: theme.colors.accent, fontSize: 10, fontWeight: "600", marginTop: 2 }}>Auto-filled</Text>
                          )}
                        </View>
                        <Text style={[styles.exerciseListMeta, { color: theme.colors.muted }]}>{done}/{total}</Text>
                        <Text style={[styles.exerciseListChevron, { color: theme.colors.muted }]}>
                          {allDone ? "✓" : "›"}
                        </Text>
                      </Pressable>
                      {idx < session.exercises.length - 1 && (
                        <View style={{ height: 1, backgroundColor: theme.colors.border }} />
                      )}
                    </View>
                  );
                })}
              </Card>
            )}

            <Button label="Add Exercise" onPress={() => setPickerVisible(true)} variant="secondary" />

            {session.isActive && (
              <View style={{ marginTop: 28 }}>
                <Button
                  label="End Session"
                  onPress={() => {
                    Alert.alert(
                      "End Session?",
                      `${completedSets}/${totalSets} sets completed across ${session.exercises.length} exercise(s).\n\nThis will log today's workout.`,
                      [
                        { text: "Keep Going", style: "cancel" },
                        {
                          text: "End Session",
                          style: "destructive",
                          onPress: async () => {
                            // ── Idempotency guard ──────────────────────────────
                            if (session.xpClaimed) {
                              router.replace("/");
                              return;
                            }

                            const completed: WorkoutSession = {
                              ...session,
                              isActive: false,
                              completedAt: new Date().toISOString(),
                              xpClaimed: true,
                            };
                            await updateWorkout(completed);

                            // ── Mark plan day completed ──────────────────────────
                            if (session.planWeek && session.planDay) {
                              markDayCompleted(session.planWeek, session.planDay);
                            }

                            // ── Streak ──────────────────────────────────────────
                            const newStreak = await recordActivity();

                            // ── PR detection (Epley 1RM vs prior sessions) ─────
                            const prevSessions = workouts.filter(
                              (w) => w.id !== session.id && !!w.completedAt
                            );
                            const isPR = prevSessions.length > 0 && session.exercises.some((ex) => {
                              let current = 0;
                              for (const s of ex.sets) {
                                if (!s.completed) continue;
                                const w = parseFloat(s.weight);
                                const r = parseFloat(s.reps);
                                if (!isNaN(w) && !isNaN(r) && r > 0) {
                                  current = Math.max(current, w * (1 + r / 30));
                                }
                              }
                              if (current <= 0) return false;
                              let prevBest = 0;
                              for (const prev of prevSessions) {
                                for (const pe of prev.exercises) {
                                  if (pe.name !== ex.name) continue;
                                  for (const s of pe.sets) {
                                    if (!s.completed) continue;
                                    const w = parseFloat(s.weight);
                                    const r = parseFloat(s.reps);
                                    if (!isNaN(w) && !isNaN(r) && r > 0) {
                                      prevBest = Math.max(prevBest, w * (1 + r / 30));
                                    }
                                  }
                                }
                              }
                              return current > prevBest;
                            });

                            // ── XP award ────────────────────────────────────────
                            const xpResult = awardSessionXP(
                              xp,
                              completed,
                              isPR,
                              newStreak.current
                            );
                            await setXPRecord(xpResult.updatedRecord);

                            // ── Performance week ────────────────────────────────
                            const weekRecord = buildPerformanceWeek(
                              isoWeekKey(new Date()),
                              [completed],
                              newStreak.current,
                              isPR ? 1 : 0
                            );
                            await savePerformanceRecord(upsertPerformanceWeek(performance, weekRecord));

                            // ── Locke reaction (suppressed — workout-complete screen owns celebration)

                            // ── Navigate to Workout Complete screen ──────────────
                            const params = buildWorkoutCompleteParams(
                              completed,
                              xpResult,
                              isPR,
                              newStreak.current
                            );
                            router.replace({
                              pathname: "/workout-complete",
                              params: {
                                data: JSON.stringify(params),
                              },
                            });
                          },
                        },
                      ]
                    );
                  }}
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Exercise picker bottom sheet */}
      <AppBottomSheet visible={pickerVisible} onClose={() => { setPickerVisible(false); setManualName(""); }} snapPoints={["60%"]}>
        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Exercise</Text>

        {planExercises.length > 0 ? (
          <FlatList
            data={planExercises.filter(
              (pe) => !session.exercises.some((se) => se.name === pe.exercise)
            )}
            keyExtractor={(_, idx) => idx.toString()}
            style={{ maxHeight: 300 }}
            renderItem={({ item }) => (
              <Pressable style={[styles.planRow, { borderBottomColor: theme.colors.border }]} onPress={() => addExercise(item.exercise, item.sets, item.reps)}>
                <Text style={[styles.planRowName, { color: theme.colors.text }]}>{item.exercise}</Text>
                {item.sets && <Badge label={`${item.sets}x${item.reps}`} />}
              </Pressable>
            )}
            ListEmptyComponent={<Text style={[styles.noPlanText, { color: theme.colors.muted }]}>All plan exercises added.</Text>}
          />
        ) : null}

        <Text style={[styles.orLabel, { color: theme.colors.muted }]}>Or enter manually:</Text>
        <TextInput
          style={[styles.manualInput, { backgroundColor: theme.colors.mutedBg, color: theme.colors.text }]}
          placeholder="Exercise name"
          placeholderTextColor={theme.colors.muted}
          value={manualName}
          onChangeText={setManualName}
          returnKeyType="done"
          onSubmitEditing={() => addExercise(manualName)}
        />

        <View style={styles.modalActions}>
          <Button label="Cancel" onPress={() => { setPickerVisible(false); setManualName(""); }} variant="secondary" />
          <View style={{ width: 12 }} />
          <Button label="Add" onPress={() => addExercise(manualName)} disabled={!manualName.trim()} />
        </View>
      </AppBottomSheet>

      {/* Classify exercise bottom sheet */}
      <AppBottomSheet visible={classifyVisible} onClose={() => setClassifyVisible(false)}>
        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Classify Exercise</Text>
        <Text style={{ color: theme.colors.muted, fontSize: 13, marginBottom: 16, lineHeight: 18 }}>
          "{classifyName}" isn't in the catalog yet. Pick a category so weights auto-fill next time.
        </Text>

        <Text style={{ color: theme.colors.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
          Movement Pattern
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, maxHeight: 40 }}>
          {(["squat", "hinge", "horizontal_push", "horizontal_pull", "vertical_push", "vertical_pull", "isolation_upper", "isolation_lower", "core", "conditioning", "carry"] as const).map((p) => (
            <Pressable
              key={p}
              onPress={() => setClassifyPattern(p)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: classifyPattern === p ? theme.colors.primary : theme.colors.mutedBg,
                marginRight: 6,
              }}
            >
              <Text style={{
                color: classifyPattern === p ? theme.colors.primaryText : theme.colors.text,
                fontSize: 12,
                fontWeight: "600",
              }}>
                {p.replace(/_/g, " ")}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={{ color: theme.colors.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
          Anchor Lift (for auto-fill)
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
          {(["none", "squat", "deadlift", "bench", "ohp"] as const).map((l) => (
            <Pressable
              key={l}
              onPress={() => setClassifyAnchor(l)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: classifyAnchor === l ? theme.colors.primary : theme.colors.mutedBg,
              }}
            >
              <Text style={{
                color: classifyAnchor === l ? theme.colors.primaryText : theme.colors.text,
                fontSize: 13,
                fontWeight: "600",
                textTransform: "capitalize",
              }}>
                {l}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.modalActions}>
          <Button
            label="Skip"
            onPress={() => { addExerciseWithLoad(classifyName); }}
            variant="secondary"
          />
          <View style={{ width: 12 }} />
          <Button label="Save & Add" onPress={handleClassifyAndAdd} />
        </View>
      </AppBottomSheet>

      {/* Floating pause bar */}
      {session.isActive && (
        <Pressable
          onPress={() => setPaused(true)}
          style={[styles.floatingPauseBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}
        >
          <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "700", fontFamily: "monospace", marginRight: 10 }}>
            {formatElapsed(elapsed)}
          </Text>
          <Text style={{ color: theme.colors.accent, fontSize: 14, fontWeight: "700" }}>pause</Text>
        </Pressable>
      )}

      {/* Auto-pause overlay */}
      <PauseOverlay visible={paused && !!session.isActive} onResume={handleResumePause} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56, paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 0, marginBottom: 16 },
  floatingPauseBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 34,
    borderTopWidth: 1,
  },
  unitLabel: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  headerCenter: { flex: 1, marginHorizontal: 12 },
  sessionName: { fontSize: 17, fontWeight: "600" },
  notFound: { textAlign: "center", marginTop: 48 },
  emptyHint: { textAlign: "center", marginTop: 32, marginBottom: 24 },
  // Progress bar
  // Exercise card
  exerciseCard: { marginBottom: 16 },
  exHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  exName: { fontSize: 17, fontWeight: "600", flexShrink: 1 },
  exNote: { fontSize: 13, fontStyle: "italic", marginTop: 2 },
  noteInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    fontSize: 13,
    marginTop: 4,
  },
  addNoteBtn: { marginTop: 2 },
  addNoteText: { fontSize: 12, fontWeight: "600" },
  removeExBtn: { alignItems: "center", paddingVertical: 16, marginTop: 12 },
  // Set header
  setHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, paddingHorizontal: 8 },
  setHeaderCell: { fontSize: 11, fontWeight: "800", letterSpacing: 1.0, textTransform: "uppercase", textAlign: "center" },
  // Column widths
  setColNum: { width: 56 },
  setColWeight: { flex: 1, marginRight: 8 },
  setColReps: { flex: 1, marginRight: 8 },
  setColCheck: { width: 40 },
  // Set rows
  setRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8 },
  setNum: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  setInput: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  // Warm-up badge
  warmUpBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: "flex-start" },
  warmUpBadgeText: { fontSize: 12, fontWeight: "800" },
  checkBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  // Rest timer
  restPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 10,
    marginLeft: 56,
  },
  restPillText: { fontSize: 13, fontWeight: "600", fontFamily: "monospace" },
  deleteAction: {
    backgroundColor: "#ff3b30",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    width: 70,
    marginBottom: 8,
  },
  setActionsGroup: {
    marginTop: 20,
  },
  setActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  setActionPill: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  setActionPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  // Exercise list rows
  // Focused exercise view
  focusedTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
  },
  focusedCounter: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 16,
  },
  focusedContent: {
    marginBottom: 12,
  },
  lockeCuesToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginBottom: 4,
  },
  lockeCuesBody: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginBottom: 12,
    marginLeft: 4,
  },
  lockeCueRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  exerciseListRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  exerciseListName: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
  },
  exerciseListMeta: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 10,
  },
  exerciseListChevron: {
    fontSize: 20,
    fontWeight: "400",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  planRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  planRowName: { fontSize: 15, flex: 1, marginRight: 8 },
  noPlanText: { textAlign: "center", paddingVertical: 16 },
  orLabel: { fontSize: 13, marginTop: 16, marginBottom: 8 },
  manualInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
  },
  modalActions: { flexDirection: "row" },
});

const pauseStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  card: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    width: "85%",
    maxWidth: 340,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  resumeBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
  },
  resumeBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
});

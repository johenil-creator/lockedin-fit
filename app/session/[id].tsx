import { useState, useCallback, useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
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
import { useLocke } from "../../contexts/LockeContext";
import { awardSessionXP } from "../../lib/xpService";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useProfileContext } from "../../contexts/ProfileContext";
import { LockeTips } from "../../components/LockeTips";
import { LockeMascot } from "../../components/Locke/LockeMascot";
import type { LockeMascotMood } from "../../components/Locke/LockeMascot";
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

function SessionProgressBar({
  completedSets,
  totalSets,
}: {
  completedSets: number;
  totalSets: number;
}) {
  const { theme } = useAppTheme();
  const pct = totalSets > 0 ? completedSets / totalSets : 0;
  const [trackWidth, setTrackWidth] = useState(0);
  const fillWidth = useSharedValue(0);

  useEffect(() => {
    if (trackWidth > 0) {
      fillWidth.value = withTiming(trackWidth * pct, { duration: 400 });
    }
  }, [pct, trackWidth]);

  const barStyle = useAnimatedStyle(() => ({ width: fillWidth.value }));

  return (
    <View style={styles.progressContainer}>
      <View
        style={[styles.progressTrack, { backgroundColor: theme.colors.mutedBg }]}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <Animated.View
          style={[
            styles.progressFill,
            { backgroundColor: theme.colors.primary },
            barStyle,
          ]}
        />
      </View>
      <Text style={[styles.progressLabel, { color: theme.colors.muted }]}>
        {completedSets} of {totalSets} sets
      </Text>
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { workouts, loading: workoutsLoading, updateWorkout } = useWorkouts();
  const { exercises: planExercises } = usePlanContext();
  const { xp, setXPRecord, rank } = useXP();
  const { recordActivity } = useStreak();
  const { performance, savePerformanceRecord } = usePerformance();
  const { fire } = useLocke();
  const { profile } = useProfileContext();
  const sessionUnit = profile.weightUnit === "lbs" ? "lbs" : "kg";
  const [pickerVisible, setPickerVisible] = useState(false);
  const [manualName, setManualName] = useState("");
  const [elapsed, setElapsed] = useState(0);

  // Rest timers: key = `${exerciseId}-${setIdx}`, value = seconds remaining
  const [restTimers, setRestTimers] = useState<Record<string, number>>({});
  const intervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // Per-exercise note editing: key = exerciseId
  const [editingNotes, setEditingNotes] = useState<Record<string, boolean>>({});
  // Tracks in-progress note text while the TextInput is focused
  const [pendingNotes, setPendingNotes] = useState<Record<string, string>>({});

  // Session notes editing
  const [sessionNotesOpen, setSessionNotesOpen] = useState(false);

  // Exercise list / focused view state
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);

  const session = workouts.find((w) => w.id === id);

  useEffect(() => {
    if (!session?.isActive || !session?.startedAt) return;
    const start = new Date(session.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
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
      <View style={[styles.container, { backgroundColor: theme.colors.bg, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.exitBtn, { color: theme.colors.muted }]}>✕</Text>
        </Pressable>
        <Text style={[styles.notFound, { color: theme.colors.muted }]}>Workout not found.</Text>
      </View>
    );
  }

  function startRestTimer(exId: string, setIdx: number, restTime: number) {
    const key = `${exId}-${setIdx}`;
    const duration = restTime || 90;
    setRestTimers((prev) => ({ ...prev, [key]: duration }));

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

  function addExercise(name: string) {
    if (!name.trim() || !session) return;
    const newEx: SessionExercise = {
      exerciseId: makeId(),
      name: name.trim(),
      sets: [{ reps: "", weight: "", completed: false }],
    };
    update({ ...session, exercises: [...session.exercises, newEx] });
    setPickerVisible(false);
    setManualName("");
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

  function updateSet(exId: string, setIdx: number, patch: Partial<SetEntry>) {
    if (!session) return;

    // If marking completed (transitioning from false to true), start rest timer
    if (patch.completed === true) {
      const ex = session.exercises.find((e) => e.exerciseId === exId);
      const wasCompleted = ex?.sets[setIdx]?.completed;
      if (!wasCompleted && ex) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        startRestTimer(exId, setIdx, ex.restTime ?? 90);
      }
    }

    const updated = session.exercises.map((ex) =>
      ex.exerciseId === exId
        ? {
            ...ex,
            sets: ex.sets.map((s, i) => (i === setIdx ? { ...s, ...patch } : s)),
          }
        : ex
    );
    update({ ...session, exercises: updated });
  }

  function removeExercise(exId: string) {
    if (!session) return;
    update({ ...session, exercises: session.exercises.filter((ex) => ex.exerciseId !== exId) });
  }

  function updateExerciseNote(exId: string, note: string) {
    if (!session) return;
    const updated = session.exercises.map((ex) =>
      ex.exerciseId === exId ? { ...ex, notes: note } : ex
    );
    update({ ...session, exercises: updated });
    setEditingNotes((prev) => ({ ...prev, [exId]: false }));
  }

  function updateSessionNotes(notes: string) {
    if (!session) return;
    update({ ...session, notes });
  }

  const completedSets = session.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );
  const totalSets = session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  // Locke mascot mood
  const lockeMood: LockeMascotMood = !session.isActive
    ? "neutral"
    : completedSets === totalSets && totalSets > 0
    ? "celebrating"
    : completedSets > totalSets * 0.5
    ? "encouraging"
    : "intense";

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
        <Pressable onPress={() => {
          if (session.isActive) {
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
        }}>
          <Text style={[styles.exitBtn, { color: theme.colors.muted }]}>✕</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[styles.sessionName, { color: theme.colors.text }]} numberOfLines={1}>{session.name}</Text>
            {session.isActive && (
              <>
                <Text style={{ color: theme.colors.success, fontSize: 12, fontWeight: "600" }}>● Active</Text>
                {session.startedAt && (
                  <Text style={{ color: theme.colors.muted, fontSize: 12, fontFamily: "monospace" }}>
                    {formatElapsed(elapsed)}
                  </Text>
                )}
              </>
            )}
          </View>
          <Text style={[styles.sessionDate, { color: theme.colors.muted }]}>
            {(() => { const d = new Date(session.date); return `${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}/${String(d.getFullYear()).slice(-2)}`; })()}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <SessionProgressBar completedSets={completedSets} totalSets={totalSets} />

      {/* Locke mascot */}
      <View style={{ alignItems: "center", marginVertical: 8 }}>
        <LockeMascot size="icon" mood={lockeMood} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Session notes */}
        <Card style={styles.sessionNotesCard}>
          <Pressable
            onPress={() => setSessionNotesOpen((v) => !v)}
            style={styles.sessionNotesHeader}
          >
            <Text style={[styles.sessionNotesTitle, { color: theme.colors.muted }]}>Session Notes</Text>
            <Text style={{ color: theme.colors.muted, fontSize: 14 }}>{sessionNotesOpen ? "▾" : "▸"}</Text>
          </Pressable>
          {sessionNotesOpen && (
            <TextInput
              style={[
                styles.sessionNotesInput,
                {
                  backgroundColor: theme.colors.mutedBg,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="Session notes..."
              placeholderTextColor={theme.colors.muted}
              value={session.notes ?? ""}
              onChangeText={(text) => update({ ...session, notes: text })}
              onBlur={() => updateSessionNotes(session.notes ?? "")}
              multiline
            />
          )}
        </Card>

        {activeExercise ? (
          /* ── Focused Exercise View ─────────────────────────────────── */
          <View>
            <View style={styles.focusedNavRow}>
              <Pressable onPress={() => setActiveExerciseId(null)} style={{ paddingVertical: 8 }}>
                <Text style={{ color: theme.colors.primary, fontSize: 14, fontWeight: "600" }}>← All Exercises</Text>
              </Pressable>
              <Pressable onPress={() => removeExercise(activeExercise.exerciseId)}>
                <Text style={[styles.removeEx, { color: theme.colors.muted }]}>✕</Text>
              </Pressable>
            </View>

            <Text style={[styles.focusedTitle, { color: theme.colors.text }]}>{activeExercise.name}</Text>
            <Text style={[styles.focusedCounter, { color: theme.colors.muted }]}>
              Exercise {activeExerciseIndex + 1} of {session.exercises.length}
            </Text>

            <View style={styles.focusedContent}>
                  {activeExercise.notes ? (
                    <LockeTips tip={activeExercise.notes} />
                  ) : (
                    <>
                      {editingNotes[activeExercise.exerciseId] && (
                        <TextInput
                          style={[
                            styles.noteInput,
                            {
                              backgroundColor: theme.colors.mutedBg,
                              color: theme.colors.text,
                              borderColor: theme.colors.border,
                            },
                          ]}
                          placeholder="Add a note..."
                          placeholderTextColor={theme.colors.muted}
                          value={pendingNotes[activeExercise.exerciseId] ?? ""}
                          onChangeText={(text) =>
                            setPendingNotes((prev) => ({ ...prev, [activeExercise.exerciseId]: text }))
                          }
                          onBlur={() =>
                            updateExerciseNote(
                              activeExercise.exerciseId,
                              pendingNotes[activeExercise.exerciseId] ?? ""
                            )
                          }
                          onSubmitEditing={() =>
                            updateExerciseNote(
                              activeExercise.exerciseId,
                              pendingNotes[activeExercise.exerciseId] ?? ""
                            )
                          }
                          autoFocus
                          returnKeyType="done"
                        />
                      )}
                      {!editingNotes[activeExercise.exerciseId] && (
                        <Pressable
                          onPress={() => setEditingNotes((prev) => ({ ...prev, [activeExercise.exerciseId]: true }))}
                          style={styles.addNoteBtn}
                        >
                          <Text style={[styles.addNoteText, { color: theme.colors.accent }]}>+ Note</Text>
                        </Pressable>
                      )}
                    </>
                  )}

              {/* Set headers */}
              <View style={styles.setHeaderRow}>
                <Text style={[styles.setHeaderCell, styles.setColNum, { color: theme.colors.muted }]}>SET</Text>
                <Text style={[styles.setHeaderCell, styles.setColWeight, { color: theme.colors.muted }]}>WEIGHT</Text>
                <Text style={[styles.setHeaderCell, styles.setColReps, { color: theme.colors.muted }]}>REPS</Text>
                <Text style={[styles.setHeaderCell, styles.setColCheck, { color: theme.colors.muted }]}>DONE</Text>
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
                return (
                  <View key={i}>
                    <View style={[styles.setRow, isWarmUp && { opacity: 0.85 }]}>
                      <View style={styles.setColNum}>
                        {isWarmUp ? (
                          <View style={[styles.warmUpBadge, { backgroundColor: theme.colors.accent }]}>
                            <Text style={[styles.warmUpBadgeText, { color: theme.colors.accentText }]}>W{warmUpIndex}</Text>
                          </View>
                        ) : (
                          <Text style={[styles.setNum, { color: theme.colors.muted }]}>{workingIndex}</Text>
                        )}
                      </View>
                      <TextInput
                        style={[styles.setInput, styles.setColWeight, { backgroundColor: theme.colors.mutedBg, color: theme.colors.text }]}
                        placeholder={sessionUnit}
                        placeholderTextColor={theme.colors.muted}
                        value={s.weight}
                        onChangeText={(v) => updateSet(activeExercise.exerciseId, i, { weight: v })}
                        keyboardType="decimal-pad"
                      />
                      <TextInput
                        style={[styles.setInput, styles.setColReps, { backgroundColor: theme.colors.mutedBg, color: theme.colors.text }]}
                        placeholder="reps"
                        placeholderTextColor={theme.colors.muted}
                        value={s.reps}
                        onChangeText={(v) => updateSet(activeExercise.exerciseId, i, { reps: v })}
                        keyboardType="number-pad"
                      />
                      <Pressable
                        style={[styles.checkBtn, styles.setColCheck, { backgroundColor: s.completed ? theme.colors.primary : theme.colors.mutedBg }]}
                        onPress={() => updateSet(activeExercise.exerciseId, i, { completed: !s.completed })}
                      >
                        <Text style={{ color: s.completed ? theme.colors.primaryText : theme.colors.muted, fontSize: 14 }}>✓</Text>
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
                        <Text style={{ color: theme.colors.muted, fontSize: 11, marginLeft: 8 }}>tap to dismiss</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}

              <Pressable style={styles.addSetBtn} onPress={() => addSet(activeExercise.exerciseId)}>
                <Text style={[styles.addSetText, { color: theme.colors.accent }]}>+ Set</Text>
              </Pressable>
            </View>

            {/* Next Exercise / Back to List */}
            <View style={{ marginTop: 12 }}>
              <Button
                label={activeExerciseIndex < session.exercises.length - 1 ? "Next Exercise" : "All Exercises"}
                onPress={() => {
                  if (activeExerciseIndex < session.exercises.length - 1) {
                    setActiveExerciseId(session.exercises[activeExerciseIndex + 1].exerciseId);
                  } else {
                    setActiveExerciseId(null);
                  }
                }}
                variant="secondary"
              />
            </View>
          </View>
        ) : (
          /* ── Exercise List View ────────────────────────────────────── */
          <View>
            {session.exercises.length === 0 && (
              <Text style={[styles.emptyHint, { color: theme.colors.muted }]}>No exercises yet. Tap "Add Exercise" to start.</Text>
            )}

            {session.exercises.length > 0 && (
              <Card style={{ marginBottom: 16 }}>
                {session.exercises.map((ex, idx) => {
                  const done = ex.sets.filter((s) => s.completed).length;
                  const total = ex.sets.length;
                  const allDone = total > 0 && done === total;
                  return (
                    <View key={ex.exerciseId}>
                      <Pressable
                        style={[styles.exerciseListRow, { opacity: allDone ? 0.6 : 1 }]}
                        onPress={() => setActiveExerciseId(ex.exerciseId)}
                      >
                        <Text style={[styles.exerciseListName, { color: theme.colors.text }]} numberOfLines={1}>{ex.name}</Text>
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
              <View style={{ marginTop: 24 }}>
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
                            const completed = {
                              ...session,
                              isActive: false,
                              completedAt: new Date().toISOString(),
                            };
                            await updateWorkout(completed);

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
                            const { updatedRecord, rankedUp } = awardSessionXP(
                              xp,
                              completed,
                              isPR,
                              newStreak.current
                            );
                            await setXPRecord(updatedRecord);

                            // ── Performance week ────────────────────────────────
                            const weekRecord = buildPerformanceWeek(
                              isoWeekKey(new Date()),
                              [completed],
                              newStreak.current,
                              isPR ? 1 : 0
                            );
                            await savePerformanceRecord(upsertPerformanceWeek(performance, weekRecord));

                            // ── Locke reaction ──────────────────────────────────
                            fire({
                              trigger: rankedUp
                                ? "rank_up"
                                : isPR
                                ? "pr_hit"
                                : newStreak.current >= 7
                                ? "streak_milestone"
                                : newStreak.current >= 3
                                ? "streak_milestone"
                                : "session_complete",
                              streakDays: newStreak.current,
                              isPR,
                              rank,
                            });

                            router.replace("/");
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

      {/* Exercise picker modal */}
      <Modal visible={pickerVisible} transparent animationType="slide">
        <View style={[styles.modalOverlay]}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Exercise</Text>

            {planExercises.length > 0 ? (
              <FlatList
                data={planExercises.filter(
                  (pe) => !session.exercises.some((se) => se.name === pe.exercise)
                )}
                keyExtractor={(_, idx) => idx.toString()}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => (
                  <Pressable style={[styles.planRow, { borderBottomColor: theme.colors.border }]} onPress={() => addExercise(item.exercise)}>
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
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56, paddingHorizontal: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 0, marginBottom: 12 },
  exitBtn: { fontSize: 24, padding: 4 },
  unitLabel: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  headerCenter: { flex: 1, marginHorizontal: 12 },
  sessionName: { fontSize: 17, fontWeight: "600" },
  sessionDate: { fontSize: 12 },
  notFound: { textAlign: "center", marginTop: 48 },
  emptyHint: { textAlign: "center", marginTop: 32, marginBottom: 24 },
  // Progress bar
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    flexDirection: "row",
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    position: "absolute",
    left: 0,
    top: 0,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
    letterSpacing: 0.3,
  },
  // Session notes
  sessionNotesCard: { marginBottom: 16 },
  sessionNotesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sessionNotesTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  sessionNotesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginTop: 10,
    minHeight: 60,
    textAlignVertical: "top",
  },
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
  removeEx: { fontSize: 14, padding: 4 },
  // Set header
  setHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  setHeaderCell: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  // Column widths
  setColNum: { width: 56 },
  setColWeight: { flex: 1, marginRight: 8 },
  setColReps: { flex: 1, marginRight: 8 },
  setColCheck: { width: 36 },
  // Set rows
  setRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  setNum: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  setInput: {
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    textAlign: "center",
  },
  // Warm-up badge
  warmUpBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start" },
  warmUpBadgeText: { fontSize: 9, fontWeight: "800" },
  checkBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  // Rest timer
  restPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 8,
    marginLeft: 56,
  },
  restPillText: { fontSize: 13, fontWeight: "600", fontFamily: "monospace" },
  addSetBtn: { marginTop: 4, alignSelf: "flex-start" },
  addSetText: { fontSize: 13, fontWeight: "600" },
  // Exercise list rows
  // Focused exercise view
  focusedNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  focusedTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 2,
  },
  focusedCounter: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 16,
  },
  focusedContent: {
    marginBottom: 8,
  },
  exerciseListRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  exerciseListName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  exerciseListMeta: {
    fontSize: 13,
    fontWeight: "600",
    marginRight: 8,
  },
  exerciseListChevron: {
    fontSize: 18,
    fontWeight: "300",
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 40,
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
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
  },
  modalActions: { flexDirection: "row" },
});

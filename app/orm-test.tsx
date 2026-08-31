import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Keyboard,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { impact, ImpactStyle } from "../lib/haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useProfileContext } from "../contexts/ProfileContext";
import { usePlanContext } from "../contexts/PlanContext";
import { useWorkouts } from "../hooks/useWorkouts";
import { useStreak, isoWeek } from "../hooks/useStreak";
import { useXP } from "../hooks/useXP";
import { useOrmTest } from "../hooks/useOrmTest";
import { useAppTheme } from "../contexts/ThemeContext";
import { useLocke } from "../contexts/LockeContext";
import { useToast } from "../contexts/ToastContext";
import { LockeMascot } from "../components/Locke/LockeMascot";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { BackButton } from "../components/BackButton";
import { Skeleton } from "../components/Skeleton";
import { AppBottomSheet } from "../components/AppBottomSheet";
import { LIFT_TIPS } from "../lib/liftTips";
import { hasAcceptedOrmDisclaimer, markOrmDisclaimerAccepted } from "../lib/storage";
import { makeId } from "../lib/helpers";
import { awardSessionXP } from "../lib/xpService";
import { syncCompletedSession } from "../lib/healthkit/integration";
import { watchSession } from "../lib/watchSession";
import type { WorkoutSession, SessionExercise, SetEntry, OrmTestSession } from "../lib/types";

// ── Progress Bar ────────────────────────────────────────────────────────────

function OrmProgressBar({
  completedLifts,
  totalLifts,
}: {
  completedLifts: number;
  totalLifts: number;
}) {
  const { theme } = useAppTheme();
  const pct = completedLifts / totalLifts;
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
        Lift {Math.min(completedLifts + 1, totalLifts)} of {totalLifts}
      </Text>
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function OrmTestScreen() {
  const { source } = useLocalSearchParams<{ source?: string }>();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { profile, updateProfile } = useProfileContext();
  const { exercises, recalculateWeights } = usePlanContext();
  const { workouts, addWorkout } = useWorkouts();
  const { recordActivity } = useStreak();
  const { xp, setXPRecord } = useXP();
  const { showToast } = useToast();
  const ormTest = useOrmTest(updateProfile);
  const { fire } = useLocke();

  const [unit, setUnit] = useState<"kg" | "lbs">(
    profile.weightUnit ?? "kg"
  );
  const [unitChosen, setUnitChosen] = useState(
    !!profile.weightUnit
  );
  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [setsVisible, setSetsVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const watchInitiatedRef = useRef(false);
  const [tipExpanded, setTipExpanded] = useState(false);
  const [safetyExpanded, setSafetyExpanded] = useState(false);

  const [disclaimerChecked, setDisclaimerChecked] = useState(false);

  // Show safety disclaimer on first visit
  useEffect(() => {
    hasAcceptedOrmDisclaimer().then((accepted) => {
      if (accepted) {
        setDisclaimerChecked(true);
      } else {
        Alert.alert(
          "Important Safety Notice",
          "One-rep max testing involves lifting near your maximum capacity. Before proceeding:\n\n\u2022 Ensure you have a spotter or safety equipment\n\u2022 Warm up thoroughly before attempting\n\u2022 Stop immediately if you feel pain or dizziness\n\u2022 Consult a physician if you have any medical conditions or concerns\n\nThis feature provides estimates for training purposes only and is not medical or professional fitness advice.",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => router.back(),
            },
            {
              text: "I Understand",
              onPress: () => {
                markOrmDisclaimerAccepted();
                setDisclaimerChecked(true);
              },
            },
          ],
          { cancelable: false }
        );
      }
    });
  }, []);

  // Rest timer
  const REST_DURATION = 120; // 2 minutes between 1RM sets
  const [restTimer, setRestTimer] = useState<{ key: string; remaining: number } | null>(null);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function formatRestTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function startRestTimer(setIdx: number) {
    // Clear any existing timer
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    watchSession.sendRestStart(REST_DURATION);
    const key = `set-${setIdx}`;
    setRestTimer({ key, remaining: REST_DURATION });
    restIntervalRef.current = setInterval(() => {
      setRestTimer((prev) => {
        if (!prev || prev.remaining <= 1) {
          if (restIntervalRef.current) clearInterval(restIntervalRef.current);
          restIntervalRef.current = null;
          return null;
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
  }

  function dismissRestTimer() {
    if (restIntervalRef.current) {
      clearInterval(restIntervalRef.current);
      restIntervalRef.current = null;
    }
    setRestTimer(null);
    watchSession.sendRestDone();
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    };
  }, []);

  // If resuming an existing session, skip the unit picker
  useEffect(() => {
    if (ormTest.loading) return;
    if (ormTest.session !== null) {
      // Coming from onboarding fresh — clear stale session and start fresh
      if (source === "onboarding") {
        ormTest.clearSession();
        // Start fresh test immediately with the unit from onboarding
        setTimeout(() => ormTest.startTest(unit), 0);
        return;
      }
      setUnit(ormTest.session.unit);
      setUnitChosen(true);
    } else if (unitChosen && !ormTest.session) {
      // Unit already known — start test directly
      ormTest.startTest(unit);
    }
  }, [ormTest.loading]);

  // Fire Locke intense state when test begins
  useEffect(() => {
    if (ormTest.session && ormTest.session.status === "in_progress") {
      fire({ trigger: "1rm_test" }, 10000);
    }
  }, [ormTest.session?.id]);

  // If resuming an in-progress session, show sets if the current lift already has them
  useEffect(() => {
    if (ormTest.session && ormTest.currentLift && ormTest.currentLift.sets.length > 0) {
      setSetsVisible(true);
    }
  }, [ormTest.loading]);

  // Reset tip when lift changes
  useEffect(() => { setTipExpanded(false); }, [ormTest.session?.currentLiftIndex]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const liftIndex = ormTest.session?.currentLiftIndex ?? 0;
  const currentLift = ormTest.currentLift;
  const completedCount =
    ormTest.session?.lifts.filter((l) => l.completed).length ?? 0;
  const allSetsComplete = currentLift?.sets.every((s) => s.completed) ?? false;
  // True when all 4 lifts are done (stays true after finishTest to prevent
  // a flash of empty state while navigating out)
  const allLiftsComplete =
    ormTest.session?.lifts.every((l) => l.completed) ?? false;

  // ── Watch sync ──────────────────────────────────────────────────────────────

  /** Push current 1RM lift/set state to Watch. */
  function syncWatchState() {
    if (!watchSession.isAvailable || !currentLift) return;
    const nextIdx = currentLift.sets.findIndex((s) => !s.completed);
    const setIdx = nextIdx >= 0 ? nextIdx : currentLift.sets.length - 1;
    const set = currentLift.sets[setIdx];
    const pctLabel = set?.prescribedReps === 'amrap'
      ? 'AMRAP'
      : set?.prescribedPct === 0
        ? 'Bar'
        : `${Math.round((set?.prescribedPct ?? 0) * 100)}%`;
    watchSession.sendWorkoutState({
      exerciseName: `1RM: ${currentLift.liftLabel}`,
      setIndex: setIdx,
      totalSets: currentLift.sets.length,
      exerciseIndex: liftIndex,
      totalExercises: ormTest.session?.lifts.length ?? 4,
      targetReps: set?.prescribedReps === 'amrap'
        ? (set?.reps ? String(set.reps) : 'MAX')
        : String(set?.prescribedReps ?? ''),
      targetWeight: parseFloat(set?.weight ?? '0') || 0,
      weightUnit: (unit === 'lbs' ? 'lb' : 'kg') as 'lb' | 'kg',
      notes: pctLabel,
    });
  }

  // Derive current set values so the sync fires when reps/weight change (e.g. AMRAP entry)
  const currentSetIdx = currentLift?.sets.findIndex((s) => !s.completed) ?? -1;
  const currentSetReps = currentSetIdx >= 0 ? currentLift?.sets[currentSetIdx]?.reps : undefined;
  const currentSetWeight = currentSetIdx >= 0 ? currentLift?.sets[currentSetIdx]?.weight : undefined;

  // Sync Watch whenever the active lift, set, or set values change
  useEffect(() => {
    if (ormTest.session?.status !== 'in_progress' || !currentLift) return;
    if (setsVisible) {
      // Sets are visible — sync current set/weight/reps
      syncWatchState();
    } else {
      // Between lifts (estimate input screen) — tell Watch to show keypad
      // so the user can enter their estimated 1RM directly from the wrist.
      watchSession.sendWorkoutState({
        exerciseName: currentLift.liftLabel,
        setIndex: 0,
        totalSets: 1,
        exerciseIndex: liftIndex,
        totalExercises: ormTest.session?.lifts.length ?? 4,
        targetReps: '',
        targetWeight: 0,
        weightUnit: (unit === 'lbs' ? 'lb' : 'kg') as 'lb' | 'kg',
        isAwaitingEstimate: true,
      });
    }
  }, [liftIndex, currentLift?.sets.filter((s) => s.completed).length, setsVisible, currentSetReps, currentSetWeight]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for Watch commands
  useEffect(() => {
    const unsub1 = watchSession.onSetDone(() => {
      if (!currentLift) return;
      const nextIndex = currentLift.sets.findIndex((s) => !s.completed);
      if (nextIndex >= 0 && !restTimer) {
        // Complete the next incomplete set
        ormTest.completeSet(liftIndex, nextIndex);
        impact(ImpactStyle.Medium);
        // Check if this was the last set — if so, skip rest and advance
        const remainingAfter = currentLift.sets.filter(
          (s, i) => !s.completed && i !== nextIndex
        ).length;
        if (remainingAfter === 0) {
          // Last set done — auto-advance to next lift (no rest needed)
          handleCompleteLift();
        } else {
          startRestTimer(nextIndex);
        }
      } else if (nextIndex < 0) {
        // All sets complete — auto-advance to next lift
        handleCompleteLift();
      }
    });
    const unsub2 = watchSession.onSkipRest(() => {
      dismissRestTimer();
    });
    const unsub3 = watchSession.onAdjustWeight(({ delta }) => {
      if (!currentLift) return;
      const idx = currentLift.sets.findIndex((s) => !s.completed);
      if (idx < 0) return;
      const current = parseFloat(currentLift.sets[idx].weight ?? '0') || 0;
      const newWeight = Math.max(0, current + delta);
      ormTest.updateSetWeight(liftIndex, idx, String(newWeight));
    });
    const unsub4 = watchSession.onAdjustReps(({ delta }) => {
      if (!currentLift) return;
      const idx = currentLift.sets.findIndex((s) => !s.completed);
      if (idx < 0) return;
      const current = parseInt(currentLift.sets[idx].reps ?? '0', 10) || 0;
      const newReps = Math.max(0, current + delta);
      ormTest.updateSetReps(liftIndex, idx, String(newReps));
    });
    const unsub5 = watchSession.onSubmitEstimate(({ value }) => {
      if (!currentLift || setsVisible) return;
      const parsed = parseFloat(value);
      if (!parsed || parsed <= 0) return;
      ormTest.setEstimatedInput(liftIndex, value);
      // Small delay so the state updates before generating sets
      setTimeout(() => {
        ormTest.generateSets(liftIndex);
        setSetsVisible(true);
      }, 50);
    });
    const unsub6 = watchSession.onEndSession(() => {
      // User tapped "Save to Profile" on Watch after all lifts complete
      watchInitiatedRef.current = true;
      handleFinish();
    });
    const unsub7 = watchSession.onUpdateWeights(async () => {
      // User tapped "Update" on Watch weight update prompt
      const count = await recalculateWeights(profile, workouts);
      if (count > 0) showToast({ message: `Updated weights for ${count} exercise${count !== 1 ? "s" : ""}`, type: "success" });
      watchSession.endWorkout();
      navigateOut();
    });
    const unsub8 = watchSession.onSkipUpdateWeights(() => {
      // User tapped "Skip" on Watch weight update prompt
      watchSession.endWorkout();
      navigateOut();
    });
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7(); unsub8(); };
  }); // no deps — always uses latest closure values

  // End Watch session when test finishes or user exits
  useEffect(() => {
    return () => { watchSession.endWorkout(); };
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handlePickUnit(picked: "kg" | "lbs") {
    setUnit(picked);
    setUnitChosen(true);
    ormTest.startTest(picked);
  }

  function handleGenerateSets() {
    ormTest.generateSets(liftIndex);
    setSetsVisible(true);
  }

  function handleCompleteCurrentSet() {
    if (!currentLift || restTimer) return;
    const nextIndex = currentLift.sets.findIndex((s) => !s.completed);
    if (nextIndex >= 0) {
      ormTest.completeSet(liftIndex, nextIndex);
      impact(ImpactStyle.Medium);
      // Check if this was the last set — skip rest and advance
      const remainingAfter = currentLift.sets.filter(
        (s, i) => !s.completed && i !== nextIndex
      ).length;
      if (remainingAfter === 0) {
        handleCompleteLift();
      } else {
        startRestTimer(nextIndex);
      }
    }
  }

  async function handleCompleteLift() {
    dismissRestTimer();
    try {
      const updated = await ormTest.completeLift();
      setSetsVisible(false);
      // Check the RETURNED session (not stale React state) for completion
      const allDone = updated?.lifts.every((l) => l.completed) ?? false;
      if (allDone) {
        watchSession.sendSessionComplete({ completionLabel: 'Save to Profile' });
      }
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  function navigateOut() {
    if (source === "onboarding") {
      router.replace("/");
    } else {
      router.back();
    }
  }

  // ── Record the completed 1RM test as a WorkoutSession ──────────────────────
  //
  // Creates a strength workout from the test's lifts so it appears in history,
  // counts toward streak, awards XP, and syncs to Apple Health.
  async function recordTestAsWorkout(testSession: OrmTestSession) {
    const now = new Date().toISOString();
    const startedAt = testSession.startedAt;

    const sessionExercises: SessionExercise[] = testSession.lifts
      .filter((lift) => lift.completed)
      .map((lift) => {
        const sets: SetEntry[] = lift.sets
          .filter((s) => s.completed)
          .map((s) => ({
            reps: String(s.reps),
            weight: String(s.weight),
            completed: true,
            isWarmUp: s.prescribedPct < 0.7, // bar + 50% + 60% treated as warmup
          }));
        return {
          exerciseId: makeId(),
          name: lift.liftLabel,
          sets,
          equipment: "barbell",
          loadSource: "orm",
        };
      });

    if (sessionExercises.length === 0) return;

    const workoutSession: WorkoutSession = {
      id: makeId(),
      name: "1RM Strength Trial",
      date: now,
      startedAt,
      completedAt: now,
      isActive: false,
      exercises: sessionExercises,
      sessionType: "strength",
      xpClaimed: true,
    };

    await addWorkout(workoutSession);

    // ── Streak (with freeze + rest-day support) ───────────────────────────
    const restDays = profile.restDays ?? [];
    const week = isoWeek();
    const freezesLeft =
      profile.freezesResetWeek === week
        ? (profile.freezesRemaining ?? 2)
        : 2;
    const { streak: newStreak, freezesUsed } = await recordActivity(
      new Date(),
      restDays,
      freezesLeft
    );
    if (freezesUsed > 0 || profile.freezesResetWeek !== week) {
      updateProfile({
        freezesRemaining: freezesLeft - freezesUsed,
        freezesResetWeek: week,
      });
    }

    // ── XP award (1RM test always treated as a PR since it establishes baseline) ─
    const xpResult = awardSessionXP(xp, workoutSession, true, newStreak.current);
    await setXPRecord(xpResult.updatedRecord);

    // ── Sync to Apple Health (fire-and-forget) ───────────────────────────
    void syncCompletedSession(workoutSession);
  }

  async function handleFinish() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Capture the pre-finish session so we can record it as a workout
      // (finishTest clears local storage and flips status to "completed").
      const testSession = ormTest.session;
      await ormTest.finishTest();

      if (testSession) {
        await recordTestAsWorkout(testSession);
      }

      if (exercises.length > 0) {
        if (watchInitiatedRef.current) {
          // Watch-initiated — send prompt to Watch instead of Alert
          watchSession.sendWeightUpdatePrompt();
        } else {
          Alert.alert(
            "Update Plan Weights",
            "Update your plan weights with your new 1RM data?",
            [
              { text: "Skip", style: "cancel", onPress: () => navigateOut() },
              {
                text: "Update",
                onPress: async () => {
                  const count = await recalculateWeights(profile, workouts);
                  if (count > 0) showToast({ message: `Updated weights for ${count} exercise${count !== 1 ? "s" : ""}`, type: "success" });
                  navigateOut();
                },
              },
            ]
          );
        }
      } else {
        if (watchInitiatedRef.current) {
          watchSession.endWorkout();
        }
        navigateOut();
      }
    } catch (e) {
      setIsSaving(false);
      Alert.alert("Save Failed", e instanceof Error ? e.message : "Could not save results. Please try again.");
    }
  }

  async function handleSaveAndExit() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await ormTest.saveAndExit();
      navigateOut();
    } catch (e) {
      setIsSaving(false);
      Alert.alert("Save Failed", e instanceof Error ? e.message : "Could not save results. Please try again.");
    }
  }

  async function handleRestart() {
    await ormTest.restartTest(unit);
    setSetsVisible(false);
    setExitModalVisible(false);
  }

  // ── Wait for disclaimer check before rendering anything ─────────────────

  if (!disclaimerChecked) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.header}>
          <BackButton />
        </View>
      </View>
    );
  }

  // ── Unit Picker (shown before test starts or while loading) ────────────────

  if (!unitChosen) {
    const unitCardStyle = (selected: boolean) => ({
      flex: 1 as const,
      flexDirection: "row" as const,
      height: 48,
      borderRadius: 24,
      borderWidth: 2,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
      backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
      borderColor: selected ? theme.colors.primary : theme.colors.border,
    });
    const unitLabelColor = (selected: boolean) =>
      selected ? theme.colors.primaryText : theme.colors.text;
    const unitSubColor = (selected: boolean) =>
      selected ? theme.colors.primaryText + "BB" : theme.colors.muted;

    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.header}>
          <BackButton />
        </View>
        <View style={styles.unitPickerCenter}>
          <LockeMascot size={240} mood="neutral" />
          <Text style={[styles.unitPickerMicrocopy, { color: theme.colors.muted }]}>
            Just need to know how you measure.
          </Text>
          <Text style={[styles.unitPickerTitle, { color: theme.colors.text }]}>
            How do you measure weight?
          </Text>
          <View style={styles.unitPickerRow}>
            <Pressable
              style={unitCardStyle(unit === "kg")}
              onPress={() => setUnit("kg")}
            >
              <Text style={[styles.unitPickerLabel, { color: unitLabelColor(unit === "kg") }]}>KG</Text>
              <Text style={[styles.unitPickerSub, { color: unitSubColor(unit === "kg") }]}>Kilograms</Text>
            </Pressable>
            <Pressable
              style={unitCardStyle(unit === "lbs")}
              onPress={() => setUnit("lbs")}
            >
              <Text style={[styles.unitPickerLabel, { color: unitLabelColor(unit === "lbs") }]}>LBS</Text>
              <Text style={[styles.unitPickerSub, { color: unitSubColor(unit === "lbs") }]}>Pounds</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.unitPickerBottom}>
          <Button label="Continue" onPress={() => handlePickUnit(unit)} />
        </View>
      </View>
    );
  }

  // ── Loading state (only for test content, not unit picker) ─────────────────

  if (ormTest.loading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.bg, alignItems: "center", paddingTop: 80 },
        ]}
      >
        <Skeleton.Circle size={80} />
        <View style={{ height: 16 }} />
        <Skeleton.Rect width="60%" height={20} />
        <View style={{ height: 16 }} />
        <Skeleton.Card />
      </View>
    );
  }

  // ── Review Screen (shown after all 4 lifts complete, before finishTest) ─────

  function ReviewScreen() {
    if (!ormTest.session) return null;
    return (
      <View style={styles.scrollContent}>
        <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>
          1RM REVIEW
        </Text>
        <Text style={[styles.resultsTitle, { color: theme.colors.text }]}>
          Your Results
        </Text>
        <Text style={[{ color: theme.colors.muted, fontSize: 14, marginBottom: 20, lineHeight: 20 }]}>
          Review your calculated 1RM values below, then tap Calculate to save them to your profile.
        </Text>

        {ormTest.session.lifts.map((lift) => {
          const set7 = lift.sets[6];
          return (
            <Card key={lift.liftKey} style={styles.resultCard}>
              <Text style={[styles.resultLiftName, { color: theme.colors.text }]}>
                {lift.liftLabel}
              </Text>
              <Text style={[styles.resultOrm, { color: theme.colors.primary }]}>
                {lift.finalOrm ?? "—"} {unit}
              </Text>
              <Text style={[styles.resultLabel, { color: theme.colors.muted }]}>
                Est. 1RM
              </Text>
              {set7 && (
                <Text style={[styles.resultBasis, { color: theme.colors.muted }]}>
                  Based on: {set7.weight} {unit} × {set7.reps || "0"} reps
                </Text>
              )}
            </Card>
          );
        })}

        <View style={{ height: 16 }} />
        <Button label="Save to Profile" onPress={handleFinish} disabled={isSaving} loading={isSaving} />
        <View style={{ height: 12 }} />
        <Button label="Retake Test" onPress={handleRestart} variant="secondary" />
        <View style={{ height: 40 }} />
      </View>
    );
  }

  // ── Per-Lift View ───────────────────────────────────────────────────────────

  function LiftView() {
    if (!currentLift) return null;

    // State A: Estimated input
    if (!setsVisible) {
      return (
        <View style={styles.estimateContainer}>
          <Text style={[styles.liftTitle, { color: theme.colors.text }]}>
            {currentLift.liftLabel}
          </Text>
          <Text style={[styles.liftSubtitle, { color: theme.colors.muted }]}>
            Enter your estimated 1RM to generate your warm-up weights
          </Text>

          <Text style={[styles.estimateLabel, { color: theme.colors.muted }]}>
            ESTIMATED 1RM ({unit})
          </Text>
          <TextInput
            style={[
              styles.estimateInput,
              {
                backgroundColor: theme.colors.mutedBg,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
            keyboardType="decimal-pad"
            maxLength={6}
            placeholder="0"
            placeholderTextColor={theme.colors.muted}
            value={currentLift.estimatedInput}
            onChangeText={(v) => ormTest.setEstimatedInput(liftIndex, v)}
            autoFocus={false}
          />

          <View style={{ marginTop: 24 }}>
            <Button
              label="Generate Sets"
              onPress={handleGenerateSets}
              disabled={
                !currentLift.estimatedInput ||
                currentLift.estimatedInput === "0"
              }
            />
          </View>
        </View>
      );
    }

    // State B: Set list
    const nextSetIndex = currentLift.sets.findIndex((s) => !s.completed);

    return (
        <View style={styles.scrollContent}>
          <Text style={[styles.liftTitle, { color: theme.colors.text }]}>
            {currentLift.liftLabel}
          </Text>
          <Text style={[styles.liftEstLabel, { color: theme.colors.muted }]}>
            Est. 1RM: {currentLift.estimatedInput} {unit}
          </Text>

          {/* Column headers */}
          <View style={styles.setHeaderRow}>
            <Text style={[styles.setHeaderCell, styles.setColNum, { color: theme.colors.muted }]}>
              SET
            </Text>
            <Text style={[styles.setHeaderCell, styles.setColWeight, { color: theme.colors.muted }]}>
              WEIGHT
            </Text>
            <Text style={[styles.setHeaderCell, styles.setColReps, { color: theme.colors.muted }]}>
              REPS
            </Text>
            <Text style={[styles.setHeaderCell, styles.setColCheck, { color: theme.colors.muted }]}>
              DONE
            </Text>
          </View>

          {currentLift.sets.map((set, i) => {
            const isAmrap = set.prescribedReps === "amrap";
            const isCurrent = i === nextSetIndex;
            const isFuture = !set.completed && i > nextSetIndex && nextSetIndex >= 0;
            const rowOpacity = set.completed ? 0.6 : isFuture ? 0.4 : 1;

            if (isAmrap) {
              return (
                <View key={i}>
                  <View
                    style={[
                      styles.setRow,
                      {
                        borderWidth: 1,
                        borderColor: theme.colors.primary,
                        borderRadius: 8,
                        padding: 8,
                        marginBottom: 4,
                        opacity: rowOpacity,
                      },
                    ]}
                  >
                    <View style={styles.setColNum}>
                      <View
                        style={[
                          styles.amrapBadge,
                          { backgroundColor: theme.colors.accent },
                        ]}
                      >
                        <Text
                          style={[styles.amrapBadgeText, { color: theme.colors.accentText }]}
                          numberOfLines={1}
                        >
                          AMRAP
                        </Text>
                      </View>
                    </View>
                    <TextInput
                      style={[
                        styles.setWeightInput,
                        styles.setColWeight,
                        {
                          backgroundColor: theme.colors.mutedBg,
                          color: theme.colors.text,
                        },
                      ]}
                      keyboardType="decimal-pad"
                      maxLength={6}
                      value={set.weight}
                      onChangeText={(v) =>
                        ormTest.updateSetWeight(liftIndex, i, v)
                      }
                      editable={!set.completed && !isFuture}
                    />
                    <TextInput
                      style={[
                        styles.setWeightInput,
                        styles.setColReps,
                        {
                          backgroundColor: theme.colors.mutedBg,
                          color: theme.colors.text,
                          borderWidth: isCurrent ? 1 : 0,
                          borderColor: theme.colors.primary,
                        },
                      ]}
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="reps"
                      placeholderTextColor={theme.colors.muted}
                      value={set.reps}
                      onChangeText={(v) =>
                        ormTest.updateSetReps(liftIndex, i, v)
                      }
                      editable={!set.completed && !isFuture}
                    />
                    <Pressable
                      style={[
                        styles.setCheck,
                        styles.setColCheck,
                        {
                          backgroundColor: set.completed
                            ? theme.colors.primary
                            : theme.colors.mutedBg,
                        },
                      ]}
                      onPress={() => {
                        if (!set.completed && !isFuture && !restTimer && set.reps?.trim()) {
                          ormTest.completeSet(liftIndex, i);
                          impact(ImpactStyle.Medium);
                          startRestTimer(i);
                        }
                      }}
                      disabled={set.completed || isFuture || !!restTimer || !set.reps?.trim()}
                    >
                      <Text
                        style={{
                          color: set.completed
                            ? theme.colors.primaryText
                            : theme.colors.muted,
                          fontSize: 14,
                        }}
                      >
                        ✓
                      </Text>
                    </Pressable>
                  </View>
                  {restTimer?.key === `set-${i}` && (
                    <Pressable
                      onPress={dismissRestTimer}
                      style={[styles.restPill, { backgroundColor: theme.colors.accent + "22" }]}
                    >
                      <Text style={{ color: theme.colors.accent, fontSize: 14, fontWeight: "700" }}>
                        Rest: {formatRestTime(restTimer.remaining)}
                      </Text>
                      <Text style={{ color: theme.colors.muted, fontSize: 11, marginLeft: 8 }}>tap to skip</Text>
                    </Pressable>
                  )}
                  <Text style={[styles.amrapNote, { color: theme.colors.muted }]}>
                    Lift as many reps as you can with good form
                  </Text>
                  {set.reps === "0" && (
                    <Text style={[styles.amrapNote, { color: theme.colors.accent }]}>
                      0 reps is valid — your 1RM equals the weight used
                    </Text>
                  )}
                </View>
              );
            }

            // Standard set row (sets 1-6)
            const pctLabel = set.prescribedPct === 0
              ? "Bar"
              : `${Math.round(set.prescribedPct * 100)}%`;

            return (
              <View key={i}>
              <View
                style={[styles.setRow, { opacity: rowOpacity, marginBottom: 8 }]}
              >
                <View style={styles.setColNum}>
                  <Text style={[styles.setNum, { color: theme.colors.muted }]}>
                    {pctLabel}
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.setWeightInput,
                    styles.setColWeight,
                    {
                      backgroundColor: theme.colors.mutedBg,
                      color: theme.colors.text,
                    },
                  ]}
                  keyboardType="decimal-pad"
                  maxLength={6}
                  value={set.weight}
                  onChangeText={(v) =>
                    ormTest.updateSetWeight(liftIndex, i, v)
                  }
                  editable={!set.completed && !isFuture}
                />
                <TextInput
                  style={[
                    styles.setWeightInput,
                    styles.setColReps,
                    {
                      backgroundColor: theme.colors.mutedBg,
                      color: theme.colors.text,
                    },
                  ]}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={set.reps}
                  placeholder={
                    typeof set.prescribedReps === "number"
                      ? String(set.prescribedReps)
                      : "reps"
                  }
                  placeholderTextColor={theme.colors.muted}
                  onChangeText={(v) => ormTest.updateSetReps(liftIndex, i, v)}
                  editable={!set.completed && !isFuture}
                />
                <Pressable
                  style={[
                    styles.setCheck,
                    styles.setColCheck,
                    {
                      backgroundColor: set.completed
                        ? theme.colors.primary
                        : theme.colors.mutedBg,
                    },
                  ]}
                  onPress={() => {
                    if (!set.completed && !isFuture && !restTimer) {
                      ormTest.completeSet(liftIndex, i);
                      impact(ImpactStyle.Medium);
                      startRestTimer(i);
                    }
                  }}
                  disabled={set.completed || isFuture || !!restTimer}
                >
                  <Text
                    style={{
                      color: set.completed
                        ? theme.colors.primaryText
                        : theme.colors.muted,
                      fontSize: 14,
                    }}
                  >
                    ✓
                  </Text>
                </Pressable>
              </View>
              {restTimer?.key === `set-${i}` && (
                <Pressable
                  onPress={dismissRestTimer}
                  style={[styles.restPill, { backgroundColor: theme.colors.accent + "22" }]}
                >
                  <Text style={{ color: theme.colors.accent, fontSize: 14, fontWeight: "700" }}>
                    Rest: {formatRestTime(restTimer.remaining)}
                  </Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 11, marginLeft: 8 }}>tap to skip</Text>
                </Pressable>
              )}
              </View>
            );
          })}

          <View style={{ height: 24 }} />
          {allSetsComplete ? (
            <Button label="Complete Lift" onPress={handleCompleteLift} />
          ) : (
            <Button
              label={restTimer ? `Resting… ${formatRestTime(restTimer.remaining)}` : "Complete Set"}
              onPress={handleCompleteCurrentSet}
              disabled={nextSetIndex < 0 || !!restTimer}
            />
          )}
          <View style={{ height: 40 }} />
        </View>
    );
  }

  // ── Exit Modal ──────────────────────────────────────────────────────────────

  function ExitModal() {
    const bodyText =
      completedCount === 0
        ? "You haven't completed any lifts yet. You can set your numbers later."
        : `You've completed ${completedCount} of 4 lifts. Your progress will be saved.`;

    return (
      <AppBottomSheet visible={exitModalVisible} onClose={() => setExitModalVisible(false)}>
        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
          Exit 1RM Test?
        </Text>
        <Text style={[styles.modalBody, { color: theme.colors.muted }]}>
          {bodyText}
        </Text>

        <View style={styles.modalActions}>
          <Button
            label="Back"
            onPress={() => {
              Alert.alert(
                "Leave Test?",
                "Your session progress will be lost.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Leave",
                    style: "destructive",
                    onPress: () => { setExitModalVisible(false); router.back(); },
                  },
                ]
              );
            }}
          />
          <View style={{ height: 10 }} />
          <Button
            label="Continue Test"
            onPress={() => setExitModalVisible(false)}
            variant="secondary"
          />
        </View>
      </AppBottomSheet>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Fixed header */}
      <View style={styles.header}>
        <BackButton variant="close" onPress={() => { Keyboard.dismiss(); setExitModalVisible(true); }} />
        <Text style={[styles.unitLabel, { color: theme.colors.muted }]}>{unit.toUpperCase()}</Text>
      </View>

      {/* Progress bar */}
      <OrmProgressBar completedLifts={completedCount} totalLifts={4} />

      {/* Single scrollable area — native keyboard inset handling */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
      >
        {/* Inline disclaimer */}
        <Text style={[styles.inlineDisclaimer, { color: theme.colors.muted }]}>
          Estimates for training purposes only. Not medical advice.
        </Text>

        {/* Locke mascot — celebrates on completion, encouraging during test */}
        <View style={{ alignItems: "center", marginVertical: 8 }}>
          <LockeMascot
            size={240}
            mood={allLiftsComplete ? "celebrating" : "encouraging"}
          />
          {!allLiftsComplete && setsVisible && currentLift && LIFT_TIPS[currentLift.liftLabel] && (
            <Pressable
              onPress={() => setTipExpanded((v) => !v)}
              style={{ marginTop: -4, paddingHorizontal: 32, alignItems: "center" }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.primary }}>
                {tipExpanded ? "Hide how-to ▲" : "How do I do this? ▼"}
              </Text>
              {tipExpanded && (
                <Text style={{ fontSize: 13, lineHeight: 18, color: theme.colors.muted, textAlign: "center", marginTop: 6 }}>
                  {LIFT_TIPS[currentLift.liftLabel]}
                </Text>
              )}
            </Pressable>
          )}
        </View>

        {/* Safety warning — collapsible, shown before user starts any lift */}
        {completedCount === 0 && !setsVisible && (
          <Pressable
            onPress={() => setSafetyExpanded((v) => !v)}
            style={{
              marginHorizontal: 20, marginTop: 12, padding: 12, borderRadius: 12,
              backgroundColor: "#FF9F0A15", borderWidth: 1, borderColor: "#FF9F0A40",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#FF9F0A" }}>
                ⚠️  Safety Warning
              </Text>
              <Text style={{ fontSize: 12, color: "#FF9F0A" }}>
                {safetyExpanded ? "▲" : "▼"}
              </Text>
            </View>
            {safetyExpanded && (
              <Text style={{ fontSize: 13, color: theme.colors.muted, lineHeight: 20, marginTop: 8 }}>
                {"\u2022"} This test involves lifting near your maximum capacity.{"\n"}
                {"\u2022"} Always use a spotter for barbell exercises.{"\n"}
                {"\u2022"} Stop immediately if you feel pain or dizziness.{"\n"}
                {"\u2022"} Do not attempt if you are new to barbell training, have cardiovascular conditions, recent injuries, or are pregnant.
              </Text>
            )}
          </Pressable>
        )}

        {/* Content — rendered inline (no nested ScrollView/KAV) */}
        <View style={{ marginTop: 40 }} />
        {allLiftsComplete ? ReviewScreen() : LiftView()}
      </ScrollView>

      {/* Exit modal */}
      {ExitModal()}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 56,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  unitLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Unit picker
  unitPickerCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  unitPickerMicrocopy: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  unitPickerTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 24,
  },
  unitPickerRow: {
    flexDirection: "row",
    gap: 12,
    alignSelf: "stretch",
  },
  unitPickerLabel: {
    fontSize: 16,
    fontWeight: "800",
  },
  unitPickerSub: {
    fontSize: 12,
    fontWeight: "500",
  },
  unitPickerBottom: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Progress bar
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    flexDirection: "row",
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
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

  // Estimate input
  estimateContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  liftTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
  },
  liftSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 32,
  },
  estimateLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  estimateInput: {
    fontSize: 28,
    fontWeight: "700",
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    textAlign: "center",
  },

  // Set list
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  liftEstLabel: {
    fontSize: 13,
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },

  // Set header
  setHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  setHeaderCell: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  // Column widths
  setColNum: { width: 56 },
  setColWeight: { flex: 1, marginRight: 8 },
  setColReps: { flex: 1, marginRight: 8 },
  setColCheck: { width: 36 },

  // Set rows
  setRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  setNum: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  setWeightInput: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    textAlign: "center",
  },
  setRepsLabel: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  setCheck: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  // AMRAP
  amrapBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  amrapBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  amrapNote: {
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: 8,
    marginLeft: 44,
  },

  // Results
  resultsTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },
  resultCard: {
    marginBottom: 12,
  },
  resultLiftName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  resultOrm: {
    fontSize: 28,
    fontWeight: "800",
  },
  resultLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  resultBasis: {
    fontSize: 13,
    marginTop: 8,
  },

  // Modal
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: {
    gap: 0,
  },
  inlineDisclaimer: {
    fontSize: 11,
    textAlign: "center",
    paddingHorizontal: 24,
    marginTop: 4,
  },
  restPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 8,
  },
});

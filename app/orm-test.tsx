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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useProfileContext } from "../contexts/ProfileContext";
import { useOrmTest } from "../hooks/useOrmTest";
import { useAppTheme } from "../contexts/ThemeContext";
import { useLocke } from "../contexts/LockeContext";
import { LockeMascot } from "../components/Locke/LockeMascot";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { BackButton } from "../components/BackButton";
import { Skeleton } from "../components/Skeleton";
import { AppBottomSheet } from "../components/AppBottomSheet";

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
  const ormTest = useOrmTest(updateProfile);
  const { fire } = useLocke();

  const [unit, setUnit] = useState<"kg" | "lbs">(
    profile.weightUnit ?? "kg"
  );
  const [unitChosen, setUnitChosen] = useState(false);
  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [setsVisible, setSetsVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      // Coming from onboarding fresh — clear stale session, show unit picker
      if (source === "onboarding") {
        ormTest.clearSession();
        return;
      }
      setUnit(ormTest.session.unit);
      setUnitChosen(true);
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

  // ── Derived values ──────────────────────────────────────────────────────────

  const liftIndex = ormTest.session?.currentLiftIndex ?? 0;
  const currentLift = ormTest.currentLift;
  const completedCount =
    ormTest.session?.lifts.filter((l) => l.completed).length ?? 0;
  const allSetsComplete = currentLift?.sets.every((s) => s.completed) ?? false;
  // True when all 4 lifts are done but finishTest() hasn't been called yet
  const allLiftsComplete =
    (ormTest.session?.lifts.every((l) => l.completed) ?? false) &&
    !ormTest.isComplete;

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      startRestTimer(nextIndex);
    }
  }

  async function handleCompleteLift() {
    dismissRestTimer();
    await ormTest.completeLift();
    setSetsVisible(false);
  }

  function navigateOut() {
    if (source === "onboarding") {
      router.replace("/");
    } else {
      router.back();
    }
  }

  async function handleFinish() {
    if (isSaving) return;
    setIsSaving(true);
    await ormTest.finishTest();
    navigateOut();
  }

  async function handleSaveAndExit() {
    if (isSaving) return;
    setIsSaving(true);
    await ormTest.saveAndExit();
    navigateOut();
  }

  async function handleRestart() {
    await ormTest.restartTest(unit);
    setSetsVisible(false);
    setExitModalVisible(false);
  }

  // ── Loading state ───────────────────────────────────────────────────────────

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

  // ── Unit Picker (shown before test starts) ─────────────────────────────────

  if (!unitChosen) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.header}>
          <BackButton variant="close" />
        </View>
        <View style={styles.unitPickerCenter}>
          <LockeMascot size="icon" mood="intense" />
          <View style={{ height: 16 }} />
          <Text style={[styles.unitPickerTitle, { color: theme.colors.text }]}>
            How do you measure weight?
          </Text>
          <View style={{ height: 24 }} />
          <View style={styles.unitPickerRow}>
            <Pressable
              style={[
                styles.unitPickerBtn,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => handlePickUnit("kg")}
            >
              <Text style={[styles.unitPickerLabel, { color: theme.colors.text }]}>KG</Text>
              <Text style={[styles.unitPickerSub, { color: theme.colors.muted }]}>Kilograms</Text>
            </Pressable>
            <Pressable
              style={[
                styles.unitPickerBtn,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => handlePickUnit("lbs")}
            >
              <Text style={[styles.unitPickerLabel, { color: theme.colors.text }]}>LBS</Text>
              <Text style={[styles.unitPickerSub, { color: theme.colors.muted }]}>Pounds</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ── Review Screen (shown after all 4 lifts complete, before finishTest) ─────

  function ReviewScreen() {
    if (!ormTest.session) return null;
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
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
      </ScrollView>
    );
  }

  // ── Per-Lift View ───────────────────────────────────────────────────────────

  function LiftView() {
    if (!currentLift) return null;

    // State A: Estimated input
    if (!setsVisible) {
      return (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
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
              keyboardType="numeric"
              maxLength={3}
              placeholder="0"
              placeholderTextColor={theme.colors.muted}
              value={currentLift.estimatedInput}
              onChangeText={(v) => ormTest.setEstimatedInput(liftIndex, v)}
              autoFocus
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
        </KeyboardAvoidingView>
      );
    }

    // State B: Set list
    const nextSetIndex = currentLift.sets.findIndex((s) => !s.completed);

    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
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
                      keyboardType="numeric"
                      maxLength={3}
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
                        if (!set.completed && !isFuture && !restTimer) {
                          ormTest.completeSet(liftIndex, i);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
                        {set.completed ? "✓" : "✓"}
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
                  keyboardType="numeric"
                  maxLength={3}
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
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        </ScrollView>
      </KeyboardAvoidingView>
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
            label={completedCount > 0 ? "Save & Exit" : "Exit"}
            onPress={handleSaveAndExit}
          />
          <View style={{ height: 10 }} />
          <Button
            label="Restart Test"
            onPress={() => {
              Alert.alert(
                "Restart Test?",
                "This will discard your current progress and start fresh.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Restart",
                    style: "destructive",
                    onPress: handleRestart,
                  },
                ]
              );
            }}
            variant="danger"
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

      {/* Locke mascot — celebrates on completion, intense during test */}
      <View style={{ alignItems: "center", marginVertical: 8 }}>
        <LockeMascot
          size="icon"
          mood={allLiftsComplete ? "celebrating" : "intense"}
        />
      </View>

      {/* Content */}
      {allLiftsComplete ? ReviewScreen() : LiftView()}

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
    paddingHorizontal: 32,
  },
  unitPickerTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  unitPickerRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  unitPickerBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  unitPickerLabel: {
    fontSize: 24,
    fontWeight: "800",
  },
  unitPickerSub: {
    fontSize: 12,
    marginTop: 4,
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
    flex: 1,
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

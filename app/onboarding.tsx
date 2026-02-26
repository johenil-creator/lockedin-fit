import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LockeMascot } from "../components/Locke/LockeMascot";
import type { LockeMascotMood } from "../components/Locke/LockeMascot";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useProfileContext } from "../contexts/ProfileContext";
import { useAppTheme } from "../contexts/ThemeContext";
import { useLocke } from "../contexts/LockeContext";
import { Button } from "../components/Button";

const LIFTS = ["Deadlift", "Squat", "Bench Press", "Overhead Press"] as const;
type LiftKey = "deadlift" | "squat" | "bench" | "ohp";

const LIFT_KEY_MAP: Record<string, LiftKey> = {
  Deadlift: "deadlift",
  Squat: "squat",
  "Bench Press": "bench",
  "Overhead Press": "ohp",
};

type LiftInput = { weight: string; reps: string };

const WARMUP_STEPS = [
  { pct: 0.50, reps: "8" },
  { pct: 0.60, reps: "4" },
  { pct: 0.70, reps: "3" },
  { pct: 0.80, reps: "2" },
  { pct: 0.85, reps: "1" },
] as const;

function roundToNearest(weight: number, step = 2.5) {
  return Math.round(weight / step) * step;
}

function StepSlide({ children }: { children: React.ReactNode }) {
  const tx = useSharedValue(320);
  useEffect(() => { tx.value = withTiming(0, { duration: 300 }); }, []);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  return <Animated.View style={[{ flex: 1 }, anim]}>{children}</Animated.View>;
}

type StepKey = "intro" | "explain" | "pick" | "enter" | "results" | "manual";

export default function OnboardingScreen() {
  const router = useRouter();
  const { retake } = useLocalSearchParams<{ retake?: string }>();
  const { theme } = useAppTheme();
  const { updateProfile } = useProfileContext();
  const { fire } = useLocke();

  const [step, setStep] = useState<StepKey>(retake === "1" ? "explain" : "intro");
  const [lockeMood, setLockeMood] = useState<LockeMascotMood>("neutral");

  // Fire Locke onboarding_guide on arrival
  useEffect(() => {
    fire({ trigger: "onboarding" }, 12000);
  }, []);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [liftInputs, setLiftInputs] = useState<Record<string, LiftInput>>({});
  const [results, setResults] = useState<Record<string, number>>({});
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  // For manual entry path — direct 1RM values
  const [manualInputs, setManualInputs] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  async function skip() {
    await updateProfile({ onboardingComplete: true });
    router.replace("/");
  }

  function toggleLift(lift: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(lift)) next.delete(lift);
      else next.add(lift);
      return next;
    });
  }

  function updateLiftInput(lift: string, field: keyof LiftInput, value: string) {
    setLiftInputs((prev) => ({
      ...prev,
      [lift]: { ...prev[lift], [field]: value },
    }));
  }

  function calculate() {
    const calculated: Record<string, number> = {};
    for (const lift of selected) {
      const input = liftInputs[lift];
      const weight = parseFloat(input?.weight || "0");
      const reps = parseFloat(input?.reps || "0");
      if (weight > 0 && reps > 0) {
        calculated[lift] = Math.round(weight * (1 + reps / 30));
      }
    }
    setResults(calculated);
    setLockeMood("celebrating");
    setStep("results");
  }

  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);
    const manual1RM: Record<string, string> = {};
    for (const [lift, value] of Object.entries(results)) {
      const key = LIFT_KEY_MAP[lift];
      if (key) manual1RM[key] = String(value);
    }
    await updateProfile({ name: "", weight: "", weightUnit: unit, manual1RM, onboardingComplete: true });
    router.replace("/");
  }

  async function handleManualSave() {
    if (isSaving) return;
    setIsSaving(true);
    const manual1RM: Record<string, string> = {};
    for (const lift of LIFTS) {
      const val = manualInputs[lift]?.trim();
      if (val && parseFloat(val) > 0) {
        const key = LIFT_KEY_MAP[lift];
        if (key) manual1RM[key] = val;
      }
    }
    await updateProfile({ name: "", weight: "", weightUnit: unit, manual1RM, onboardingComplete: true });
    router.replace("/");
  }

  // ── Step: Intro ───────────────────────────────────────────────────────────
  if (step === "intro") {
    return (
      <StepSlide>
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
          <Pressable onPress={skip} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: theme.colors.muted }]}>Skip for now</Text>
          </Pressable>

          <View style={styles.center}>
            <LockeMascot size="full" mood={lockeMood} />
            <Text style={[styles.lockeIntro, { color: theme.colors.primary }]}>I'm Locke.</Text>
            <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>
              Set your numbers — everything starts here.
            </Text>
          </View>

          <View style={styles.bottom}>
            <Button label="Let's Go" onPress={() => { setLockeMood("encouraging"); setStep("explain"); }} />
          </View>
        </View>
      </StepSlide>
    );
  }

  // ── Step: Explain 1RM ────────────────────────────────────────────────────
  if (step === "explain") {
    return (
      <StepSlide>
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
          <View style={styles.body}>
            <Text style={[styles.stepEyebrow, { color: theme.colors.primary }]}>SETUP</Text>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>What's a 1RM?</Text>
            <Text style={[styles.explainText, { color: theme.colors.muted }]}>
              Your <Text style={{ color: theme.colors.text, fontWeight: "700" }}>1-Rep Max (1RM)</Text> is
              the maximum weight you can lift for a single rep on a given exercise.
            </Text>
            <Text style={[styles.explainText, { color: theme.colors.muted }]}>
              We use it to set intelligent load targets in your plans, track progress over time,
              and award PRs when you break your personal records.
            </Text>
            <Text style={[styles.explainText, { color: theme.colors.muted }]}>
              You don't need to test your true max — enter any weight and rep count and we'll
              estimate it using the Epley formula.
            </Text>
          </View>

          <View style={[styles.bottom, { gap: 12 }]}>
            <Button label="Start 1RM Test" onPress={() => router.push("/orm-test?source=onboarding")} />
            <Button
              label="Skip – I Know My Numbers"
              onPress={() => { setLockeMood("encouraging"); setStep("manual"); }}
              variant="secondary"
            />
            <Pressable onPress={skip} style={styles.skipTextBtn}>
              <Text style={[styles.skipText, { color: theme.colors.muted }]}>Skip for now</Text>
            </Pressable>
          </View>
        </View>
      </StepSlide>
    );
  }

  // ── Step: Manual Entry ───────────────────────────────────────────────────
  if (step === "manual") {
    return (
      <StepSlide>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.bg }]}
            contentContainerStyle={styles.scrollBody}
          >
            <Text style={[styles.stepEyebrow, { color: theme.colors.primary }]}>YOUR NUMBERS</Text>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Enter your 1RM values
            </Text>
            <Text style={[styles.stepSub, { color: theme.colors.muted }]}>
              Leave blank any lifts you don't track
            </Text>

            <View style={styles.unitPickerRow}>
              <Pressable
                style={[
                  styles.unitPickerBtnSmall,
                  {
                    backgroundColor: unit === "kg" ? theme.colors.primary : theme.colors.surface,
                    borderColor: unit === "kg" ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setUnit("kg")}
              >
                <Text style={[styles.unitPickerLabel, { fontSize: 16, color: unit === "kg" ? theme.colors.primaryText : theme.colors.text }]}>KG</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.unitPickerBtnSmall,
                  {
                    backgroundColor: unit === "lbs" ? theme.colors.primary : theme.colors.surface,
                    borderColor: unit === "lbs" ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setUnit("lbs")}
              >
                <Text style={[styles.unitPickerLabel, { fontSize: 16, color: unit === "lbs" ? theme.colors.primaryText : theme.colors.text }]}>LBS</Text>
              </Pressable>
            </View>
            <View style={{ height: 16 }} />

            {LIFTS.map((lift) => (
              <View
                key={lift}
                style={[
                  styles.liftCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <Text style={[styles.liftName, { color: theme.colors.text }]}>{lift}</Text>
                <View style={styles.manualRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: theme.colors.muted }]}>1RM ({unit})</Text>
                    <TextInput
                      style={[
                        styles.numInput,
                        {
                          backgroundColor: theme.colors.mutedBg,
                          color: theme.colors.text,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      keyboardType="numeric"
                      placeholder="e.g. 100"
                      placeholderTextColor={theme.colors.muted}
                      value={manualInputs[lift] ?? ""}
                      onChangeText={(v) =>
                        setManualInputs((prev) => ({ ...prev, [lift]: v }))
                      }
                    />
                  </View>
                </View>
              </View>
            ))}

            <View style={{ height: 24 }} />
            <Button label="Save & Continue" onPress={handleManualSave} disabled={isSaving} loading={isSaving} />
            <View style={{ height: 12 }} />
            <Button label="Back" onPress={() => setStep("explain")} variant="secondary" />
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </StepSlide>
    );
  }

  // ── Step: Pick Lifts ─────────────────────────────────────────────────────
  if (step === "pick") {
    return (
      <StepSlide>
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
          <Pressable onPress={skip} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: theme.colors.muted }]}>Skip for now</Text>
          </Pressable>

          <View style={styles.body}>
            <Text style={[styles.stepEyebrow, { color: theme.colors.primary }]}>STEP 1 OF 3</Text>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Which lifts do you want to track?
            </Text>
            <Text style={[styles.stepSub, { color: theme.colors.muted }]}>
              Select all that apply
            </Text>

            {LIFTS.map((lift) => {
              const isSelected = selected.has(lift);
              return (
                <Pressable
                  key={lift}
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => toggleLift(lift)}
                >
                  <Text
                    style={[
                      styles.checkboxText,
                      { color: isSelected ? theme.colors.primaryText : theme.colors.text },
                    ]}
                  >
                    {isSelected ? "✓  " : "    "}
                    {lift}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.bottom}>
            <Button label="Next" onPress={() => setStep("enter")} disabled={selected.size === 0} />
          </View>
        </View>
      </StepSlide>
    );
  }

  // ── Step: Enter Numbers ──────────────────────────────────────────────────
  if (step === "enter") {
    const selectedLifts = LIFTS.filter((l) => selected.has(l));
    return (
      <StepSlide>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.bg }]}
            contentContainerStyle={styles.scrollBody}
          >
            <Pressable onPress={skip} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: theme.colors.muted }]}>Skip for now</Text>
            </Pressable>

            <Text style={[styles.stepEyebrow, { color: theme.colors.primary }]}>STEP 2 OF 3</Text>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Enter your numbers
            </Text>
            <Text style={[styles.stepSub, { color: theme.colors.muted }]}>
              Your heaviest recent lift — any weight and rep count works
            </Text>

            {selectedLifts.map((lift) => (
              <View
                key={lift}
                style={[
                  styles.liftCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <Text style={[styles.liftName, { color: theme.colors.text }]}>{lift}</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.colors.muted }]}>Weight ({unit})</Text>
                    <TextInput
                      style={[
                        styles.numInput,
                        {
                          backgroundColor: theme.colors.mutedBg,
                          color: theme.colors.text,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={theme.colors.muted}
                      value={liftInputs[lift]?.weight ?? ""}
                      onChangeText={(v) => updateLiftInput(lift, "weight", v)}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.colors.muted }]}>Reps</Text>
                    <TextInput
                      style={[
                        styles.numInput,
                        {
                          backgroundColor: theme.colors.mutedBg,
                          color: theme.colors.text,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={theme.colors.muted}
                      value={liftInputs[lift]?.reps ?? ""}
                      onChangeText={(v) => updateLiftInput(lift, "reps", v)}
                    />
                  </View>
                </View>
              </View>
            ))}

            <View style={{ height: 24 }} />
            <Button label="Calculate My 1RM" onPress={calculate} />
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </StepSlide>
    );
  }

  // ── Step: Results + Warm-up Ladder ───────────────────────────────────────
  const selectedLifts = LIFTS.filter((l) => selected.has(l));
  return (
    <StepSlide>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.bg }]}
        contentContainerStyle={styles.scrollBody}
      >
        <Text style={[styles.stepEyebrow, { color: theme.colors.primary }]}>STEP 3 OF 3</Text>
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Your estimated 1RM</Text>
        <Text style={[styles.stepSub, { color: theme.colors.muted }]}>
          Locke calculated your baseline — here's your personalised warm-up ladder too.
        </Text>

        {selectedLifts.map((lift) => {
          const orm = results[lift];
          return (
            <View
              key={lift}
              style={[
                styles.resultCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <View style={styles.resultTopRow}>
                <Text style={[styles.resultLift, { color: theme.colors.text }]}>{lift}</Text>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.resultValue, { color: theme.colors.primary }]}>
                    {orm ?? "—"} {unit}
                  </Text>
                  <Text style={[styles.resultLabel, { color: theme.colors.muted }]}>Est. 1RM</Text>
                </View>
              </View>

              {orm != null && (
                <View style={[styles.ladderSection, { borderTopColor: theme.colors.border }]}>
                  <Text style={[styles.ladderTitle, { color: theme.colors.muted }]}>
                    WARM-UP LADDER
                  </Text>
                  {WARMUP_STEPS.map(({ pct, reps }) => {
                    const w = roundToNearest(orm * pct);
                    return (
                      <View key={pct} style={styles.ladderRow}>
                        <Text style={[styles.ladderWeight, { color: theme.colors.text }]}>
                          {w} {unit}
                        </Text>
                        <Text style={[styles.ladderReps, { color: theme.colors.muted }]}>
                          × {reps} reps
                        </Text>
                        <Text style={[styles.ladderPct, { color: theme.colors.muted }]}>
                          {Math.round(pct * 100)}%
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 24 }} />
        <Button label="Save to Profile" onPress={handleSave} disabled={isSaving} loading={isSaving} />
        <View style={{ height: 40 }} />
      </ScrollView>
    </StepSlide>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56 },
  scrollBody: { paddingHorizontal: 24, paddingTop: 32 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  bottom: { paddingHorizontal: 24, paddingBottom: 48 },

  skipBtn: { position: "absolute", top: 56, right: 24, zIndex: 10, padding: 8 },
  skipTextBtn: { alignItems: "center", paddingVertical: 4 },
  skipText: { fontSize: 14, fontWeight: "500" },

  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  lockeIntro: { fontSize: 28, fontWeight: "800", marginBottom: 8 },
  welcomeTitle: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 12, lineHeight: 30 },
  welcomeSub: { fontSize: 15, textAlign: "center", lineHeight: 22 },

  stepEyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, marginBottom: 6, textTransform: "uppercase" },
  stepTitle: { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  stepSub: { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  explainText: { fontSize: 15, lineHeight: 24, marginBottom: 16 },

  checkbox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  checkboxText: { fontSize: 16, fontWeight: "600" },

  liftCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  liftName: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  inputRow: { flexDirection: "row", gap: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 12, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  numInput: {
    fontSize: 18,
    fontWeight: "600",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    textAlign: "center",
  },
  manualRow: { flexDirection: "row", gap: 12 },
  unitRow: { marginBottom: 20 },
  unitReadOnly: { fontSize: 15, fontWeight: "700", marginTop: 2 },
  unitPickerRow: { flexDirection: "row", gap: 12 },
  unitPickerBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  unitPickerLabel: { fontSize: 24, fontWeight: "800" },
  unitPickerSub: { fontSize: 12, marginTop: 4 },
  unitPickerBtnSmall: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  resultCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  resultTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultLift: { fontSize: 16, fontWeight: "600" },
  resultValue: { fontSize: 28, fontWeight: "800" },
  resultLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },

  ladderSection: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  ladderTitle: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 },
  ladderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  ladderWeight: { fontSize: 15, fontWeight: "700", width: 70 },
  ladderReps: { fontSize: 14, flex: 1 },
  ladderPct: { fontSize: 12 },
});

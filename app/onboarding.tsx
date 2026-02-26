import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet as RNStyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import type { LockeMascotMood } from "../components/Locke/LockeMascot";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useProfileContext } from "../contexts/ProfileContext";
import { useAppTheme } from "../contexts/ThemeContext";
import { useLocke } from "../contexts/LockeContext";
import { Button } from "../components/Button";
import { WelcomeStep } from "../components/onboarding/WelcomeStep";
import { NameStep } from "../components/onboarding/NameStep";
import { ExplainStep } from "../components/onboarding/ExplainStep";
import { StepSlide, onboardingStyles as styles } from "../components/onboarding/shared";

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

type StepKey = "welcome" | "name" | "explain" | "pick" | "enter" | "results" | "manual";

const STEP_ORDER: StepKey[] = ["welcome", "name", "explain", "manual"];
function stepIndex(s: StepKey): number {
  if (s === "pick" || s === "enter" || s === "results") return 3;
  const idx = STEP_ORDER.indexOf(s);
  return idx >= 0 ? idx : 0;
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[dotStyles.row, { top: insets.top + 12 }]}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            { backgroundColor: i === current ? theme.colors.primary : i < current ? theme.colors.primary + "55" : theme.colors.border },
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = RNStyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center", gap: 8, position: "absolute", left: 0, right: 0, zIndex: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

export default function OnboardingScreen() {
  const router = useRouter();
  const { retake } = useLocalSearchParams<{ retake?: string }>();
  const { theme } = useAppTheme();
  const { updateProfile } = useProfileContext();
  const { fire } = useLocke();

  const [step, setStep] = useState<StepKey>(retake === "1" ? "explain" : "welcome");
  const [lockeMood, setLockeMood] = useState<LockeMascotMood>("neutral");

  useEffect(() => {
    fire({ trigger: "onboarding" }, 12000);
  }, []);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [liftInputs, setLiftInputs] = useState<Record<string, LiftInput>>({});
  const [results, setResults] = useState<Record<string, number>>({});
  const [userName, setUserName] = useState("");
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  const [manualInputs, setManualInputs] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  async function skip() {
    await updateProfile({ name: userName.trim(), onboardingComplete: true });
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
    const cleaned = value.replace(/[^0-9]/g, "");
    const maxLen = field === "reps" ? 2 : 3;
    const capped = cleaned.slice(0, maxLen);
    setLiftInputs((prev) => ({
      ...prev,
      [lift]: { ...prev[lift], [field]: capped },
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
    await updateProfile({ name: userName.trim(), weight: "", weightUnit: unit, manual1RM, onboardingComplete: true });
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
    await updateProfile({ name: userName.trim(), weight: "", weightUnit: unit, manual1RM, onboardingComplete: true });
    router.replace("/");
  }

  // ── Extracted steps ─────────────────────────────────────────────────────────

  const currentStepIdx = stepIndex(step);

  if (step === "welcome") {
    return (
      <View style={{ flex: 1 }}>
        <ProgressDots current={currentStepIdx} total={STEP_ORDER.length} />
        <WelcomeStep
          lockeMood={lockeMood}
          onContinue={() => setStep("name")}
        />
      </View>
    );
  }

  if (step === "name") {
    return (
      <View style={{ flex: 1 }}>
        <ProgressDots current={currentStepIdx} total={STEP_ORDER.length} />
        <NameStep
          userName={userName}
          onChangeUserName={setUserName}
          onContinue={() => {
            updateProfile({ name: userName.trim() });
            setLockeMood("encouraging");
            setStep("explain");
          }}
        />
      </View>
    );
  }

  if (step === "explain") {
    return (
      <View style={{ flex: 1 }}>
        <ProgressDots current={currentStepIdx} total={STEP_ORDER.length} />
        <ExplainStep
          onManual={() => { setLockeMood("encouraging"); setStep("manual"); }}
          onSkip={skip}
        />
      </View>
    );
  }

  // ── Inline steps (heavy state dependencies) ─────────────────────────────────

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
                style={[styles.unitPickerBtnSmall, { backgroundColor: unit === "kg" ? theme.colors.primary : theme.colors.surface, borderColor: unit === "kg" ? theme.colors.primary : theme.colors.border }]}
                onPress={() => setUnit("kg")}
              >
                <Text style={[styles.unitPickerLabel, { fontSize: 16, color: unit === "kg" ? theme.colors.primaryText : theme.colors.text }]}>KG</Text>
              </Pressable>
              <Pressable
                style={[styles.unitPickerBtnSmall, { backgroundColor: unit === "lbs" ? theme.colors.primary : theme.colors.surface, borderColor: unit === "lbs" ? theme.colors.primary : theme.colors.border }]}
                onPress={() => setUnit("lbs")}
              >
                <Text style={[styles.unitPickerLabel, { fontSize: 16, color: unit === "lbs" ? theme.colors.primaryText : theme.colors.text }]}>LBS</Text>
              </Pressable>
            </View>
            <View style={{ height: 16 }} />

            {LIFTS.map((lift) => (
              <View key={lift} style={[styles.liftCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.liftName, { color: theme.colors.text }]}>{lift}</Text>
                <View style={styles.manualRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: theme.colors.muted }]}>1RM ({unit})</Text>
                    <TextInput
                      style={[styles.numInput, { backgroundColor: theme.colors.mutedBg, color: theme.colors.text, borderColor: theme.colors.border }]}
                      keyboardType="numeric"
                      maxLength={3}
                      placeholder="e.g. 100"
                      placeholderTextColor={theme.colors.muted}
                      value={manualInputs[lift] ?? ""}
                      onChangeText={(v) => setManualInputs((prev) => ({ ...prev, [lift]: v.replace(/[^0-9]/g, "").slice(0, 3) }))}
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

  if (step === "pick") {
    return (
      <StepSlide>
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
          <Pressable onPress={skip} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: theme.colors.muted }]}>Skip for now</Text>
          </Pressable>

          <View style={styles.body}>
            <Text style={[styles.stepEyebrow, { color: theme.colors.primary }]}>STEP 1 OF 3</Text>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Which lifts do you want to track?</Text>
            <Text style={[styles.stepSub, { color: theme.colors.muted }]}>Select all that apply</Text>

            {LIFTS.map((lift) => {
              const isSelected = selected.has(lift);
              return (
                <Pressable
                  key={lift}
                  style={[styles.checkbox, { backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface, borderColor: isSelected ? theme.colors.primary : theme.colors.border }]}
                  onPress={() => toggleLift(lift)}
                >
                  <Text style={[styles.checkboxText, { color: isSelected ? theme.colors.primaryText : theme.colors.text }]}>
                    {isSelected ? "✓  " : "    "}{lift}
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

  if (step === "enter") {
    const selectedLifts = LIFTS.filter((l) => selected.has(l));
    return (
      <StepSlide>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.bg }]}
            contentContainerStyle={styles.scrollBody}
          >
            <Pressable onPress={skip} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: theme.colors.muted }]}>Skip for now</Text>
            </Pressable>

            <Text style={[styles.stepEyebrow, { color: theme.colors.primary }]}>STEP 2 OF 3</Text>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Enter your numbers</Text>
            <Text style={[styles.stepSub, { color: theme.colors.muted }]}>Your heaviest recent lift — any weight and rep count works</Text>

            {selectedLifts.map((lift) => (
              <View key={lift} style={[styles.liftCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.liftName, { color: theme.colors.text }]}>{lift}</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.colors.muted }]}>Weight ({unit})</Text>
                    <TextInput
                      style={[styles.numInput, { backgroundColor: theme.colors.mutedBg, color: theme.colors.text, borderColor: theme.colors.border }]}
                      keyboardType="numeric" maxLength={3} placeholder="0" placeholderTextColor={theme.colors.muted}
                      value={liftInputs[lift]?.weight ?? ""} onChangeText={(v) => updateLiftInput(lift, "weight", v)}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.colors.muted }]}>Reps</Text>
                    <TextInput
                      style={[styles.numInput, { backgroundColor: theme.colors.mutedBg, color: theme.colors.text, borderColor: theme.colors.border }]}
                      keyboardType="numeric" maxLength={2} placeholder="0" placeholderTextColor={theme.colors.muted}
                      value={liftInputs[lift]?.reps ?? ""} onChangeText={(v) => updateLiftInput(lift, "reps", v)}
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
            <View key={lift} style={[styles.resultCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.resultTopRow}>
                <Text style={[styles.resultLift, { color: theme.colors.text }]}>{lift}</Text>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.resultValue, { color: theme.colors.primary }]}>{orm ?? "—"} {unit}</Text>
                  <Text style={[styles.resultLabel, { color: theme.colors.muted }]}>Est. 1RM</Text>
                </View>
              </View>

              {orm != null && (
                <View style={[styles.ladderSection, { borderTopColor: theme.colors.border }]}>
                  <Text style={[styles.ladderTitle, { color: theme.colors.muted }]}>WARM-UP LADDER</Text>
                  {WARMUP_STEPS.map(({ pct, reps }) => {
                    const w = roundToNearest(orm * pct);
                    return (
                      <View key={pct} style={styles.ladderRow}>
                        <Text style={[styles.ladderWeight, { color: theme.colors.text }]}>{w} {unit}</Text>
                        <Text style={[styles.ladderReps, { color: theme.colors.muted }]}>× {reps} reps</Text>
                        <Text style={[styles.ladderPct, { color: theme.colors.muted }]}>{Math.round(pct * 100)}%</Text>
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

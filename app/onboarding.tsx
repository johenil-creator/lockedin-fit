import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet as RNStyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LockeMascot } from "../components/Locke/LockeMascot";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useProfileContext } from "../contexts/ProfileContext";
import type { UserProfile } from "../lib/types";
import { usePlanContext } from "../contexts/PlanContext";
import { useWorkouts } from "../hooks/useWorkouts";
import { useAppTheme } from "../contexts/ThemeContext";
import { useLocke } from "../contexts/LockeContext";
import { useToast } from "../contexts/ToastContext";
import { Button } from "../components/Button";
import { WelcomeStep } from "../components/onboarding/WelcomeStep";
import { NameStep } from "../components/onboarding/NameStep";
import { UnitStep } from "../components/onboarding/UnitStep";
import { ExplainStep } from "../components/onboarding/ExplainStep";
import { HealthStep } from "../components/onboarding/HealthStep";
import { StepSlide, onboardingStyles as styles } from "../components/onboarding/shared";
import { sanitizeWeight } from "../lib/sanitizeWeight";
import { spacing } from "../lib/theme";

const LIFTS = ["Deadlift", "Squat", "Bench Press", "Overhead Press"] as const;
type LiftKey = "deadlift" | "squat" | "bench" | "ohp";

const LIFT_KEY_MAP: Record<string, LiftKey> = {
  Deadlift: "deadlift",
  Squat: "squat",
  "Bench Press": "bench",
  "Overhead Press": "ohp",
};

type StepKey = "welcome" | "name" | "unit" | "explain" | "health" | "manual";

const STEP_ORDER: StepKey[] = ["welcome", "unit", "health", "name", "explain", "manual"];
const VISIBLE_STEPS: StepKey[] = Platform.OS === "ios"
  ? STEP_ORDER
  : STEP_ORDER.filter((s) => s !== "health");

function stepIndex(s: StepKey): number {
  const idx = VISIBLE_STEPS.indexOf(s);
  return idx >= 0 ? idx : 0;
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[dotStyles.row, { top: insets.top + spacing.md }]}>
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
  const { retake, step: startStep } = useLocalSearchParams<{ retake?: string; step?: string }>();
  const { theme } = useAppTheme();
  const { updateProfile, profile } = useProfileContext();
  const { fire } = useLocke();
  const { exercises, recalculateWeights } = usePlanContext();
  const { workouts } = useWorkouts();
  const { showToast } = useToast();

  const [step, setStep] = useState<StepKey>(
    startStep === "manual" ? "manual" : retake === "1" ? "explain" : "welcome"
  );
  useEffect(() => {
    fire({ trigger: "onboarding" }, 12000);
  }, []);

  const [userName, setUserName] = useState("");
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  const [manualInputs, setManualInputs] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  async function skip() {
    await updateProfile({ name: userName.trim() || profile.name, weightUnit: unit, onboardingComplete: true });
    router.replace("/");
  }

  async function handleManualSave() {
    if (isSaving) return;
    setIsSaving(true);
    const manual1RM: UserProfile['manual1RM'] = {};
    for (const lift of LIFTS) {
      const val = manualInputs[lift]?.trim();
      if (val && parseFloat(val) > 0) {
        const key = LIFT_KEY_MAP[lift];
        if (key) manual1RM[key] = val;
      }
    }
    const updatedProfile = { ...profile, name: userName.trim() || profile.name, weightUnit: unit, manual1RM, onboardingComplete: true };
    await updateProfile(updatedProfile);

    const has1RM = Object.values(manual1RM).some((v) => v && parseFloat(v) > 0);
    if (has1RM && exercises.length > 0) {
      Alert.alert(
        "Update Plan Weights",
        "Update your plan weights with your new 1RM data?",
        [
          { text: "Skip", style: "cancel", onPress: () => router.replace("/") },
          {
            text: "Update",
            onPress: async () => {
              const count = await recalculateWeights(updatedProfile, workouts);
              if (count > 0) showToast({ message: `Updated weights for ${count} exercise${count !== 1 ? "s" : ""}`, type: "success" });
              router.replace("/");
            },
          },
        ]
      );
    } else {
      router.replace("/");
    }
  }

  // ── Extracted steps ─────────────────────────────────────────────────────────

  const currentStepIdx = stepIndex(step);

  if (step === "welcome") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <ProgressDots current={currentStepIdx} total={VISIBLE_STEPS.length} />
        <WelcomeStep
          onContinue={() => setStep("unit")}
        />
      </View>
    );
  }

  if (step === "name") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <ProgressDots current={currentStepIdx} total={VISIBLE_STEPS.length} />
        <NameStep
          userName={userName}
          onChangeUserName={setUserName}
          onContinue={() => {
            updateProfile({ name: userName.trim() });
            setStep("explain");
          }}
          onBack={() => setStep(Platform.OS === "ios" ? "health" : "unit")}
        />
      </View>
    );
  }

  if (step === "unit") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <ProgressDots current={currentStepIdx} total={VISIBLE_STEPS.length} />
        <UnitStep
          unit={unit}
          onSelectUnit={setUnit}
          onContinue={() => {
            updateProfile({ weightUnit: unit });
            setStep(Platform.OS === "ios" ? "health" : "name");
          }}
          onBack={() => setStep("welcome")}
        />
      </View>
    );
  }

  if (step === "health") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <ProgressDots current={currentStepIdx} total={VISIBLE_STEPS.length} />
        <HealthStep
          unit={unit}
          onSynced={(w) => { updateProfile({ weight: w }); setStep("name"); }}
          onSkip={() => setStep("name")}
          onBack={() => setStep("unit")}
        />
      </View>
    );
  }

  if (step === "explain") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <ProgressDots current={currentStepIdx} total={VISIBLE_STEPS.length} />
        <ExplainStep
          onManual={() => setStep("manual")}
          onSkip={skip}
          onBack={() => setStep("name")}
        />
      </View>
    );
  }

  // ── Manual 1RM entry step ────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ProgressDots current={VISIBLE_STEPS.length - 1} total={VISIBLE_STEPS.length} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={[styles.container, { backgroundColor: theme.colors.bg }]}
          contentContainerStyle={styles.scrollBody}
        >
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <LockeMascot size={240} mood="encouraging" />
            <Text style={{ fontSize: 13, color: theme.colors.muted, textAlign: "center", marginTop: 6 }}>
              Just your best guess — we'll dial it in.
            </Text>
          </View>
          <Text style={[styles.stepEyebrow, { color: theme.colors.primary }]}>YOUR LIFTS</Text>
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            What's the heaviest you've lifted?
          </Text>
          <Text style={[styles.stepSub, { color: theme.colors.muted }]}>
            Rough estimates are fine — leave blank any you're unsure about
          </Text>

          {LIFTS.map((lift) => (
            <View key={lift} style={[styles.liftCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.liftName, { color: theme.colors.text }]}>{lift}</Text>
              <View style={styles.manualRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: theme.colors.muted }]}>1RM ({unit})</Text>
                  <TextInput
                    testID={`orm-input-${lift.toLowerCase().replace(/\s+/g, "-")}`}
                    style={[styles.numInput, { backgroundColor: theme.colors.mutedBg, color: theme.colors.text, borderColor: theme.colors.border }]}
                    keyboardType="decimal-pad"
                    maxLength={6}
                    placeholder="e.g. 100"
                    placeholderTextColor={theme.colors.muted}
                    value={manualInputs[lift] ?? ""}
                    onChangeText={(v) => setManualInputs((prev) => ({ ...prev, [lift]: sanitizeWeight(v) }))}
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
    </View>
  );
}

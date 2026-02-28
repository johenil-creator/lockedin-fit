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
import { LockeMascot } from "../components/Locke/LockeMascot";
import type { LockeMascotMood } from "../components/Locke/LockeMascot";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useProfileContext } from "../contexts/ProfileContext";
import { useAppTheme } from "../contexts/ThemeContext";
import { useLocke } from "../contexts/LockeContext";
import { Button } from "../components/Button";
import { WelcomeStep } from "../components/onboarding/WelcomeStep";
import { NameStep } from "../components/onboarding/NameStep";
import { UnitStep } from "../components/onboarding/UnitStep";
import { ExplainStep } from "../components/onboarding/ExplainStep";
import { StepSlide, onboardingStyles as styles } from "../components/onboarding/shared";
import { LIFT_TIPS } from "../lib/liftTips";

const LIFTS = ["Deadlift", "Squat", "Bench Press", "Overhead Press"] as const;
type LiftKey = "deadlift" | "squat" | "bench" | "ohp";

const LIFT_KEY_MAP: Record<string, LiftKey> = {
  Deadlift: "deadlift",
  Squat: "squat",
  "Bench Press": "bench",
  "Overhead Press": "ohp",
};

type StepKey = "welcome" | "name" | "unit" | "explain" | "manual";

const STEP_ORDER: StepKey[] = ["welcome", "name", "explain", "unit", "manual"];
function stepIndex(s: StepKey): number {
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

  const [userName, setUserName] = useState("");
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");
  const [manualInputs, setManualInputs] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  async function skip() {
    await updateProfile({ name: userName.trim(), weightUnit: unit, onboardingComplete: true });
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
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
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
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <ProgressDots current={currentStepIdx} total={STEP_ORDER.length} />
        <NameStep
          userName={userName}
          onChangeUserName={setUserName}
          onContinue={() => {
            updateProfile({ name: userName.trim() });
            setStep("explain");
          }}
        />
      </View>
    );
  }

  if (step === "explain") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <ProgressDots current={currentStepIdx} total={STEP_ORDER.length} />
        <ExplainStep
          onManual={() => { setLockeMood("encouraging"); setStep("unit"); }}
          onSkip={skip}
        />
      </View>
    );
  }

  if (step === "unit") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <ProgressDots current={currentStepIdx} total={STEP_ORDER.length} />
        <UnitStep
          unit={unit}
          onSelectUnit={setUnit}
          onContinue={() => setStep("manual")}
          onBack={() => setStep("explain")}
        />
      </View>
    );
  }

  // ── Manual 1RM entry step ────────────────────────────────────────────────────

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
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <LockeMascot size={240} mood="encouraging" />
            <Text style={{ fontSize: 13, color: theme.colors.muted, textAlign: "center", marginTop: 6 }}>
              Here's how each lift works.
            </Text>
          </View>
          <Text style={[styles.stepEyebrow, { color: theme.colors.primary }]}>YOUR NUMBERS</Text>
          <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
            Enter your 1RM values
          </Text>
          <Text style={[styles.stepSub, { color: theme.colors.muted }]}>
            Leave blank any lifts you don't track
          </Text>

          {LIFTS.map((lift) => (
            <View key={lift} style={[styles.liftCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.liftName, { color: theme.colors.text }]}>{lift}</Text>
              <Text style={{ fontSize: 12, lineHeight: 17, color: theme.colors.muted, marginBottom: 8 }}>
                {LIFT_TIPS[lift]}
              </Text>
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
          <Button label="Back" onPress={() => setStep("unit")} variant="secondary" />
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </StepSlide>
  );
}

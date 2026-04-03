import { useState, useCallback } from "react";
import {
  View,
  Pressable,
  StyleSheet as RNStyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing } from "../../lib/theme";
import { saveMealPrefs, saveMealPlan, loadMealPrefs } from "../../lib/mealStorage";
import { generateWeeklyPlan, getWeekKey, computeMacroTargets } from "../../lib/mealService";
import { recipeCatalog } from "../../src/data/recipeCatalog";
import type { CuisineTier, MealPreferences, DietaryFilter, ActivityLevel, BiologicalSex } from "../../src/data/mealTypes";
import { WelcomeStep } from "../../components/meals/setup/WelcomeStep";
import { TierStep } from "../../components/meals/setup/TierStep";
import { BodyStatsStep } from "../../components/meals/setup/BodyStatsStep";
import { GoalStep } from "../../components/meals/setup/GoalStep";
import { RestrictionsStep } from "../../components/meals/setup/RestrictionsStep";
import { StartDayStep } from "../../components/meals/setup/StartDayStep";
import { PreviewStep } from "../../components/meals/setup/PreviewStep";
import { useEffect } from "react";
import { useProfileContext } from "../../contexts/ProfileContext";
import { useInterstitialAd } from "../../hooks/useInterstitialAd";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SetupStep = "welcome" | "tier" | "body" | "goal" | "restrictions" | "start" | "preview";

type MealSetupDraft = {
  tier: CuisineTier;
  nutritionGoal: "aggressive_cut" | "cut" | "maintain" | "bulk";
  restrictions: DietaryFilter[];
  heightCm?: number;
  age?: number;
  sex?: BiologicalSex;
  activityLevel?: ActivityLevel;
  goalWeightKg?: number;
  startDayIndex?: number;
};

export type StepProps = {
  draft: MealSetupDraft;
  onUpdate: (patch: Partial<MealSetupDraft>) => void;
  onContinue: () => void;
  onBack: () => void;
};

// ---------------------------------------------------------------------------
// Step order
// ---------------------------------------------------------------------------

const STEP_ORDER: SetupStep[] = ["welcome", "tier", "body", "goal", "restrictions", "start", "preview"];

function stepIndex(s: SetupStep): number {
  return STEP_ORDER.indexOf(s);
}

// ---------------------------------------------------------------------------
// ProgressDots (self-contained, matches onboarding pattern)
// ---------------------------------------------------------------------------

function ProgressDots({ total, current }: { total: number; current: number }) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[dotStyles.row, { top: insets.top + spacing.md }]}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            {
              backgroundColor:
                i === current
                  ? theme.colors.primary
                  : i < current
                    ? theme.colors.primary + "55"
                    : theme.colors.border,
            },
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = RNStyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 5,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

// ---------------------------------------------------------------------------
// Default draft
// ---------------------------------------------------------------------------

const DEFAULT_DRAFT: MealSetupDraft = {
  tier: "scavenge",
  nutritionGoal: "maintain",
  restrictions: [],
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function MealSetupScreen() {
  const router = useRouter();
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { profileRef } = useProfileContext();
  const { show: showInterstitial } = useInterstitialAd();

  const [step, setStep] = useState<SetupStep>(prefill === "1" ? "tier" : "welcome");
  const [draft, setDraft] = useState<MealSetupDraft>({ ...DEFAULT_DRAFT });
  const [isSaving, setIsSaving] = useState(false);
  const [didPrefill, setDidPrefill] = useState(false);

  // Pre-populate draft from saved prefs when re-setup
  useEffect(() => {
    if (prefill !== "1" || didPrefill) return;
    (async () => {
      const saved = await loadMealPrefs();
      if (saved.setupComplete) {
        setDraft({
          tier: saved.tier,
          nutritionGoal: saved.nutritionGoal,
          restrictions: [...saved.restrictions],
          heightCm: saved.heightCm,
          age: saved.age,
          sex: saved.sex,
          activityLevel: saved.activityLevel,
          goalWeightKg: saved.goalWeightKg,
          startDayIndex: saved.startDayIndex,
        });
      }
      setDidPrefill(true);
    })();
  }, [prefill, didPrefill]);

  const onUpdate = useCallback((patch: Partial<MealSetupDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  // Step navigation helpers
  const goNext = useCallback(() => {
    const idx = stepIndex(step);
    if (idx < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[idx + 1]);
    }
  }, [step]);

  const isPrefill = prefill === "1";
  const firstStep = isPrefill ? "tier" : "welcome";

  const goBack = useCallback(() => {
    if (step === firstStep) {
      router.back();
      return;
    }
    const idx = stepIndex(step);
    if (idx > 0) {
      setStep(STEP_ORDER[idx - 1]);
    }
  }, [step, firstStep, router]);

  // Final save handler
  const handleFinish = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const prefs: MealPreferences = {
        tier: draft.tier,
        nutritionGoal: draft.nutritionGoal,
        customMacros: null,
        restrictions: draft.restrictions,
        setupComplete: true,
        heightCm: draft.heightCm,
        age: draft.age,
        sex: draft.sex,
        activityLevel: draft.activityLevel,
        goalWeightKg: draft.goalWeightKg,
        startDayIndex: draft.startDayIndex,
      };
      await saveMealPrefs(prefs);

      // If the chosen start day has already passed this week, generate next week's plan
      const jsDay = new Date().getDay();
      const todayIdx = jsDay === 0 ? 6 : jsDay - 1;
      const chosenStart = draft.startDayIndex ?? 0;
      const weekOffset = chosenStart < todayIdx ? 1 : 0;
      const weekKey = getWeekKey(weekOffset);
      // Compute calorie target so plan respects cut/bulk goals
      const rawWeight = parseFloat(profileRef.current.weight as string) || 0;
      const wKg = profileRef.current.weightUnit === "lbs" ? rawWeight / 2.205 : rawWeight;
      let calTarget: number | undefined;
      if (draft.nutritionGoal !== "maintain" && wKg > 0) {
        calTarget = computeMacroTargets(wKg, draft.nutritionGoal, {
          heightCm: draft.heightCm,
          age: draft.age,
          sex: draft.sex,
          activityLevel: draft.activityLevel,
        }).calories;
      }
      const plan = generateWeeklyPlan(draft.tier, weekKey, recipeCatalog, draft.restrictions, calTarget);
      await saveMealPlan(plan);

      // Show interstitial ad while plan loads
      await showInterstitial();

      router.replace("/meals");
    } catch (e) {
      if (__DEV__) console.warn("[MealSetup] save error:", e);
      setIsSaving(false);
    }
  }, [draft, isSaving, router]);

  // Render loading overlay while saving
  if (isSaving) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const currentIdx = stepIndex(step);

  const stepProps: StepProps = {
    draft,
    onUpdate,
    onContinue: step === "preview" ? handleFinish : goNext,
    onBack: goBack,
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
      <ProgressDots total={STEP_ORDER.length} current={currentIdx} />

      {isPrefill && (
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={[styles.closeBtn, { top: insets.top + spacing.md - 2 }]}
        >
          <Ionicons name="close" size={24} color={theme.colors.muted} />
        </Pressable>
      )}

      {step === "welcome" && <WelcomeStep {...stepProps} />}
      {step === "tier" && <TierStep {...stepProps} />}
      {step === "body" && <BodyStatsStep {...stepProps} />}
      {step === "goal" && <GoalStep {...stepProps} />}
      {step === "restrictions" && <RestrictionsStep {...stepProps} />}
      {step === "start" && <StartDayStep {...stepProps} />}
      {step === "preview" && (
        <PreviewStep
          draft={draft}
          onConfirm={handleFinish}
          onBack={goBack}
        />
      )}
    </View>
  );
}

const styles = RNStyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    left: spacing.md,
    zIndex: 10,
  },
});

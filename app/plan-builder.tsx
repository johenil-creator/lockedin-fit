import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { impact, notification, ImpactStyle, NotificationType } from "../lib/haptics";
import { BackButton } from "../components/BackButton";
import { usePlanContext } from "../contexts/PlanContext";
import { useProfileContext } from "../contexts/ProfileContext";
import { useWorkouts } from "../hooks/useWorkouts";
import { loadPlanDraft, savePlanDraft, clearPlanDraft, loadSavedDraftById, saveSavedDraft, type SavedPlanDraft } from "../lib/storage";
import { useAppTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { ExercisePicker } from "../components/plan-builder/ExercisePicker";
import { resolveExerciseLoad, classifyExercise, getWeekPrescription } from "../lib/loadEngine";
import { glowColors, spacing, radius, typography } from "../lib/theme";
import type { Exercise } from "../lib/types";

// ── Types ────────────────────────────────────────────────────────────────────

type DayExercise = {
  name: string;
  sets: string;
  reps: string;
  restTime: string;
  warmUpSets: string;
};

type DayConfig = {
  label: string;
  exercises: DayExercise[];
};

const GOALS = ["Strength", "Hypertrophy", "Endurance", "General"] as const;
const REST_OPTIONS = ["60", "90", "120", "180"] as const;

// ── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  const { theme } = useAppTheme();
  return (
    <View style={si.row}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            si.dot,
            {
              backgroundColor: i === current ? glowColors.viridian : i < current ? theme.colors.success : theme.colors.border,
              width: i === current ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  );
}

const si = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  dot: { height: 8, borderRadius: 4 },
});

// ── Chip Selector ────────────────────────────────────────────────────────────

function ChipRow<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: readonly T[];
  selected: T;
  onSelect: (val: T) => void;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={chip.row}>
      {options.map((opt) => {
        const active = opt === selected;
        return (
          <Pressable
            key={opt}
            onPress={() => {
              impact(ImpactStyle.Light);
              onSelect(opt);
            }}
            style={[
              chip.pill,
              {
                backgroundColor: active ? glowColors.viridianDim : theme.colors.mutedBg,
                borderColor: active ? glowColors.viridian : theme.colors.border,
              },
            ]}
          >
            <Text style={[chip.label, { color: active ? glowColors.viridian : theme.colors.text }]}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const chip = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.full, borderWidth: 1.5 },
  label: { fontSize: 14, fontWeight: "600" },
});

// ── Number Stepper ───────────────────────────────────────────────────────────

function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  label?: string;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={stepper.row}>
      {label && <Text style={[stepper.label, { color: theme.colors.muted }]}>{label}</Text>}
      <View style={stepper.controls}>
        <Pressable
          onPress={() => {
            if (value > min) { impact(ImpactStyle.Light); onChange(value - 1); }
          }}
          style={[stepper.btn, { backgroundColor: theme.colors.mutedBg, opacity: value <= min ? 0.3 : 1 }]}
        >
          <Ionicons name="remove" size={18} color={theme.colors.text} />
        </Pressable>
        <Text style={[stepper.value, { color: theme.colors.text }]}>{value}</Text>
        <Pressable
          onPress={() => {
            if (value < max) { impact(ImpactStyle.Light); onChange(value + 1); }
          }}
          style={[stepper.btn, { backgroundColor: theme.colors.mutedBg, opacity: value >= max ? 0.3 : 1 }]}
        >
          <Ionicons name="add" size={18} color={theme.colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const stepper = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 14, fontWeight: "600" },
  controls: { flexDirection: "row", alignItems: "center", gap: 12 },
  btn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  value: { fontSize: 20, fontWeight: "800", minWidth: 28, textAlign: "center" },
});

// ── Exercise Row ─────────────────────────────────────────────────────────────

function ExerciseRow({
  ex,
  index,
  onUpdate,
  onDelete,
}: {
  ex: DayExercise;
  index: number;
  onUpdate: (i: number, patch: Partial<DayExercise>) => void;
  onDelete: (i: number) => void;
}) {
  const { theme } = useAppTheme();

  return (
    <Animated.View entering={FadeIn.duration(200)} style={[exRow.container, { backgroundColor: theme.colors.mutedBg, borderColor: theme.colors.border }]}>
      <View style={exRow.header}>
        <Text style={[exRow.name, { color: theme.colors.text }]} numberOfLines={1}>{ex.name}</Text>
        <Pressable onPress={() => onDelete(index)} hitSlop={8}>
          <Ionicons name="close-circle" size={20} color={theme.colors.danger} />
        </Pressable>
      </View>

      <View style={exRow.configRow}>
        <View style={exRow.field}>
          <Text style={[exRow.fieldLabel, { color: theme.colors.muted }]}>Sets</Text>
          <TextInput
            style={[exRow.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
            value={ex.sets}
            onChangeText={(v) => onUpdate(index, { sets: v.replace(/[^0-9]/g, "").slice(0, 2) })}
            keyboardType="numeric"
            maxLength={2}
            placeholder="3"
            placeholderTextColor={theme.colors.muted}
          />
        </View>
        <View style={exRow.field}>
          <Text style={[exRow.fieldLabel, { color: theme.colors.muted }]}>Warm-Up Sets</Text>
          <TextInput
            style={[exRow.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
            value={ex.warmUpSets}
            onChangeText={(v) => onUpdate(index, { warmUpSets: v.replace(/[^0-9]/g, "").slice(0, 1) })}
            keyboardType="numeric"
            maxLength={1}
            placeholder="0"
            placeholderTextColor={theme.colors.muted}
          />
        </View>
        <View style={exRow.field}>
          <Text style={[exRow.fieldLabel, { color: theme.colors.muted }]}>Reps</Text>
          <TextInput
            style={[exRow.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
            value={ex.reps}
            onChangeText={(v) => onUpdate(index, { reps: v.replace(/[^0-9\-]/g, "").slice(0, 5) })}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            placeholder="8-12"
            placeholderTextColor={theme.colors.muted}
          />
        </View>
        <View style={exRow.field}>
          <Text style={[exRow.fieldLabel, { color: theme.colors.muted }]}>Rest</Text>
          <View style={exRow.restRow}>
            {REST_OPTIONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => onUpdate(index, { restTime: r })}
                style={[
                  exRow.restPill,
                  {
                    backgroundColor: ex.restTime === r ? glowColors.viridianDim : theme.colors.surface,
                    borderColor: ex.restTime === r ? glowColors.viridian : theme.colors.border,
                  },
                ]}
              >
                <Text style={[exRow.restText, { color: ex.restTime === r ? glowColors.viridian : theme.colors.muted }]}>
                  {r}s
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const exRow = StyleSheet.create({
  container: { borderRadius: radius.md, borderWidth: 1, padding: 12, marginBottom: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  name: { fontSize: 15, fontWeight: "700", flex: 1, marginRight: 8 },
  configRow: { gap: 10 },
  field: {},
  fieldLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 10, fontSize: 15, fontWeight: "600" },
  restRow: { flexDirection: "row", gap: 6 },
  restPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1 },
  restText: { fontSize: 12, fontWeight: "600" },
});

// ── Day Tab Bar ──────────────────────────────────────────────────────────────

function DayTabs({
  days,
  activeDay,
  onSelect,
}: {
  days: DayConfig[];
  activeDay: number;
  onSelect: (i: number) => void;
}) {
  const { theme } = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={dt.scroll}
    >
      {days.map((d, i) => {
        const active = i === activeDay;
        return (
          <Pressable
            key={i}
            onPress={() => { impact(ImpactStyle.Light); onSelect(i); }}
            style={[
              dt.tab,
              {
                backgroundColor: active ? glowColors.viridianDim : "transparent",
                borderColor: active ? glowColors.viridian : theme.colors.border,
              },
            ]}
          >
            <Text style={[dt.label, { color: active ? glowColors.viridian : theme.colors.muted }]}>
              {d.label || `Day ${i + 1}`}
            </Text>
            <Text style={[dt.count, { color: active ? glowColors.viridian : theme.colors.muted }]}>
              {d.exercises.length} ex
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const dt = StyleSheet.create({
  scroll: { gap: 8, paddingBottom: 4 },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.full, borderWidth: 1.5, alignItems: "center", minWidth: 72 },
  label: { fontSize: 13, fontWeight: "700" },
  count: { fontSize: 10, marginTop: 2 },
});

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function PlanBuilderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ new?: string; draftId?: string }>();
  const { theme } = useAppTheme();
  const { setPlan } = usePlanContext();
  const { profile } = useProfileContext();
  const { workouts } = useWorkouts();
  const { showToast } = useToast();

  // Track which saved draft we're editing (if any)
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(params.draftId ?? null);

  // Wizard state
  const [step, setStep] = useState(0);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Step 1: Plan basics
  const [planName, setPlanName] = useState("");
  const [goal, setGoal] = useState<(typeof GOALS)[number]>("Hypertrophy");
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [numWeeks, setNumWeeks] = useState(4);

  // Step 2: Day builder — per-week
  const makeDays = (n: number) => Array.from({ length: n }, (_, i) => ({ label: `Day ${i + 1}`, exercises: [] as DayExercise[] }));
  const [weeks, setWeeks] = useState<DayConfig[][]>(() =>
    Array.from({ length: 4 }, () => makeDays(4))
  );

  // Restore draft on mount
  useEffect(() => {
    (async () => {
      // If new=1, start fresh — skip draft loading
      if (params.new === "1") {
        setDraftLoaded(true);
        return;
      }

      // If draftId is specified, load from saved drafts
      if (params.draftId) {
        const saved = await loadSavedDraftById(params.draftId);
        if (saved?.draft) {
          const d = saved.draft;
          setPlanName(d.planName ?? "");
          setGoal(d.goal ?? "Hypertrophy");
          setDaysPerWeek(d.daysPerWeek ?? 4);
          setNumWeeks(d.numWeeks ?? 4);
          if (d.weeks) setWeeks(d.weeks);
          setStep(d.step ?? 0);
          if (d.activeWeek != null) setActiveWeek(d.activeWeek);
          if (d.activeDay != null) setActiveDay(d.activeDay);
          setCurrentDraftId(saved.id);
        }
        setDraftLoaded(true);
        return;
      }

      // Fallback: load legacy single draft
      const draft = await loadPlanDraft();
      if (draft) {
        setPlanName(draft.planName ?? "");
        setGoal(draft.goal ?? "Hypertrophy");
        setDaysPerWeek(draft.daysPerWeek ?? 4);
        setNumWeeks(draft.numWeeks ?? 4);
        if (draft.weeks) setWeeks(draft.weeks);
        setStep(draft.step ?? 0);
        if (draft.activeWeek != null) setActiveWeek(draft.activeWeek);
        if (draft.activeDay != null) setActiveDay(draft.activeDay);
      }
      setDraftLoaded(true);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [activeWeek, setActiveWeek] = useState(0);
  const [activeDay, setActiveDay] = useState(0);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Convenience accessor for current week's days
  const days = weeks[activeWeek] ?? [];
  const setDays = useCallback((updater: (prev: DayConfig[]) => DayConfig[]) => {
    setWeeks((prev) => {
      const updated = [...prev];
      updated[activeWeek] = updater(updated[activeWeek]);
      return updated;
    });
  }, [activeWeek]);

  // Sync weeks/days when numWeeks or daysPerWeek changes
  const handleDaysPerWeekChange = useCallback((n: number) => {
    setDaysPerWeek(n);
    setWeeks((prev) => prev.map((week) => {
      if (n > week.length) {
        return [...week, ...Array.from({ length: n - week.length }, (_, i) => ({ label: `Day ${week.length + i + 1}`, exercises: [] as DayExercise[] }))];
      }
      return week.slice(0, n);
    }));
    setActiveDay((prev) => Math.min(prev, n - 1));
  }, []);

  // Keep weeks array in sync with numWeeks
  useEffect(() => {
    setWeeks((prev) => {
      if (numWeeks > prev.length) {
        // Add new weeks — copy structure from week 1 (with empty exercises) as template
        const template = prev[0] ?? makeDays(daysPerWeek);
        return [...prev, ...Array.from({ length: numWeeks - prev.length }, () =>
          template.map((d) => ({ label: d.label, exercises: [] as DayExercise[] }))
        )];
      }
      return prev.slice(0, numWeeks);
    });
    setActiveWeek((prev) => Math.min(prev, numWeeks - 1));
  }, [numWeeks, daysPerWeek]);

  // Check if user has 1RM data
  const has1RM = !!(profile.manual1RM?.deadlift || profile.manual1RM?.squat || profile.manual1RM?.bench || profile.manual1RM?.ohp);

  // Add exercise with optional auto-fill from 1RM
  const addExerciseWithDefaults = useCallback((name: string, autoFill: boolean) => {
    let sets = "3";
    let reps = "10";
    let restTime = "90";
    let warmUpSets = "0";

    if (autoFill) {
      const weekStr = `Week ${activeWeek + 1}`;
      // Get prescription for sets/reps based on week + exercise type
      const classification = classifyExercise(name);
      const isCompound = classification.baseLift !== null && classification.confidence >= 0.5;
      const prescription = getWeekPrescription(activeWeek + 1, isCompound, classification.pattern);

      sets = String(prescription.sets);
      reps = String(prescription.reps);
      restTime = isCompound ? "120" : "90";
      warmUpSets = isCompound ? "2" : "0";

      // Try to get weight from load engine
      const load = resolveExerciseLoad({
        exerciseName: name,
        weekStr,
        profile,
        workouts,
        workingSetCount: prescription.sets,
        targetReps: String(prescription.reps),
        plannedWarmUpCount: isCompound ? 2 : 0,
      });

      // If we got a calculated weight, show it in the reps field context
      if (load.workingSets.length > 0 && load.workingSets[0].weight) {
        // Weight will be applied when the session starts via the load engine,
        // but show the prescription sets/reps so the user sees the auto-fill worked
      }

      if (__DEV__) {
        console.log(`[auto-fill] ${name}: ${sets}×${reps}, source=${load.source}, weight=${load.workingWeight}`);
      }
    }

    setDays((prev) => {
      const updated = [...prev];
      updated[activeDay] = {
        ...updated[activeDay],
        exercises: [...updated[activeDay].exercises, { name, sets, reps, restTime, warmUpSets }],
      };
      return updated;
    });
    impact(ImpactStyle.Light);
  }, [activeDay, activeWeek, setDays, profile, workouts]);

  // Exercise handlers
  const handleAddExercise = useCallback((exercise: { name: string; equipment: string }) => {
    setPickerVisible(false);

    if (has1RM) {
      Alert.alert(
        "Set Up Exercise",
        `How would you like to configure "${exercise.name}"?`,
        [
          {
            text: "Auto-fill from 1RM",
            onPress: () => addExerciseWithDefaults(exercise.name, true),
          },
          {
            text: "Enter Manually",
            onPress: () => addExerciseWithDefaults(exercise.name, false),
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
    } else {
      addExerciseWithDefaults(exercise.name, false);
    }
  }, [has1RM, addExerciseWithDefaults]);

  const handleUpdateExercise = useCallback((i: number, patch: Partial<DayExercise>) => {
    setDays((prev) => {
      const updated = [...prev];
      const dayExercises = [...updated[activeDay].exercises];
      dayExercises[i] = { ...dayExercises[i], ...patch };
      updated[activeDay] = { ...updated[activeDay], exercises: dayExercises };
      return updated;
    });
  }, [activeDay, setDays]);

  const handleDeleteExercise = useCallback((i: number) => {
    impact(ImpactStyle.Light);
    setDays((prev) => {
      const updated = [...prev];
      const dayExercises = [...updated[activeDay].exercises];
      dayExercises.splice(i, 1);
      updated[activeDay] = { ...updated[activeDay], exercises: dayExercises };
      return updated;
    });
  }, [activeDay, setDays]);

  const handleDayRename = useCallback((newLabel: string) => {
    setDays((prev) => {
      const updated = [...prev];
      updated[activeDay] = { ...updated[activeDay], label: newLabel };
      return updated;
    });
  }, [activeDay, setDays]);

  // Existing exercise names for current day (for de-emphasis in picker)
  const existingNames = days[activeDay]?.exercises.map((e) => e.name) ?? [];

  // Total exercise count across all weeks/days
  const totalExercises = weeks.reduce((sum, week) => sum + week.reduce((s, d) => s + d.exercises.length, 0), 0);
  const currentWeekExercises = days.reduce((sum, d) => sum + d.exercises.length, 0);

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    const exercises: Exercise[] = [];
    weeks.forEach((weekDays, wi) => {
      for (const day of weekDays) {
        for (const ex of day.exercises) {
          exercises.push({
            exercise: ex.name,
            sets: ex.sets || "3",
            reps: ex.reps || "10",
            weight: "",
            comments: "",
            week: `Week ${wi + 1}`,
            day: day.label,
            restTime: ex.restTime || "90",
            warmUpSets: ex.warmUpSets || "0",
          });
        }
      }
    });

    setPlan(planName.trim(), exercises);
    clearPlanDraft();
    notification(NotificationType.Success);
    showToast({ message: `Created "${planName.trim()}" — ${totalExercises} exercises, ${numWeeks} weeks`, type: "success" });
    router.replace("/");
  }, [planName, weeks, numWeeks, totalExercises, setPlan, showToast, router]);

  const handleSaveAndStart = useCallback(async () => {
    // Build exercises from current state
    const exercises: Exercise[] = [];
    weeks.forEach((weekDays, wi) => {
      for (const day of weekDays) {
        for (const ex of day.exercises) {
          exercises.push({
            exercise: ex.name,
            sets: ex.sets || "3",
            reps: ex.reps || "10",
            weight: "",
            comments: "",
            week: `Week ${wi + 1}`,
            day: day.label,
            restTime: ex.restTime || "90",
            warmUpSets: ex.warmUpSets || "0",
          });
        }
      }
    });

    // Only save if there's at least one exercise
    if (exercises.length > 0) {
      setPlan(planName.trim() || "My Plan", exercises);
    }

    // Save to multi-draft system
    const draftData = { planName, goal, daysPerWeek, numWeeks, weeks, step, activeWeek, activeDay };
    const draftId = currentDraftId || `draft_${Date.now()}`;
    const totalEx = weeks.reduce((sum, wk) => sum + wk.reduce((s, d) => s + d.exercises.length, 0), 0);
    await saveSavedDraft({
      id: draftId,
      name: planName.trim() || "Untitled Plan",
      goal,
      daysPerWeek,
      numWeeks,
      totalExercises: totalEx,
      updatedAt: new Date().toISOString(),
      draft: draftData,
    });
    // Also save to legacy single draft for backwards compat
    await savePlanDraft(draftData);
    setCurrentDraftId(draftId);
    showToast({ message: "Plan saved — you can edit anytime", type: "success" });
    router.replace("/");
  }, [planName, goal, daysPerWeek, numWeeks, weeks, step, activeWeek, activeDay, currentDraftId, setPlan, showToast, router]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const currentDayHasExercises = step === 1 && (days[activeDay]?.exercises.length ?? 0) > 0;
  const canAdvance = step === 0 ? planName.trim().length > 0 : step === 1 ? currentDayHasExercises : true;

  const isLastDay = step === 1 && activeDay >= days.length - 1;
  const isLastWeek = step === 1 && activeWeek >= numWeeks - 1;

  const handleNext = useCallback(() => {
    if (step === 1 && !isLastDay) {
      // Advance to next day tab
      impact(ImpactStyle.Light);
      setActiveDay(activeDay + 1);
    } else if (step === 1 && isLastDay && !isLastWeek) {
      // Advance to next week
      impact(ImpactStyle.Light);
      setActiveWeek(activeWeek + 1);
      setActiveDay(0);
    } else if (step < 2) {
      impact(ImpactStyle.Light);
      setStep(step + 1);
    } else {
      handleSave();
    }
  }, [step, activeDay, activeWeek, isLastDay, isLastWeek, numWeeks, handleSave]);

  const handleBack = useCallback(() => {
    if (step === 1 && activeWeek > 0) {
      // Go back to previous week's last day
      setActiveWeek(activeWeek - 1);
      setActiveDay(daysPerWeek - 1);
    } else if (step === 2) {
      // Go back to last week's last day
      setActiveWeek(numWeeks - 1);
      setActiveDay(daysPerWeek - 1);
      setStep(1);
    } else if (step > 0) {
      setStep(step - 1);
    } else {
      router.back();
    }
  }, [step, activeWeek, daysPerWeek, numWeeks, router]);

  // ── Step titles ────────────────────────────────────────────────────────────

  const stepTitles = ["Plan Basics", numWeeks > 1 ? `Week ${activeWeek + 1} Exercises` : "Add Exercises", "Review"];

  return (
    <View style={[s.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <BackButton onPress={handleBack} />
        <View style={s.headerCenter}>
          <Text style={[typography.heading, { color: theme.colors.text, fontSize: 18 }]}>
            {stepTitles[step]}
          </Text>
          <StepIndicator current={step} total={3} />
        </View>
        <Pressable onPress={handleSaveAndStart} hitSlop={8} style={{ width: 44, alignItems: "center" }}>
          <Ionicons name="save-outline" size={22} color={theme.colors.accent} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* ── STEP 0: Plan Basics ─────────────────────────────────────────── */}
          {step === 0 && (
            <Animated.View entering={FadeIn.duration(250)}>
              <View style={[s.card, { backgroundColor: theme.colors.surface }]}>
                <Text style={[s.fieldLabel, { color: theme.colors.muted }]}>Plan Name</Text>
                <TextInput
                  style={[s.textInput, { backgroundColor: theme.colors.mutedBg, color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={planName}
                  onChangeText={setPlanName}
                  placeholder="e.g. Push Pull Legs"
                  placeholderTextColor={theme.colors.muted}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  blurOnSubmit
                />

                <Text style={[s.fieldLabel, { color: theme.colors.muted, marginTop: spacing.lg }]}>Goal</Text>
                <ChipRow options={GOALS} selected={goal} onSelect={setGoal} />

                <View style={{ marginTop: spacing.lg }}>
                  <Stepper value={daysPerWeek} min={1} max={7} onChange={handleDaysPerWeekChange} label="Days per Week" />
                </View>

                <View style={{ marginTop: spacing.lg }}>
                  <Stepper value={numWeeks} min={1} max={16} onChange={setNumWeeks} label="Number of Weeks" />
                </View>
              </View>
            </Animated.View>
          )}

          {/* ── STEP 1: Day Builder ─────────────────────────────────────────── */}
          {step === 1 && (
            <Animated.View entering={FadeIn.duration(250)}>
              {/* Week indicator */}
              {numWeeks > 1 && (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 8, gap: 6 }}>
                  {Array.from({ length: numWeeks }, (_, i) => (
                    <Pressable
                      key={i}
                      onPress={() => { setActiveWeek(i); setActiveDay(0); }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: 12,
                        backgroundColor: i === activeWeek ? theme.colors.accent + "20" : "transparent",
                        borderWidth: 1,
                        borderColor: i === activeWeek ? theme.colors.accent : theme.colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: i === activeWeek ? "700" : "500", color: i === activeWeek ? theme.colors.accent : theme.colors.muted }}>
                        W{i + 1}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Day tabs */}
              <DayTabs days={days} activeDay={activeDay} onSelect={setActiveDay} />

              {/* Day name */}
              <View style={[s.card, { backgroundColor: theme.colors.surface, marginTop: spacing.sm }]}>
                <Text style={[s.fieldLabel, { color: theme.colors.muted }]}>Day Name</Text>
                <TextInput
                  style={[s.textInput, { backgroundColor: theme.colors.mutedBg, color: theme.colors.text, borderColor: theme.colors.border }]}
                  value={days[activeDay]?.label ?? ""}
                  onChangeText={handleDayRename}
                  placeholder={`Day ${activeDay + 1}`}
                  placeholderTextColor={theme.colors.muted}
                />
              </View>

              {/* Exercises list */}
              {days[activeDay]?.exercises.length === 0 ? (
                <View style={s.emptyDay}>
                  <Ionicons name="barbell-outline" size={40} color={theme.colors.border} />
                  <Text style={[s.emptyText, { color: theme.colors.muted }]}>
                    No exercises yet
                  </Text>
                  <Text style={[s.emptyHint, { color: theme.colors.muted }]}>
                    Every pack needs a plan. Tap below to add exercises.
                  </Text>
                </View>
              ) : (
                <View style={{ marginTop: spacing.sm }}>
                  {days[activeDay].exercises.map((ex, i) => (
                    <ExerciseRow
                      key={`${activeDay}-${i}-${ex.name}`}
                      ex={ex}
                      index={i}
                      onUpdate={handleUpdateExercise}
                      onDelete={handleDeleteExercise}
                    />
                  ))}
                </View>
              )}

              {/* Add exercise button */}
              <Pressable
                onPress={() => {
                  impact(ImpactStyle.Light);
                  setPickerVisible(true);
                }}
                style={[s.addBtn, { borderColor: glowColors.viridian }]}
              >
                <Ionicons name="add-circle" size={20} color={glowColors.viridian} />
                <Text style={[s.addBtnText, { color: glowColors.viridian }]}>Add Exercise</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* ── STEP 2: Review ──────────────────────────────────────────────── */}
          {step === 2 && (
            <Animated.View entering={FadeIn.duration(250)}>
              {/* Summary card */}
              <View style={[s.card, { backgroundColor: theme.colors.surface }]}>
                <Text style={[s.reviewTitle, { color: theme.colors.text }]}>{planName}</Text>
                <View style={s.reviewMeta}>
                  <View style={[s.metaPill, { backgroundColor: theme.colors.mutedBg }]}>
                    <Ionicons name="trophy-outline" size={14} color={glowColors.viridian} />
                    <Text style={[s.metaText, { color: theme.colors.text }]}>{goal}</Text>
                  </View>
                  <View style={[s.metaPill, { backgroundColor: theme.colors.mutedBg }]}>
                    <Ionicons name="calendar-outline" size={14} color={glowColors.viridian} />
                    <Text style={[s.metaText, { color: theme.colors.text }]}>{numWeeks} weeks</Text>
                  </View>
                  <View style={[s.metaPill, { backgroundColor: theme.colors.mutedBg }]}>
                    <Ionicons name="barbell-outline" size={14} color={glowColors.viridian} />
                    <Text style={[s.metaText, { color: theme.colors.text }]}>{totalExercises} exercises</Text>
                  </View>
                </View>
              </View>

              {/* Per-week / per-day summary */}
              {weeks.map((weekDays, wi) => (
                <View key={wi}>
                  {numWeeks > 1 && (
                    <Text style={{ color: theme.colors.accent, fontSize: 14, fontWeight: "700", marginTop: wi > 0 ? 16 : 8, marginBottom: 6 }}>
                      Week {wi + 1}
                    </Text>
                  )}
                  {weekDays.map((day, i) => (
                    <Animated.View
                      key={`${wi}-${i}`}
                      entering={FadeInDown.delay((wi * weekDays.length + i) * 40).duration(200)}
                      style={[s.card, { backgroundColor: theme.colors.surface }]}
                    >
                      <View style={s.reviewDayHeader}>
                        <Text style={[s.reviewDayLabel, { color: theme.colors.text }]}>{day.label}</Text>
                        <Text style={[s.reviewDayCount, { color: theme.colors.muted }]}>
                          {day.exercises.length} exercise{day.exercises.length !== 1 ? "s" : ""}
                        </Text>
                      </View>
                      {day.exercises.map((ex, j) => (
                        <View key={j} style={s.reviewExRow}>
                          <Text style={[s.reviewExName, { color: theme.colors.text }]}>{ex.name}</Text>
                          <Text style={[s.reviewExDetail, { color: theme.colors.muted }]}>
                            {ex.sets} × {ex.reps}
                          </Text>
                        </View>
                      ))}
                      {day.exercises.length === 0 && (
                        <Text style={[s.reviewEmpty, { color: theme.colors.muted }]}>No exercises</Text>
                      )}
                    </Animated.View>
                  ))}
                </View>
              ))}
            </Animated.View>
          )}

          {/* Bottom CTA */}
          <View style={[s.bottomBar, { backgroundColor: theme.colors.bg, paddingBottom: Math.max(insets.bottom, 16) }]}>
            {step === 2 && (
              <Pressable
                onPress={handleBack}
                style={[s.ctaBtn, { backgroundColor: theme.colors.mutedBg, marginBottom: 10 }]}
              >
                <Ionicons name="pencil-outline" size={16} color={theme.colors.text} />
                <Text style={[s.ctaBtnText, { color: theme.colors.text, marginLeft: 6 }]}>Edit Plan</Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleNext}
              disabled={!canAdvance}
              style={[
                s.ctaBtn,
                {
                  backgroundColor: canAdvance ? theme.colors.primary : theme.colors.mutedBg,
                  opacity: canAdvance ? 1 : 0.5,
                },
              ]}
            >
              <Text style={[s.ctaBtnText, { color: canAdvance ? theme.colors.primaryText : theme.colors.muted }]}>
                {step === 2 ? "Create Plan" : step === 1 && isLastDay && isLastWeek ? "Finish" : step === 1 && isLastDay ? "Next Week" : "Next"}
              </Text>
              {step === 2 || (step === 1 && isLastDay && isLastWeek) ? null : <Ionicons name="arrow-forward" size={18} color={canAdvance ? theme.colors.primaryText : theme.colors.muted} />}
            </Pressable>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Exercise Picker */}
      <ExercisePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleAddExercise}
        excludeNames={existingNames}
      />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerCenter: { alignItems: "center", gap: 6 },
  scrollContent: { padding: spacing.md },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "600",
  },
  emptyDay: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: { fontSize: 16, fontWeight: "600" },
  emptyHint: { fontSize: 13 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginTop: spacing.sm,
  },
  addBtnText: { fontSize: 15, fontWeight: "700" },
  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  ctaBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaBtnText: { fontSize: 16, fontWeight: "700" },
  // Review
  reviewTitle: { fontSize: 22, fontWeight: "800", marginBottom: spacing.sm },
  reviewMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  metaText: { fontSize: 13, fontWeight: "600" },
  reviewDayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  reviewDayLabel: { fontSize: 15, fontWeight: "700" },
  reviewDayCount: { fontSize: 12 },
  reviewExRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  reviewExName: { fontSize: 14, fontWeight: "600", flex: 1 },
  reviewExDetail: { fontSize: 13, fontWeight: "600" },
  reviewEmpty: { fontSize: 13, fontStyle: "italic", paddingVertical: 4 },
});

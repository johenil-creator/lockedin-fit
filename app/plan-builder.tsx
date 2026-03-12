import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { impact, notification, ImpactStyle, NotificationType } from "../lib/haptics";
import { BackButton } from "../components/BackButton";
import { usePlanContext } from "../contexts/PlanContext";
import { useAppTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { ExercisePicker } from "../components/plan-builder/ExercisePicker";
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
  const { theme } = useAppTheme();
  const { setPlan } = usePlanContext();
  const { showToast } = useToast();

  // Wizard state
  const [step, setStep] = useState(0);

  // Step 1: Plan basics
  const [planName, setPlanName] = useState("");
  const [goal, setGoal] = useState<(typeof GOALS)[number]>("Hypertrophy");
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [numWeeks, setNumWeeks] = useState(4);

  // Step 2: Day builder
  const [days, setDays] = useState<DayConfig[]>(() =>
    Array.from({ length: 4 }, (_, i) => ({ label: `Day ${i + 1}`, exercises: [] }))
  );
  const [activeDay, setActiveDay] = useState(0);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Sync days array when daysPerWeek changes
  const handleDaysPerWeekChange = useCallback((n: number) => {
    setDaysPerWeek(n);
    setDays((prev) => {
      if (n > prev.length) {
        return [...prev, ...Array.from({ length: n - prev.length }, (_, i) => ({ label: `Day ${prev.length + i + 1}`, exercises: [] }))];
      }
      return prev.slice(0, n);
    });
    setActiveDay((prev) => Math.min(prev, n - 1));
  }, []);

  // Exercise handlers
  const handleAddExercise = useCallback((exercise: { name: string; equipment: string }) => {
    setDays((prev) => {
      const updated = [...prev];
      updated[activeDay] = {
        ...updated[activeDay],
        exercises: [...updated[activeDay].exercises, { name: exercise.name, sets: "3", reps: "10", restTime: "90", warmUpSets: "0" }],
      };
      return updated;
    });
    setPickerVisible(false);
    impact(ImpactStyle.Light);
  }, [activeDay]);

  const handleUpdateExercise = useCallback((i: number, patch: Partial<DayExercise>) => {
    setDays((prev) => {
      const updated = [...prev];
      const dayExercises = [...updated[activeDay].exercises];
      dayExercises[i] = { ...dayExercises[i], ...patch };
      updated[activeDay] = { ...updated[activeDay], exercises: dayExercises };
      return updated;
    });
  }, [activeDay]);

  const handleDeleteExercise = useCallback((i: number) => {
    impact(ImpactStyle.Light);
    setDays((prev) => {
      const updated = [...prev];
      const dayExercises = [...updated[activeDay].exercises];
      dayExercises.splice(i, 1);
      updated[activeDay] = { ...updated[activeDay], exercises: dayExercises };
      return updated;
    });
  }, [activeDay]);

  const handleDayRename = useCallback((newLabel: string) => {
    setDays((prev) => {
      const updated = [...prev];
      updated[activeDay] = { ...updated[activeDay], label: newLabel };
      return updated;
    });
  }, [activeDay]);

  // Existing exercise names for current day (for de-emphasis in picker)
  const existingNames = days[activeDay]?.exercises.map((e) => e.name) ?? [];

  // Total exercise count across all days
  const totalExercises = days.reduce((sum, d) => sum + d.exercises.length, 0);

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    const exercises: Exercise[] = [];
    for (let w = 1; w <= numWeeks; w++) {
      for (const day of days) {
        for (const ex of day.exercises) {
          exercises.push({
            exercise: ex.name,
            sets: ex.sets || "3",
            reps: ex.reps || "10",
            weight: "",
            comments: "",
            week: `Week ${w}`,
            day: day.label,
            restTime: ex.restTime || "90",
            warmUpSets: ex.warmUpSets || "0",
          });
        }
      }
    }

    setPlan(planName.trim(), exercises);
    notification(NotificationType.Success);
    showToast({ message: `Created "${planName.trim()}" — ${totalExercises} exercises, ${numWeeks} weeks`, type: "success" });
    router.replace("/(tabs)/plan");
  }, [planName, days, numWeeks, totalExercises, setPlan, showToast, router]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const canAdvance = step === 0 ? planName.trim().length > 0 : step === 1 ? totalExercises > 0 : true;

  const handleNext = useCallback(() => {
    if (step < 2) {
      impact(ImpactStyle.Light);
      setStep(step + 1);
    } else {
      handleSave();
    }
  }, [step, handleSave]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      router.back();
    }
  }, [step, router]);

  // ── Step titles ────────────────────────────────────────────────────────────

  const stepTitles = ["Plan Basics", "Add Exercises", "Review"];

  return (
    <View style={[s.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={handleBack} hitSlop={8}>
          {step > 0 ? (
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          ) : (
            <BackButton />
          )}
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={[typography.heading, { color: theme.colors.text, fontSize: 18 }]}>
            {stepTitles[step]}
          </Text>
          <StepIndicator current={step} total={3} />
        </View>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
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
                  autoFocus
                  returnKeyType="next"
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
                    Tap the button below to add exercises
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

              {/* Per-day summary */}
              {days.map((day, i) => (
                <Animated.View
                  key={i}
                  entering={FadeInDown.delay(i * 60).duration(200)}
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
            </Animated.View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom CTA */}
        <View style={[s.bottomBar, { backgroundColor: theme.colors.bg, paddingBottom: Math.max(insets.bottom, 16) }]}>
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
              {step === 2 ? "Create Plan" : "Next"}
            </Text>
            {step < 2 && <Ionicons name="arrow-forward" size={18} color={canAdvance ? theme.colors.primaryText : theme.colors.muted} />}
          </Pressable>
        </View>
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
    marginBottom: spacing.sm + 4,
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

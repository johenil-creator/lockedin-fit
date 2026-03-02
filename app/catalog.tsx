import { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CATALOG_PLANS } from "../lib/catalog";
import { usePlanContext } from "../contexts/PlanContext";
import { useWorkouts } from "../hooks/useWorkouts";
import { useAppTheme } from "../contexts/ThemeContext";
import { useProfileContext } from "../contexts/ProfileContext";
import { Button } from "../components/Button";
import { BackButton } from "../components/BackButton";
import { AppBottomSheet } from "../components/AppBottomSheet";
import { LockeMascot } from "../components/Locke/LockeMascot";
import { spacing } from "../lib/theme";
import type { CatalogPlan } from "../lib/types";

// ── Difficulty chip ────────────────────────────────────────────────────────────

function DifficultyChip({ difficulty }: { difficulty: CatalogPlan["difficulty"] }) {
  const { theme } = useAppTheme();
  const colorMap: Record<CatalogPlan["difficulty"], { bg: string; text: string }> = {
    Beginner:     { bg: theme.colors.success + "22", text: theme.colors.success },
    Intermediate: { bg: theme.colors.accent  + "22", text: theme.colors.accent },
    Advanced:     { bg: theme.colors.danger  + "22", text: theme.colors.danger },
  };
  const { bg, text } = colorMap[difficulty];
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color: text }]}>{difficulty}</Text>
    </View>
  );
}

// ── Who it's for mapping ──────────────────────────────────────────────────────

const WHO_ITS_FOR: Record<string, string> = {
  "glute-buster":       "Anyone wanting bigger, stronger glutes with dedicated hip-dominant sessions",
  "chest-pump":         "Push-day lovers chasing a fuller chest with high-volume pressing",
  "arm-destroyer":      "Beginners wanting dedicated arm days with bicep/tricep supersets",
  "full-body-burn":     "Anyone training 3 days/week who wants whole-body stimulus each session",
  "squat-pr-builder":   "Powerlifters and athletes focused on a competition-peaking squat cycle",
  "push-pull-legs":     "Experienced lifters comfortable with 5-6 sessions/week wanting PPL structure",
  "5x5-strength":       "Intermediate lifters focused on adding weight to the bar every session",
  "core-and-abs":       "Anyone wanting a dedicated core and abs programme alongside other training",
  "shoulder-sculptor":  "Lifters who want broader, rounder delts with 4 focused shoulder sessions",
  "deadlift-dominator": "Anyone who wants to pull heavier with a dedicated hinge-focused programme",
  "upper-lower-split":  "Intermediate lifters who want balanced upper/lower frequency and recovery",
  "cardio-shred":       "Anyone looking to add structured cardio conditioning alongside lifting",
  "quick-start":        "Beginners looking for a short, low-commitment intro to structured training",
  "strength-blitz":     "Advanced lifters wanting a fast peaking cycle or mini-block before a meet",
  "hypertrophy-surge":  "Intermediate lifters who want a focused 6-week muscle-building block",
  "cut-and-condition":  "Anyone cutting who wants to preserve muscle while adding metabolic work",
  "powerbuilder-6wk":   "Intermediate lifters who want to build strength and size in a shorter cycle",
};

// ── Split label derivation ────────────────────────────────────────────────────

function getSplitLabel(plan: CatalogPlan): string {
  const goal = plan.goal.toLowerCase();
  if (goal.includes("ppl")) return "Push / Pull / Legs";
  if (goal.includes("upper") && goal.includes("lower")) return "Upper / Lower Split";
  if (goal.includes("push") && goal.includes("pull")) return "Push / Pull / Legs";
  if (goal.includes("full body") || goal.includes("full-body")) return "Full Body";
  if (goal.includes("glute") || goal.includes("lower body")) return "Lower Body Focus";
  if (goal.includes("chest") || goal.includes("push")) return "Push Focus";
  if (goal.includes("arm")) return "Arms Specialization";
  if (goal.includes("squat")) return "Squat Specialization";
  if (goal.includes("deadlift") || goal.includes("posterior")) return "Hinge Specialization";
  if (goal.includes("shoulder")) return "Shoulder Focus";
  if (goal.includes("core") || goal.includes("abs")) return "Core Focus";
  if (goal.includes("cardio") || goal.includes("conditioning")) return "Conditioning";
  if (goal.includes("strength") || goal.includes("power")) return "Strength / Power";
  if (goal.includes("hypertrophy")) return `${plan.daysPerWeek}-Day Hypertrophy Split`;
  return `${plan.daysPerWeek}-Day Split`;
}

// ── Week structure summary ────────────────────────────────────────────────────

function getWeekStructure(plan: CatalogPlan): string[] {
  const totalWeeks = plan.totalWeeks ?? 12;
  if (totalWeeks === 3) {
    return [
      "Week 1: Accumulation — moderate volume, build the base",
      "Week 2: Intensification — heavier loads, fewer reps",
      "Week 3: Realization — peak effort, test your strength",
    ];
  }
  if (totalWeeks === 6) {
    return [
      "Weeks 1–2: Accumulation — high volume, build the base",
      "Weeks 3–4: Intensification — add load, reduce reps",
      "Week 5: Realization — peak effort, heavy work",
      "Week 6: Deload — lower volume, active recovery",
    ];
  }
  if (totalWeeks === 12) {
    return [
      "Weeks 1–4: Accumulation — high volume, build the base",
      "Weeks 5–8: Intensification — add load, reduce reps",
      "Weeks 9–11: Realization — peak effort, heavy work",
      "Week 12: Deload — lower volume, active recovery",
    ];
  }
  return [`${totalWeeks} progressive weeks with built-in deloads`];
}

// ── Day preview ───────────────────────────────────────────────────────────────

function getDayPreviews(plan: CatalogPlan): { day: string; exercises: string[] }[] {
  const dayMap = new Map<string, string[]>();
  for (const ex of plan.exercises) {
    if (ex.week !== "Week 1") continue;
    const day = ex.day || "Day 1";
    if (!dayMap.has(day)) dayMap.set(day, []);
    const arr = dayMap.get(day)!;
    if (arr.length < 3) arr.push(ex.exercise);
  }
  return Array.from(dayMap.entries()).map(([day, exercises]) => ({ day, exercises }));
}

// ── Plan Card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, startSessionFromPlan, getActiveSession, onNeed1RM }: {
  plan: CatalogPlan;
  startSessionFromPlan: ReturnType<typeof useWorkouts>["startSessionFromPlan"];
  getActiveSession: ReturnType<typeof useWorkouts>["getActiveSession"];
  onNeed1RM: (startAnyway: () => void) => void;
}) {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { setPlan, planName: currentPlanName, exercises: currentExercises } = usePlanContext();
  const { profile } = useProfileContext();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Use the actual first day label from Week 1 — handles "Day 1A", "Day 1B", etc.
  const firstDay = plan.exercises.find((e) => e.week === "Week 1")?.day ?? "Day 1";
  const day1Exercises = plan.exercises.filter((e) => e.week === "Week 1" && e.day === firstDay);
  const splitLabel = useMemo(() => getSplitLabel(plan), [plan]);
  const weekStructure = useMemo(() => getWeekStructure(plan), [plan]);
  const dayPreviews = useMemo(() => getDayPreviews(plan), [plan]);
  const whoFor = WHO_ITS_FOR[plan.id] ?? plan.description;
  const isActivePlan = currentPlanName === plan.name && currentExercises.length > 0;

  function handleLoadPlan() {
    if (currentExercises.length > 0) {
      Alert.alert(
        "Replace Plan?",
        `Replace "${currentPlanName}"? Your progress will be reset.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Replace",
            style: "destructive",
            onPress: () => {
              setPlan(plan.name, plan.exercises);
              router.push("/plan");
            },
          },
        ]
      );
      return;
    }
    setPlan(plan.name, plan.exercises);
    router.push("/plan");
  }

  async function handleStartDay1() {
    const active = getActiveSession();
    if (active) {
      Alert.alert(
        "Active Session",
        "You already have an active session. Resume or end it first.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Resume Session", onPress: () => router.push(`/session/${active.id}`) },
        ]
      );
      return;
    }

    async function doStart() {
      setLoading(true);
      try {
        setPlan(plan.name, plan.exercises);
        const id = await startSessionFromPlan(plan.name, "Week 1", firstDay, day1Exercises, profile);
        router.push(`/session/${id}`);
      } catch (e) {
        Alert.alert("Couldn't start session", e instanceof Error ? e.message : "Please try again.");
      } finally {
        setLoading(false);
      }
    }

    function promptOrStart() {
      const m = profile.manual1RM;
      const has1RM = !!(m?.deadlift || m?.squat || m?.bench || m?.ohp);
      if (!has1RM) {
        onNeed1RM(doStart);
        return;
      }
      doStart();
    }

    if (currentExercises.length > 0) {
      Alert.alert(
        "Replace Plan?",
        `Replace "${currentPlanName}"? Your progress will be reset.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Replace & Start", style: "destructive", onPress: promptOrStart },
        ]
      );
      return;
    }

    promptOrStart();
  }

  return (
    <View style={[styles.planCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {/* ── Card Header ── */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.planName, { color: theme.colors.text }]}>{plan.name}</Text>
          <Text style={[styles.splitLabel, { color: theme.colors.muted }]}>{splitLabel}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <DifficultyChip difficulty={plan.difficulty} />
          {isActivePlan && (
            <View style={[styles.chip, { backgroundColor: theme.colors.accent + "22" }]}>
              <Text style={[styles.chipText, { color: theme.colors.accent }]}>Active ✓</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Quick stats row ── */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="calendar-outline" size={14} color="#E07A3F" />
          <Text style={[styles.statText, { color: "#E07A3F" }]}>
            {plan.daysPerWeek} days/week
          </Text>
        </View>
        <View style={styles.statDot} />
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={14} color="#D9A100" />
          <Text style={[styles.statText, { color: "#D9A100" }]}>
            {plan.totalWeeks ?? 12} weeks
          </Text>
        </View>
        <View style={styles.statDot} />
        <View style={styles.statItem}>
          <Ionicons name="barbell-outline" size={14} color="#E63946" />
          <Text style={[styles.statText, { color: "#E63946" }]} numberOfLines={1}>
            {splitLabel}
          </Text>
        </View>
      </View>

      {/* ── Who it's for ── */}
      <Text style={[styles.whoFor, { color: theme.colors.muted }]} numberOfLines={expanded ? undefined : 2}>
        {whoFor}
      </Text>

      {/* ── Expandable details ── */}
      {expanded && (
        <View style={[styles.expandedSection, { borderTopColor: theme.colors.border }]}>
          {/* Block structure */}
          <Text style={[styles.expandLabel, { color: theme.colors.muted }]}>BLOCK STRUCTURE</Text>
          {weekStructure.map((line, i) => (
            <Text key={i} style={[styles.blockLine, { color: theme.colors.text }]}>• {line}</Text>
          ))}

          {/* Sample week — day previews */}
          <Text style={[styles.expandLabel, { color: theme.colors.muted, marginTop: 14 }]}>WEEK 1 SAMPLE</Text>
          {dayPreviews.map(({ day, exercises }) => (
            <View key={day} style={styles.dayPreviewRow}>
              <Text style={[styles.dayLabel, { color: theme.colors.primary }]}>{day}</Text>
              <Text style={[styles.dayExercises, { color: theme.colors.text }]}>
                {exercises.join(" · ")}
                {exercises.length < (plan.exercises.filter(e => e.week === "Week 1" && e.day === day).length)
                  ? " + more"
                  : ""}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Actions ── */}
      <View style={styles.cardActions}>
        <Pressable style={styles.previewToggle} onPress={() => setExpanded(!expanded)}>
          <Text style={[styles.previewToggleText, { color: theme.colors.accent }]}>
            {expanded ? "Collapse" : "See inside"}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={theme.colors.accent}
          />
        </Pressable>
        <View style={styles.actionButtons}>
          <Button label="Set as My Plan" onPress={handleLoadPlan} variant="secondary" small />
          <View style={{ width: 8 }} />
          <Button
            label="Start Day 1"
            onPress={handleStartDay1}
            small
            loading={loading}
          />
        </View>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

const DIFFICULTY_OPTIONS = ["All", "Beginner", "Intermediate", "Advanced"] as const;
const DAYS_OPTIONS = [3, 4, 5, 6] as const;

export default function CatalogScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { startSessionFromPlan, getActiveSession } = useWorkouts();
  const [difficultyFilter, setDifficultyFilter] = useState<string>("All");
  const [daysFilter, setDaysFilter] = useState<number | null>(null);
  const [ormPrompt, setOrmPrompt] = useState<{ startAnyway: () => void } | null>(null);

  const filtered = useMemo(
    () => CATALOG_PLANS.filter(p => {
      if (difficultyFilter !== "All" && p.difficulty !== difficultyFilter) return false;
      if (daysFilter !== null && p.daysPerWeek !== daysFilter) return false;
      return true;
    }),
    [difficultyFilter, daysFilter]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <BackButton />
        <View style={{ flex: 1 }} />
      </View>

      <Text style={[styles.title, { color: theme.colors.text }]}>Workout Plans</Text>
      <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
        Plans range from 3 to 12 weeks with block periodization — volume, intensity, and deload built in.
      </Text>

      {/* ── Filter chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        {DIFFICULTY_OPTIONS.map((d) => {
          const active = difficultyFilter === d;
          return (
            <Pressable
              key={d}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? theme.colors.accent : theme.colors.mutedBg,
                  borderColor: active ? theme.colors.accent : theme.colors.border,
                },
              ]}
              onPress={() => setDifficultyFilter(d)}
            >
              <Text style={[styles.filterChipText, { color: active ? theme.colors.accentText : theme.colors.muted }]}>
                {d}
              </Text>
            </Pressable>
          );
        })}
        <View style={[styles.filterDivider, { backgroundColor: theme.colors.border }]} />
        {DAYS_OPTIONS.map((d) => {
          const active = daysFilter === d;
          return (
            <Pressable
              key={d}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? theme.colors.accent : theme.colors.mutedBg,
                  borderColor: active ? theme.colors.accent : theme.colors.border,
                },
              ]}
              onPress={() => setDaysFilter(active ? null : d)}
            >
              <Text style={[styles.filterChipText, { color: active ? theme.colors.accentText : theme.colors.muted }]}>
                {d}d/wk
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {filtered.length === 0 ? (
          <View style={styles.noResults}>
            <Text style={[styles.noResultsText, { color: theme.colors.muted }]}>No plans match your filters.</Text>
          </View>
        ) : (
          filtered.map((plan) => (
            <PlanCard key={plan.id} plan={plan} startSessionFromPlan={startSessionFromPlan} getActiveSession={getActiveSession} onNeed1RM={(startAnyway) => setOrmPrompt({ startAnyway })} />
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* 1RM setup prompt bottom sheet */}
      <AppBottomSheet
        visible={!!ormPrompt}
        onClose={() => setOrmPrompt(null)}
        snapPoints={["58%"]}
      >
        <View style={ormStyles.container}>
          <LockeMascot size={100} mood="savage" />
          <Text style={[ormStyles.title, { color: theme.colors.text }]}>
            Set Up Your Lifts First
          </Text>
          <Text style={[ormStyles.subtitle, { color: theme.colors.muted }]}>
            Your big 4 lifts aren't configured yet. Adding your 1RM data lets me calculate accurate weights for every exercise.
          </Text>
          <View style={ormStyles.buttons}>
            <Pressable
              style={[ormStyles.optionCard, { backgroundColor: theme.colors.primary + "15", borderColor: theme.colors.primary }]}
              onPress={() => { setOrmPrompt(null); router.push("/orm-test?source=retake"); }}
            >
              <Ionicons name="barbell-outline" size={22} color={theme.colors.primary} />
              <View style={ormStyles.optionText}>
                <Text style={[ormStyles.optionLabel, { color: theme.colors.primary }]}>Take 1RM Test</Text>
                <Text style={[ormStyles.optionHint, { color: theme.colors.muted }]}>Guided protocol, most accurate</Text>
              </View>
            </Pressable>
            <Pressable
              style={[ormStyles.optionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => { setOrmPrompt(null); router.push("/onboarding?retake=1&step=manual"); }}
            >
              <Ionicons name="create-outline" size={22} color={theme.colors.text} />
              <View style={ormStyles.optionText}>
                <Text style={[ormStyles.optionLabel, { color: theme.colors.text }]}>Enter Manually</Text>
                <Text style={[ormStyles.optionHint, { color: theme.colors.muted }]}>Quick if you know your numbers</Text>
              </View>
            </Pressable>
          </View>
          <Pressable
            style={ormStyles.skipBtn}
            onPress={() => {
              const cb = ormPrompt?.startAnyway;
              setOrmPrompt(null);
              cb?.();
            }}
          >
            <Text style={[ormStyles.skipText, { color: theme.colors.muted }]}>Skip for now</Text>
          </Pressable>
        </View>
      </AppBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  list: { paddingBottom: 40 },

  planCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  planName: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  splitLabel: { fontSize: 12, fontWeight: "500" },

  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipText: { fontSize: 11, fontWeight: "700" },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12 },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#888",
    opacity: 0.4,
  },

  whoFor: { fontSize: 13, lineHeight: 19, marginBottom: 12 },

  expandedSection: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginBottom: 12,
  },
  expandLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  blockLine: { fontSize: 13, lineHeight: 20 },
  dayPreviewRow: { marginBottom: 6 },
  dayLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 1 },
  dayExercises: { fontSize: 13, lineHeight: 18 },

  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  previewToggleText: { fontSize: 14, fontWeight: "600" },
  actionButtons: { flexDirection: "row", alignItems: "center" },

  // Filter chips
  filterRow: { flexGrow: 0, flexShrink: 0, marginBottom: 16 },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: "600" },
  filterDivider: { width: 1, alignSelf: "stretch", marginHorizontal: 4, opacity: 0.4 },
  noResults: { paddingVertical: 40, alignItems: "center" },
  noResultsText: { fontSize: 14 },
});

const ormStyles = StyleSheet.create({
  container:   { alignItems: "center", paddingHorizontal: spacing.lg },
  title:       { fontSize: 20, fontWeight: "700", marginTop: 12, textAlign: "center" },
  subtitle:    { fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 6, marginBottom: 20, paddingHorizontal: 8 },
  buttons:     { width: "100%", gap: 10 },
  optionCard:  { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1.5, paddingVertical: 14, paddingHorizontal: 16 },
  optionText:  { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: "700" },
  optionHint:  { fontSize: 12, marginTop: 2 },
  skipBtn:     { marginTop: 14, paddingVertical: 8 },
  skipText:    { fontSize: 14, fontWeight: "600" },
});

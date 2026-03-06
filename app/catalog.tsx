import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  Alert,
  LayoutAnimation,
  UIManager,
  Platform,
} from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
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
import { spacing, radius } from "../lib/theme";
import type { CatalogPlan } from "../lib/types";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
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
  "3d-strength":        "Intermediate lifters who want three focused days built around squat, bench, and deadlift",
  "3d-hypertrophy":     "Anyone training 3 days/week who wants maximum muscle growth with full-body sessions",
  "3d-athletic":        "Beginners who want to build a strong, well-rounded athletic base in three sessions",
  "5d-bro-split":       "Intermediate lifters who love training one muscle group per day with high volume",
  "5d-strength":        "Advanced lifters who want five heavy days focused on the competition lifts plus accessories",
  "5d-body-recomp":     "Intermediate lifters looking to build muscle and lose fat with a balanced 5-day split",
  "5d-peak-week":       "Advanced lifters wanting a 3-week peaking cycle before a meet or max-out day",
  "5d-hypertrophy":     "Intermediate lifters who want dedicated volume for each muscle group across five days",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function getGoalCategory(plan: CatalogPlan): string {
  const g = plan.goal.toLowerCase();
  if (g.includes("strength") || g.includes("power") || g.includes("peak")) return "Strength";
  if (g.includes("hypertrophy") || g.includes("recomp")) return "Hypertrophy";
  if (g.includes("full body") || g.includes("athletic") || g.includes("ppl")) return "Full Body";
  if (g.includes("conditioning") || g.includes("cardio") || g.includes("fat loss")) return "Conditioning";
  if (g.includes("glute") || g.includes("chest") || g.includes("arm") || g.includes("shoulder") ||
      g.includes("core") || g.includes("posterior") || g.includes("squat") || g.includes("deadlift")) return "Body Part";
  return "Full Body";
}

function getRecommendationScore(
  plan: CatalogPlan,
  profile: ReturnType<typeof useProfileContext>["profile"],
  activePlanName: string | null,
  hasExercises: boolean
): number {
  let score = 0;
  if (activePlanName === plan.name && hasExercises) return 1000;
  const m = profile.manual1RM;
  const has1RM = !!(m?.deadlift || m?.squat || m?.bench || m?.ohp);
  if (!has1RM && plan.difficulty === "Beginner") score += 15;
  if (has1RM && plan.difficulty !== "Beginner") score += 5;
  if (!hasExercises) {
    if ((plan.totalWeeks ?? 12) <= 6) score += 5;
    if ((plan.totalWeeks ?? 12) === 3) score += 3;
  }
  if (plan.difficulty === "Intermediate") score += 2;
  return score;
}

// ── Difficulty chip ──────────────────────────────────────────────────────────

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

// ── Plan Card ────────────────────────────────────────────────────────────────

const PlanCard = React.memo(function PlanCard({ plan, startSessionFromPlan, getActiveSession, onNeed1RM, isRecommended, index }: {
  plan: CatalogPlan;
  startSessionFromPlan: ReturnType<typeof useWorkouts>["startSessionFromPlan"];
  getActiveSession: ReturnType<typeof useWorkouts>["getActiveSession"];
  onNeed1RM: (startAnyway: () => void) => void;
  isRecommended?: boolean;
  index: number;
}) {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { setPlan, planName: currentPlanName, exercises: currentExercises } = usePlanContext();
  const { profile } = useProfileContext();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

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
          { text: "Replace", style: "destructive", onPress: () => { setPlan(plan.name, plan.exercises); router.push("/plan"); } },
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
      Alert.alert("Active Session", "You already have an active session. Resume or end it first.", [
        { text: "Cancel", style: "cancel" },
        { text: "Resume Session", onPress: () => router.push(`/session/${active.id}`) },
      ]);
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
      if (!has1RM) { onNeed1RM(doStart); return; }
      doStart();
    }
    if (currentExercises.length > 0) {
      Alert.alert("Replace Plan?", `Replace "${currentPlanName}"? Your progress will be reset.`, [
        { text: "Cancel", style: "cancel" },
        { text: "Replace & Start", style: "destructive", onPress: promptOrStart },
      ]);
      return;
    }
    promptOrStart();
  }

  function toggleExpand() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  }

  // Only animate first 5 cards to avoid blocking the JS thread on mount
  const shouldAnimate = index < 5;
  const entryDelay = Math.min(index * 60, 240);

  const content = (
      <Animated.View style={animStyle}>
        <Pressable
          style={[
            styles.planCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: isActivePlan ? theme.colors.primary + "66" : theme.colors.border,
              borderWidth: isActivePlan ? 1.5 : 1,
            },
          ]}
          onPressIn={() => { scale.value = withSpring(0.98, { damping: 15, stiffness: 400 }); }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
          onPress={toggleExpand}
        >
          {/* ── Header ── */}
          <View style={styles.cardHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.planName, { color: theme.colors.text }]}>{plan.name}</Text>
              <Text style={[styles.splitLabel, { color: theme.colors.muted }]}>{splitLabel}</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <DifficultyChip difficulty={plan.difficulty} />
              {isActivePlan && (
                <View style={[styles.chip, { backgroundColor: theme.colors.primary + "22" }]}>
                  <Text style={[styles.chipText, { color: theme.colors.primary }]}>Active</Text>
                </View>
              )}
              {isRecommended && !isActivePlan && (
                <View style={[styles.chip, { backgroundColor: theme.colors.success + "22" }]}>
                  <Text style={[styles.chipText, { color: theme.colors.success }]}>For You</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Stat pills ── */}
          <View style={styles.statPills}>
            <View style={[styles.statPill, { backgroundColor: theme.colors.mutedBg }]}>
              <Ionicons name="calendar-outline" size={12} color={theme.colors.primary} />
              <Text style={[styles.statPillText, { color: theme.colors.text }]}>
                {plan.daysPerWeek}d/wk
              </Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: theme.colors.mutedBg }]}>
              <Ionicons name="time-outline" size={12} color={theme.colors.primary} />
              <Text style={[styles.statPillText, { color: theme.colors.text }]}>
                {plan.totalWeeks ?? 12} wk
              </Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: theme.colors.mutedBg }]}>
              <Ionicons name="trending-up-outline" size={12} color={theme.colors.primary} />
              <Text style={[styles.statPillText, { color: theme.colors.text }]} numberOfLines={1}>
                {plan.weeklyProgression?.type === "linear" ? "Linear" : "% Based"}
              </Text>
            </View>
          </View>

          {/* ── Description ── */}
          <Text style={[styles.whoFor, { color: theme.colors.muted }]} numberOfLines={expanded ? undefined : 2}>
            {whoFor}
          </Text>

          {/* ── Expanded details ── */}
          {expanded && (
            <View style={[styles.expandedSection, { borderTopColor: theme.colors.border }]}>
              <Text style={[styles.expandLabel, { color: theme.colors.muted }]}>BLOCK STRUCTURE</Text>
              {weekStructure.map((line, i) => (
                <Text key={i} style={[styles.blockLine, { color: theme.colors.text }]}>{line}</Text>
              ))}

              <Text style={[styles.expandLabel, { color: theme.colors.muted, marginTop: 14 }]}>WEEK 1 PREVIEW</Text>
              {dayPreviews.map(({ day, exercises }) => (
                <View key={day} style={styles.dayPreviewRow}>
                  <View style={[styles.dayBadge, { backgroundColor: theme.colors.primary + "18" }]}>
                    <Text style={[styles.dayBadgeText, { color: theme.colors.primary }]}>{day}</Text>
                  </View>
                  <Text style={[styles.dayExercises, { color: theme.colors.text }]} numberOfLines={1}>
                    {exercises.join("  ·  ")}
                    {exercises.length < (plan.exercises.filter(e => e.week === "Week 1" && e.day === day).length)
                      ? "  + more"
                      : ""}
                  </Text>
                </View>
              ))}

              {/* ── Action buttons ── */}
              <View style={styles.actionRow}>
                <Button label="Set as My Plan" onPress={handleLoadPlan} variant="secondary" small />
                <View style={{ width: 8 }} />
                <Button label="Start Day 1" onPress={handleStartDay1} small loading={loading} />
              </View>
            </View>
          )}

          {/* ── Expand indicator ── */}
          {!expanded && (
            <View style={styles.expandHint}>
              <Ionicons name="chevron-down" size={16} color={theme.colors.muted + "88"} />
            </View>
          )}
        </Pressable>
      </Animated.View>
  );

  if (shouldAnimate) {
    return (
      <Animated.View entering={FadeInDown.delay(entryDelay).duration(300).springify().damping(18)}>
        {content}
      </Animated.View>
    );
  }
  return content;
});

// ── Filter chip (reusable) ───────────────────────────────────────────────────

function FilterChip({ label, active, onPress, theme }: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useAppTheme>["theme"];
}) {
  return (
    <Pressable
      style={[
        styles.filterChip,
        {
          backgroundColor: active ? theme.colors.accent : theme.colors.mutedBg,
          borderColor: active ? theme.colors.accent : theme.colors.border,
        },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.filterChipText, { color: active ? theme.colors.accentText : theme.colors.muted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

const planKeyExtractor = (item: CatalogPlan) => item.id;
const DAYS_OPTIONS = [3, 4, 5] as const;
const DURATION_OPTIONS = [3, 6, 12] as const;
const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced"] as const;
const GOAL_OPTIONS = ["Strength", "Hypertrophy", "Full Body", "Body Part", "Conditioning"] as const;

export default function CatalogScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { startSessionFromPlan, getActiveSession } = useWorkouts();
  const { planName: currentPlanName, exercises: currentExercises } = usePlanContext();
  const { profile } = useProfileContext();

  const [daysFilter, setDaysFilter] = useState<number | null>(null);
  const [durationFilter, setDurationFilter] = useState<number | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
  const [goalFilter, setGoalFilter] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [ormPrompt, setOrmPrompt] = useState<{ startAnyway: () => void } | null>(null);

  const filtered = useMemo(
    () => CATALOG_PLANS.filter(p => {
      if (daysFilter !== null && p.daysPerWeek !== daysFilter) return false;
      if (durationFilter !== null && (p.totalWeeks ?? 12) !== durationFilter) return false;
      if (difficultyFilter !== null && p.difficulty !== difficultyFilter) return false;
      if (goalFilter !== null && getGoalCategory(p) !== goalFilter) return false;
      return true;
    }),
    [daysFilter, durationFilter, difficultyFilter, goalFilter]
  );

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const scoreA = getRecommendationScore(a, profile, currentPlanName, currentExercises.length > 0);
      const scoreB = getRecommendationScore(b, profile, currentPlanName, currentExercises.length > 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.name.localeCompare(b.name);
    });
  }, [filtered, profile, currentPlanName, currentExercises.length]);

  const recommendedIds = useMemo(() => {
    const nonActive = sorted.filter(p => !(currentPlanName === p.name && currentExercises.length > 0));
    return new Set(nonActive.slice(0, 3).map(p => p.id));
  }, [sorted, currentPlanName, currentExercises.length]);

  const activeFilterCount = [daysFilter, durationFilter, difficultyFilter, goalFilter].filter(v => v !== null).length;
  const hasAnyFilter = activeFilterCount > 0;

  const clearAll = useCallback(() => {
    setDaysFilter(null);
    setDurationFilter(null);
    setDifficultyFilter(null);
    setGoalFilter(null);
  }, []);

  function toggleFilters() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFiltersOpen(!filtersOpen);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <BackButton />
        <View style={{ flex: 1 }} />
      </View>

      <Text style={[styles.title, { color: theme.colors.text }]}>Workout Plans</Text>
      <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
        Block periodized programmes with built-in deloads. Tap a plan to preview.
      </Text>

      {/* ── Filter bar ── */}
      <View style={[styles.filterBar, { borderColor: theme.colors.border }]}>
        <Pressable style={styles.filterBarLeft} onPress={toggleFilters} hitSlop={4}>
          <Ionicons name="options-outline" size={16} color={theme.colors.text} />
          <Text style={[styles.filterBarText, { color: theme.colors.text }]}>Filters</Text>
          {hasAnyFilter && (
            <View style={[styles.filterBadge, { backgroundColor: theme.colors.accent }]}>
              <Text style={[styles.filterBadgeText, { color: theme.colors.accentText }]}>{activeFilterCount}</Text>
            </View>
          )}
          <Ionicons
            name={filtersOpen ? "chevron-up" : "chevron-down"}
            size={14}
            color={theme.colors.muted}
            style={{ marginLeft: 2 }}
          />
        </Pressable>
        <View style={styles.filterBarRight}>
          <Text style={[styles.resultCount, { color: theme.colors.muted }]}>
            {hasAnyFilter ? `${filtered.length} match` : `${CATALOG_PLANS.length} plans`}
          </Text>
          {hasAnyFilter && (
            <Pressable onPress={clearAll} hitSlop={8} style={{ marginLeft: 10 }}>
              <Text style={[styles.clearAll, { color: theme.colors.accent }]}>Clear</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Expandable filter grid ── */}
      {filtersOpen && (
        <View style={styles.filterGrid}>
          {/* Days */}
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: theme.colors.muted }]}>DAYS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
              {DAYS_OPTIONS.map(d => (
                <FilterChip key={d} label={`${d}d`} active={daysFilter === d} onPress={() => setDaysFilter(daysFilter === d ? null : d)} theme={theme} />
              ))}
            </ScrollView>
          </View>
          {/* Duration */}
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: theme.colors.muted }]}>WKS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
              {DURATION_OPTIONS.map(w => (
                <FilterChip key={w} label={`${w} wk`} active={durationFilter === w} onPress={() => setDurationFilter(durationFilter === w ? null : w)} theme={theme} />
              ))}
            </ScrollView>
          </View>
          {/* Level */}
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: theme.colors.muted }]}>LEVEL</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
              {LEVEL_OPTIONS.map(l => (
                <FilterChip key={l} label={l} active={difficultyFilter === l} onPress={() => setDifficultyFilter(difficultyFilter === l ? null : l)} theme={theme} />
              ))}
            </ScrollView>
          </View>
          {/* Goal */}
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: theme.colors.muted }]}>GOAL</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
              {GOAL_OPTIONS.map(g => (
                <FilterChip key={g} label={g} active={goalFilter === g} onPress={() => setGoalFilter(goalFilter === g ? null : g)} theme={theme} />
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* ── Plan list ── */}
      {sorted.length === 0 ? (
        <View style={styles.noResults}>
          <LockeMascot size={80} mood="neutral" />
          <Text style={[styles.noResultsTitle, { color: theme.colors.text }]}>No plans match</Text>
          <Text style={[styles.noResultsText, { color: theme.colors.muted }]}>
            Try loosening your filters or tap Clear to see all plans.
          </Text>
          <View style={{ marginTop: 12 }}>
            <Button label="Clear Filters" onPress={clearAll} variant="secondary" small />
          </View>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={planKeyExtractor}
          renderItem={({ item, index }) => (
            <PlanCard
              plan={item}
              startSessionFromPlan={startSessionFromPlan}
              getActiveSession={getActiveSession}
              onNeed1RM={(startAnyway) => setOrmPrompt({ startAnyway })}
              isRecommended={recommendedIds.has(item.id)}
              index={index}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          initialNumToRender={5}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews={Platform.OS === "android"}
        />
      )}

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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  list: { paddingBottom: 40 },

  // Filter bar
  filterBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 10,
  },
  filterBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterBarText: { fontSize: 14, fontWeight: "600" },
  filterBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: { fontSize: 10, fontWeight: "700" },
  filterBarRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  resultCount: { fontSize: 13, fontWeight: "500" },
  clearAll: { fontSize: 13, fontWeight: "600" },

  // Filter grid
  filterGrid: {
    gap: 10,
    paddingBottom: 14,
    marginBottom: 6,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    width: 42,
    flexShrink: 0,
  },
  filterChips: {
    gap: 6,
    paddingRight: 8,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 12, fontWeight: "600" },

  // Plan card
  planCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  planName: { fontSize: 17, fontWeight: "700", marginBottom: 2 },
  splitLabel: { fontSize: 12, fontWeight: "500" },

  chip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  chipText: { fontSize: 10, fontWeight: "700" },

  // Stat pills
  statPills: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statPillText: { fontSize: 11, fontWeight: "600" },

  // Description
  whoFor: { fontSize: 13, lineHeight: 18, marginBottom: 4 },

  // Expand hint
  expandHint: {
    alignItems: "center",
    paddingTop: 4,
  },

  // Expanded section
  expandedSection: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 8,
  },
  expandLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  blockLine: { fontSize: 13, lineHeight: 20 },
  dayPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  dayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dayBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  dayExercises: { fontSize: 13, lineHeight: 18, flex: 1 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 14,
  },

  // No results
  noResults: { paddingVertical: 48, alignItems: "center" },
  noResultsTitle: { fontSize: 17, fontWeight: "700", marginTop: 12, marginBottom: 4 },
  noResultsText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
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

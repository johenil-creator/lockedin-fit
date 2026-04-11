/**
 * Weekly Plan — app/meals/weekly-plan.tsx
 *
 * Shows the 7-day meal plan for the selected week and tier.
 * Collapsible day rows with MealSlotRow components.
 */
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import { MealSlotRow } from "../../components/meals";
import { AppBottomSheet } from "../../components/AppBottomSheet";
import { useMealPlan } from "../../hooks/useMealPlan";
import { getDevNow } from "../../lib/devDateOverride";
import { recipeMap, getRecipesBySlot } from "../../src/data/recipeCatalog";
import type { CuisineTier, MealSlot, DailyMealPlan, Recipe } from "../../src/data/mealTypes";

// ── Constants ───────────────────────────────────────────────────────────────
const TIER_ACCENT: Record<CuisineTier, string> = {
  scavenge: "#1D9E75",
  hunt: "#378ADD",
  apex_feast: "#BA7517",
};

const TIER_DESCRIPTIONS: Record<CuisineTier, string> = {
  scavenge: "Everyday global comfort food",
  hunt: "Restaurant-quality dishes at home",
  apex_feast: "Fine dining — elevated technique",
};

const TIER_LABELS: Record<CuisineTier, string> = {
  scavenge: "Scavenge",
  hunt: "Hunt",
  apex_feast: "Apex Feast",
};

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack1", "snack2"];

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack1: "Snack",
  snack2: "Snack",
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function getWeekLabel(offset: number): string {
  if (offset === 0) return "This Week";
  if (offset === 1) return "Next Week";
  if (offset === -1) return "Last Week";
  if (offset > 0) return `+${offset} wks`;
  return `${offset} wks`;
}

function computeDayCalories(day: DailyMealPlan | undefined): number {
  if (!day?.meals) return 0;
  return day.meals.reduce((sum, m) => {
    const recipe = recipeMap.get(m.recipeId);
    return sum + (recipe?.macros.calories ?? 0);
  }, 0);
}

function getTodayDayIndex(): number {
  const jsDay = (__DEV__ ? getDevNow() : new Date()).getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

// ── Section entrance animation helper ───────────────────────────────────────
const sectionEnter = (delay: number) =>
  FadeInDown.delay(delay).duration(350).damping(20).stiffness(150);

// ── Collapsible Day Row ─────────────────────────────────────────────────────
type SwapTarget = {
  dayIndex: number;
  slot: MealSlot;
  currentRecipeId: string;
};

type DayRowProps = {
  dayIndex: number;
  dayPlan: DailyMealPlan | undefined;
  defaultExpanded: boolean;
  tierColor: string;
  maxCalories: number;
  isToday: boolean;
  onSwapOpen: (target: SwapTarget) => void;
};

const DayRow = React.memo(function DayRow({
  dayIndex,
  dayPlan,
  defaultExpanded,
  tierColor,
  maxCalories,
  isToday,
  onSwapOpen,
}: DayRowProps) {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const calories = useMemo(() => computeDayCalories(dayPlan), [dayPlan]);
  const progress = maxCalories > 0 ? Math.min(calories / maxCalories, 1) : 0;

  const chevronRotation = useSharedValue(defaultExpanded ? 1 : 0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value * 90}deg` }],
  }));

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => {
      chevronRotation.value = withTiming(prev ? 0 : 1, { duration: 200 });
      return !prev;
    });
  }, [chevronRotation]);

  const handleSlotPress = useCallback(
    (recipeId: string) => {
      router.push({ pathname: "/meals/recipe", params: { recipeId } });
    },
    [router],
  );

  const mealCount = dayPlan?.meals?.length ?? 0;

  return (
    <View
      style={[
        styles.dayContainer,
        {
          backgroundColor: theme.colors.surface,
          borderColor: isToday ? tierColor + "60" : theme.colors.border,
        },
      ]}
    >
      {/* Today accent bar */}
      {isToday && <View style={[styles.dayAccentBar, { backgroundColor: tierColor }]} />}

      {/* Day header */}
      <Pressable onPress={toggleExpand} style={styles.dayHeader}>
        <View style={styles.dayHeaderLeft}>
          <View>
            <View style={styles.dayNameRow}>
              <Text style={[styles.dayName, { color: isToday ? tierColor : theme.colors.text }]}>
                {DAY_NAMES[dayIndex]}
              </Text>
              {isToday && (
                <View style={[styles.todayBadge, { backgroundColor: tierColor + "20" }]}>
                  <Text style={[styles.todayBadgeText, { color: tierColor }]}>TODAY</Text>
                </View>
              )}
            </View>
            <Text style={[styles.dayMeta, { color: theme.colors.muted }]}>
              {calories} cal · {mealCount} meals
            </Text>
          </View>
        </View>

        <View style={styles.dayHeaderRight}>
          {/* Mini progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: theme.colors.mutedBg }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%` as any, backgroundColor: tierColor },
              ]}
            />
          </View>

          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
          </Animated.View>
        </View>
      </Pressable>

      {/* Expanded meal slots */}
      {expanded && (
        <View style={styles.slotsContainer}>
          {MEAL_SLOTS.map((slot) => {
            const assignment = dayPlan?.meals.find((m) => m.slot === slot);
            if (!assignment) {
              return (
                <View
                  key={slot}
                  style={[
                    styles.emptySlot,
                    { backgroundColor: theme.colors.mutedBg, borderColor: theme.colors.muted + "40" },
                  ]}
                >
                  <Text style={[styles.emptySlotText, { color: theme.colors.muted }]}>
                    {SLOT_LABELS[slot]} · Not planned
                  </Text>
                  <Ionicons name="add-circle-outline" size={18} color={theme.colors.muted} />
                </View>
              );
            }
            return (
              <MealSlotRow
                key={slot}
                slot={slot}
                recipeId={assignment.recipeId}
                onPress={() => handleSlotPress(assignment.recipeId)}
                onLongPress={() =>
                  onSwapOpen({ dayIndex, slot, currentRecipeId: assignment.recipeId })
                }
              />
            );
          })}
        </View>
      )}
    </View>
  );
});

// ── Main Component ──────────────────────────────────────────────────────────
export default function WeeklyPlan() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { plan, prefs, weekOffset, setWeekOffset, swapSlot, reload } = useMealPlan();

  // Reload data when screen regains focus (e.g. after settings change)
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const tier = prefs?.tier ?? "scavenge";
  const tierColor = TIER_ACCENT[tier];
  const tierLabel = TIER_LABELS[tier];
  const tierDesc = TIER_DESCRIPTIONS[tier];

  const todayIndex = useMemo(() => getTodayDayIndex(), []);

  // Compute max daily calories for the progress bar scale
  const maxCalories = useMemo(() => {
    if (!plan?.days) return 2500; // fallback
    let max = 0;
    for (const day of plan.days) {
      const cal = computeDayCalories(day);
      if (cal > max) max = cal;
    }
    return max || 2500;
  }, [plan]);

  // ── Swap sheet state ──────────────────────────────────────────────
  const [swapTarget, setSwapTarget] = useState<SwapTarget | null>(null);
  const swapSheetOpen = swapTarget !== null;

  const handleSwapOpen = useCallback((target: SwapTarget) => {
    setSwapTarget(target);
  }, []);

  const handleSwapClose = useCallback(() => {
    setSwapTarget(null);
  }, []);

  const handleSwapSelect = useCallback(
    (newRecipeId: string) => {
      if (!swapTarget) return;
      swapSlot(swapTarget.dayIndex, swapTarget.slot, newRecipeId);
      setSwapTarget(null);
    },
    [swapTarget, swapSlot],
  );

  // Alternative recipes for the swap sheet (same tier + slot, excluding current)
  const swapAlternatives = useMemo<Recipe[]>(() => {
    if (!swapTarget) return [];
    return getRecipesBySlot(tier, swapTarget.slot).filter(
      (r) => r.id !== swapTarget.currentRecipeId,
    );
  }, [swapTarget, tier]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
          <Text
            style={[
              typography.screenTitle,
              { color: theme.colors.text, flex: 1 },
            ]}
          >
            Weekly Menu
          </Text>
        </Animated.View>

        {/* ── Week Navigation ─────────────────────────────────────────── */}
        <Animated.View entering={sectionEnter(80)} style={styles.weekNav}>
          <Pressable
            onPress={() => setWeekOffset(weekOffset - 1)}
            hitSlop={12}
            style={[styles.weekArrow, { backgroundColor: theme.colors.mutedBg }]}
          >
            <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
          </Pressable>

          <View style={[styles.weekLabelPill, { backgroundColor: theme.colors.mutedBg }]}>
            <Ionicons name="calendar-outline" size={14} color={theme.colors.muted} />
            <Text style={[styles.weekLabelText, { color: theme.colors.text }]}>
              {getWeekLabel(weekOffset)}
            </Text>
          </View>

          <Pressable
            onPress={() => setWeekOffset(weekOffset + 1)}
            hitSlop={12}
            style={[styles.weekArrow, { backgroundColor: theme.colors.mutedBg }]}
          >
            <Ionicons name="chevron-forward" size={18} color={theme.colors.text} />
          </Pressable>
        </Animated.View>

        {/* ── Tier Banner ─────────────────────────────────────────────── */}
        <Animated.View entering={sectionEnter(160)}>
          <View
            style={[
              styles.tierBanner,
              { backgroundColor: tierColor + "18", borderColor: tierColor + "40" },
            ]}
          >
            <Text style={[typography.subheading, { color: tierColor }]}>
              {tierLabel}
            </Text>
            <Text
              style={[
                typography.small,
                { color: tierColor, opacity: 0.8, marginTop: 2 },
              ]}
            >
              {tierDesc}
            </Text>
          </View>
        </Animated.View>

        {/* ── Day Sections ────────────────────────────────────────────── */}
        {DAY_NAMES.map((_, i) => {
          const startDay = prefs?.startDayIndex ?? 0;
          // For the current week, skip days before the start day
          if (weekOffset === 0 && i < startDay) return null;
          const dayPlan = plan?.days?.find((d) => d.dayIndex === i);
          return (
            <Animated.View key={i} entering={sectionEnter(240 + i * 60)}>
              <DayRow
                dayIndex={i}
                dayPlan={dayPlan}
                defaultExpanded={weekOffset === 0 && i === todayIndex}
                tierColor={tierColor}
                maxCalories={maxCalories}
                isToday={weekOffset === 0 && i === todayIndex}
                onSwapOpen={handleSwapOpen}
              />
            </Animated.View>
          );
        })}
      </ScrollView>

      {/* ── Swap Meal Bottom Sheet ─────────────────────────────────── */}
      <AppBottomSheet
        visible={swapSheetOpen}
        onClose={handleSwapClose}
        snapPoints={["60%"]}
        scrollable
      >
        <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
          Swap{" "}
          {swapTarget
            ? SLOT_LABELS[swapTarget.slot]
            : "Meal"}
        </Text>
        <Text style={[typography.caption, { color: theme.colors.muted, marginBottom: spacing.md }]}>
          Long-press any meal to swap it
        </Text>

        {swapAlternatives.length === 0 ? (
          <Text style={[typography.body, { color: theme.colors.muted, textAlign: "center", marginTop: spacing.lg }]}>
            No alternatives available
          </Text>
        ) : (
          swapAlternatives.map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.swapRow,
                {
                  backgroundColor: theme.colors.mutedBg,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => handleSwapSelect(item.id)}
            >
              <Text style={styles.swapFlag}>{item.flag}</Text>
              <View style={styles.swapInfo}>
                <Text
                  style={[styles.swapName, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <View style={styles.swapMeta}>
                  <Text style={[typography.caption, { color: theme.colors.muted }]}>
                    {item.macros.calories} cal
                  </Text>
                  <View
                    style={[
                      styles.cuisineBadge,
                      { backgroundColor: tierColor + "20" },
                    ]}
                  >
                    <Text
                      style={[styles.cuisineBadgeText, { color: tierColor }]}
                      numberOfLines={1}
                    >
                      {item.cuisineBadge}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons name="swap-horizontal" size={18} color={theme.colors.muted} />
            </Pressable>
          ))
        )}
      </AppBottomSheet>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  backBtn: {
    marginRight: spacing.sm,
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  weekArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  weekLabelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  weekLabelText: {
    fontSize: typography.body.fontSize,
    fontWeight: "600",
  },
  tierBanner: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  dayContainer: {
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm + 2,
    overflow: "hidden",
  },
  dayAccentBar: {
    height: 3,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  dayHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dayNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dayName: {
    fontSize: typography.subheading.fontSize,
    fontWeight: "700",
  },
  todayBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  todayBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  dayMeta: {
    fontSize: typography.caption.fontSize,
    marginTop: 2,
  },
  dayHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  progressTrack: {
    width: 56,
    height: 5,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.full,
  },
  slotsContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  emptySlot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    marginBottom: spacing.xs,
  },
  emptySlotText: {
    fontSize: typography.body.fontSize,
    fontWeight: "500",
  },
  swapRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  swapFlag: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  swapInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  swapName: {
    fontSize: typography.body.fontSize,
    fontWeight: "600",
  },
  swapMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 2,
  },
  cuisineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  cuisineBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});

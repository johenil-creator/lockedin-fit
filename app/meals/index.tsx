/**
 * Fuel Hub — app/meals/index.tsx
 *
 * Main entry point for the meal planner feature.
 * Gates on setup completion, then shows today's meals as primary content.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import { LockeMascot } from "../../components/Locke/LockeMascot";
import { MealSlotRow } from "../../components/meals";
import { useMealPlan } from "../../hooks/useMealPlan";
import { useFoodLog } from "../../hooks/useFoodLog";
import { recipeMap, getRecipesBySlot } from "../../src/data/recipeCatalog";
import { getWeekKey } from "../../lib/mealService";
import { AppBottomSheet } from "../../components/AppBottomSheet";
import type { Recipe } from "../../src/data/mealTypes";
import { getDevNow, shiftDevDate, resetDevDate, getDevOffset } from "../../lib/devDateOverride";
import type { CuisineTier, MealSlot } from "../../src/data/mealTypes";
import { useInterstitialAd } from "../../hooks/useInterstitialAd";

// ── Tier accent colors ──────────────────────────────────────────────────────
const TIER_ACCENT: Record<CuisineTier, string> = {
  scavenge: "#1D9E75",
  hunt: "#378ADD",
  apex_feast: "#BA7517",
};

// ── Day names ───────────────────────────────────────────────────────────────
const DAY_NAMES_FULL = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// ── Meal slots in display order ─────────────────────────────────────────────
const SLOTS: MealSlot[] = ["breakfast", "snack1", "lunch", "snack2", "dinner"];

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack1: "Snack 1",
  snack2: "Snack 2",
};

// ── Today's date string (YYYY-MM-DD) ────────────────────────────────────────
function todayStr(): string {
  const d = __DEV__ ? getDevNow() : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── Day index helpers ────────────────────────────────────────────────────────
function todayDayIdx(): number {
  const d = (__DEV__ ? getDevNow() : new Date()).getDay();
  return d === 0 ? 6 : d - 1;
}

function dayLabel(idx: number): string | null {
  const today = todayDayIdx();
  if (idx === today) return "Today";
  if (idx === (today + 1) % 7) return "Tomorrow";
  return null;
}

// ── Section entrance animation helper ───────────────────────────────────────
const sectionEnter = (delay: number) =>
  FadeInDown.delay(delay).duration(350).damping(20).stiffness(150);

// ── Quick action data ───────────────────────────────────────────────────────
type QuickAction = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  { key: "diary", icon: "journal-outline", label: "Log Meal", route: "/meals/diary" },
  { key: "grocery", icon: "cart-outline", label: "Grocery", route: "/meals/grocery" },
  { key: "prep", icon: "restaurant-outline", label: "Prep Day", route: "/meals/prep" },
  { key: "recipes", icon: "book-outline", label: "Recipes", route: "/meals/recipes" },
];

// ── Component ───────────────────────────────────────────────────────────────
export default function FuelHub() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { prefs, plan, loading, macroTargets, reload, setStartDay, swapSlot } = useMealPlan();
  const [showDayPicker, setShowDayPicker] = useState(false);

  // Glow pulse behind mascot
  const glowOpacity = useSharedValue(0.15);
  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.15, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  const { isSlotLogged, reload: reloadLog } = useFoodLog();
  const { show: showInterstitial } = useInterstitialAd();
  const adShownTodayRef = useRef<string | null>(null);

  // ── Dev time-travel state ───────────────────────────────────────────
  const [devOpen, setDevOpen] = useState(false);
  const [devKey, setDevKey] = useState(0);

  const devTravel = useCallback(
    (days: number) => {
      shiftDevDate(days);
      setDevKey((k) => k + 1);
      reload();
    },
    [reload],
  );

  const devReset = useCallback(() => {
    resetDevDate();
    setDevKey((k) => k + 1);
    reload();
  }, [reload]);

  // ── Reload data when screen regains focus (e.g. after settings change / logging)
  useFocusEffect(
    useCallback(() => {
      reload();
      reloadLog();
    }, [reload, reloadLog])
  );

  // ── Setup gate ────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    if (!prefs.setupComplete) {
      router.replace("/meals/setup");
    }
  }, [loading, prefs.setupComplete]);

  // ── Derived values (hooks must always run — no early return above) ──
  const activeTier = prefs.tier ?? "scavenge";
  const tierColor = TIER_ACCENT[activeTier];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const today = useMemo(() => todayStr(), [devKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const todayIdx = useMemo(() => todayDayIdx(), [devKey]);
  const todayDayName = DAY_NAMES_FULL[todayIdx];
  const startDay = prefs.startDayIndex ?? 0;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const currentWeekKey = useMemo(() => getWeekKey(0), [devKey]);
  const planNotStarted =
    plan.weekKey > currentWeekKey || (plan.weekKey === currentWeekKey && todayIdx < startDay);

  // Find today's plan day
  const todayPlan = planNotStarted ? undefined : plan.days.find((d) => d.dayIndex === todayIdx);

  // ── Show interstitial ad when dinner is logged for today ──────────────
  const dinnerLogged = isSlotLogged(today, "dinner");

  useEffect(() => {
    if (dinnerLogged && adShownTodayRef.current !== today) {
      adShownTodayRef.current = today;
      showInterstitial();
    }
  }, [dinnerLogged, today, showInterstitial]);

  // Total calories for today's planned meals
  const todayCalories = useMemo(() => {
    if (!todayPlan) return 0;
    return todayPlan.meals.reduce((sum, m) => {
      const recipe = recipeMap.get(m.recipeId);
      return sum + (recipe?.macros.calories ?? 0);
    }, 0);
  }, [todayPlan]);

  // Build a lookup for today's slot → recipeId
  const slotRecipeMap = useMemo(() => {
    const map: Partial<Record<MealSlot, string>> = {};
    if (todayPlan) {
      for (const m of todayPlan.meals) {
        map[m.slot] = m.recipeId;
      }
    }
    return map;
  }, [todayPlan]);

  // Weekly total calories (only from start day onward)
  const weekTotalCal = useMemo(() => {
    return plan.days
      .filter((d) => d.dayIndex >= startDay)
      .reduce((total, day) => {
        return total + day.meals.reduce((sum, m) => {
          const recipe = recipeMap.get(m.recipeId);
          return sum + (recipe?.macros.calories ?? 0);
        }, 0);
      }, 0);
  }, [plan.days, startDay]);

  // ── Compute days until plan starts ─────────────────────────────────
  const daysUntilStart = useMemo(() => {
    if (!planNotStarted) return 0;
    if (startDay > todayIdx) return startDay - todayIdx;
    return 7 - todayIdx + startDay; // wraps to next week
  }, [planNotStarted, startDay, todayIdx]);

  // ── Swap sheet state ──────────────────────────────────────────────
  const [swapTarget, setSwapTarget] = useState<{ slot: MealSlot; currentRecipeId: string } | null>(null);
  const swapSheetOpen = swapTarget !== null;

  const handleSwapOpen = useCallback((slot: MealSlot, currentRecipeId: string) => {
    setSwapTarget({ slot, currentRecipeId });
  }, []);

  const handleSwapClose = useCallback(() => {
    setSwapTarget(null);
  }, []);

  const handleSwapSelect = useCallback(
    (newRecipeId: string) => {
      if (!swapTarget) return;
      swapSlot(todayIdx, swapTarget.slot, newRecipeId);
      setSwapTarget(null);
    },
    [swapTarget, swapSlot, todayIdx],
  );

  const swapAlternatives = useMemo<Recipe[]>(() => {
    if (!swapTarget) return [];
    return getRecipesBySlot(activeTier, swapTarget.slot).filter(
      (r) => r.id !== swapTarget.currentRecipeId,
    );
  }, [swapTarget, activeTier]);

  // ── Loading / setup gate render ─────────────────────────────────────
  if (loading || !prefs.setupComplete) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.bg }} />;
  }

  // ── Plan hasn't started yet — full-screen waiting state ────────────
  if (planNotStarted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + spacing.sm,
              paddingBottom: insets.bottom + spacing.xl,
              flexGrow: 1,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
            </Pressable>
            <Text style={[typography.screenTitle, { color: theme.colors.text, flex: 1 }]}>
              {activeTier === "apex_feast" ? "Apex Feast" : activeTier === "hunt" ? "Hunt" : "Scavenge"} Fuel Plan
            </Text>
            <Pressable
              onPress={() => router.push("/meals/preferences" as any)}
              hitSlop={12}
              style={[styles.switchPlanBtn, { borderColor: theme.colors.border }]}
            >
              <Ionicons name="create-outline" size={14} color={theme.colors.muted} />
              <Text style={[styles.switchPlanText, { color: theme.colors.muted }]}>
                Edit Plan
              </Text>
            </Pressable>
          </Animated.View>
          {/* Mascot + glow */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(450)}
            style={styles.waitingMascot}
          >
            <Animated.View
              style={[
                styles.mascotGlow,
                { backgroundColor: tierColor },
                glowStyle,
              ]}
            />
            <LockeMascot size={180} mood="analytical" />
          </Animated.View>

          {/* Locke quote */}
          <Animated.View
            entering={FadeInDown.delay(180).duration(350)}
            style={styles.waitingCenter}
          >
            <View style={[styles.speechBubble, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.speechText, { color: theme.colors.text }]}>
                Prep smart. Eat clean. Dominate.
              </Text>
            </View>
            <View style={[styles.speechTail, { borderTopColor: theme.colors.surface }]} />
          </Animated.View>

          {/* Countdown badge */}
          <Animated.View
            entering={FadeInDown.delay(250).duration(400)}
            style={styles.waitingCenter}
          >
            <View style={[styles.countdownOuter, { borderColor: tierColor + "20" }]}>
              <View style={[styles.countdownBadge, { backgroundColor: tierColor + "18", borderColor: tierColor + "40" }]}>
                <Text style={[styles.countdownNumber, { color: tierColor }]}>
                  {daysUntilStart}
                </Text>
                <Text style={[styles.countdownLabel, { color: tierColor }]}>
                  {daysUntilStart === 1 ? "day away" : "days away"}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Heading + subtitle */}
          <Animated.View
            entering={FadeInDown.delay(350).duration(400)}
            style={styles.waitingCenter}
          >
            <Text style={[styles.launchEyebrow, { color: tierColor }]}>
              LAUNCHING {DAY_NAMES_FULL[startDay].toUpperCase()}
            </Text>
            <Text style={[styles.heroHeading, { color: theme.colors.text }]}>
              Your fuel plan is ready
            </Text>
            <Text style={[styles.heroSubtitle, { color: theme.colors.muted }]}>
              Use this time to prep and stock up.
            </Text>
          </Animated.View>

          {/* While you wait — section label */}
          <Animated.View
            entering={FadeInDown.delay(420).duration(350)}
            style={styles.sectionEyebrow}
          >
            <View style={[styles.eyebrowLine, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.eyebrowText, { color: theme.colors.muted }]}>
              WHILE YOU WAIT
            </Text>
            <View style={[styles.eyebrowLine, { backgroundColor: theme.colors.border }]} />
          </Animated.View>

          {/* Quick action cards */}
          <View style={styles.waitingActions}>
            <Animated.View entering={FadeInDown.delay(450).duration(400)}>
              <Pressable
                onPress={() => router.push("/meals/grocery" as any)}
              style={[
                styles.waitingActionCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={[styles.actionAccentBar, { backgroundColor: tierColor }]} />
              <View style={[styles.waitingActionIcon, { backgroundColor: tierColor + "18" }]}>
                <Ionicons name="cart-outline" size={22} color={tierColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.subheading, { color: theme.colors.text }]}>
                  Grocery List
                </Text>
                <Text style={[typography.small, { color: theme.colors.muted }]}>
                  See what you need to buy
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
            </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(530).duration(400)}>
              <Pressable
                onPress={() => router.push("/meals/prep" as any)}
              style={[
                styles.waitingActionCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={[styles.actionAccentBar, { backgroundColor: tierColor }]} />
              <View style={[styles.waitingActionIcon, { backgroundColor: tierColor + "18" }]}>
                <Ionicons name="restaurant-outline" size={22} color={tierColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.subheading, { color: theme.colors.text }]}>
                  Prep Day
                </Text>
                <Text style={[typography.small, { color: theme.colors.muted }]}>
                  Batch cook to save time
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
            </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(610).duration(400)}>
              <Pressable
                onPress={() => router.push("/meals/weekly-plan" as any)}
              style={[
                styles.waitingActionCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={[styles.actionAccentBar, { backgroundColor: tierColor }]} />
              <View style={[styles.waitingActionIcon, { backgroundColor: tierColor + "18" }]}>
                <Ionicons name="calendar-outline" size={22} color={tierColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.subheading, { color: theme.colors.text }]}>
                  Preview Week
                </Text>
                <Text style={[typography.small, { color: theme.colors.muted }]}>
                  See all meals for the week ahead
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
            </Pressable>
            </Animated.View>
          </View>

          {/* Change start day */}
          <Animated.View
            entering={FadeInDown.delay(720).duration(400)}
            style={styles.waitingCenter}
          >
            <Pressable
              onPress={() => setShowDayPicker(true)}
              style={[
                styles.changeBtn,
                {
                  backgroundColor: theme.colors.primary + "12",
                  borderColor: theme.colors.primary + "30",
                },
              ]}
            >
              <Ionicons name="swap-horizontal-outline" size={15} color={theme.colors.primary} />
              <Text style={[styles.changeBtnText, { color: theme.colors.primary }]}>
                Change start day
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>

        {/* Start Day Picker Modal */}
        <Modal visible={showDayPicker} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setShowDayPicker(false)}>
            <Pressable style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]}>
              {/* Modal header */}
              <View style={styles.modalHeader}>
                <Ionicons name="calendar-outline" size={20} color={tierColor} />
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  Pick your start day
                </Text>
                <Pressable onPress={() => setShowDayPicker(false)} hitSlop={12}>
                  <Ionicons name="close" size={22} color={theme.colors.muted} />
                </Pressable>
              </View>

              {DAY_NAMES_FULL.map((name, i) => {
                const tag = dayLabel(i);
                const isSelected = i === startDay;
                return (
                  <Pressable
                    key={i}
                    onPress={() => {
                      setStartDay(i);
                      setShowDayPicker(false);
                    }}
                    style={[
                      styles.dayOption,
                      {
                        backgroundColor: isSelected ? tierColor + "18" : "transparent",
                        borderColor: isSelected ? tierColor + "40" : theme.colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.dayOptionText, { color: isSelected ? tierColor : theme.colors.text }]}>
                      {name}
                    </Text>
                    {tag && (
                      <View style={[styles.dayTag, { backgroundColor: tierColor + "18" }]}>
                        <Text style={[styles.dayTagText, { color: tierColor }]}>
                          {tag}
                        </Text>
                      </View>
                    )}
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={tierColor} />
                    )}
                  </Pressable>
                );
              })}
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── Dev Time-Travel Panel ──────────────────────────────────── */}
        {__DEV__ && (
          <>
            <Pressable
              onPress={() => setDevOpen((o) => !o)}
              style={styles.devFab}
            >
              <Ionicons name="time-outline" size={20} color="#fff" />
            </Pressable>
            {devOpen && (
              <View style={styles.devPanel}>
                <Text style={styles.devTitle}>
                  Time Travel {getDevOffset() !== 0 ? `(${getDevOffset() > 0 ? "+" : ""}${getDevOffset()}d)` : ""}
                </Text>
                <Text style={styles.devDate}>
                  Simulated: {getDevNow().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </Text>
                <Text style={styles.devDate}>
                  Week: {currentWeekKey}
                </Text>
                <View style={styles.devRow}>
                  <Pressable onPress={() => devTravel(-7)} style={styles.devBtn}>
                    <Text style={styles.devBtnText}>-1w</Text>
                  </Pressable>
                  <Pressable onPress={() => devTravel(-1)} style={styles.devBtn}>
                    <Text style={styles.devBtnText}>-1d</Text>
                  </Pressable>
                  <Pressable onPress={devReset} style={[styles.devBtn, { backgroundColor: "#c62828" }]}>
                    <Text style={styles.devBtnText}>Reset</Text>
                  </Pressable>
                  <Pressable onPress={() => devTravel(1)} style={styles.devBtn}>
                    <Text style={styles.devBtnText}>+1d</Text>
                  </Pressable>
                  <Pressable onPress={() => devTravel(7)} style={styles.devBtn}>
                    <Text style={styles.devBtnText}>+1w</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + spacing.xl,
          },
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
            <Ionicons
              name="chevron-back"
              size={24}
              color={theme.colors.text}
            />
          </Pressable>

          <Text
            style={[
              typography.screenTitle,
              { color: theme.colors.text, flex: 1 },
            ]}
          >
            {activeTier === "apex_feast" ? "Apex Feast" : activeTier === "hunt" ? "Hunt" : "Scavenge"} Fuel Plan
          </Text>


          <Pressable
            onPress={() => router.push("/meals/preferences" as any)}
            hitSlop={12}
            style={[styles.switchPlanBtn, { borderColor: theme.colors.border }]}
          >
            <Ionicons name="create-outline" size={14} color={theme.colors.muted} />
            <Text style={[styles.switchPlanText, { color: theme.colors.muted }]}>
              Edit Plan
            </Text>
          </Pressable>
        </Animated.View>

        {/* ── Today Content ─────────────────────────────────────────── */}
            {/* ── Today's Meals ───────────────────────────────────────── */}
            <View>
              <View style={styles.sectionHeader}>
                <Text style={[typography.subheading, { color: theme.colors.text }]}>
                  Today's Menu
                </Text>
                <Text style={[typography.small, { color: theme.colors.muted }]}>
                  {todayDayName} {"\u00B7"} {todayCalories} cal
                </Text>
              </View>
              <View style={styles.swapHint}>
                <Ionicons name="swap-horizontal" size={12} color={theme.colors.primary} />
                <Text style={[styles.swapHintText, { color: theme.colors.primary }]}>
                  Hold a meal to swap it
                </Text>
              </View>

              {SLOTS.map((slot) => {
                const recipeId = slotRecipeMap[slot];
                if (!recipeId) return null;
                return (
                  <MealSlotRow
                    key={slot}
                    slot={slot}
                    recipeId={recipeId}
                    logged={isSlotLogged(today, slot)}
                    onPress={() =>
                      router.push({ pathname: "/meals/recipe", params: { recipeId } } as any)
                    }
                    onLongPress={() => handleSwapOpen(slot, recipeId)}
                  />
                );
              })}
            </View>

            {/* ── Quick Actions ─────────────────────────────────────────── */}
            <View style={styles.quickRow}>
              {QUICK_ACTIONS.map((action) => (
                <Pressable
                  key={action.key}
                  onPress={() => router.push(action.route as any)}
                  style={[
                    styles.quickPill,
                    {
                      backgroundColor: tierColor + "18",
                      borderColor: tierColor + "40",
                    },
                  ]}
                >
                  <Ionicons name={action.icon} size={16} color={tierColor} />
                  <Text style={[styles.quickLabel, { color: tierColor }]}>
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* ── Weekly Lineup Card ────────────────────────────────────── */}
            <Pressable
              onPress={() => router.push("/meals/weekly-plan" as any)}
              style={[
                styles.weeklyCard,
                {
                  backgroundColor: tierColor + "12",
                  borderColor: tierColor + "40",
                },
              ]}
            >
              <View style={styles.weeklyCardContent}>
                <Ionicons name="calendar-outline" size={22} color={tierColor} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={[typography.subheading, { color: theme.colors.text }]}>
                    This Week's Lineup
                  </Text>
                  <Text style={[typography.small, { color: theme.colors.muted }]}>
                    {7 - startDay} days planned · {weekTotalCal.toLocaleString()} cal total
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
              </View>
            </Pressable>

            {/* ── Logs Card ─────────────────────────────────────────────── */}
            <Pressable
              onPress={() => router.push("/meals/logs" as any)}
              style={[
                styles.weeklyCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.weeklyCardContent}>
                <View style={[styles.logsCardIcon, { backgroundColor: "#378ADD" + "18" }]}>
                  <Ionicons name="stats-chart" size={18} color="#378ADD" />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={[typography.subheading, { color: theme.colors.text }]}>
                    Logs
                  </Text>
                  <Text style={[typography.small, { color: theme.colors.muted }]}>
                    View your logs, macros & streaks
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
              </View>
            </Pressable>

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

        {swapAlternatives.map((item) => (
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
        ))}
      </AppBottomSheet>

      {/* ── Dev Time-Travel Panel ──────────────────────────────────── */}
      {__DEV__ && (
        <>
          <Pressable
            onPress={() => setDevOpen((o) => !o)}
            style={styles.devFab}
          >
            <Ionicons name="time-outline" size={20} color="#fff" />
          </Pressable>
          {devOpen && (
            <View style={styles.devPanel}>
              <Text style={styles.devTitle}>
                Time Travel {getDevOffset() !== 0 ? `(${getDevOffset() > 0 ? "+" : ""}${getDevOffset()}d)` : ""}
              </Text>
              <Text style={styles.devDate}>
                Simulated: {getDevNow().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </Text>
              <Text style={styles.devDate}>
                Week: {currentWeekKey}
              </Text>
              <View style={styles.devRow}>
                <Pressable onPress={() => devTravel(-7)} style={styles.devBtn}>
                  <Text style={styles.devBtnText}>-1w</Text>
                </Pressable>
                <Pressable onPress={() => devTravel(-1)} style={styles.devBtn}>
                  <Text style={styles.devBtnText}>-1d</Text>
                </Pressable>
                <Pressable onPress={devReset} style={[styles.devBtn, { backgroundColor: "#c62828" }]}>
                  <Text style={styles.devBtnText}>Reset</Text>
                </Pressable>
                <Pressable onPress={() => devTravel(1)} style={styles.devBtn}>
                  <Text style={styles.devBtnText}>+1d</Text>
                </Pressable>
                <Pressable onPress={() => devTravel(7)} style={styles.devBtn}>
                  <Text style={styles.devBtnText}>+1w</Text>
                </Pressable>
              </View>
            </View>
          )}
        </>
      )}
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
    marginBottom: spacing.lg,
  },
  backBtn: {
    marginRight: spacing.sm,
  },
  switchPlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  switchPlanText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: spacing.sm,
  },
  waitingMascot: {
    alignItems: "center",
    marginTop: spacing.sm,
  },
  mascotGlow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  waitingCenter: {
    alignItems: "center",
    marginTop: spacing.lg,
  },
  countdownOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  countdownBadge: {
    alignItems: "center",
    justifyContent: "center",
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
  },
  countdownNumber: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 32,
  },
  countdownLabel: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.8,
  },
  sectionEyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  eyebrowLine: {
    flex: 1,
    height: 1,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  waitingActions: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  waitingActionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  waitingActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  actionAccentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  changeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  changeBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  quickRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  quickPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  weeklyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  weeklyCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  logsCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalSheet: {
    width: "100%",
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  dayOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  dayOptionText: {
    fontSize: typography.body.fontSize,
    fontWeight: "600",
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.subheading.fontSize,
    fontWeight: "700",
    flex: 1,
  },
  dayTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginRight: spacing.xs,
  },
  dayTagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  speechBubble: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  speechText: {
    fontSize: 13,
    fontStyle: "italic",
    fontWeight: "500",
    textAlign: "center",
  },
  speechTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -1,
  },
  launchEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.8,
    marginBottom: spacing.xs,
  },
  heroHeading: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: typography.body.fontSize,
    textAlign: "center",
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  devFab: {
    position: "absolute",
    bottom: 90,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6A1B9A",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 100,
  },
  devPanel: {
    position: "absolute",
    bottom: 140,
    right: 16,
    left: 16,
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 100,
  },
  devTitle: {
    color: "#ce93d8",
    fontWeight: "700",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 4,
  },
  devDate: {
    color: "#aaa",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 2,
  },
  devRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  devBtn: {
    backgroundColor: "#6A1B9A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  devBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  swapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: spacing.sm,
  },
  swapHintText: {
    fontSize: 11,
    fontStyle: "italic",
  },
  swapRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  swapFlag: {
    fontSize: 20,
  },
  swapInfo: {
    flex: 1,
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

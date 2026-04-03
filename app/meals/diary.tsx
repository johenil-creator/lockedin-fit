import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, radius, typography } from "../../lib/theme";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useFoodLog } from "../../hooks/useFoodLog";
import { useMealPlan } from "../../hooks/useMealPlan";
import { FoodEntryRow } from "../../components/meals";
import { AddFoodSheet } from "../../components/meals/AddFoodSheet";
import type { MealSlot, Macros, Recipe } from "../../src/data/mealTypes";
import { recipeMap, getRecipesBySlot } from "../../src/data/recipeCatalog";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SLOT_ORDER: { key: MealSlot; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack1", label: "Snack 1" },
  { key: "snack2", label: "Snack 2" },
];

const MACRO_COLORS = {
  calories: "#3FB950",
  protein: "#378ADD",
  carbs: "#BA7517",
  fat: "#7F77DD",
} as const;

const AMBER = "#F0883E";
const RED = "#F85149";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function barColor(ratio: number, base: string): string {
  if (ratio > 1) return RED;
  if (ratio > 0.9) return AMBER;
  return base;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FoodDiaryScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const {
    log,
    selectedDate,
    dayEntries,
    dayMacros,
    addEntry,
    removeEntry,
    logRecipe,
    setDate,
    isSlotLogged,
  } = useFoodLog();

  const { plan, prefs, macroTargets } = useMealPlan();

  const [sheetSlot, setSheetSlot] = useState<MealSlot | null>(null);

  // ------ date navigation ------
  const dateObj = useMemo(() => new Date(selectedDate + "T12:00:00"), [selectedDate]);

  const navigateDate = useCallback(
    (dir: -1 | 1) => {
      const d = new Date(dateObj);
      d.setDate(d.getDate() + dir);
      setDate(toDateKey(d));
    },
    [dateObj, setDate]
  );

  // ------ quick picks for the sheet ------
  const quickPicks = useMemo(() => {
    if (!plan || !sheetSlot) return [];
    const dayOfWeek = dateObj.getDay(); // 0=Sun
    const dayPlan = plan.days.find((d) => d.dayIndex === dayOfWeek);
    if (!dayPlan) return [];
    return dayPlan.meals
      .filter((m) => m.slot === sheetSlot)
      .map((m) => recipeMap.get(m.recipeId))
      .filter((r): r is Recipe => r !== undefined);
  }, [plan, sheetSlot, dateObj]);

  // ------ per-slot entries ------
  const entriesBySlot = useMemo(() => {
    const map: Record<MealSlot, typeof dayEntries> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack1: [],
      snack2: [],
    };
    for (const entry of dayEntries) {
      if (map[entry.slot]) map[entry.slot].push(entry);
    }
    return map;
  }, [dayEntries]);

  const slotCalories = useCallback(
    (slot: MealSlot) =>
      entriesBySlot[slot].reduce((sum, e) => sum + e.macros.calories, 0),
    [entriesBySlot]
  );

  // ------ macro summary data ------
  const macroItems = useMemo(() => {
    const t = macroTargets;
    const d = dayMacros;
    return [
      { label: "Calories", current: d.calories, target: t.calories, color: MACRO_COLORS.calories, unit: "" },
      { label: "Protein", current: d.protein, target: t.protein, color: MACRO_COLORS.protein, unit: "g" },
      { label: "Carbs", current: d.carbs, target: t.carbs, color: MACRO_COLORS.carbs, unit: "g" },
      { label: "Fat", current: d.fat, target: t.fat, color: MACRO_COLORS.fat, unit: "g" },
    ];
  }, [dayMacros, macroTargets]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      {/* ── Header ─────────────────────────────────── */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Fuel Log</Text>
        <View style={{ width: 26 }} />
      </Animated.View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Macro Summary Strip ──────────────────── */}
        <Animated.View entering={FadeInDown.delay(50).duration(350)} style={styles.macroStrip}>
          {macroItems.map((m) => {
            const ratio = m.target > 0 ? m.current / m.target : 0;
            const barPct = Math.min(ratio, 1) * 100;
            const color = barColor(ratio, m.color);
            return (
              <View key={m.label} style={[styles.macroCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.macroLabel, { color: theme.colors.muted }]}>{m.label}</Text>
                <Text style={[styles.macroValue, { color: theme.colors.text }]}>
                  {Math.round(m.current)}
                  <Text style={[styles.macroTarget, { color: theme.colors.muted }]}>/{m.target}{m.unit}</Text>
                </Text>
                <View style={[styles.barTrack, { backgroundColor: theme.colors.border }]}>
                  <View style={[styles.barFill, { width: `${barPct}%`, backgroundColor: color }]} />
                </View>
              </View>
            );
          })}
        </Animated.View>

        {/* ── Date Nav ─────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100).duration(350)} style={styles.dateNav}>
          <Pressable onPress={() => navigateDate(-1)} hitSlop={12} style={styles.dateArrow}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.muted} />
          </Pressable>
          <Text style={[styles.dateLabel, { color: theme.colors.text }]}>{formatDateLabel(dateObj)}</Text>
          <Pressable onPress={() => navigateDate(1)} hitSlop={12} style={styles.dateArrow}>
            <Ionicons name="chevron-forward" size={22} color={theme.colors.muted} />
          </Pressable>
        </Animated.View>

        {/* ── Meal Slot Sections ───────────────────── */}
        {SLOT_ORDER.map((slot, idx) => {
          const entries = entriesBySlot[slot.key];
          const cal = slotCalories(slot.key);
          return (
            <Animated.View
              key={slot.key}
              entering={FadeInDown.delay(150 + idx * 60).duration(350)}
              style={[styles.slotSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              {/* Slot header */}
              <View style={styles.slotHeader}>
                <Text style={[styles.slotTitle, { color: theme.colors.text }]}>{slot.label}</Text>
                {cal > 0 && (
                  <Text style={[styles.slotCal, { color: theme.colors.muted }]}>{Math.round(cal)} cal</Text>
                )}
              </View>

              {/* Entries */}
              {entries.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.colors.muted }]}>Nothing logged</Text>
              ) : (
                entries.map((entry) => (
                  <FoodEntryRow
                    key={entry.id}
                    entry={entry}
                    onDelete={() => removeEntry(selectedDate, entry.id)}
                  />
                ))
              )}

              {/* Add button */}
              <Pressable
                onPress={() => setSheetSlot(slot.key)}
                style={({ pressed }) => [
                  styles.addBtn,
                  { borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="add" size={18} color={theme.colors.primary} />
                <Text style={[styles.addBtnText, { color: theme.colors.primary }]}>Add</Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>

      {/* ── Add Food Sheet ─────────────────────────── */}
      <AddFoodSheet
        visible={sheetSlot !== null}
        slot={sheetSlot ?? "breakfast"}
        date={selectedDate}
        quickPicks={quickPicks}
        onClose={() => setSheetSlot(null)}
        onLog={addEntry}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    ...typography.heading,
  },
  scroll: {
    paddingHorizontal: spacing.md,
  },

  // ── Macro strip ──
  macroStrip: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  macroCard: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  macroLabel: {
    ...typography.caption,
    marginBottom: 2,
  },
  macroValue: {
    ...typography.subheading,
  },
  macroTarget: {
    ...typography.caption,
    fontWeight: "400",
  },
  barTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: spacing.xs,
    overflow: "hidden",
  },
  barFill: {
    height: 3,
    borderRadius: 2,
  },

  // ── Date nav ──
  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  dateArrow: {
    padding: spacing.xs,
  },
  dateLabel: {
    ...typography.subheading,
    minWidth: 120,
    textAlign: "center",
  },

  // ── Slot sections ──
  slotSection: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  slotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  slotTitle: {
    ...typography.subheading,
  },
  slotCal: {
    ...typography.small,
  },
  emptyText: {
    ...typography.small,
    fontStyle: "italic",
    marginBottom: spacing.sm,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addBtnText: {
    ...typography.small,
    fontWeight: "600",
  },
});

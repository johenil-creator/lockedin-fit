/**
 * Fuel Logs — app/meals/logs.tsx
 *
 * Two-tab screen: Progress (stats, macro rings, calendar) and History (tappable calendar with day detail).
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
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import { MacroRings } from "../../components/meals";
import { useMealPlan } from "../../hooks/useMealPlan";
import { useFoodLog } from "../../hooks/useFoodLog";
import { useNutritionStreak } from "../../hooks/useNutritionStreak";
import { computeDayMacros } from "../../lib/mealService";
import type { CuisineTier, MealSlot, FoodLogEntry } from "../../src/data/mealTypes";
import { useWeightLog } from "../../hooks/useWeightLog";
import { useProfileContext } from "../../contexts/ProfileContext";
import { WeightTrendGraph } from "../../components/meals/WeightTrendGraph";
import { WeightInputModal } from "../../components/meals/WeightInputModal";

// ── Constants ──────────────────────────────────────────────────────────────
const TIER_ACCENT: Record<CuisineTier, string> = {
  scavenge: "#1D9E75",
  hunt: "#378ADD",
  apex_feast: "#BA7517",
};

const DAY_NAMES_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  snack1: "Snack",
  lunch: "Lunch",
  snack2: "Snack",
  dinner: "Dinner",
};

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayStr(): string {
  return formatDate(new Date());
}

// ── Component ──────────────────────────────────────────────────────────────
export default function FuelLogs() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { profile } = useProfileContext();
  const { prefs, plan, macroTargets, reload } = useMealPlan();
  const { log, dayMacros, isSlotLogged, reload: reloadLog } = useFoodLog();
  const { streak } = useNutritionStreak();

  // Seed weight log from profile weight if no entries exist yet
  const profileWeightKg = useMemo(() => {
    const num = parseFloat(profile.weight);
    if (isNaN(num) || num <= 0) return undefined;
    return profile.weightUnit === "lbs" ? num / 2.20462 : num;
  }, [profile.weight, profile.weightUnit]);

  const { sortedEntries: weightEntries, latestEntry: latestWeight, addEntry: addWeightEntry, reload: reloadWeight } = useWeightLog(profileWeightKg);

  const [activeTab, setActiveTab] = useState<"progress" | "history">("progress");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showWeightInput, setShowWeightInput] = useState(false);

  // ── Calendar state ─────────────────────────────────────────────────
  const nowDate = new Date();
  const [calMonth, setCalMonth] = useState(nowDate.getMonth());
  const [calYear, setCalYear] = useState(nowDate.getFullYear());

  const goToPrevMonth = useCallback(() => {
    setCalMonth((m) => {
      if (m === 0) { setCalYear((y) => y - 1); return 11; }
      return m - 1;
    });
  }, []);
  const goToNextMonth = useCallback(() => {
    setCalMonth((m) => {
      if (m === 11) { setCalYear((y) => y + 1); return 0; }
      return m + 1;
    });
  }, []);
  const goToCurrentMonth = useCallback(() => {
    const n = new Date();
    setCalMonth(n.getMonth());
    setCalYear(n.getFullYear());
  }, []);

  // ── Reload on focus ────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      reload();
      reloadLog();
      reloadWeight();
    }, [reload, reloadLog, reloadWeight])
  );

  // ── Derived ────────────────────────────────────────────────────────
  const activeTier = prefs.tier ?? "scavenge";
  const tierColor = TIER_ACCENT[activeTier];
  const jsDay = new Date().getDay();
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1;
  const startDay = prefs.startDayIndex ?? 0;

  // ── Monthly calendar grid ─────────────────────────────────────────
  const monthGrid = useMemo(() => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstJsDay = new Date(calYear, calMonth, 1).getDay();
    const startPad = firstJsDay === 0 ? 6 : firstJsDay - 1;

    const todayDateStr = todayStr();
    const todayParts = todayDateStr.split("-").map(Number);
    const todayAbsolute = todayParts[0] * 10000 + todayParts[1] * 100 + todayParts[2];

    const cells: (null | {
      date: number;
      dateStr: string;
      isToday: boolean;
      isFuture: boolean;
      hasLog: boolean;
    })[] = [];

    for (let p = 0; p < startPad; p++) cells.push(null);

    let loggedCount = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(new Date(calYear, calMonth, d));
      const dateAbsolute = calYear * 10000 + (calMonth + 1) * 100 + d;
      const isToday = dateStr === todayDateStr;
      const isFuture = dateAbsolute > todayAbsolute;
      const hasLog = !!(log[dateStr] && log[dateStr].length > 0);
      if (hasLog) loggedCount++;
      cells.push({ date: d, dateStr, isToday, isFuture, hasLog });
    }

    return { cells, loggedCount, daysInMonth };
  }, [calYear, calMonth, log]);

  // Today's column for header highlight
  const todayColIdx = useMemo(() => {
    const now = new Date();
    if (now.getMonth() !== calMonth || now.getFullYear() !== calYear) return -1;
    return todayIdx;
  }, [calMonth, calYear, todayIdx]);

  // ── Selected day data ─────────────────────────────────────────────
  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null;
    const entries: FoodLogEntry[] = log[selectedDate] ?? [];
    if (entries.length === 0) return { entries: [], macros: { calories: 0, protein: 0, carbs: 0, fat: 0 }, dayName: "", monthName: "", day: 0, dateStr: selectedDate, empty: true };
    const macros = computeDayMacros(entries);
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayName = DAY_NAMES_FULL[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1];
    const monthName = MONTH_NAMES[m - 1];
    return { entries, macros, dayName, monthName, day: d, dateStr: selectedDate, empty: false };
  }, [selectedDate, log]);

  // ── Nutrition goal label ─────────────────────────────────────────
  const goalLabel = useMemo(() => {
    const g = prefs.nutritionGoal ?? "maintain";
    const labels: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }> = {
      aggressive_cut: { label: "Aggressive Cut", icon: "trending-down", desc: "Max deficit for rapid loss" },
      cut: { label: "Cut", icon: "arrow-down-circle-outline", desc: "Moderate calorie deficit" },
      maintain: { label: "Maintain", icon: "swap-horizontal-outline", desc: "Staying at current weight" },
      bulk: { label: "Bulk", icon: "arrow-up-circle-outline", desc: "Calorie surplus for growth" },
    };
    return labels[g] ?? labels.maintain;
  }, [prefs.nutritionGoal]);

  // ── 7-day calorie history ─────────────────────────────────────────
  const last7Days = useMemo(() => {
    const now = new Date();
    const days: { dateStr: string; letter: string; calories: number; hasLog: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = formatDate(d);
      const entries = log[dateStr] ?? [];
      const calories = entries.reduce((sum, e) => sum + (e.macros?.calories ?? 0), 0);
      const jsD = d.getDay();
      const letter = DAY_LETTERS[jsD === 0 ? 6 : jsD - 1];
      days.push({ dateStr, letter, calories, hasLog: entries.length > 0 });
    }
    return days;
  }, [log]);

  const avgCalories = useMemo(() => {
    const logged = last7Days.filter((d) => d.hasLog);
    if (logged.length === 0) return 0;
    return Math.round(logged.reduce((s, d) => s + d.calories, 0) / logged.length);
  }, [last7Days]);

  const maxBarCal = useMemo(() => {
    return Math.max(...last7Days.map((d) => d.calories), macroTargets.calories, 1);
  }, [last7Days, macroTargets.calories]);

  // ── Streak message ────────────────────────────────────────────────
  const streakMessage = useMemo(() => {
    const current = streak?.current ?? 0;
    if (current === 0) return "Log all meals today to start a streak";
    if (current === 1) return "1 day down — keep the momentum going";
    if (current < 5) return `${current} days strong — building consistency`;
    if (current < 14) return `${current} days — you're on fire`;
    return `${current} days — absolute discipline`;
  }, [streak]);

  // ── Week stats ────────────────────────────────────────────────────
  const weekStats = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);

    let completeDays = 0;
    let totalDays = 0;
    let loggedMeals = 0;
    let plannedMeals = 0;

    DAY_NAMES_FULL.forEach((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = formatDate(d);
      const dayPlan = plan.days.find((dp) => dp.dayIndex === i);
      const ps = dayPlan?.meals?.length ?? 0;
      const ls = dayPlan?.meals?.filter((m) => isSlotLogged(dateStr, m.slot)).length ?? 0;
      const isBeforeStart = i < startDay;
      if (!isBeforeStart) {
        totalDays++;
        plannedMeals += ps;
        loggedMeals += ls;
        if (ps > 0 && ls === ps) completeDays++;
      }
    });

    return { completeDays, totalDays, loggedMeals, plannedMeals };
  }, [plan.days, startDay, isSlotLogged]);

  // ── Render calendar (shared between tabs) ─────────────────────────
  const renderCalendar = (tappable: boolean) => (
    <View style={[styles.calendarCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {/* Month navigation */}
      <View style={styles.monthNav}>
        <Pressable onPress={goToPrevMonth} hitSlop={12} style={[styles.monthArrow, { backgroundColor: theme.colors.mutedBg }]}>
          <Ionicons name="chevron-back" size={16} color={theme.colors.text} />
        </Pressable>
        <Pressable onPress={goToCurrentMonth} style={styles.monthLabelWrap}>
          <Ionicons name="calendar-outline" size={14} color={tierColor} />
          <Text style={[styles.monthLabel, { color: theme.colors.text }]}>
            {MONTH_NAMES[calMonth]} {calYear}
          </Text>
        </Pressable>
        <Pressable onPress={goToNextMonth} hitSlop={12} style={[styles.monthArrow, { backgroundColor: theme.colors.mutedBg }]}>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.text} />
        </Pressable>
      </View>

      {/* Day headers */}
      <View style={styles.calWeekRow}>
        {DAY_LETTERS.map((letter, i) => (
          <View key={i} style={styles.calDayCol}>
            <Text style={[styles.calLetter, { color: i === todayColIdx ? tierColor : theme.colors.muted }]}>{letter}</Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <View style={styles.calGrid}>
        {monthGrid.cells.map((cell, i) => (
          <View key={i} style={styles.calDayCol}>
            {cell ? (
              <Pressable
                onPress={() => {
                  if (tappable && (!cell.isFuture || cell.isToday)) {
                    setSelectedDate(cell.dateStr === selectedDate ? null : cell.dateStr);
                  }
                }}
              >
                <View
                  style={[
                    styles.calCircle,
                    {
                      backgroundColor:
                        tappable && cell.dateStr === selectedDate
                          ? cell.hasLog ? tierColor : tierColor + "30"
                          : cell.hasLog
                            ? tierColor
                            : cell.isToday
                              ? tierColor + "20"
                              : "transparent",
                      borderColor:
                        tappable && cell.dateStr === selectedDate
                          ? tierColor
                          : cell.isToday && !cell.hasLog
                            ? tierColor + "50"
                            : cell.hasLog
                              ? tierColor
                              : "transparent",
                      opacity: cell.isFuture && !cell.isToday ? 0.35 : 1,
                    },
                  ]}
                >
                  {cell.hasLog ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : (
                    <Text style={[styles.calDateNum, { color: cell.isToday || (tappable && cell.dateStr === selectedDate) ? tierColor : theme.colors.muted }]}>
                      {cell.date}
                    </Text>
                  )}
                </View>
              </Pressable>
            ) : (
              <View style={styles.calCirclePlaceholder} />
            )}
          </View>
        ))}
      </View>

      {/* Summary */}
      <View style={[styles.monthSummary, { borderTopColor: theme.colors.border }]}>
        <View style={styles.monthSumItem}>
          <View style={[styles.monthSumDot, { backgroundColor: tierColor }]} />
          <Text style={[styles.monthSumText, { color: theme.colors.muted }]}>
            {monthGrid.loggedCount} day{monthGrid.loggedCount !== 1 ? "s" : ""} logged
          </Text>
        </View>
        <Text style={[styles.monthSumText, { color: theme.colors.muted }]}>
          {Math.round((monthGrid.loggedCount / monthGrid.daysInMonth) * 100)}% of month
        </Text>
      </View>
    </View>
  );

  // Format selected day header text
  const selectedLabel = useMemo(() => {
    if (!selectedDate) return "";
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayName = DAY_NAMES_FULL[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1];
    return `${dayName}, ${MONTH_NAMES[m - 1]} ${d}`;
  }, [selectedDate]);

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
        {/* ── Header ──────────────────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
          <Text style={[typography.screenTitle, { color: theme.colors.text, flex: 1 }]}>
            Fuel Logs
          </Text>
        </Animated.View>

        {/* ── Segmented Toggle ──────────────────────────────────── */}
        <View style={[styles.segmentRow, { backgroundColor: theme.colors.mutedBg }]}>
          {(["progress", "history"] as const).map((tab) => (
            <Pressable
              key={tab}
              style={[
                styles.segmentPill,
                activeTab === tab && { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => {
                setActiveTab(tab);
                if (tab === "progress") setSelectedDate(null);
              }}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: activeTab === tab ? theme.colors.primaryText : theme.colors.muted },
                ]}
              >
                {tab === "progress" ? "Progress" : "History"}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === "progress" ? (
          <>
            {/* ── Progress Tab ──────────────────────────────────── */}

            {/* Streak banner */}
            <Animated.View entering={FadeInDown.delay(60).duration(300)}>
              <View style={[styles.streakBanner, { backgroundColor: tierColor + "12", borderColor: tierColor + "30" }]}>
                <Ionicons name="flame" size={20} color={tierColor} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.streakBannerValue, { color: theme.colors.text }]}>
                    {streak?.current ?? 0} day streak
                  </Text>
                  <Text style={[styles.streakBannerMsg, { color: theme.colors.muted }]}>
                    {streakMessage}
                  </Text>
                </View>
                {(streak?.current ?? 0) > 0 && (
                  <View style={[styles.streakBestBadge, { backgroundColor: theme.colors.mutedBg }]}>
                    <Ionicons name="trophy" size={11} color="#BA7517" />
                    <Text style={[styles.streakBestText, { color: theme.colors.muted }]}>
                      {streak?.longest ?? 0}
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>

            {/* Section: This Week */}
            <Animated.View entering={FadeInDown.delay(120).duration(300)} style={styles.sectionDivider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              <Text style={[styles.sectionLabelInline, { color: theme.colors.muted }]}>THIS WEEK</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            </Animated.View>

            {/* Stats row */}
            <Animated.View entering={FadeInDown.delay(160).duration(350)} style={styles.statsRow}>
              {[
                { icon: "checkmark-done" as const, color: "#3FB950", value: `${weekStats.completeDays}/${weekStats.totalDays}`, label: "Days" },
                { icon: "restaurant" as const, color: "#378ADD", value: `${weekStats.loggedMeals}/${weekStats.plannedMeals}`, label: "Meals" },
              ].map((stat) => (
                <View key={stat.label} style={[styles.statPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <View style={[styles.statAccent, { backgroundColor: stat.color }]} />
                  <Ionicons name={stat.icon} size={16} color={stat.color} />
                  <Text style={[styles.statValue, { color: theme.colors.text }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: theme.colors.muted }]}>{stat.label}</Text>
                </View>
              ))}
            </Animated.View>

            {/* 7-day calorie bars */}
            <Animated.View entering={FadeInDown.delay(220).duration(350)}>
              <View style={[styles.calBarCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={styles.calBarHeader}>
                  <Text style={[styles.calBarTitle, { color: theme.colors.text }]}>Last 7 Days</Text>
                  <View style={styles.calBarAvg}>
                    <Text style={[styles.calBarAvgLabel, { color: theme.colors.muted }]}>Avg</Text>
                    <Text style={[styles.calBarAvgValue, { color: theme.colors.text }]}>{avgCalories}</Text>
                    <Text style={[styles.calBarAvgUnit, { color: theme.colors.muted }]}>cal</Text>
                  </View>
                </View>
                <View style={styles.calBarsRow}>
                  {last7Days.map((d, i) => {
                    const pct = maxBarCal > 0 ? Math.min(d.calories / maxBarCal, 1) : 0;
                    const isToday = i === 6;
                    return (
                      <View key={d.dateStr} style={styles.calBarCol}>
                        <Text style={[styles.calBarCalLabel, { color: d.hasLog ? theme.colors.text : theme.colors.border }]}>
                          {d.hasLog ? d.calories : "-"}
                        </Text>
                        <View style={[styles.calBarTrack, { backgroundColor: theme.colors.mutedBg }]}>
                          <View
                            style={[
                              styles.calBarFill,
                              {
                                height: `${Math.max(pct * 100, d.hasLog ? 4 : 0)}%` as any,
                                backgroundColor: d.calories > macroTargets.calories
                                  ? "#E5534B"
                                  : isToday
                                    ? tierColor
                                    : tierColor + "90",
                              },
                            ]}
                          />
                          {/* Target line */}
                          <View
                            style={[
                              styles.calBarTarget,
                              {
                                bottom: `${Math.min((macroTargets.calories / maxBarCal) * 100, 100)}%` as any,
                                backgroundColor: theme.colors.muted + "40",
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.calBarLetter, { color: isToday ? tierColor : theme.colors.muted }]}>
                          {d.letter}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </Animated.View>

            {/* Section: Today's Macros */}
            <Animated.View entering={FadeInDown.delay(300).duration(300)} style={styles.sectionDivider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              <Text style={[styles.sectionLabelInline, { color: theme.colors.muted }]}>TODAY'S MACROS</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            </Animated.View>

            {/* Macro rings + numbers + progress bars */}
            <Animated.View entering={FadeInDown.delay(360).duration(350)}>
              <View style={[styles.macroCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={[styles.macroAccentBar, { backgroundColor: tierColor }]} />
                <MacroRings current={dayMacros} target={macroTargets} size={140} />
                <View style={styles.macroNumbersRow}>
                  {[
                    { label: "Cal", current: Math.round(dayMacros.calories), target: Math.round(macroTargets.calories), color: "#3FB950" },
                    { label: "Protein", current: Math.round(dayMacros.protein), target: Math.round(macroTargets.protein), color: "#378ADD" },
                    { label: "Carbs", current: Math.round(dayMacros.carbs), target: Math.round(macroTargets.carbs), color: "#BA7517" },
                    { label: "Fat", current: Math.round(dayMacros.fat), target: Math.round(macroTargets.fat), color: "#7F77DD" },
                  ].map((m) => {
                    const pct = m.target > 0 ? Math.min(m.current / m.target, 1) : 0;
                    const remaining = m.target - m.current;
                    return (
                      <View key={m.label} style={styles.macroNumCol}>
                        <View style={[styles.macroColorDot, { backgroundColor: m.color }]} />
                        <Text style={[styles.macroNumValue, { color: theme.colors.text }]}>
                          {m.current}<Text style={{ color: theme.colors.muted, fontWeight: "500" }}>/{m.target}</Text>
                        </Text>
                        <Text style={[styles.macroNumLabel, { color: theme.colors.muted }]}>{m.label}</Text>
                        {/* Progress bar */}
                        <View style={[styles.macroProgressTrack, { backgroundColor: theme.colors.mutedBg }]}>
                          <View style={[styles.macroProgressFill, { width: `${pct * 100}%` as any, backgroundColor: m.color }]} />
                        </View>
                        <Text style={[styles.macroRemaining, { color: remaining >= 0 ? theme.colors.muted : "#E5534B" }]}>
                          {remaining >= 0 ? `${remaining} left` : `${Math.abs(remaining)} over`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </Animated.View>

            {/* Nutrition goal badge */}
            <Animated.View entering={FadeInDown.delay(440).duration(350)}>
              <View style={[styles.goalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={[styles.goalIcon, { backgroundColor: tierColor + "18" }]}>
                  <Ionicons name={goalLabel.icon} size={18} color={tierColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.goalTitle, { color: theme.colors.text }]}>{goalLabel.label}</Text>
                  <Text style={[styles.goalDesc, { color: theme.colors.muted }]}>{goalLabel.desc}</Text>
                </View>
                <Text style={[styles.goalTarget, { color: tierColor }]}>
                  {Math.round(macroTargets.calories)} cal/day
                </Text>
              </View>
            </Animated.View>

            {/* Section: Weight */}
            <Animated.View entering={FadeInDown.delay(500).duration(300)} style={styles.sectionDivider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              <Text style={[styles.sectionLabelInline, { color: theme.colors.muted }]}>WEIGHT</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            </Animated.View>

            {/* Weight trend graph */}
            <Animated.View entering={FadeInDown.delay(560).duration(350)}>
              <WeightTrendGraph
                entries={weightEntries}
                goalWeightKg={prefs.goalWeightKg}
                weightUnit={profile.weightUnit}
              />
            </Animated.View>

            {/* Weight summary + log button */}
            <Animated.View entering={FadeInDown.delay(620).duration(350)}>
              <View style={[styles.weightRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                {latestWeight ? (() => {
                  const currentDisplay = profile.weightUnit === "lbs"
                    ? Math.round(latestWeight.weightKg * 2.20462 * 10) / 10
                    : Math.round(latestWeight.weightKg * 10) / 10;
                  const goalKg = prefs.goalWeightKg;
                  const hasGoal = goalKg != null && goalKg > 0;
                  const goalDisplay = hasGoal
                    ? profile.weightUnit === "lbs"
                      ? Math.round(goalKg! * 2.20462 * 10) / 10
                      : Math.round(goalKg! * 10) / 10
                    : 0;

                  // "to go" calculation
                  const diffDisplay = hasGoal
                    ? profile.weightUnit === "lbs"
                      ? Math.round(Math.abs(latestWeight.weightKg - goalKg!) * 2.20462 * 10) / 10
                      : Math.round(Math.abs(latestWeight.weightKg - goalKg!) * 10) / 10
                    : 0;
                  const isCut = hasGoal && goalKg! < latestWeight.weightKg;
                  const atGoal = hasGoal && diffDisplay === 0;

                  // Progress bar
                  const startKg = weightEntries.length > 0 ? weightEntries[0].weightKg : latestWeight.weightKg;
                  const totalRange = hasGoal ? Math.abs(startKg - goalKg!) : 0;
                  const progressDone = hasGoal && totalRange > 0
                    ? Math.min(1, Math.max(0, 1 - Math.abs(latestWeight.weightKg - goalKg!) / totalRange))
                    : 0;

                  // Source + recency
                  const isSynced = latestWeight.source === "healthkit";
                  const loggedDate = new Date(latestWeight.loggedAt);
                  const diffDays = Math.floor((Date.now() - loggedDate.getTime()) / (1000 * 60 * 60 * 24));
                  const timeText = diffDays === 0 ? "Today" : diffDays === 1 ? "Yesterday" : `${diffDays}d ago`;

                  return (
                    <View style={{ flex: 1 }}>
                      <View style={styles.weightTopRow}>
                        <Text style={[styles.weightCurrentValue, { color: theme.colors.text }]}>
                          {currentDisplay} <Text style={[styles.weightUnitText, { color: theme.colors.muted }]}>{profile.weightUnit}</Text>
                        </Text>
                        {hasGoal && !atGoal && (
                          <Text style={[styles.weightGoalText, { color: theme.colors.muted }]}>
                            Goal: {goalDisplay}
                          </Text>
                        )}
                      </View>
                      <View style={styles.weightMetaRow}>
                        <View style={styles.weightSourcePill}>
                          <Ionicons
                            name={isSynced ? "heart-outline" : "create-outline"}
                            size={10}
                            color={isSynced ? "#E05252" : theme.colors.muted}
                          />
                          <Text style={[styles.weightSourceText, { color: theme.colors.muted }]}>
                            {isSynced ? "Apple Health" : "Manual"} · {timeText}
                          </Text>
                        </View>
                        {hasGoal && !atGoal && (
                          <Text style={[styles.weightToGoText, { color: progressDone >= 0.5 ? "#1D9E75" : tierColor }]}>
                            {diffDisplay} {isCut ? "to go" : "to gain"}
                          </Text>
                        )}
                        {atGoal && (
                          <Text style={[styles.weightToGoText, { color: "#1D9E75" }]}>
                            Goal reached!
                          </Text>
                        )}
                      </View>
                      {hasGoal && (
                        <View style={[styles.weightProgressTrack, { backgroundColor: theme.colors.border }]}>
                          <View
                            style={[
                              styles.weightProgressFill,
                              { width: `${Math.round(progressDone * 100)}%`, backgroundColor: tierColor },
                            ]}
                          />
                        </View>
                      )}
                    </View>
                  );
                })() : (
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.weightCurrentLabel, { color: theme.colors.muted }]}>
                      No weigh-ins yet
                    </Text>
                  </View>
                )}
                <Pressable
                  onPress={() => setShowWeightInput(true)}
                  style={[styles.logWeightBtn, { backgroundColor: tierColor }]}
                >
                  <Ionicons name="scale-outline" size={16} color="#fff" />
                  <Text style={styles.logWeightBtnText}>Log</Text>
                </Pressable>
              </View>
            </Animated.View>

            <WeightInputModal
              visible={showWeightInput}
              onClose={() => setShowWeightInput(false)}
              onSave={(kg) => addWeightEntry(kg)}
              currentWeightDisplay={
                latestWeight
                  ? profile.weightUnit === "lbs"
                    ? Math.round(latestWeight.weightKg * 2.20462 * 10) / 10
                    : Math.round(latestWeight.weightKg * 10) / 10
                  : parseFloat(profile.weight) || undefined
              }
              weightUnit={profile.weightUnit}
              tierColor={tierColor}
            />
          </>
        ) : (
          <>
            {/* ── History Tab ───────────────────────────────────── */}

            {/* Calendar (tappable) */}
            <Animated.View entering={FadeInDown.delay(60).duration(300)}>
              {renderCalendar(true)}
            </Animated.View>

            {/* Selected day detail */}
            {selectedDate && (
              <Animated.View entering={FadeInDown.duration(250)}>
                <View style={[styles.dayDetailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <View style={[styles.dayDetailAccent, { backgroundColor: tierColor }]} />

                  <View style={styles.dayDetailHeader}>
                    <View>
                      <Text style={[styles.dayDetailTitle, { color: theme.colors.text }]}>
                        {selectedLabel}
                      </Text>
                      {selectedDayData && !selectedDayData.empty ? (
                        <Text style={[styles.dayDetailSub, { color: theme.colors.muted }]}>
                          {Math.round(selectedDayData.macros.calories)} cal · {selectedDayData.entries.length} item{selectedDayData.entries.length !== 1 ? "s" : ""} logged
                        </Text>
                      ) : (
                        <Text style={[styles.dayDetailSub, { color: theme.colors.muted }]}>
                          No meals logged
                        </Text>
                      )}
                    </View>
                    <Pressable onPress={() => setSelectedDate(null)} hitSlop={8}>
                      <Ionicons name="close-circle" size={22} color={theme.colors.muted} />
                    </Pressable>
                  </View>

                  {selectedDayData && !selectedDayData.empty ? (
                    <>
                      {/* Macro summary */}
                      <View style={[styles.dayDetailMacros, { borderColor: theme.colors.border }]}>
                        {[
                          { label: "Cal", value: Math.round(selectedDayData.macros.calories), color: "#3FB950" },
                          { label: "Protein", value: Math.round(selectedDayData.macros.protein), color: "#378ADD" },
                          { label: "Carbs", value: Math.round(selectedDayData.macros.carbs), color: "#BA7517" },
                          { label: "Fat", value: Math.round(selectedDayData.macros.fat), color: "#7F77DD" },
                        ].map((m) => (
                          <View key={m.label} style={styles.dayDetailMacroCol}>
                            <View style={[styles.macroColorDot, { backgroundColor: m.color }]} />
                            <Text style={[styles.dayDetailMacroVal, { color: theme.colors.text }]}>{m.value}</Text>
                            <Text style={[styles.dayDetailMacroLabel, { color: theme.colors.muted }]}>{m.label}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Entries */}
                      {selectedDayData.entries.map((entry) => (
                        <View key={entry.id} style={[styles.dayDetailEntry, { borderColor: theme.colors.border }]}>
                          <View style={[styles.slotBadge, { backgroundColor: tierColor + "18" }]}>
                            <Text style={[styles.slotBadgeText, { color: tierColor }]}>
                              {SLOT_LABELS[entry.slot] ?? entry.slot}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.entryName, { color: theme.colors.text }]} numberOfLines={1}>
                              {entry.name}
                            </Text>
                            <Text style={[styles.entryCal, { color: theme.colors.muted }]}>
                              {Math.round(entry.macros.calories)} cal · {Math.round(entry.macros.protein)}p · {Math.round(entry.macros.carbs)}c · {Math.round(entry.macros.fat)}f
                            </Text>
                          </View>
                        </View>
                      ))}
                    </>
                  ) : (
                    <View style={styles.dayDetailEmpty}>
                      <Ionicons name="restaurant-outline" size={28} color={theme.colors.border} />
                      <Text style={[styles.dayDetailEmptyText, { color: theme.colors.muted }]}>
                        Nothing logged this day
                      </Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            )}

            {!selectedDate && (
              <View style={styles.historyHint}>
                <Ionicons name="hand-left-outline" size={16} color={theme.colors.muted} />
                <Text style={[styles.historyHintText, { color: theme.colors.muted }]}>
                  Tap a day to view your logs
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
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
  segmentRow: {
    flexDirection: "row",
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  segmentPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.md - 2,
    alignItems: "center",
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
  },
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  sectionLabelInline: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  streakBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  streakBannerValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  streakBannerMsg: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  streakBestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  streakBestText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
    overflow: "hidden",
  },
  statAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  calendarCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },
  monthArrow: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  calWeekRow: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calDayCol: {
    width: "14.28%",
    alignItems: "center",
    marginBottom: 8,
  },
  calLetter: {
    fontSize: 11,
    fontWeight: "600",
  },
  calCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  calCirclePlaceholder: {
    width: 36,
    height: 36,
  },
  calDateNum: {
    fontSize: 12,
    fontWeight: "700",
  },
  monthSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  monthSumItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  monthSumDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  monthSumText: {
    fontSize: 12,
    fontWeight: "600",
  },
  macroCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: "center",
    overflow: "hidden",
  },
  macroAccentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  macroNumbersRow: {
    flexDirection: "row",
    marginTop: spacing.md,
    width: "100%",
    paddingHorizontal: spacing.sm,
  },
  macroNumCol: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  macroColorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 2,
  },
  macroNumValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  macroNumLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  macroProgressTrack: {
    width: "80%",
    height: 3,
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden",
  },
  macroProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  macroRemaining: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },
  calBarCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  calBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  calBarTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  calBarAvg: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  calBarAvgLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  calBarAvgValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  calBarAvgUnit: {
    fontSize: 11,
    fontWeight: "500",
  },
  calBarsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-end",
  },
  calBarCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  calBarCalLabel: {
    fontSize: 9,
    fontWeight: "600",
  },
  calBarTrack: {
    width: "100%",
    height: 80,
    borderRadius: 4,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  calBarFill: {
    width: "100%",
    borderRadius: 4,
  },
  calBarTarget: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
  },
  calBarLetter: {
    fontSize: 11,
    fontWeight: "600",
  },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  goalIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  goalDesc: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  goalTarget: {
    fontSize: 13,
    fontWeight: "700",
  },
  dayDetailCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.md,
    overflow: "hidden",
  },
  dayDetailAccent: {
    height: 3,
  },
  dayDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  dayDetailTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  dayDetailSub: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  dayDetailMacros: {
    flexDirection: "row",
    marginHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  dayDetailMacroCol: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  dayDetailMacroVal: {
    fontSize: 14,
    fontWeight: "700",
  },
  dayDetailMacroLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  dayDetailEntry: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  slotBadge: {
    minWidth: 70,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  slotBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  entryName: {
    fontSize: 14,
    fontWeight: "600",
  },
  entryCal: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  dayDetailEmpty: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  dayDetailEmptyText: {
    fontSize: 13,
    fontWeight: "500",
  },
  historyHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.lg,
    opacity: 0.6,
  },
  historyHintText: {
    fontSize: 13,
    fontWeight: "500",
  },
  weightRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  weightCurrentLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  weightTopRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  weightCurrentValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  weightUnitText: {
    fontSize: 13,
    fontWeight: "500",
  },
  weightGoalText: {
    fontSize: 11,
    fontWeight: "500",
  },
  weightMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  weightSourcePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  weightSourceText: {
    fontSize: 10,
    fontWeight: "500",
  },
  weightToGoText: {
    fontSize: 11,
    fontWeight: "700",
  },
  logWeightBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    marginLeft: spacing.sm,
  },
  logWeightBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  weightProgressTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 8,
    overflow: "hidden" as const,
  },
  weightProgressFill: {
    height: "100%" as any,
    borderRadius: 2,
  },
});

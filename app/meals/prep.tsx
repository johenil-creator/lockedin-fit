/**
 * Prep Day Screen — app/meals/prep.tsx
 *
 * Shows the batch prep plan for the week: tasks to complete,
 * time savings summary, and progress tracking.
 * Includes a "When are you prepping?" picker on first visit.
 */
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography, shadowPresets } from "../../lib/theme";
import { usePrepDay } from "../../hooks/usePrepDay";
import { loadMealPlan } from "../../lib/mealStorage";
import { getWeekKey } from "../../lib/mealService";
import type { PrepTask, PrepCategory, ExpiryStatus } from "../../src/data/mealTypes";

// ── Category display config ─────────────────────────────────────────────────

const CATEGORY_META: Record<PrepCategory, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  protein: { icon: "fitness-outline", color: "#F85149", label: "Proteins" },
  grain: { icon: "leaf-outline", color: "#D2A038", label: "Grains" },
  vegetable: { icon: "nutrition-outline", color: "#3FB950", label: "Vegetables" },
  legume: { icon: "ellipse-outline", color: "#A371F7", label: "Legumes" },
  sauce: { icon: "water-outline", color: "#58A6FF", label: "Sauces" },
  other: { icon: "cube-outline", color: "#7D8590", label: "Other" },
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Prep scope options ──────────────────────────────────────────────────────

type ScopeOption = { days: number; label: string };
const SCOPE_OPTIONS: ScopeOption[] = [
  { days: 2, label: "2 days" },
  { days: 3, label: "3 days" },
  { days: 0, label: "Full week" },
];

const EXPIRY_COLORS: Record<ExpiryStatus, { bg: string; text: string; label: string }> = {
  ok: { bg: "#3FB95020", text: "#3FB950", label: "Fresh" },
  tight: { bg: "#D2A03830", text: "#D2A038", label: "Use soon" },
  unsafe: { bg: "#F8514930", text: "#F85149", label: "Freeze!" },
};

// ── Today's day index (Mon=0 ... Sun=6) ─────────────────────────────────────

function todayDayIndex(): number {
  const js = new Date().getDay();
  return js === 0 ? 6 : js - 1;
}

// ── Task Card (expandable) ───────────────────────────────────────────────────

function TaskCard({
  task,
  isDone,
  categoryColor,
  theme,
  onToggle,
}: {
  task: PrepTask;
  isDone: boolean;
  categoryColor: string;
  theme: any;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(!isDone);
  const expiry = EXPIRY_COLORS[task.storage.expiryStatus] ?? EXPIRY_COLORS.ok;
  const totalTime = task.activeMinutes + task.passiveMinutes;

  return (
    <Pressable
      onPress={() => setExpanded((p) => !p)}
      style={[
        styles.taskCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: isDone ? theme.colors.success + "40" : theme.colors.border,
          opacity: isDone ? 0.7 : 1,
        },
      ]}
    >
      {/* Category accent bar */}
      <View style={[styles.taskAccentBar, { backgroundColor: isDone ? theme.colors.success : categoryColor }]} />

      <View style={styles.taskBody}>
        {/* Header */}
        <View style={styles.taskTop}>
          <Pressable onPress={onToggle} hitSlop={10}>
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: isDone ? theme.colors.success : theme.colors.muted + "60",
                  backgroundColor: isDone ? theme.colors.success + "20" : "transparent",
                },
              ]}
            >
              {isDone && (
                <Ionicons name="checkmark" size={14} color={theme.colors.success} />
              )}
            </View>
          </Pressable>
          <View style={styles.taskInfo}>
            <View style={styles.taskNameRow}>
              <Text
                style={[
                  styles.taskName,
                  {
                    color: isDone ? theme.colors.muted : theme.colors.text,
                    textDecorationLine: isDone ? "line-through" : "none",
                  },
                ]}
              >
                {task.name}
              </Text>
              {task.prepStyle === "marinate" && (
                <View style={[styles.marinateChip, { borderColor: "#58A6FF50" }]}>
                  <Text style={styles.marinateChipText}>MARINATE</Text>
                </View>
              )}
            </View>
            {task.quantity ? (
              <Text style={[styles.taskQuantity, { color: categoryColor }]}>
                {task.quantity}{task.servingsCount > 0 ? ` · ${task.servingsCount} servings` : ""}
              </Text>
            ) : null}
            <Text style={[styles.taskMetaText, { color: theme.colors.muted }]}>
              {task.prepStyle === "marinate" ? `${totalTime} min prep` : `${totalTime} min`}
              {" · "}
              {task.storage.location === "fridge" ? "Fridge" : "Freezer"}
              {task.prepStyle === "marinate" && task.cookDayOfMinutes
                ? ` · ${task.cookDayOfMinutes} min cook day-of`
                : ""}
              {task.storage.expiryStatus === "tight" ? " · Use soon" : ""}
              {task.storage.expiryStatus === "unsafe" ? " · Freeze!" : ""}
            </Text>
          </View>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={theme.colors.muted}
          />
        </View>

        {/* Expanded content */}
        {expanded && (
          <View style={styles.expandedContent}>
            <Text style={[styles.instructionsText, { color: theme.colors.text }]}>
              {task.instructions}
            </Text>

            {task.storage.expiryStatus !== "ok" && (
              <View style={[styles.warningRow, { backgroundColor: expiry.bg }]}>
                <Ionicons name="alert-circle" size={14} color={expiry.text} />
                <Text style={[styles.warningText, { color: expiry.text }]}>
                  {expiry.label} — {task.storage.shelfLifeDays} day shelf life
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ── Start Button (spring press) ──────────────────────────────────────────────

function StartButton({ theme, onPress }: { theme: any; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 12, stiffness: 200 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
    >
      <Animated.View
        style={[
          styles.startBtn,
          {
            backgroundColor: theme.colors.primary,
            ...shadowPresets.glow,
            shadowColor: theme.colors.primary,
          },
          animStyle,
        ]}
      >
        <Ionicons name="play" size={20} color={theme.colors.primaryText} />
        <Text style={[styles.startBtnText, { color: theme.colors.primaryText }]}>
          Start Prep Session
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export default function PrepDayScreen() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    plan,
    progress,
    prefs,
    loading,
    generatePlan,
    toggleTask,
    startPrepSession,
    updatePrefs,
    completionPercent,
    allDone,
    planStartDay,
  } = usePrepDay();
  const [generating, setGenerating] = useState(false);
  const [showPrepDayPicker, setShowPrepDayPicker] = useState(false);
  const currentScope = prefs.scopeDays ?? 3;

  // Compute dynamic subtitle showing actual day range being prepped
  const scopeSubtitle = useMemo(() => {
    if (currentScope === 0) return "Some items may need freezing";
    const today = todayDayIndex();
    const planNotStartedYet = today < planStartDay;
    const effectiveStart = planNotStartedYet ? planStartDay : today;
    const endIdx = Math.min(6, effectiveStart + currentScope - 1);
    const startName = DAY_NAMES[effectiveStart];
    const endName = DAY_NAMES[endIdx];
    if (startName === endName) return `${startName} only`;
    return `${startName} – ${endName}`;
  }, [currentScope, planStartDay]);

  const handleScopeChange = useCallback(async (scopeDays: number) => {
    await updatePrefs({ scopeDays });
    setGenerating(true);
    await generatePlan(undefined, scopeDays);
    setGenerating(false);
  }, [updatePrefs, generatePlan]);

  // Check if we need to generate/regenerate on mount
  useEffect(() => {
    if (loading || generating) return;

    async function check() {
      const mealPlan = await loadMealPlan();
      if (!mealPlan.weekKey) return;

      // Always regenerate when the meal plan is for next week — prep should
      // cover the full upcoming week, not just the prep day itself
      const planIsNextWeek = mealPlan.weekKey > getWeekKey(0);
      const needsGenerate =
        !plan ||
        plan.weekKey !== mealPlan.weekKey ||
        mealPlan.generatedAt > (plan.generatedAt ?? "") ||
        planIsNextWeek;

      if (needsGenerate) {
        // Show prep day picker if user hasn't chosen yet
        if (!prefs.onboardingComplete) {
          setShowPrepDayPicker(true);
        } else {
          setGenerating(true);
          await generatePlan();
          setGenerating(false);
        }
      }
    }
    check();
  }, [loading, plan?.weekKey, plan?.generatedAt]);

  const handlePickPrepDay = useCallback(async (dayIndex: number) => {
    setShowPrepDayPicker(false);
    await updatePrefs({ prepDay: dayIndex, onboardingComplete: true });
    setGenerating(true);
    await generatePlan(dayIndex);
    setGenerating(false);
  }, [updatePrefs, generatePlan]);

  const handleChangePrepDay = useCallback(() => {
    setShowPrepDayPicker(true);
  }, []);

  if (loading || generating) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!plan || plan.tasks.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg }]}>
        {/* Show prep day picker even on the empty state so first-time users can pick a day */}
        <Modal
          visible={showPrepDayPicker}
          animationType="fade"
          transparent
          onRequestClose={() => setShowPrepDayPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="calendar-outline" size={32} color={theme.colors.primary} />
              <Text style={[typography.heading, { color: theme.colors.text, marginTop: spacing.sm }]}>
                When are you prepping?
              </Text>
              <Text style={[typography.small, { color: theme.colors.muted, textAlign: "center", marginTop: spacing.xs }]}>
                Pick the day you'll batch cook. We'll calculate shelf life from that day.
              </Text>
              <View style={styles.dayGrid}>
                {DAY_NAMES.map((name, idx) => {
                  const isToday = idx === todayDayIndex();
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => handlePickPrepDay(idx)}
                      style={[
                        styles.dayBtn,
                        {
                          backgroundColor: isToday ? theme.colors.primary + "20" : theme.colors.mutedBg,
                          borderColor: isToday ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                    >
                      <Text style={[typography.body, { color: isToday ? theme.colors.primary : theme.colors.text, fontWeight: "600" }]}>
                        {name}
                      </Text>
                      {isToday && (
                        <Text style={[typography.caption, { color: theme.colors.primary }]}>Today</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>

        <Ionicons name="nutrition-outline" size={48} color={theme.colors.muted} />
        <Text style={[typography.body, { color: theme.colors.muted, marginTop: spacing.md, textAlign: "center" }]}>
          No preppable components found in this week's plan.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backLink, { borderColor: theme.colors.border }]}
        >
          <Text style={[typography.body, { color: theme.colors.primary }]}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Group tasks by category
  const grouped = plan.tasks.reduce<Record<string, PrepTask[]>>((acc, task) => {
    const key = task.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  const handleStart = () => {
    startPrepSession();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Prep Day Picker Modal */}
      <Modal
        visible={showPrepDayPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowPrepDayPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="calendar-outline" size={32} color={theme.colors.primary} />
            <Text style={[typography.heading, { color: theme.colors.text, marginTop: spacing.sm }]}>
              When are you prepping?
            </Text>
            <Text style={[typography.small, { color: theme.colors.muted, textAlign: "center", marginTop: spacing.xs }]}>
              Pick the day you'll batch cook. We'll calculate shelf life from that day.
            </Text>
            <View style={styles.dayGrid}>
              {DAY_NAMES.map((name, idx) => {
                const isToday = idx === todayDayIndex();
                return (
                  <Pressable
                    key={idx}
                    onPress={() => handlePickPrepDay(idx)}
                    style={[
                      styles.dayBtn,
                      {
                        backgroundColor: isToday ? theme.colors.primary + "20" : theme.colors.mutedBg,
                        borderColor: isToday ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <Text style={[typography.body, { color: isToday ? theme.colors.primary : theme.colors.text, fontWeight: "600" }]}>
                      {name}
                    </Text>
                    {isToday && (
                      <Text style={[typography.caption, { color: theme.colors.primary }]}>Today</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
          <Text style={[typography.screenTitle, { color: theme.colors.text, flex: 1, marginLeft: spacing.sm }]}>
            Prep Day
          </Text>
          {allDone && (
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} style={{ marginLeft: spacing.xs }} />
          )}
        </Animated.View>

        {/* Scope Picker */}
        <Animated.View entering={FadeInDown.delay(60).duration(300)}>
          <View style={[styles.scopeRow, { borderColor: theme.colors.border }]}>
            {SCOPE_OPTIONS.map((opt) => {
              const active = opt.days === currentScope;
              return (
                <Pressable
                  key={opt.days}
                  onPress={() => handleScopeChange(opt.days)}
                  style={[
                    styles.scopeBtn,
                    {
                      backgroundColor: active ? theme.colors.primary + "20" : "transparent",
                      borderColor: active ? theme.colors.primary : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.scopeLabel,
                      { color: active ? theme.colors.primary : theme.colors.muted },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[typography.caption, { color: theme.colors.muted, textAlign: "center", marginBottom: spacing.md }]}>
            {scopeSubtitle}
          </Text>
        </Animated.View>

        {/* Stat Pills */}
        <Animated.View entering={FadeInDown.delay(120).duration(350)}>
          <View style={styles.statPillRow}>
            {[
              { value: plan.totalActiveMinutes, label: "min prep", color: theme.colors.text },
              { value: plan.timeSavings.savedMinutes, label: "min saved", color: theme.colors.success },
              { value: `${plan.timeSavings.savedPercent}%`, label: "less cooking", color: theme.colors.primary },
            ].map((stat, i) => (
              <View
                key={i}
                style={[
                  styles.statPill,
                  {
                    backgroundColor: (typeof stat.color === "string" ? stat.color : theme.colors.primary) + "12",
                    borderColor: (typeof stat.color === "string" ? stat.color : theme.colors.primary) + "40",
                  },
                ]}
              >
                <Text style={[styles.statPillValue, { color: stat.color }]}>
                  {stat.value}
                </Text>
                <Text style={[styles.statPillLabel, { color: theme.colors.muted }]}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Progress bar */}
        <Animated.View entering={FadeInDown.delay(160).duration(350)}>
          <View style={[styles.progressTrack, { backgroundColor: theme.colors.mutedBg }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: allDone ? theme.colors.success : theme.colors.primary,
                  width: `${completionPercent}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressLabel, { color: theme.colors.muted }]}>
            {progress.completedTaskIds.length}/{plan.tasks.length} tasks done
          </Text>
        </Animated.View>

        {/* Start Button (if not started) */}
        {!progress.startedAt && (
          <Animated.View entering={FadeInDown.delay(200).duration(350)}>
            <StartButton theme={theme} onPress={handleStart} />
          </Animated.View>
        )}

        {/* Task Groups */}
        {Object.entries(grouped).map(([category, tasks], groupIdx) => {
          const meta = CATEGORY_META[category as PrepCategory];
          return (
            <Animated.View
              key={category}
              entering={FadeInDown.delay(200 + groupIdx * 60).duration(350)}
            >
              <View style={styles.groupHeader}>
                <View style={[styles.groupIconWrap, { backgroundColor: meta.color + "18" }]}>
                  <Ionicons name={meta.icon} size={14} color={meta.color} />
                </View>
                <View>
                  <Text style={[styles.groupEyebrow, { color: meta.color }]}>
                    {meta.label.toUpperCase()}
                  </Text>
                  <Text style={[styles.groupCount, { color: theme.colors.muted }]}>
                    {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>

              {tasks.map((task) => {
                const isDone = progress.completedTaskIds.includes(task.id);
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isDone={isDone}
                    categoryColor={meta.color}
                    theme={theme}
                    onToggle={() => toggleTask(task.id)}
                  />
                );
              })}
            </Animated.View>
          );
        })}

        {/* Completion section */}
        {allDone && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.doneSection}>
            <Ionicons name="checkmark-done-circle" size={40} color={theme.colors.success} />
            <Text style={[typography.subheading, { color: theme.colors.text, marginTop: spacing.sm }]}>
              Prep Complete!
            </Text>
            <Text style={[typography.small, { color: theme.colors.muted, textAlign: "center", marginTop: spacing.xs }]}>
              {currentScope === 0
                ? "Your meals are prepped for the week."
                : `Your next ${currentScope} days are prepped.`}{" "}
              Each meal is now a quick assembly.
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={[styles.doneBtn, { backgroundColor: theme.colors.success }]}
            >
              <Text style={[typography.subheading, { color: theme.colors.successText }]}>
                Done
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  scroll: { paddingHorizontal: spacing.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  scopeRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  scopeBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md - 1,
  },
  scopeLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  statPillRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 2,
  },
  statPillValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  statPillLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: radius.full,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.full,
    minWidth: 4,
  },
  progressLabel: {
    fontSize: typography.caption.fontSize,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  startBtnText: {
    fontSize: 17,
    fontWeight: "700",
    marginLeft: spacing.sm,
    letterSpacing: 0.5,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  groupIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  groupEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  groupCount: {
    fontSize: 11,
    marginTop: 1,
  },
  taskCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  taskAccentBar: {
    width: 4,
  },
  taskBody: {
    flex: 1,
    padding: spacing.md,
  },
  taskTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  taskInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  taskNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  taskName: {
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
  marinateChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    backgroundColor: "#58A6FF12",
  },
  marinateChipText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#58A6FF",
    letterSpacing: 0.8,
  },
  taskQuantity: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  taskMetaText: {
    fontSize: 12,
    marginTop: 2,
  },
  expandedContent: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 21,
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  warningText: {
    fontSize: 12,
    fontWeight: "600",
  },
  doneSection: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  doneBtn: {
    marginTop: spacing.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl * 2,
    borderRadius: radius.md,
  },
  backLink: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modalCard: {
    width: "100%",
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
  },
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  dayBtn: {
    width: 72,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
  },
});

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import RNAnimated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LockeMascot } from "../../components/Locke/LockeMascot";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useRouter } from "expo-router";
import { usePlanContext } from "../../contexts/PlanContext";
import { useWorkouts } from "../../hooks/useWorkouts";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import { Skeleton } from "../../components/Skeleton";
import { AppBottomSheet } from "../../components/AppBottomSheet";
import { useAppTheme } from "../../contexts/ThemeContext";
import { ProfileButton } from "../../components/ProfileButton";
import { ExercisePicker } from "../../components/plan-builder/ExercisePicker";
import { useToast } from "../../contexts/ToastContext";
import { useProfileContext } from "../../contexts/ProfileContext";
import { spacing, radius } from "../../lib/theme";
import type { Exercise } from "../../lib/types";
import {
  smartParse,
  groupByWeekDay,
  getBlockLabel,
  parseGoogleSheetsUrl,
  looksLikeHtml,
  validateParsedPlan,
} from "../../lib/importPlan";
import type { DayGroup, WeekGroup } from "../../lib/importPlan";

// ── Types ─────────────────────────────────────────────────────────────────────

type DayCardState = "completed" | "next-up" | "available" | "locked";
type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

// ── ExerciseCard ──────────────────────────────────────────────────────────────

function ExerciseCard({ exercise: ex }: { exercise: Exercise }) {
  const { theme } = useAppTheme();
  return (
    <Card style={exStyles.card}>
      <View style={exStyles.top}>
        <Text style={[exStyles.name, { color: theme.colors.text }]}>{ex.exercise}</Text>
        <View style={exStyles.badges}>
          {ex.sets   && <Badge label={`${ex.sets} sets`} />}
          {ex.reps   && <Badge label={`${ex.reps} reps`} />}
          {ex.weight && <Badge label={ex.weight} variant="dark" />}
        </View>
      </View>
      {!!ex.comments && (
        <Text style={[exStyles.comments, { color: theme.colors.muted }]}>{ex.comments}</Text>
      )}
    </Card>
  );
}

const exStyles = StyleSheet.create({
  card:     { marginBottom: 8 },
  top:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  name:     { fontSize: 15, fontWeight: "700", flexShrink: 1 },
  badges:   { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" },
  comments: { marginTop: 8, fontSize: 13, fontStyle: "italic" },
});

// ── WeekPills — horizontal scrollable week selector ──────────────────────────

function WeekPills({ weeks, selectedWeek, onSelect, isDayCompleted }: {
  weeks: WeekGroup[];
  selectedWeek: number;
  onSelect: (idx: number) => void;
  isDayCompleted: (week: string, day: string) => boolean;
}) {
  const { theme } = useAppTheme();

  const isWeekComplete = (wg: WeekGroup) =>
    wg.days.length > 0 && wg.days.every((d) => isDayCompleted(wg.week, d.day));

  const weekHasProgress = (wg: WeekGroup) =>
    wg.days.some((d) => isDayCompleted(wg.week, d.day));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={wpStyles.container}
    >
      {weeks.map((wg, i) => {
        const isActive = i === selectedWeek;
        const complete = isWeekComplete(wg);
        const hasProgress = weekHasProgress(wg);
        const doneDays = wg.days.filter((d) => isDayCompleted(wg.week, d.day)).length;

        return (
          <Pressable
            key={wg.week}
            onPress={() => onSelect(i)}
            style={[
              wpStyles.pill,
              {
                backgroundColor: isActive
                  ? theme.colors.primary + "18"
                  : complete
                  ? theme.colors.success + "12"
                  : theme.colors.surface,
                borderColor: isActive
                  ? theme.colors.primary
                  : complete
                  ? theme.colors.success + "55"
                  : theme.colors.border,
              },
            ]}
          >
            {complete && (
              <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} style={{ marginRight: 4 }} />
            )}
            <Text
              style={[
                wpStyles.pillText,
                {
                  color: isActive
                    ? theme.colors.primary
                    : complete
                    ? theme.colors.success
                    : theme.colors.muted,
                },
              ]}
            >
              W{i + 1}
            </Text>
            {!complete && hasProgress && (
              <View style={[wpStyles.progressDot, { backgroundColor: theme.colors.primary }]} />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const wpStyles = StyleSheet.create({
  container:   { gap: 8, paddingVertical: 4, paddingHorizontal: 2 },
  pill:        {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    minWidth: 52,
    justifyContent: "center",
  },
  pillText:    { fontSize: 13, fontWeight: "700" },
  progressDot: { width: 5, height: 5, borderRadius: 3, marginLeft: 5 },
});

// ── DayCard (redesigned) ─────────────────────────────────────────────────────

function inferMuscleTags(exercises: Exercise[]): string[] {
  const tags = new Set<string>();
  for (const ex of exercises) {
    const n = ex.exercise.toLowerCase();
    if (/bench|push.?up|chest\s?fly|dip/i.test(n))           tags.add("Chest");
    if (/squat|leg\s?press|lunge|split\s?squat/i.test(n))    tags.add("Legs");
    if (/deadlift|rdl|hip\s?thrust|good\s?morning/i.test(n)) tags.add("Posterior");
    if (/row|pull.?up|chin.?up|lat/i.test(n))                tags.add("Back");
    if (/ohp|press|shoulder|lateral\s?raise|delt/i.test(n))   tags.add("Shoulders");
    if (/curl|bicep/i.test(n))                                tags.add("Biceps");
    if (/tricep|skull\s?crush|pushdown/i.test(n))             tags.add("Triceps");
    if (/ab|crunch|plank|core/i.test(n))                      tags.add("Core");
  }
  return Array.from(tags).slice(0, 3);
}

function DayCard({ dayGroup, state, isStarting, isExpanded, onToggle, onStart, onEdit, onRemoveExercise }: {
  dayGroup: DayGroup;
  state: DayCardState;
  isStarting: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onStart: () => void;
  onEdit?: () => void;
  onRemoveExercise?: (exerciseName: string, index: number) => void;
}) {
  const { theme } = useAppTheme();
  const isCompleted = state === "completed";
  const isNextUp    = state === "next-up";
  const isLocked    = state === "locked";

  // Show up to 3 exercise names in preview
  const previewNames = dayGroup.exercises.slice(0, 3).map((e) => e.exercise);
  const moreCount = Math.max(0, dayGroup.exercises.length - 3);
  const muscleTags = useMemo(() => inferMuscleTags(dayGroup.exercises), [dayGroup.exercises]);
  const totalSets = useMemo(() => dayGroup.exercises.reduce((s, e) => s + (parseInt(e.sets, 10) || 3), 0), [dayGroup.exercises]);

  return (
    <Pressable
      onPress={isLocked ? undefined : onToggle}
      disabled={isLocked}
      style={[
        dcStyles.container,
        {
          backgroundColor: isNextUp
            ? theme.colors.primary + "0D"
            : isCompleted
            ? theme.colors.surface
            : theme.colors.surface,
          borderColor: isNextUp
            ? theme.colors.primary + "66"
            : "transparent",
          opacity: isLocked ? 0.35 : 1,
        },
        isNextUp && dcStyles.nextUpShadow,
      ]}
    >
      {/* Left accent bar */}
      <View
        style={[
          dcStyles.accentBar,
          {
            backgroundColor: isCompleted
              ? theme.colors.success
              : isNextUp
              ? theme.colors.primary
              : theme.colors.border + "44",
          },
        ]}
      />

      <View style={dcStyles.inner}>
        {/* Header row */}
        <View style={dcStyles.header}>
          <View style={dcStyles.headerLeft}>
            <View style={dcStyles.titleRow}>
              {isCompleted ? (
                <View style={[dcStyles.statusIcon, { backgroundColor: theme.colors.success + "22" }]}>
                  <Ionicons name="checkmark" size={12} color={theme.colors.success} />
                </View>
              ) : isNextUp ? (
                <View style={[dcStyles.statusIcon, { backgroundColor: theme.colors.primary + "22" }]}>
                  <Ionicons name="play" size={10} color={theme.colors.primary} />
                </View>
              ) : (
                <View style={[dcStyles.statusIcon, { backgroundColor: theme.colors.mutedBg }]}>
                  <Text style={{ color: theme.colors.muted, fontSize: 10, fontWeight: "700" }}>
                    {dayGroup.day.replace(/\D/g, "")}
                  </Text>
                </View>
              )}
              <Text style={[dcStyles.dayLabel, { color: isCompleted ? theme.colors.success : isNextUp ? theme.colors.primary : theme.colors.text }]}>
                {dayGroup.day}
              </Text>
              <Text style={[dcStyles.exCount, { color: theme.colors.muted }]}>
                {dayGroup.exercises.length} exercise{dayGroup.exercises.length !== 1 ? "s" : ""} · {totalSets} sets
              </Text>
            </View>

            {/* Muscle group tags */}
            {muscleTags.length > 0 && !isCompleted && !isExpanded && (
              <View style={{ flexDirection: "row", gap: 5, marginTop: 4, marginLeft: 30 }}>
                {muscleTags.map((tag) => (
                  <View key={tag} style={[dcStyles.muscleTag, { backgroundColor: isNextUp ? theme.colors.primary + "20" : theme.colors.mutedBg }]}>
                    <Text style={{ fontSize: 10, fontWeight: "600", color: isNextUp ? theme.colors.primary : theme.colors.muted }}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Exercise preview — compact list */}
            {!isExpanded && !isNextUp && previewNames.length > 0 && (
              <Text style={[dcStyles.preview, { color: theme.colors.muted }]} numberOfLines={1}>
                {previewNames.join(" · ")}{moreCount > 0 ? ` +${moreCount}` : ""}
              </Text>
            )}
          </View>

          <View style={dcStyles.headerRight}>
            {!isLocked && !isNextUp && !isCompleted && (
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={theme.colors.muted}
              />
            )}
          </View>
        </View>

        {/* Next-up: show exercises + prominent CTA */}
        {isNextUp && (
          <View style={{ marginTop: 10 }}>
            {previewNames.map((name, i) => (
              <View key={i} style={dcStyles.nextUpExRow}>
                <View style={[dcStyles.nextUpDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={[dcStyles.nextUpExName, { color: theme.colors.text }]}>{name}</Text>
              </View>
            ))}
            {moreCount > 0 && (
              <Text style={[dcStyles.nextUpMore, { color: theme.colors.muted }]}>
                +{moreCount} more
              </Text>
            )}
            <Pressable
              style={[dcStyles.startBtn, { backgroundColor: theme.colors.primary, opacity: isStarting ? 0.5 : 1 }]}
              disabled={isStarting}
              onPress={onStart}
            >
              {isStarting ? (
                <ActivityIndicator size="small" color={theme.colors.primaryText} />
              ) : (
                <View style={dcStyles.startBtnInner}>
                  <Ionicons name="play" size={14} color={theme.colors.primaryText} />
                  <Text style={[dcStyles.startBtnText, { color: theme.colors.primaryText }]}>
                    Start Workout
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        )}

        {/* Expanded exercise list (non-next-up) */}
        {isExpanded && !isLocked && !isNextUp && (
          <View style={{ marginTop: 8 }}>
            {dayGroup.exercises.map((ex, i) => (
              <View key={`${ex.exercise}-${i}`} style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <ExerciseCard exercise={ex} />
                </View>
                {!isCompleted && onRemoveExercise && (
                  <Pressable
                    onPress={() => onRemoveExercise(ex.exercise, i)}
                    hitSlop={8}
                    style={{ paddingLeft: 8 }}
                  >
                    <Ionicons name="close-circle" size={18} color={theme.colors.danger} />
                  </Pressable>
                )}
              </View>
            ))}

            {/* Action row: Add exercise + Start */}
            <View style={dcStyles.expandedActions}>
              {!isCompleted && onEdit && (
                <Pressable onPress={onEdit} style={dcStyles.addExBtn}>
                  <Ionicons name="add-circle-outline" size={15} color={theme.colors.accent} />
                  <Text style={{ color: theme.colors.accent, fontSize: 12, fontWeight: "600", marginLeft: 5 }}>Add</Text>
                </Pressable>
              )}
              {!isCompleted && (
                <Pressable
                  onPress={onStart}
                  disabled={isStarting}
                  style={[dcStyles.inlineStartBtn, { backgroundColor: theme.colors.primary, opacity: isStarting ? 0.5 : 1 }]}
                >
                  <Ionicons name="play" size={12} color={theme.colors.primaryText} />
                  <Text style={{ color: theme.colors.primaryText, fontSize: 12, fontWeight: "700", marginLeft: 5 }}>Start</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const dcStyles = StyleSheet.create({
  container:      { flexDirection: "row", borderRadius: 14, overflow: "hidden", borderWidth: 1 },
  nextUpShadow:   { shadowColor: "#00875A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4 },
  accentBar:      { width: 3 },
  inner:          { flex: 1, padding: 14 },
  header:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft:     { flex: 1, paddingRight: 8 },
  titleRow:       { flexDirection: "row", alignItems: "center", gap: 8 },
  statusIcon:     { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  dayLabel:       { fontSize: 15, fontWeight: "700" },
  exCount:        { fontSize: 12 },
  preview:        { fontSize: 12, lineHeight: 16, marginTop: 4, marginLeft: 30 },
  headerRight:    { flexDirection: "row", alignItems: "center", gap: 6 },
  doneLabel:      { fontSize: 12, fontWeight: "600" },
  muscleTag:      { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  nextUpExRow:    { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 30, marginBottom: 4 },
  nextUpDot:      { width: 5, height: 5, borderRadius: 3 },
  nextUpExName:   { fontSize: 13 },
  nextUpMore:     { fontSize: 12, marginLeft: 43, marginBottom: 4 },
  startBtn:       { borderRadius: 10, paddingVertical: 12, marginTop: 10, alignItems: "center" },
  startBtnInner:  { flexDirection: "row", alignItems: "center", gap: 8 },
  startBtnText:   { fontSize: 14, fontWeight: "700" },
  expandedActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 6, paddingTop: 6 },
  addExBtn:       { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 10 },
  inlineStartBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8 },
});

// ── Coach encouragement based on progress ────────────────────────────────────

function getCoachLine(pct: number): string {
  if (pct >= 1)    return "You crushed this plan. Absolute alpha.";
  if (pct >= 0.75) return "Almost there — finish what you started.";
  if (pct >= 0.5)  return "Halfway through. No slowing down.";
  if (pct >= 0.25) return "Building momentum. Keep showing up.";
  if (pct > 0)     return "Good start. Consistency is everything.";
  return "Let's get this plan moving.";
}

// ── ProgressBar — compact inline progress ────────────────────────────────────

function ProgressBar({ doneDays, totalDays, currentWeek, totalWeeks }: {
  doneDays: number;
  totalDays: number;
  currentWeek: number;
  totalWeeks: number;
}) {
  const { theme } = useAppTheme();
  const pct = totalDays > 0 ? doneDays / totalDays : 0;
  const pctStr = `${Math.round(pct * 100)}%` as `${number}%`;
  const coachLine = getCoachLine(pct);
  const isComplete = doneDays === totalDays && totalDays > 0;

  return (
    <View style={[pbStyles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={pbStyles.topRow}>
        <View style={pbStyles.leftInfo}>
          {isComplete ? (
            <View style={pbStyles.completeRow}>
              <Ionicons name="trophy" size={14} color={theme.colors.success} />
              <Text style={[pbStyles.completeText, { color: theme.colors.success }]}>Plan Complete!</Text>
            </View>
          ) : (
            <Text style={[pbStyles.statusText, { color: theme.colors.text }]}>
              Day {doneDays + 1} of {totalDays}
              {totalWeeks > 1 && (
                <Text style={{ color: theme.colors.muted }}> · Week {currentWeek}</Text>
              )}
            </Text>
          )}
        </View>
        <Text style={[pbStyles.pctText, { color: theme.colors.primary }]}>{pctStr}</Text>
      </View>

      {/* Thin progress bar */}
      <View style={[pbStyles.track, { backgroundColor: theme.colors.mutedBg }]}>
        <View
          style={[
            pbStyles.fill,
            {
              backgroundColor: isComplete ? theme.colors.success : theme.colors.primary,
              width: pctStr,
            },
          ]}
        />
      </View>

      {/* Coach line — subtle, one line */}
      <Text style={[pbStyles.coachLine, { color: theme.colors.muted }]} numberOfLines={1}>
        {coachLine}
      </Text>
    </View>
  );
}

const pbStyles = StyleSheet.create({
  container:    { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  topRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  leftInfo:     { flex: 1 },
  statusText:   { fontSize: 14, fontWeight: "600" },
  pctText:      { fontSize: 14, fontWeight: "700" },
  track:        { height: 4, borderRadius: 999, overflow: "hidden" },
  fill:         { height: "100%", borderRadius: 999, position: "absolute", left: 0, top: 0 },
  coachLine:    { fontSize: 12, marginTop: 6 },
  completeRow:  { flexDirection: "row", alignItems: "center", gap: 5 },
  completeText: { fontSize: 14, fontWeight: "700" },
});

// ── EmptyPlanState ────────────────────────────────────────────────────────────

function EmptyPlanState({ onCreate, onCatalog, onImport }: {
  onCreate: () => void;
  onCatalog: () => void;
  onImport: () => void;
}) {
  const { theme } = useAppTheme();
  const router = useRouter();

  // Press feedback
  const customScale = useSharedValue(1);
  const catalogScale = useSharedValue(1);
  const importScale = useSharedValue(1);
  const fuelScale = useSharedValue(1);

  const customPress = useAnimatedStyle(() => ({
    transform: [{ scale: customScale.value }],
    opacity: customScale.value < 1 ? 0.9 : 1,
  }));
  const catalogPress = useAnimatedStyle(() => ({
    transform: [{ scale: catalogScale.value }],
    opacity: catalogScale.value < 1 ? 0.9 : 1,
  }));
  const importPress = useAnimatedStyle(() => ({
    transform: [{ scale: importScale.value }],
    opacity: importScale.value < 1 ? 0.9 : 1,
  }));
  const fuelPress = useAnimatedStyle(() => ({
    transform: [{ scale: fuelScale.value }],
    opacity: fuelScale.value < 1 ? 0.9 : 1,
  }));

  const onIn = (sv: typeof customScale) => { sv.value = withTiming(0.96, { duration: 100 }); };
  const onOut = (sv: typeof customScale) => { sv.value = withTiming(1, { duration: 150 }); };

  // Glow pulse
  const glowOpacity = useSharedValue(0.12);
  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.12, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  return (
    <View style={epStyles.container}>
      {/* Mascot with glow */}
      <RNAnimated.View entering={FadeIn.duration(200)} style={epStyles.mascotWrap}>
        <View style={[epStyles.mascotRing, { borderColor: theme.colors.primary + "15" }]} />
        <RNAnimated.View style={[epStyles.mascotGlow, { backgroundColor: theme.colors.primary }, glowStyle]} />
        <LockeMascot size={160} mood="encouraging" />
      </RNAnimated.View>

      {/* Greeting — no bubble */}
      <RNAnimated.View entering={FadeInDown.delay(100).duration(250)} style={epStyles.greetingWrap}>
        <Text style={[epStyles.headline, { color: theme.colors.text }]}>
          Time to hunt.
        </Text>
        <Text style={[epStyles.subline, { color: theme.colors.muted }]}>
          Pick a plan and I'll coach you through it.
        </Text>
      </RNAnimated.View>

      {/* Section label */}
      <RNAnimated.View entering={FadeIn.delay(200).duration(200)} style={epStyles.sectionLabelWrap}>
        <View style={[epStyles.labelLine, { backgroundColor: theme.colors.border }]} />
        <Text style={[epStyles.sectionLabel, { color: theme.colors.muted }]}>GET STARTED</Text>
        <View style={[epStyles.labelLine, { backgroundColor: theme.colors.border }]} />
      </RNAnimated.View>

      {/* Action cards — vertical stack */}
      <View style={epStyles.cardsWrap}>
        {/* Custom Plans */}
        <RNAnimated.View entering={FadeInDown.delay(220).duration(300)}>
        <Pressable
          onPress={onCreate}
          onPressIn={() => onIn(customScale)}
          onPressOut={() => onOut(customScale)}
        >
          <RNAnimated.View
            style={[
              epStyles.secondaryCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              customPress,
            ]}
          >
            <View style={[epStyles.cardAccent, { backgroundColor: theme.colors.primary }]} />
            <View style={[epStyles.cardIconWrap, { backgroundColor: theme.colors.primary + "15" }]}>
              <Ionicons name="hammer-outline" size={22} color={theme.colors.primary} />
            </View>
            <View style={epStyles.cardContent}>
              <Text style={[epStyles.secondaryLabel, { color: theme.colors.text }]}>Custom Plans</Text>
              <Text style={[epStyles.cardHint, { color: theme.colors.muted }]}>Build from scratch or continue a saved draft</Text>
            </View>
            <View style={[epStyles.secondaryArrow, { backgroundColor: theme.colors.primary + "12" }]}>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
            </View>
          </RNAnimated.View>
        </Pressable>
        </RNAnimated.View>

        {/* Secondary: Browse Catalog */}
        <RNAnimated.View entering={FadeInDown.delay(290).duration(300)}>
        <Pressable
          onPress={onCatalog}
          onPressIn={() => onIn(catalogScale)}
          onPressOut={() => onOut(catalogScale)}
        >
          <RNAnimated.View
            style={[
              epStyles.secondaryCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              catalogPress,
            ]}
          >
            <View style={[epStyles.cardAccent, { backgroundColor: "#8B5CF6" }]} />
            <View style={[epStyles.cardIconWrap, { backgroundColor: "#8B5CF6" + "15" }]}>
              <Ionicons name="grid-outline" size={22} color="#8B5CF6" />
            </View>
            <View style={epStyles.cardContent}>
              <Text style={[epStyles.secondaryLabel, { color: theme.colors.text }]}>Browse Catalog</Text>
              <Text style={[epStyles.cardHint, { color: theme.colors.muted }]}>Proven programs for strength & hypertrophy</Text>
            </View>
            <View style={[epStyles.secondaryArrow, { backgroundColor: "#8B5CF6" + "12" }]}>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
            </View>
          </RNAnimated.View>
        </Pressable>
        </RNAnimated.View>

        {/* Tertiary: Import Plan */}
        <RNAnimated.View entering={FadeInDown.delay(360).duration(300)}>
        <Pressable
          onPress={onImport}
          onPressIn={() => onIn(importScale)}
          onPressOut={() => onOut(importScale)}
        >
          <RNAnimated.View
            style={[
              epStyles.secondaryCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              importPress,
            ]}
          >
            <View style={[epStyles.cardAccent, { backgroundColor: "#F59E0B" }]} />
            <View style={[epStyles.cardIconWrap, { backgroundColor: "#F59E0B" + "15" }]}>
              <Ionicons name="document-text-outline" size={22} color="#F59E0B" />
            </View>
            <View style={epStyles.cardContent}>
              <Text style={[epStyles.secondaryLabel, { color: theme.colors.text }]}>Import Plan</Text>
              <Text style={[epStyles.cardHint, { color: theme.colors.muted }]}>Upload a CSV, Excel, or Google Sheets link</Text>
            </View>
            <View style={[epStyles.secondaryArrow, { backgroundColor: "#F59E0B" + "12" }]}>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
            </View>
          </RNAnimated.View>
        </Pressable>
        </RNAnimated.View>

        {/* Fuel Plan */}
        <RNAnimated.View entering={FadeInDown.delay(430).duration(300)}>
        <Pressable
          onPress={() => router.push("/meals")}
          onPressIn={() => onIn(fuelScale)}
          onPressOut={() => onOut(fuelScale)}
        >
          <RNAnimated.View
            style={[
              epStyles.secondaryCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              fuelPress,
            ]}
          >
            <View style={[epStyles.cardAccent, { backgroundColor: "#E5793B" }]} />
            <View style={[epStyles.cardIconWrap, { backgroundColor: "#E5793B" + "15" }]}>
              <Ionicons name="restaurant-outline" size={22} color="#E5793B" />
            </View>
            <View style={epStyles.cardContent}>
              <Text style={[epStyles.secondaryLabel, { color: theme.colors.text }]}>Fuel Plan</Text>
              <Text style={[epStyles.cardHint, { color: theme.colors.muted }]}>Weekly meals, macros & grocery lists</Text>
            </View>
            <View style={[epStyles.secondaryArrow, { backgroundColor: "#E5793B" + "12" }]}>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
            </View>
          </RNAnimated.View>
        </Pressable>
        </RNAnimated.View>
      </View>
    </View>
  );
}

const epStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
    paddingHorizontal: spacing.lg,
  },
  // Mascot
  mascotWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  mascotRing: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
  },
  mascotGlow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  // Greeting
  greetingWrap: {
    alignItems: "center",
    marginBottom: 28,
  },
  headline: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subline: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  // Section label
  sectionLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 12,
    width: "100%",
  },
  labelLine: {
    flex: 1,
    height: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  // Cards
  cardsWrap: {
    gap: 12,
    width: "100%",
  },
  secondaryCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    overflow: "hidden",
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
  },
  secondaryLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  cardHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  secondaryArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PlanScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { planName, exercises, loading, clearPlan, isDayCompleted, completedDays, setPlan, recalculateWeights, updateDayExercises } = usePlanContext();
  const { workouts, startSessionFromPlan, getActiveSession } = useWorkouts();
  const { profile } = useProfileContext();
  const { showToast } = useToast();

  const [selectedWeek, setSelectedWeek]           = useState(0);
  const [urlModalVisible, setUrlModalVisible]     = useState(false);
  const [sheetUrl, setSheetUrl]                   = useState("");
  const [importing, setImporting]                 = useState(false);
  const [startingDay, setStartingDay]             = useState<string | null>(null);
  const [expandedDays, setExpandedDays]           = useState<Record<string, boolean>>({});
  const [recalculating, setRecalculating]         = useState(false);
  const [ormPromptData, setOrmPromptData]         = useState<{ week: string; day: string; exs: Exercise[] } | null>(null);
  const [editingDay, setEditingDay]               = useState<{ week: string; day: string } | null>(null);
  const [editPickerVisible, setEditPickerVisible] = useState(false);
  const [menuVisible, setMenuVisible]             = useState(false);

  const weeks = useMemo(() => groupByWeekDay(exercises), [exercises]);

  const activeWeek = weeks[selectedWeek];

  function isWeekUnlocked(weekIndex: number): boolean {
    if (weekIndex === 0) return true;
    const prevWeek = weeks[weekIndex - 1];
    return prevWeek?.days.every((d) => isDayCompleted(prevWeek.week, d.day)) ?? false;
  }

  const activeWeekLocked = !isWeekUnlocked(selectedWeek);

  const nextIncompleteTarget = useMemo<{ weekIndex: number; weekGroup: WeekGroup; dayGroup: DayGroup } | null>(() => {
    for (let wi = 0; wi < weeks.length; wi++) {
      if (!isWeekUnlocked(wi)) break;
      const wg = weeks[wi];
      for (const dg of wg.days) {
        if (!isDayCompleted(wg.week, dg.day)) return { weekIndex: wi, weekGroup: wg, dayGroup: dg };
      }
    }
    return null;
  }, [weeks, completedDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const { totalDays, doneDays } = useMemo(() => {
    let total = 0, done = 0;
    for (const wg of weeks) {
      for (const dg of wg.days) {
        total++;
        if (isDayCompleted(wg.week, dg.day)) done++;
      }
    }
    return { totalDays: total, doneDays: done };
  }, [weeks, completedDays]);

  // Auto-advance to the week with the next incomplete day on plan load
  useEffect(() => {
    if (weeks.length === 0) return;
    if (nextIncompleteTarget) setSelectedWeek(nextIncompleteTarget.weekIndex);
  }, [weeks.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  function toggleDay(dayKey: string) {
    setExpandedDays((prev) => ({ ...prev, [dayKey]: !prev[dayKey] }));
  }

  function showImportPicker() {
    router.push("/import-drive");
  }

  const handleFileImport = useCallback(async () => {
    let result;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "text/comma-separated-values",
          "text/plain",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ],
        copyToCacheDirectory: true,
      });
    } catch (e) {
      Alert.alert("File Picker Error", e instanceof Error ? e.message : "Could not open file picker.");
      return;
    }
    if (result.canceled || !result.assets?.length) return;
    const file = result.assets[0];

    try {
      let rawRows: string[][];
      if (/\.xlsx?$/i.test(file.name)) {
        const b64 = await FileSystem.readAsStringAsync(file.uri, { encoding: "base64" as const });
        const wb = XLSX.read(b64, { type: "base64" });
        rawRows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], {
          header: 1, defval: "", raw: false,
        });
      } else {
        const text = await FileSystem.readAsStringAsync(file.uri, { encoding: "utf8" as const });
        rawRows = Papa.parse<string[]>(text, { header: false }).data;
      }
      if (!rawRows.length) {
        Alert.alert("Import Error", "No data rows found in the file.");
        return;
      }
      const normalized = smartParse(rawRows);
      const validation = validateParsedPlan(normalized);
      if (!validation.valid) {
        Alert.alert("Import Error", validation.error);
        return;
      }
      const planDisplayName = file.name.replace(/\.(csv|xlsx?)$/i, "");
      setPlan(planDisplayName, normalized);
      setSelectedWeek(0);
      setExpandedDays({});
      showToast({ message: `Loaded "${planDisplayName}" — ${validation.summary.totalExercises} exercises across ${validation.summary.totalDays} days`, type: "success" });
    } catch (e) {
      Alert.alert("Import Error", `Failed to parse the file: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [setPlan, showToast]);

  const handleUrlImport = useCallback(async () => {
    const parsed = parseGoogleSheetsUrl(sheetUrl.trim());
    if (!parsed) { Alert.alert("Invalid URL", "Paste a Google Sheets share link."); return; }

    const exportUrl =
      `https://docs.google.com/spreadsheets/d/${parsed.id}/export?format=csv` +
      (parsed.gid ? `&gid=${parsed.gid}` : "");

    setImporting(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(exportUrl, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (looksLikeHtml(text)) {
        throw new Error(
          'Google returned a login page.\n\nIn Google Sheets: Share → "Anyone with the link" → Viewer.'
        );
      }
      const rawRows = Papa.parse<string[]>(text, { header: false }).data;
      if (!rawRows.length) throw new Error("No rows found");
      const normalized = smartParse(rawRows);
      const validation = validateParsedPlan(normalized);
      if (!validation.valid) {
        Alert.alert("Import Error", validation.error);
        return;
      }
      setUrlModalVisible(false);
      setSheetUrl("");
      setPlan("Google Sheet", normalized);
      setSelectedWeek(0);
      setExpandedDays({});
      showToast({ message: `Loaded plan — ${validation.summary.totalExercises} exercises across ${validation.summary.totalDays} days`, type: "success" });
    } catch (e: unknown) {
      const msg = e instanceof Error && e.name === "AbortError"
        ? "Import timed out. Check your connection and try again."
        : `Import failed: ${e instanceof Error ? e.message : String(e)}`;
      Alert.alert("Import Error", msg);
    } finally {
      clearTimeout(timeoutId);
      setImporting(false);
    }
  }, [sheetUrl]);

  function handleClear() {
    Alert.alert("Leave Plan?", "This will deactivate your current plan. You can find it again in saved plans.", [
      { text: "Cancel", style: "cancel" },
      { text: "Leave", onPress: () => { clearPlan(); setSelectedWeek(0); } },
    ]);
  }

  async function doStartSession(week: string, day: string, exs: Exercise[]) {
    setStartingDay(`${week}|${day}`);
    try {
      const id = await startSessionFromPlan(planName || "Workout", week, day, exs, profile);
      router.push(`/session/${id}`);
    } catch (e) {
      Alert.alert("Couldn't start session", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setStartingDay(null);
    }
  }

  async function launchSession(week: string, day: string, exs: Exercise[]) {
    if (exs.length === 0) { showToast({ message: "This day has no exercises.", type: "error" }); return; }
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

    if (!has1RM) {
      setOrmPromptData({ week, day, exs });
      return;
    }

    doStartSession(week, day, exs);
  }

  const has1RM = useMemo(() => {
    const m = profile.manual1RM;
    return !!(m?.deadlift || m?.squat || m?.bench || m?.ohp);
  }, [profile.manual1RM]);

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      const count = await recalculateWeights(profile, workouts);
      if (count > 0) {
        showToast({ message: `Updated weights for ${count} exercise${count !== 1 ? "s" : ""}`, type: "success" });
      } else {
        showToast({ message: "All weights are already up to date", type: "info" });
      }
    } catch {
      showToast({ message: "Failed to recalculate weights", type: "error" });
    } finally {
      setRecalculating(false);
    }
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top + spacing.md }]}>
        <Skeleton.Group>
          <Skeleton.Rect width="50%" height={24} />
          <View style={{ height: 8 }} />
          <Skeleton.Card />
          <Skeleton.Card />
        </Skeleton.Group>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top + spacing.md }]}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
            {planName || "Plan"}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {exercises.length > 0 && (
            <Pressable
              onPress={() => router.push("/plan-builder")}
              style={[styles.actionBtn, { backgroundColor: theme.colors.accent + "15" }]}
              accessibilityRole="button"
              accessibilityLabel="Edit plan"
            >
              <Ionicons name="pencil-outline" size={14} color={theme.colors.accent} />
              <Text style={[styles.actionBtnText, { color: theme.colors.accent }]}>Edit</Text>
            </Pressable>
          )}
          {exercises.length > 0 && (
            <Pressable
              onPress={() => setMenuVisible(true)}
              style={[styles.menuBtn, { backgroundColor: theme.colors.mutedBg }]}
              accessibilityRole="button"
              accessibilityLabel="More options"
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.muted} />
            </Pressable>
          )}
          <ProfileButton />
        </View>
      </View>

      {exercises.length === 0 ? (
        <EmptyPlanState
          onCreate={() => router.push("/saved-plans")}
          onCatalog={() => router.push("/catalog")}
          onImport={showImportPicker}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* ── Progress bar ─────────────────────────────────────────────── */}
          {totalDays > 0 && (
            <RNAnimated.View entering={FadeInDown.duration(300)}>
              <ProgressBar
                doneDays={doneDays}
                totalDays={totalDays}
                currentWeek={selectedWeek + 1}
                totalWeeks={weeks.length}
              />
            </RNAnimated.View>
          )}

          {/* ── Week pills ───────────────────────────────────────────────── */}
          {weeks.length > 1 && (
            <RNAnimated.View entering={FadeInDown.delay(60).duration(300)} style={{ marginBottom: 12 }}>
              <WeekPills
                weeks={weeks}
                selectedWeek={selectedWeek}
                onSelect={(idx) => {
                  if (!isWeekUnlocked(idx)) {
                    showToast({ message: "Complete previous weeks to unlock this one.", type: "info" });
                    return;
                  }
                  setSelectedWeek(idx);
                }}
                isDayCompleted={isDayCompleted}
              />
            </RNAnimated.View>
          )}

          {/* ── Day cards ────────────────────────────────────────────────── */}
          {activeWeek?.days.map((dayGroup, dayIdx) => {
            const dayKey  = `${activeWeek.week}|${dayGroup.day}`;
            const dayDone = isDayCompleted(activeWeek.week, dayGroup.day);
            const isNextUp =
              !activeWeekLocked &&
              nextIncompleteTarget?.weekGroup.week === activeWeek.week &&
              nextIncompleteTarget?.dayGroup.day === dayGroup.day;

            const dayState: DayCardState = activeWeekLocked
              ? "locked"
              : dayDone
              ? "completed"
              : isNextUp
              ? "next-up"
              : "available";

            const prevDay     = dayIdx > 0 ? activeWeek.days[dayIdx - 1] : null;
            const prevDayDone = !prevDay || isDayCompleted(activeWeek.week, prevDay.day);

            return (
              <RNAnimated.View
                key={dayGroup.day}
                entering={FadeInDown.delay(120 + dayIdx * 40).duration(300)}
                style={{ marginBottom: 10 }}
              >
                <DayCard
                  dayGroup={dayGroup}
                  state={dayState}
                  isStarting={startingDay === dayKey}
                  isExpanded={expandedDays[dayKey] ?? false}
                  onToggle={() => toggleDay(dayKey)}
                  onStart={async () => {
                    if (!dayDone && !prevDayDone && prevDay) {
                      showToast({
                        message: `Heads up — usually done after ${prevDay.day}`,
                        type: "info",
                      });
                    }
                    await launchSession(activeWeek.week, dayGroup.day, dayGroup.exercises);
                  }}
                  onEdit={() => {
                    setEditingDay({ week: activeWeek.week, day: dayGroup.day });
                    setEditPickerVisible(true);
                  }}
                  onRemoveExercise={(name, idx) => {
                    Alert.alert("Remove Exercise?", `Remove "${name}" from ${dayGroup.day}?`, [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Remove",
                        style: "destructive",
                        onPress: () => {
                          updateDayExercises(activeWeek.week, dayGroup.day, (prev) => prev.filter((_, i) => i !== idx));
                          showToast({ message: `Removed ${name}`, type: "info" });
                        },
                      },
                    ]);
                  }}
                />
              </RNAnimated.View>
            );
          })}
        </ScrollView>
      )}

      {/* ── Overflow menu ──────────────────────────────────────────────────── */}
      <AppBottomSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        snapPoints={["30%"]}
      >
        <View style={menuStyles.container}>
          {has1RM && (
            <Pressable
              style={menuStyles.item}
              onPress={() => { setMenuVisible(false); handleRecalculate(); }}
              disabled={recalculating}
            >
              <Ionicons name="refresh-outline" size={20} color={theme.colors.text} />
              <View style={menuStyles.itemText}>
                <Text style={[menuStyles.itemLabel, { color: theme.colors.text }]}>Recalculate Weights</Text>
                <Text style={[menuStyles.itemHint, { color: theme.colors.muted }]}>Update weights from your 1RM data</Text>
              </View>
            </Pressable>
          )}
          <Pressable
            style={menuStyles.item}
            onPress={() => { setMenuVisible(false); handleClear(); }}
          >
            <Ionicons name="exit-outline" size={20} color={theme.colors.text} />
            <View style={menuStyles.itemText}>
              <Text style={[menuStyles.itemLabel, { color: theme.colors.text }]}>Leave Plan</Text>
              <Text style={[menuStyles.itemHint, { color: theme.colors.muted }]}>Deactivate — find it again in saved plans</Text>
            </View>
          </Pressable>
        </View>
      </AppBottomSheet>

      {/* Google Sheets URL bottom sheet */}
      <AppBottomSheet
        visible={urlModalVisible}
        onClose={() => { setUrlModalVisible(false); setSheetUrl(""); }}
        snapPoints={["50%"]}
      >
        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Google Sheets URL</Text>
        <Text style={[styles.modalHint,  { color: theme.colors.muted }]}>
          Sheet must be shared as "Anyone with the link can view"
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.bg, color: theme.colors.text }]}
          placeholder="https://docs.google.com/spreadsheets/d/..."
          placeholderTextColor={theme.colors.muted}
          value={sheetUrl}
          onChangeText={setSheetUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <View style={styles.modalActions}>
          <Button
            label="Cancel"
            onPress={() => { setUrlModalVisible(false); setSheetUrl(""); }}
            variant="secondary"
          />
          <View style={{ width: 12 }} />
          <Button label="Import" onPress={handleUrlImport} loading={importing} />
        </View>
      </AppBottomSheet>

      {/* 1RM setup prompt bottom sheet */}
      <AppBottomSheet
        visible={!!ormPromptData}
        onClose={() => setOrmPromptData(null)}
        snapPoints={["58%"]}
      >
        <View style={ormStyles.container}>
          <LockeMascot size={140} mood="savage" />
          <Text style={[ormStyles.title, { color: theme.colors.text }]}>
            Set Up Your Lifts First
          </Text>
          <Text style={[ormStyles.subtitle, { color: theme.colors.muted }]}>
            Your big 4 lifts aren't configured yet. Adding your 1RM data lets me calculate accurate weights for every exercise.
          </Text>
          <View style={ormStyles.buttons}>
            <Pressable
              style={[ormStyles.optionCard, { backgroundColor: theme.colors.primary + "15", borderColor: theme.colors.primary }]}
              onPress={() => { setOrmPromptData(null); router.push("/orm-test?source=retake"); }}
            >
              <Ionicons name="barbell-outline" size={22} color={theme.colors.primary} />
              <View style={ormStyles.optionText}>
                <Text style={[ormStyles.optionLabel, { color: theme.colors.primary }]}>Take 1RM Test</Text>
                <Text style={[ormStyles.optionHint, { color: theme.colors.muted }]}>Guided protocol, most accurate</Text>
              </View>
            </Pressable>
            <Pressable
              style={[ormStyles.optionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => { setOrmPromptData(null); router.push("/onboarding?retake=1&step=manual"); }}
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
              const data = ormPromptData;
              setOrmPromptData(null);
              if (data) doStartSession(data.week, data.day, data.exs);
            }}
          >
            <Text style={[ormStyles.skipText, { color: theme.colors.muted }]}>Skip for now</Text>
          </Pressable>
        </View>
      </AppBottomSheet>

      {/* Edit day — exercise picker */}
      <ExercisePicker
        visible={editPickerVisible}
        onClose={() => { setEditPickerVisible(false); setEditingDay(null); }}
        onSelect={({ name }) => {
          if (!editingDay) return;
          updateDayExercises(editingDay.week, editingDay.day, (prev) => [
            ...prev,
            { exercise: name, sets: "3", reps: "10", weight: "", comments: "", week: editingDay.week, day: editingDay.day, warmUpSets: "0", restTime: "90" },
          ]);
          setEditPickerVisible(false);
          setEditingDay(null);
          showToast({ message: `Added ${name}`, type: "success" });
        }}
        excludeNames={
          editingDay
            ? exercises
                .filter((e) => (e.week || "Week 1") === editingDay.week && (e.day || "Day 1") === editingDay.day)
                .map((e) => e.exercise)
            : []
        }
      />

    </View>
  );
}

// ── Screen-level styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle:   { flex: 1, marginRight: spacing.sm },
  title:         { fontSize: 28, fontWeight: "700" },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  actionBtnText: { fontSize: 13, fontWeight: "600" },
  menuBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },

  // URL modal
  modalTitle:   { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  modalHint:    { fontSize: 13, marginBottom: spacing.md },
  input:        { borderRadius: radius.md, padding: 14, fontSize: 14, marginBottom: spacing.md },
  modalActions: { flexDirection: "row" },
});

const menuStyles = StyleSheet.create({
  container:  { paddingHorizontal: spacing.md, gap: 4 },
  item:       { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 4 },
  itemText:   { flex: 1 },
  itemLabel:  { fontSize: 16, fontWeight: "600" },
  itemHint:   { fontSize: 12, marginTop: 2 },
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

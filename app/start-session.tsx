import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { BackButton } from "../components/BackButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWorkouts } from "../hooks/useWorkouts";
import { useProfileContext } from "../contexts/ProfileContext";
import { useSmartHunt } from "../hooks/useSmartHunt";
import { Button } from "../components/Button";
import { useAppTheme } from "../contexts/ThemeContext";
import { spacing, radius, typography } from "../lib/theme";
import { impact, ImpactStyle } from "../lib/haptics";
import { makeId } from "../lib/helpers";
import { Ionicons } from "@expo/vector-icons";
import { LockeHuntCard } from "../components/hunt/LockeHuntCard";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const sectionEnter = (delay: number) =>
  FadeInDown.delay(delay).duration(300).damping(20).stiffness(150);

const QUICK_NAMES: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "Push Day", icon: "arrow-up-circle-outline" },
  { label: "Pull Day", icon: "arrow-down-circle-outline" },
  { label: "Leg Day", icon: "footsteps-outline" },
  { label: "Upper Body", icon: "body-outline" },
  { label: "Lower Body", icon: "fitness-outline" },
  { label: "Full Body", icon: "barbell-outline" },
];

type Template = {
  name: string;
  description: string;
  muscleGroups: string[];
  icon: keyof typeof Ionicons.glyphMap;
  exercises: { name: string; sets: string; reps: string }[];
};

const TEMPLATES: Template[] = [
  {
    name: "Push Day",
    description: "Chest, shoulders, triceps",
    muscleGroups: ["Chest", "Shoulders", "Triceps"],
    icon: "barbell-outline",
    exercises: [
      { name: "Bench Press", sets: "4", reps: "8" },
      { name: "Overhead Press", sets: "3", reps: "10" },
      { name: "Incline Dumbbell Press", sets: "3", reps: "10" },
      { name: "Lateral Raise", sets: "3", reps: "15" },
      { name: "Tricep Pushdown", sets: "3", reps: "12" },
    ],
  },
  {
    name: "Pull Day",
    description: "Back, biceps",
    muscleGroups: ["Back", "Biceps"],
    icon: "fitness-outline",
    exercises: [
      { name: "Deadlift", sets: "3", reps: "5" },
      { name: "Barbell Row", sets: "4", reps: "8" },
      { name: "Lat Pulldown", sets: "3", reps: "10" },
      { name: "Face Pull", sets: "3", reps: "15" },
      { name: "Barbell Curl", sets: "3", reps: "12" },
    ],
  },
  {
    name: "Leg Day",
    description: "Quads, hamstrings, glutes",
    muscleGroups: ["Quads", "Hamstrings", "Glutes"],
    icon: "body-outline",
    exercises: [
      { name: "Barbell Back Squat", sets: "4", reps: "6" },
      { name: "Romanian Deadlift", sets: "3", reps: "10" },
      { name: "Leg Press", sets: "3", reps: "12" },
      { name: "Walking Lunge", sets: "3", reps: "12" },
      { name: "Leg Curl", sets: "3", reps: "12" },
    ],
  },
  {
    name: "Upper Body",
    description: "Full upper body session",
    muscleGroups: ["Chest", "Back", "Arms"],
    icon: "barbell-outline",
    exercises: [
      { name: "Bench Press", sets: "4", reps: "8" },
      { name: "Barbell Row", sets: "4", reps: "8" },
      { name: "Overhead Press", sets: "3", reps: "10" },
      { name: "Lat Pulldown", sets: "3", reps: "10" },
      { name: "Barbell Curl", sets: "2", reps: "12" },
      { name: "Tricep Pushdown", sets: "2", reps: "12" },
    ],
  },
  {
    name: "Full Body",
    description: "Hit everything in one session",
    muscleGroups: ["Full Body"],
    icon: "body-outline",
    exercises: [
      { name: "Barbell Back Squat", sets: "3", reps: "8" },
      { name: "Bench Press", sets: "3", reps: "8" },
      { name: "Barbell Row", sets: "3", reps: "8" },
      { name: "Overhead Press", sets: "3", reps: "10" },
      { name: "Romanian Deadlift", sets: "3", reps: "10" },
    ],
  },
];

function getTemplateStats(t: Template) {
  const totalSets = t.exercises.reduce((sum, e) => sum + Number(e.sets), 0);
  return { exerciseCount: t.exercises.length, totalSets };
}

/* ── Template Card ─────────────────────────────────────────────────────────── */

const TemplateCard = React.memo(function TemplateCard({
  template,
  starting,
  onStart,
}: {
  template: Template;
  starting: string | null;
  onStart: (t: Template) => void;
}) {
  const { theme } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const { exerciseCount, totalSets } = getTemplateStats(template);
  const isStarting = starting === template.name;
  const disabled = !!starting;

  const toggleExpand = useCallback(() => {
    impact(ImpactStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  const handleBeginHunt = useCallback(() => {
    impact(ImpactStyle.Medium);
    onStart(template);
  }, [template, onStart]);

  return (
    <Pressable
      onPress={toggleExpand}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: theme.colors.primary + "18" },
          ]}
        >
          <Ionicons
            name={template.icon}
            size={22}
            color={theme.colors.primary}
          />
        </View>
        <View style={styles.headerText}>
          <Text
            style={[typography.subheading, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {template.name}
          </Text>
          <Text style={[typography.caption, { color: theme.colors.muted }]}>
            {exerciseCount} exercises{" · "}
            {totalSets} sets
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={theme.colors.muted}
        />
      </View>

      {/* Muscle group pills */}
      <View style={styles.pillRow}>
        {template.muscleGroups.map((mg) => (
          <View
            key={mg}
            style={[
              styles.pill,
              { backgroundColor: theme.colors.primary + "1A", borderColor: theme.colors.primary + "4D" },
            ]}
          >
            <Text
              style={[styles.pillText, { color: theme.colors.primary }]}
            >
              {mg}
            </Text>
          </View>
        ))}
      </View>

      {/* Expandable exercise list */}
      {expanded && (
        <View
          style={[
            styles.exerciseList,
            { borderTopColor: theme.colors.border },
          ]}
        >
          {template.exercises.map((e, i) => (
            <View key={i} style={styles.exerciseRow}>
              <Text
                style={[typography.small, { color: theme.colors.text, flex: 1 }]}
                numberOfLines={1}
              >
                {i + 1}. {e.name}
              </Text>
              <View style={[styles.setsRepsBadge, { backgroundColor: theme.colors.mutedBg }]}>
                <Text
                  style={[
                    typography.caption,
                    { color: theme.colors.muted },
                  ]}
                >
                  {e.sets} × {e.reps}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Begin Hunt button */}
      <Pressable
        onPress={handleBeginHunt}
        disabled={disabled}
        style={({ pressed }) => [
          styles.huntButton,
          {
            backgroundColor: disabled
              ? theme.colors.mutedBg
              : pressed
                ? theme.colors.accent
                : theme.colors.primary,
          },
        ]}
      >
        <Ionicons
          name="paw-outline"
          size={16}
          color={disabled ? theme.colors.muted : theme.colors.primaryText}
          style={{ marginRight: 6 }}
        />
        <Text
          style={[
            styles.huntButtonText,
            {
              color: disabled
                ? theme.colors.muted
                : theme.colors.primaryText,
            },
          ]}
        >
          {isStarting ? "Tracking..." : "Begin Hunt"}
        </Text>
      </Pressable>
    </Pressable>
  );
});

/* ── Screen ────────────────────────────────────────────────────────────────── */

export default function StartSessionScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { addWorkout, startSessionFromExercises, getActiveSession } = useWorkouts();
  const { profileRef } = useProfileContext();
  const { hunt, loading: huntLoading, shuffle: shuffleHunt } = useSmartHunt();
  const [name, setName] = useState("");
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  function guardActiveSession(): boolean {
    const active = getActiveSession();
    if (active) {
      Alert.alert(
        "Active Hunt",
        "You already have an active session. Resume or end it first.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Resume Hunt", onPress: () => router.push(`/session/${active.id}`) },
        ]
      );
      return true;
    }
    return false;
  }

  async function handleBeginQuick() {
    if (guardActiveSession()) return;
    const finalName = name.trim() || "Quick Hunt";
    const id = makeId();
    await addWorkout({
      id,
      name: finalName,
      date: new Date().toISOString(),
      exercises: [],
      isActive: true,
      startedAt: new Date().toISOString(),
    });
    impact(ImpactStyle.Medium);
    router.replace(`/session/${id}`);
  }

  const startFromExercises = useCallback(
    async (sessionName: string, exercises: { exercise: string; sets: string; reps: string }[]) => {
      if (starting) return;
      if (guardActiveSession()) return;
      setStarting(sessionName);
      const id = await startSessionFromExercises(sessionName, exercises, profileRef.current);
      router.replace(`/session/${id}`);
    },
    [starting, startSessionFromExercises, getActiveSession, profileRef, router],
  );

  const handleTemplateStart = useCallback(
    async (template: Template) => {
      const exercises = template.exercises.map((e) => ({
        exercise: e.name,
        sets: e.sets,
        reps: e.reps,
      }));
      startFromExercises(template.name, exercises);
    },
    [startFromExercises],
  );

  function handleChipPress(label: string) {
    impact(ImpactStyle.Light);
    if (selectedChip === label) {
      setSelectedChip(null);
      setName("");
    } else {
      setSelectedChip(label);
      setName(label);
    }
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Back */}
      <View style={styles.backBtn}>
        <BackButton />
      </View>

      {/* Header */}
      <Animated.View entering={sectionEnter(0)}>
        <View style={styles.headerSection}>
          <View style={styles.titleRow}>
            <Ionicons
              name="paw"
              size={28}
              color={theme.colors.primary}
              style={{
                marginRight: spacing.sm,
                textShadowColor: theme.colors.primary + "66",
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 10,
              }}
            />
            <Text style={[styles.title, { color: theme.colors.text }]}>Start a Hunt</Text>
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            Name your own or pick a template below.
          </Text>
        </View>
      </Animated.View>

      {/* Name input card */}
      <Animated.View entering={sectionEnter(80)}>
        <View style={[styles.inputCard, { backgroundColor: "transparent" }]}>
          <Text style={[styles.inputLabel, { color: theme.colors.muted }]}>Name Your Hunt</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.mutedBg,
                color: theme.colors.text,
                borderColor: theme.colors.border + "80",
              },
            ]}
            placeholder="e.g. Chest & Triceps, Back Attack..."
            placeholderTextColor={theme.colors.muted}
            value={name}
            onChangeText={(text) => {
              setName(text);
              setSelectedChip(null);
            }}
            returnKeyType="go"
            onSubmitEditing={() => handleBeginQuick()}
          />
        </View>
      </Animated.View>

      {/* Quick name chips */}
      <Animated.View entering={sectionEnter(160)}>
        <View style={styles.chipsSection}>
          <Text style={[styles.chipsLabel, { color: theme.colors.muted }]}>Quick Pick</Text>
          <View style={styles.chipsRow}>
            {QUICK_NAMES.map(({ label, icon }) => {
              const isSelected = selectedChip === label;
              return (
                <Pressable
                  key={label}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => handleChipPress(label)}
                >
                  <Ionicons
                    name={icon}
                    size={16}
                    color={isSelected ? theme.colors.primaryText : theme.colors.muted}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? theme.colors.primaryText : theme.colors.text },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Animated.View>

      {/* Start Hunt button */}
      <Animated.View entering={sectionEnter(240)}>
        <View style={styles.startBtnContainer}>
          <Button label="Start Hunt" onPress={() => handleBeginQuick()} />
        </View>
      </Animated.View>

      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

      {/* Smart Hunt */}
      <Animated.View entering={sectionEnter(320)}>
        <View style={styles.templateSection}>
          <LockeHuntCard
            hunt={hunt}
            loading={huntLoading}
            starting={starting}
            onStart={startFromExercises}
            onShuffle={shuffleHunt}
          />
        </View>
      </Animated.View>

      {/* Templates */}
      <Animated.View entering={sectionEnter(400)}>
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
          <Text style={[typography.caption, { color: theme.colors.muted, fontWeight: "600", letterSpacing: 0.5, marginHorizontal: 12 }]}>
            OR PICK A TEMPLATE
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
        </View>
      </Animated.View>

      <Animated.View entering={sectionEnter(480)}>
        {TEMPLATES.map((t) => (
          <TemplateCard
            key={t.name}
            template={t}
            starting={starting}
            onStart={handleTemplateStart}
          />
        ))}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 48 },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
    marginLeft: -spacing.sm,
  },
  headerSection: {
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.title,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    ...typography.body,
  },
  inputCard: {
    borderWidth: 0,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.small,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  chipsSection: {
    marginBottom: spacing.lg,
  },
  chipsLabel: {
    ...typography.small,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: {
    ...typography.small,
    fontWeight: "600",
  },
  startBtnContainer: {
    marginBottom: spacing.lg,
  },
  templateSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: spacing.sm,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  exerciseList: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  setsRepsBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  huntButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: radius.sm,
    marginTop: spacing.md,
  },
  huntButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
});

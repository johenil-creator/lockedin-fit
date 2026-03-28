import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../contexts/ThemeContext";
import { useWorkouts } from "../hooks/useWorkouts";
import { useProfileContext } from "../contexts/ProfileContext";
import { useSmartHunt } from "../hooks/useSmartHunt";
import { BackButton } from "../components/BackButton";
import { spacing, radius, typography } from "../lib/theme";
import { impact, ImpactStyle } from "../lib/haptics";
import { LockeHuntCard } from "../components/hunt/LockeHuntCard";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
      {/* ── Header row ── */}
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

      {/* ── Muscle group pills ── */}
      <View style={styles.pillRow}>
        {template.muscleGroups.map((mg) => (
          <View
            key={mg}
            style={[
              styles.pill,
              { backgroundColor: theme.colors.primary + "1A" },
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

      {/* ── Expandable exercise list ── */}
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
                {e.name}
              </Text>
              <Text
                style={[
                  typography.caption,
                  { color: theme.colors.muted, marginLeft: spacing.sm },
                ]}
              >
                {e.sets} × {e.reps}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Begin Hunt button ── */}
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

export default function QuickWorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { startSessionFromExercises, getActiveSession } = useWorkouts();
  const { profileRef } = useProfileContext();
  const { hunt, loading: huntLoading, shuffle: shuffleHunt } = useSmartHunt();
  const [starting, setStarting] = useState<string | null>(null);

  const startExercises = useCallback(
    async (name: string, exercises: { exercise: string; sets: string; reps: string }[]) => {
      if (starting) return;

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
        return;
      }

      setStarting(name);
      const mapped = exercises.map((e) => ({
        exercise: e.exercise,
        sets: e.sets,
        reps: e.reps,
      }));
      const id = await startSessionFromExercises(name, mapped, profileRef.current);
      router.replace(`/session/${id}`);
    },
    [starting, startSessionFromExercises, getActiveSession, profileRef, router],
  );

  const handleStart = useCallback(
    async (template: Template) => {
      const exercises = template.exercises.map((e) => ({
        exercise: e.name,
        sets: e.sets,
        reps: e.reps,
      }));
      startExercises(template.name, exercises);
    },
    [startExercises],
  );

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: theme.colors.bg, paddingTop: insets.top },
      ]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <BackButton />

      <Text style={[typography.title, { color: theme.colors.text }]}>
        Hunt Templates
      </Text>
      <Text
        style={[
          typography.small,
          { color: theme.colors.muted, marginBottom: spacing.lg },
        ]}
      >
        Pre-built sessions — pick one and go.
      </Text>

      <LockeHuntCard
        hunt={hunt}
        loading={huntLoading}
        starting={starting}
        onStart={startExercises}
        onShuffle={shuffleHunt}
      />

      <Text
        style={[
          typography.caption,
          { color: theme.colors.muted, marginTop: spacing.sm, marginBottom: spacing.sm, fontWeight: "600", letterSpacing: 0.5 },
        ]}
      >
        OR PICK A TEMPLATE
      </Text>

      {TEMPLATES.map((t) => (
        <TemplateCard
          key={t.name}
          template={t}
          starting={starting}
          onStart={handleStart}
        />
      ))}
    </ScrollView>
  );
}

/* ── Styles ────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },

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
    gap: 6,
    marginTop: spacing.sm,
  },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
  },

  pillText: {
    fontSize: 11,
    fontWeight: "600",
  },

  exerciseList: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },

  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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

});

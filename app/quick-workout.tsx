import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../contexts/ThemeContext";
import { useWorkouts } from "../hooks/useWorkouts";
import { useProfileContext } from "../contexts/ProfileContext";
import { BackButton } from "../components/BackButton";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { spacing, typography } from "../lib/theme";

type Template = {
  name: string;
  description: string;
  exercises: { name: string; sets: string; reps: string }[];
};

const TEMPLATES: Template[] = [
  {
    name: "Push Day",
    description: "Chest, shoulders, triceps",
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
    exercises: [
      { name: "Barbell Back Squat", sets: "3", reps: "8" },
      { name: "Bench Press", sets: "3", reps: "8" },
      { name: "Barbell Row", sets: "3", reps: "8" },
      { name: "Overhead Press", sets: "3", reps: "10" },
      { name: "Romanian Deadlift", sets: "3", reps: "10" },
    ],
  },
];

export default function QuickWorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { startSessionFromExercises } = useWorkouts();
  const { profileRef } = useProfileContext();
  const [starting, setStarting] = useState<string | null>(null);

  async function handleStart(template: Template) {
    if (starting) return;
    setStarting(template.name);
    const exercises = template.exercises.map((e) => ({
      exercise: e.name,
      sets: e.sets,
      reps: e.reps,
    }));
    const id = await startSessionFromExercises(template.name, exercises, profileRef.current);
    router.replace(`/session/${id}`);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <BackButton />
      <Text style={[typography.title, { color: theme.colors.text }]}>Quick Workout</Text>
      <Text style={[typography.small, { color: theme.colors.muted, marginBottom: spacing.lg }]}>
        Pick a template and start lifting
      </Text>

      {TEMPLATES.map((t) => (
        <Card key={t.name} style={styles.card}>
          <Text style={[styles.templateName, { color: theme.colors.text }]}>{t.name}</Text>
          <Text style={[styles.templateDesc, { color: theme.colors.muted }]}>{t.description}</Text>
          <View style={styles.exerciseList}>
            {t.exercises.map((e, i) => (
              <Text key={i} style={[styles.exerciseLine, { color: theme.colors.text }]}>
                · {e.name} — {e.sets}×{e.reps}
              </Text>
            ))}
          </View>
          <View style={{ marginTop: 12 }}>
            <Button
              label={starting === t.name ? "Starting…" : "Start"}
              onPress={() => handleStart(t)}
              disabled={!!starting}
              loading={starting === t.name}
            />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: { marginBottom: 12 },
  templateName: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  templateDesc: { fontSize: 13, marginBottom: 8 },
  exerciseList: { gap: 2 },
  exerciseLine: { fontSize: 13, lineHeight: 20 },
});

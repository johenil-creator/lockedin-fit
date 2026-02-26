import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { CATALOG_PLANS } from "../lib/catalog";
import { usePlanContext } from "../contexts/PlanContext";
import { useWorkouts } from "../hooks/useWorkouts";
import { useAppTheme } from "../contexts/ThemeContext";
import { useProfileContext } from "../contexts/ProfileContext";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { BackButton } from "../components/BackButton";
import type { CatalogPlan } from "../lib/types";

function DifficultyChip({ difficulty }: { difficulty: CatalogPlan["difficulty"] }) {
  const { theme } = useAppTheme();
  const colorMap: Record<CatalogPlan["difficulty"], { bg: string; text: string }> = {
    Beginner:     { bg: theme.colors.success, text: theme.colors.successText },
    Intermediate: { bg: theme.colors.accent,  text: theme.colors.accentText },
    Advanced:     { bg: theme.colors.danger,  text: theme.colors.dangerText },
  };
  const { bg, text } = colorMap[difficulty];
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color: text }]}>{difficulty}</Text>
    </View>
  );
}

function PlanCard({ plan }: { plan: CatalogPlan }) {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { setPlan } = usePlanContext();
  const { startSessionFromPlan, getActiveSession } = useWorkouts();
  const { profile } = useProfileContext();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const day1Exercises = plan.exercises.filter((e) => e.day === "Day 1" && e.week === "Week 1");

  async function handleLoadPlan() {
    setPlan(plan.name, plan.exercises);
    router.push("/plan");
  }

  async function handleStartDay1() {
    const active = getActiveSession();
    if (active) {
      Alert.alert(
        "Active Session",
        "You already have an active session. Resume or end it first.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Resume Session",
            onPress: () => router.push(`/session/${active.id}`),
          },
        ]
      );
      return;
    }
    setLoading(true);
    try {
      const id = await startSessionFromPlan(plan.name, "Week 1", "Day 1", day1Exercises, profile);
      router.push(`/session/${id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card style={styles.planCard}>
      <View style={styles.cardHeader}>
        <Text style={[styles.planName, { color: theme.colors.text }]}>{plan.name}</Text>
        <DifficultyChip difficulty={plan.difficulty} />
      </View>

      <View style={styles.metaRow}>
        <Badge label={plan.goal} />
        <Text style={[styles.metaText, { color: theme.colors.muted }]}>
          {plan.daysPerWeek} days/week
        </Text>
      </View>

      <Text style={[styles.description, { color: theme.colors.muted }]} numberOfLines={2}>
        {plan.goal} · {plan.daysPerWeek} days/week · {plan.totalWeeks || 12}-week progressive program
      </Text>

      {expanded && (
        <View style={[styles.previewSection, { borderTopColor: theme.colors.border }]}>
          <Text style={[styles.previewTitle, { color: theme.colors.text }]}>Day 1 Preview</Text>
          {day1Exercises.map((ex, i) => (
            <View key={i} style={styles.previewRow}>
              <Text style={[styles.previewExName, { color: theme.colors.text }]}>{ex.exercise}</Text>
              <Text style={[styles.previewDetail, { color: theme.colors.muted }]}>
                {ex.sets}x{ex.reps}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.cardActions}>
        <Pressable onPress={() => setExpanded(!expanded)}>
          <Text style={[styles.previewToggle, { color: theme.colors.accent }]}>
            {expanded ? "Hide Preview" : "Preview"}
          </Text>
        </Pressable>
        <View style={styles.actionButtons}>
          <Button label="Load Plan" onPress={handleLoadPlan} variant="secondary" small />
          <View style={{ width: 8 }} />
          <Button
            label="Start Day 1"
            onPress={handleStartDay1}
            small
            loading={loading}
          />
        </View>
      </View>
    </Card>
  );
}

export default function CatalogScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.header}>
        <BackButton />
      </View>

      <Text style={[styles.title, { color: theme.colors.text }]}>Workout Plans</Text>
      <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
        Choose a plan to get started
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {CATALOG_PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 64, paddingHorizontal: 24 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  title: { fontSize: 32, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: 20 },
  list: { paddingBottom: 40 },

  planCard: { marginBottom: 16 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  planName: { fontSize: 18, fontWeight: "700", flexShrink: 1, marginRight: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: "600" },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  metaText: { fontSize: 13 },
  description: { fontSize: 13, lineHeight: 18, marginBottom: 12 },

  previewSection: { borderTopWidth: 1, paddingTop: 12, marginBottom: 12 },
  previewTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  previewExName: { fontSize: 14, flexShrink: 1 },
  previewDetail: { fontSize: 13 },

  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewToggle: { fontSize: 14, fontWeight: "600" },
  actionButtons: { flexDirection: "row", alignItems: "center" },
});

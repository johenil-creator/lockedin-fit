import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from "react-native";
import { useWorkouts } from "../../hooks/useWorkouts";
import { getExerciseProgress, getUniqueExerciseNames } from "../../lib/progress";
import { ProgressChart } from "../../components/ProgressChart";
import { EmptyState } from "../../components/EmptyState";
import { useAppTheme } from "../../contexts/ThemeContext";

export default function ProgressScreen() {
  const { theme } = useAppTheme();
  const { workouts } = useWorkouts();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [metric, setMetric] = useState<"maxWeight" | "totalReps">("maxWeight");

  const exerciseNames = getUniqueExerciseNames(workouts);
  const progressData = selectedExercise
    ? getExerciseProgress(workouts, selectedExercise).slice(-8)
    : [];

  const bestWeight = progressData.length
    ? Math.max(...progressData.map((d) => d.maxWeight))
    : 0;
  const firstVal = progressData[0]?.[metric] ?? 0;
  const lastVal = progressData[progressData.length - 1]?.[metric] ?? 0;
  const improvement = firstVal > 0 ? Math.round(((lastVal - firstVal) / firstVal) * 100) : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Progress</Text>
      </View>

      {exerciseNames.length === 0 ? (
        <EmptyState
          icon="📈"
          title="No data yet"
          subtitle="Complete sessions to track your progress."
        />
      ) : (
        <View style={styles.body}>
          {/* Exercise list */}
          <View style={[styles.sidebar, { borderRightColor: theme.colors.border }]}>
            <Text style={[styles.sidebarTitle, { color: theme.colors.muted }]}>EXERCISES</Text>
            <FlatList
              data={exerciseNames}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.exerciseItem,
                    selectedExercise === item && { backgroundColor: theme.colors.mutedBg },
                  ]}
                  onPress={() => setSelectedExercise(item)}
                >
                  <Text
                    style={[
                      styles.exerciseItemText,
                      { color: selectedExercise === item ? theme.colors.primary : theme.colors.text },
                    ]}
                    numberOfLines={2}
                  >
                    {item}
                  </Text>
                </Pressable>
              )}
            />
          </View>

          {/* Chart panel */}
          <ScrollView style={styles.chartPanel} contentContainerStyle={{ paddingBottom: 40 }}>
            {!selectedExercise ? (
              <Text style={[styles.hint, { color: theme.colors.muted }]}>
                Select an exercise to see progress
              </Text>
            ) : (
              <>
                <Text style={[styles.exerciseTitle, { color: theme.colors.text }]}>
                  {selectedExercise}
                </Text>

                {/* Summary row */}
                {progressData.length > 0 && (
                  <View style={styles.summaryRow}>
                    <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
                      <Text style={[styles.summaryVal, { color: theme.colors.text }]}>{bestWeight > 0 ? `${bestWeight}kg` : "—"}</Text>
                      <Text style={[styles.summaryLabel, { color: theme.colors.muted }]}>Best Weight</Text>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
                      <Text style={[styles.summaryVal, { color: theme.colors.text }]}>{progressData.length}</Text>
                      <Text style={[styles.summaryLabel, { color: theme.colors.muted }]}>Sessions</Text>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
                      <Text style={[styles.summaryVal, { color: improvement >= 0 ? theme.colors.accent : theme.colors.danger }]}>
                        {improvement >= 0 ? "+" : ""}{improvement}%
                      </Text>
                      <Text style={[styles.summaryLabel, { color: theme.colors.muted }]}>Progress</Text>
                    </View>
                  </View>
                )}

                {/* Metric toggle */}
                <View style={styles.metricToggle}>
                  {(["maxWeight", "totalReps"] as const).map((m) => (
                    <Pressable
                      key={m}
                      style={[
                        styles.metricPill,
                        { backgroundColor: metric === m ? theme.colors.primary : theme.colors.mutedBg },
                      ]}
                      onPress={() => setMetric(m)}
                    >
                      <Text style={{ color: metric === m ? theme.colors.primaryText : theme.colors.muted, fontSize: 12, fontWeight: "600" }}>
                        {m === "maxWeight" ? "Max Weight" : "Total Reps"}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {progressData.length === 0 ? (
                  <Text style={[styles.hint, { color: theme.colors.muted }]}>
                    No completed sets for this exercise yet.
                  </Text>
                ) : (
                  <ProgressChart data={progressData} metric={metric} />
                )}
              </>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "700" },
  body: { flex: 1, flexDirection: "row" },
  sidebar: { width: 140, borderRightWidth: 0.5, paddingTop: 8 },
  sidebarTitle: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, paddingHorizontal: 12, marginBottom: 8 },
  exerciseItem: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginHorizontal: 6, marginBottom: 2 },
  exerciseItemText: { fontSize: 13, fontWeight: "500" },
  chartPanel: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  hint: { textAlign: "center", marginTop: 40, fontSize: 14 },
  exerciseTitle: { fontSize: 17, fontWeight: "700", marginBottom: 16 },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  summaryVal: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  summaryLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  metricToggle: { flexDirection: "row", gap: 8, marginBottom: 16 },
  metricPill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999 },
});

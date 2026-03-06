import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  FlatList,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { fmtDate } from "../../lib/helpers";
import { useWorkouts } from "../../hooks/useWorkouts";
import { useProfileContext } from "../../contexts/ProfileContext";
import { getExerciseProgress, getUniqueExerciseNames } from "../../lib/progress";
import { ProgressChart } from "../../components/ProgressChart";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { LockeMascot } from "../../components/Locke/LockeMascot";
import { CalendarGrid } from "../../components/CalendarGrid";
import { Skeleton } from "../../components/Skeleton";
import { useAppTheme } from "../../contexts/ThemeContext";
import { ProfileButton } from "../../components/ProfileButton";
import { spacing, radius } from "../../lib/theme";
import type { WorkoutSession } from "../../lib/types";

export default function WorkoutLogScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { workouts, loading, deleteWorkout, reload } = useWorkouts();
  const { profile } = useProfileContext();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Segmented toggle state
  const [activeTab, setActiveTab] = useState<"history" | "progress">("history");

  // Progress-specific state
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

  function handleDayPress(dateKey: string, daySessions: WorkoutSession[]) {
    if (daySessions.length === 0) return;
    setSelectedDate((prev) => (prev === dateKey ? null : dateKey));
  }

  const displayedWorkouts = selectedDate
    ? workouts.filter((w) => {
        // Must match CalendarGrid's toDateKey: local-time YYYY-MM-DD
        const iso = w.completedAt ?? w.startedAt;
        const d = iso ? new Date(iso) : new Date(w.date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}` === selectedDate;
      })
    : workouts;

  const renderRightActions = useCallback((onDelete: () => void) => (
    <Pressable style={[styles.deleteAction, { backgroundColor: theme.colors.danger }]} onPress={onDelete}>
      <Text style={[styles.deleteText, { color: theme.colors.dangerText }]}>Delete</Text>
    </Pressable>
  ), [theme]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Log</Text>
          <ProfileButton />
        </View>

        {/* Segmented toggle */}
        <View style={[styles.segmentRow, { backgroundColor: theme.colors.mutedBg }]}>
          {(["history", "progress"] as const).map((tab) => (
            <Pressable
              key={tab}
              style={[
                styles.segmentPill,
                activeTab === tab && { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: activeTab === tab ? theme.colors.primaryText : theme.colors.muted },
                ]}
              >
                {tab === "history" ? "History" : "Progress"}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === "history" ? (
          /* ── History view ── */
          loading ? (
            <Skeleton.Group>
              <Skeleton.Rect width="50%" height={20} style={{ marginTop: 48 }} />
              <Skeleton.Card />
              <Skeleton.Card />
              <Skeleton.Card />
            </Skeleton.Group>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.colors.primary}
                />
              }
            >
              <CalendarGrid sessions={workouts} onDayPress={handleDayPress} />

              {/* List header */}
              <View style={styles.listHeader}>
                {selectedDate ? (
                  <Pressable style={styles.dateChip} onPress={() => setSelectedDate(null)}>
                    <Text style={[styles.dateChipText, { color: theme.colors.primary }]}>
                      {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </Text>
                    <Text style={[styles.dateChipClear, { color: theme.colors.muted }]}>  ×</Text>
                  </Pressable>
                ) : (
                  <Text style={[styles.listTitle, { color: theme.colors.muted }]}>ALL SESSIONS</Text>
                )}
              </View>

              {displayedWorkouts.length === 0 ? (
                selectedDate ? (
                  <EmptyState
                    icon="📅"
                    title="No sessions on this day"
                    subtitle="Tap another day or clear the filter."
                  />
                ) : (
                  <Animated.View entering={FadeIn.duration(400)} style={emptyStyles.wrap}>
                    <LockeMascot size={140} mood="encouraging" />
                    <View style={[emptyStyles.bubble, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                      <View style={[emptyStyles.bubbleTail, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} />
                      <Text style={[emptyStyles.bubbleTitle, { color: theme.colors.text }]}>
                        Your log is empty
                      </Text>
                      <Text style={[emptyStyles.bubbleSub, { color: theme.colors.muted }]}>
                        Every session you complete will show up here. Let's get started.
                      </Text>
                    </View>
                    <Animated.View entering={FadeInDown.delay(200).duration(350)} style={emptyStyles.actions}>
                      <Pressable
                        style={[emptyStyles.actionCard, { backgroundColor: theme.colors.primary + "15", borderColor: theme.colors.primary }]}
                        onPress={() => router.push("/(tabs)/plan")}
                      >
                        <Ionicons name="calendar-outline" size={22} color={theme.colors.primary} />
                        <Text style={[emptyStyles.actionLabel, { color: theme.colors.primary }]}>Go to My Plan</Text>
                      </Pressable>
                    </Animated.View>
                  </Animated.View>
                )
              ) : (
                displayedWorkouts.map((item, index) => (
                  <Animated.View key={item.id} entering={FadeInDown.delay(index * 60).duration(300)}>
                    <Swipeable renderRightActions={() => renderRightActions(() => deleteWorkout(item.id))}>
                      <Pressable onPress={() => router.push(`/session/${item.id}`)}>
                        <Card style={styles.row}>
                          <View style={styles.rowContent}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                              <Text style={[styles.rowName, { color: theme.colors.text }]}>{item.name}</Text>
                              {item.completedAt ? (
                                <Text style={{ backgroundColor: theme.colors.success, color: theme.colors.successText, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, fontSize: 11, fontWeight: "600", overflow: "hidden" }}>✓ Done</Text>
                              ) : item.isActive ? (
                                <Text style={{ backgroundColor: theme.colors.danger, color: theme.colors.dangerText, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, fontSize: 11, fontWeight: "600", overflow: "hidden" }}>● Active</Text>
                              ) : null}
                            </View>
                            <Text style={[styles.rowMeta, { color: theme.colors.muted }]}>
                              {fmtDate(item.date)}
                              {item.exercises.length > 0
                                ? ` · ${item.exercises.length} exercise${item.exercises.length !== 1 ? "s" : ""} · ${item.exercises.reduce((a, ex) => a + ex.sets.filter(s => s.completed).length, 0)}/${item.exercises.reduce((a, ex) => a + ex.sets.length, 0)} sets`
                                : ""}
                            </Text>
                          </View>
                          <Text style={[styles.chevron, { color: theme.colors.muted }]}>›</Text>
                        </Card>
                      </Pressable>
                    </Swipeable>
                  </Animated.View>
                ))
              )}
            </ScrollView>
          )
        ) : (
          /* ── Progress view ── */
          exerciseNames.length === 0 ? (
            <EmptyState
              icon="📈"
              title="No data yet"
              subtitle="Complete sessions to track your progress."
            />
          ) : (
            <View style={styles.progressBody}>
              {/* Exercise sidebar */}
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
              <ScrollView
                style={styles.chartPanel}
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={theme.colors.primary}
                  />
                }
              >
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
                          <Text style={[styles.summaryVal, { color: theme.colors.text }]}>{bestWeight > 0 ? `${bestWeight} ${profile.weightUnit}` : "—"}</Text>
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
                      <ProgressChart data={progressData} metric={metric} weightUnit={profile.weightUnit} />
                    )}
                  </>
                )}
              </ScrollView>
            </View>
          )
        )}
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: { fontSize: 28, fontWeight: "700" },
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
  row: { marginBottom: 0, flexDirection: "row", alignItems: "center" },
  rowContent: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: "600" },
  rowMeta: { fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 20 },
  deleteAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: radius.md,
    marginBottom: spacing.sm + 4,
  },
  deleteText: { fontWeight: "700", fontSize: 14 },
  listHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 4 },
  listTitle: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.0 },
  dateChip: { flexDirection: "row", alignItems: "center" },
  dateChipText: { fontSize: 13, fontWeight: "700" },
  dateChipClear: { fontSize: 16, fontWeight: "400" },
  // Progress styles
  progressBody: { flex: 1, flexDirection: "row" },
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

const emptyStyles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingTop: spacing.lg,
    paddingBottom: 64,
  },
  bubble: {
    maxWidth: 280,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: -4,
  },
  bubbleTail: {
    position: "absolute",
    top: -7,
    width: 14,
    height: 14,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
  bubbleTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  bubbleSub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  actionCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: "center",
    gap: 6,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});

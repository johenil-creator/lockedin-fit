import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  TextInput,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { fmtDate } from "../../lib/helpers";
import { useWorkouts } from "../../hooks/useWorkouts";
import { useStreak } from "../../hooks/useStreak";
import { useXP } from "../../hooks/useXP";
import { useProfileContext } from "../../contexts/ProfileContext";
import { getExerciseProgress, getUniqueExerciseNames, getTrend, getProgressOverview } from "../../lib/progress";
import { rankDisplayName } from "../../lib/rankService";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { LockeMascot } from "../../components/Locke/LockeMascot";
import { CalendarGrid } from "../../components/CalendarGrid";
import { Skeleton } from "../../components/Skeleton";
import { useAppTheme } from "../../contexts/ThemeContext";
import { ProfileButton } from "../../components/ProfileButton";
import { StatsStrip } from "../../components/progress/StatsStrip";
import { PRHighlights } from "../../components/progress/PRHighlights";
import { ExerciseCard } from "../../components/progress/ExerciseCard";
import { LockeCommentary } from "../../components/progress/LockeCommentary";
import { spacing, radius } from "../../lib/theme";
import type { WorkoutSession } from "../../lib/types";

export default function WorkoutLogScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { workouts, loading, deleteWorkout, reload } = useWorkouts();
  const { profile } = useProfileContext();
  const { streak } = useStreak();
  const { rank } = useXP();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Segmented toggle state
  const [activeTab, setActiveTab] = useState<"history" | "progress">("history");

  // Progress-specific state
  const [searchQuery, setSearchQuery] = useState("");

  const exerciseNames = useMemo(() => getUniqueExerciseNames(workouts), [workouts]);
  const overview = useMemo(() => getProgressOverview(workouts), [workouts]);

  // Filter exercises by search query
  const filteredExercises = useMemo(() => {
    let names = exerciseNames;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      names = names.filter((n) => n.toLowerCase().includes(q));
    }
    return names;
  }, [exerciseNames, searchQuery]);

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
                    <LockeMascot size={180} mood="encouraging" />
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
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 60 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.colors.primary}
                />
              }
            >
              {/* Locke Commentary Hero */}
              <Animated.View entering={FadeIn.duration(400)}>
                <LockeCommentary
                  weekSessions={overview.thisWeekSessions}
                  volumeChange={overview.volumeChange}
                  recentPRCount={overview.recentPRs.length}
                  streak={streak.current}
                />
              </Animated.View>

              {/* Stats Strip */}
              <Animated.View entering={FadeInDown.delay(80).duration(300)}>
                <StatsStrip
                  stats={[
                    { icon: "flame-outline", value: streak.current, label: "Streak", color: "#FF9F0A" },
                    { icon: "shield-outline", value: rankDisplayName(rank), label: "Rank" },
                    { icon: "barbell-outline", value: overview.thisWeekSessions, label: "This Week" },
                    { icon: "trophy-outline", value: overview.totalPRs, label: "PRs", color: "#FFD700" },
                  ]}
                />
              </Animated.View>

              {/* PR Highlights Carousel */}
              {overview.recentPRs.length > 0 && (
                <Animated.View entering={FadeInDown.delay(140).duration(300)}>
                  <PRHighlights prs={overview.recentPRs} weightUnit={profile.weightUnit} />
                </Animated.View>
              )}

              {/* Weekly Volume Change */}
              {overview.thisWeekVolume > 0 && (
                <Animated.View entering={FadeInDown.delay(200).duration(300)}>
                  <View style={[styles.volumeBanner, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <View>
                      <Text style={[styles.volumeBannerLabel, { color: theme.colors.muted }]}>WEEKLY VOLUME</Text>
                      <Text style={[styles.volumeBannerValue, { color: theme.colors.text }]}>
                        {overview.thisWeekVolume.toLocaleString()} {profile.weightUnit}
                      </Text>
                    </View>
                    {overview.volumeChange !== 0 && (
                      <View style={[styles.volumeChangePill, { backgroundColor: overview.volumeChange > 0 ? theme.colors.success + "20" : theme.colors.danger + "20" }]}>
                        <Ionicons
                          name={overview.volumeChange > 0 ? "trending-up" : "trending-down"}
                          size={14}
                          color={overview.volumeChange > 0 ? theme.colors.success : theme.colors.danger}
                        />
                        <Text style={{ color: overview.volumeChange > 0 ? theme.colors.success : theme.colors.danger, fontSize: 13, fontWeight: "700" }}>
                          {overview.volumeChange > 0 ? "+" : ""}{overview.volumeChange}%
                        </Text>
                      </View>
                    )}
                  </View>
                </Animated.View>
              )}

              {/* Search */}
              <View style={[styles.searchBar, { backgroundColor: theme.colors.mutedBg, borderColor: theme.colors.border }]}>
                <Ionicons name="search-outline" size={16} color={theme.colors.muted} />
                <TextInput
                  style={[styles.searchInput, { color: theme.colors.text }]}
                  placeholder="Search exercises..."
                  placeholderTextColor={theme.colors.muted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery("")}>
                    <Ionicons name="close-circle" size={16} color={theme.colors.muted} />
                  </Pressable>
                )}
              </View>

              {/* Exercise section header */}
              <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>
                {searchQuery ? `${filteredExercises.length} RESULTS` : `ALL EXERCISES (${exerciseNames.length})`}
              </Text>

              {/* Exercise Cards */}
              {filteredExercises.length === 0 ? (
                <Text style={[styles.noResults, { color: theme.colors.muted }]}>
                  No exercises match "{searchQuery}"
                </Text>
              ) : (
                filteredExercises.map((name, index) => {
                  const data = getExerciseProgress(workouts, name);
                  if (data.length === 0) return null;
                  const trend = getTrend(data, "estimated1RM");
                  return (
                    <Animated.View key={name} entering={FadeInDown.delay(Math.min(index * 40, 400)).duration(300)}>
                      <ExerciseCard
                        name={name}
                        data={data}
                        trend={trend}
                        weightUnit={profile.weightUnit}
                      />
                    </Animated.View>
                  );
                })
              )}
            </ScrollView>
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
  volumeBanner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md },
  volumeBannerLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 },
  volumeBannerValue: { fontSize: 20, fontWeight: "800" },
  volumeChangePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8 },
  noResults: { textAlign: "center", marginTop: 20, fontSize: 14 },
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

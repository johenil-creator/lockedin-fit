import { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  TextInput,
  Alert,
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
import { isExerciseTimed, isExerciseUnilateral } from "../../lib/loadEngine/classifier";
import type { WorkoutSession, SetEntry } from "../../lib/types";
import { useHealthData } from "../../hooks/useHealthData";
import { useAutoImportWorkouts } from "../../hooks/useAutoImportWorkouts";

/** Format whole seconds as M:SS (e.g. 90 → "1:30", 15 → "0:15") */
function fmtDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Build a short set summary string for an exercise's completed sets */
function exerciseSetSummary(
  ex: { name: string; sets: SetEntry[] },
): string | null {
  const done = ex.sets.filter((s) => s.completed);
  if (done.length === 0) return null;

  const timed = isExerciseTimed(ex.name);
  const isUnilateral = done.some((s) => (s as any).side != null);

  if (isUnilateral) {
    const leftSets = done.filter((s) => (s as any).side === 'L');
    const rightSets = done.filter((s) => (s as any).side === 'R');
    const setCount = Math.max(leftSets.length, rightSets.length);

    if (timed) {
      const leftAvg = leftSets.length
        ? Math.round(leftSets.reduce((s, x) => s + (parseInt(x.reps) || 0), 0) / leftSets.length)
        : 0;
      const rightAvg = rightSets.length
        ? Math.round(rightSets.reduce((s, x) => s + (parseInt(x.reps) || 0), 0) / rightSets.length)
        : 0;
      if (Math.abs(leftAvg - rightAvg) <= 1) {
        return `${setCount} \u00d7 ${fmtDuration(leftAvg)} per side`;
      }
      return `${setCount} sets \u2014 L ${fmtDuration(leftAvg)} / R ${fmtDuration(rightAvg)} avg`;
    } else {
      const leftAvg = leftSets.length
        ? Math.round(leftSets.reduce((s, x) => s + (parseFloat(x.reps) || 0), 0) / leftSets.length)
        : 0;
      const rightAvg = rightSets.length
        ? Math.round(rightSets.reduce((s, x) => s + (parseFloat(x.reps) || 0), 0) / rightSets.length)
        : 0;
      if (leftAvg === rightAvg) {
        return `${setCount} \u00d7 ${leftAvg} reps per side`;
      }
      return `${setCount} sets \u2014 L ${leftAvg} / R ${rightAvg} reps avg`;
    }
  }

  // Bilateral logic
  if (timed) {
    const secs = done.map((s) => parseInt(s.reps, 10) || 0);
    const allSame = secs.every((v) => v === secs[0]);
    if (allSame) return `${done.length} \u00d7 ${fmtDuration(secs[0])}`;
    return secs.map((s) => fmtDuration(s)).join(", ");
  }

  const reps = done.map((s) => parseInt(s.reps, 10) || 0);
  const allSame = reps.every((v) => v === reps[0]);
  if (allSame) return `${done.length} \u00d7 ${reps[0]}`;
  return reps.join(", ");
}

// ── Apple Watch auto-import toast ────────────────────────────────────────────

function AppleWatchToast({
  visible,
  count,
  xp,
  onDismiss,
}: {
  visible: boolean;
  count: number;
  xp: number;
  onDismiss: () => void;
}) {
  const { theme } = useAppTheme();

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [visible, onDismiss]);

  if (!visible || count === 0) return null;

  const label = count === 1
    ? 'Apple Watch workout synced'
    : `${count} Apple Watch workouts synced`;

  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      style={[
        toastStyles.wrap,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary + '40' },
      ]}
    >
      <Ionicons name="watch-outline" size={18} color={theme.colors.primary} />
      <View style={toastStyles.textBlock}>
        <Text style={[toastStyles.title, { color: theme.colors.text }]}>{label}</Text>
        <Text style={[toastStyles.sub, { color: theme.colors.primary }]}>+{xp} XP added</Text>
      </View>
      <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  sub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
});

// ─────────────────────────────────────────────────────────────────────────────

export default function WorkoutLogScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { workouts, loading, deleteWorkout, reload, addWorkout } = useWorkouts();
  const { profile } = useProfileContext();
  const { streak, recordActivity } = useStreak();
  const { rank, awardXP } = useXP();
  const { externalWorkouts } = useHealthData();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Segmented toggle state
  const [activeTab, setActiveTab] = useState<"history" | "progress">("history");

  // Progress-specific state
  const [searchQuery, setSearchQuery] = useState("");

  // Track which date groups are expanded (keyed by date string like "2026-04-10")
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Auto-import Apple Watch workouts silently on detection
  const { autoImportedCount, autoImportedXP, resetAutoImport } = useAutoImportWorkouts({
    externalWorkouts,
    addWorkout,
    awardXP,
    recordActivity,
  });

  // Show a toast when workouts are auto-imported
  const [showImportToast, setShowImportToast] = useState(false);
  useEffect(() => {
    if (autoImportedCount > 0) {
      setShowImportToast(true);
    }
  }, [autoImportedCount]);

  const exerciseNames = useMemo(() => getUniqueExerciseNames(workouts), [workouts]);

  // Pre-compute progress data for all exercises in one pass
  const exerciseDataMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof getExerciseProgress>> = {};
    for (const name of exerciseNames) {
      map[name] = getExerciseProgress(workouts, name);
    }
    return map;
  }, [exerciseNames, workouts]);

  const overview = useMemo(() => getProgressOverview(workouts, exerciseDataMap), [workouts, exerciseDataMap]);

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

  // Group displayed workouts by date, sorted newest first
  const groupedWorkouts = useMemo(() => {
    const groups: { dateKey: string; label: string; sessions: WorkoutSession[] }[] = [];
    const map = new Map<string, WorkoutSession[]>();

    for (const w of displayedWorkouts) {
      const iso = w.completedAt ?? w.startedAt ?? w.date;
      const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + "T12:00:00") : new Date(iso);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${day}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(w);
    }

    // Sort date keys newest first
    const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

    for (const key of sortedKeys) {
      const d = new Date(key + "T12:00:00");
      const label = d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      groups.push({ dateKey: key, label, sessions: map.get(key)! });
    }

    return groups;
  }, [displayedWorkouts]);

  // Determine if a group is expanded: today defaults to expanded, older defaults to collapsed
  const isGroupExpanded = useCallback(
    (dateKey: string) => {
      if (dateKey in expandedGroups) return expandedGroups[dateKey];
      // Default: today expanded, everything else collapsed
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      return dateKey === todayKey;
    },
    [expandedGroups],
  );

  const toggleGroup = useCallback((dateKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [dateKey]: !(prev[dateKey] ?? isGroupExpanded(dateKey)),
    }));
  }, [isGroupExpanded]);

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
      <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top + spacing.md }]}>
        {/* Apple Watch auto-import toast */}
        <AppleWatchToast
          visible={showImportToast}
          count={autoImportedCount}
          xp={autoImportedXP}
          onDismiss={() => { setShowImportToast(false); resetAutoImport(); }}
        />

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
                        <Ionicons name="clipboard-outline" size={22} color={theme.colors.primary} />
                        <Text style={[emptyStyles.actionLabel, { color: theme.colors.primary }]}>Go to My Plan</Text>
                      </Pressable>
                    </Animated.View>
                  </Animated.View>
                )
              ) : (
                groupedWorkouts.map((group) => {
                  const expanded = isGroupExpanded(group.dateKey);
                  return (
                    <View key={group.dateKey} style={styles.dateGroup}>
                      <Pressable
                        style={[styles.dateGroupHeader, { borderBottomColor: theme.colors.border }]}
                        onPress={() => toggleGroup(group.dateKey)}
                      >
                        <View style={styles.dateGroupLeft}>
                          <Ionicons
                            name={expanded ? "chevron-down" : "chevron-forward"}
                            size={16}
                            color={theme.colors.muted}
                          />
                          <Text style={[styles.dateGroupTitle, { color: theme.colors.text }]}>
                            {group.label}
                          </Text>
                        </View>
                        <Text style={[styles.dateGroupCount, { color: theme.colors.muted }]}>
                          {group.sessions.length} session{group.sessions.length !== 1 ? "s" : ""}
                        </Text>
                      </Pressable>
                      {expanded &&
                        group.sessions.map((item, index) => (
                          <Animated.View key={item.id} entering={FadeInDown.delay(index * 60).duration(300)}>
                            <Swipeable renderRightActions={() => renderRightActions(() =>
                              Alert.alert(
                                "Delete Workout?",
                                "This will permanently remove this session from your log.",
                                [
                                  { text: "Cancel", style: "cancel" },
                                  { text: "Delete", style: "destructive", onPress: () => deleteWorkout(item.id) },
                                ]
                              )
                            )}>
                              <Pressable onPress={() => router.push(`/session/${item.id}`)}>
                                <Card style={styles.row}>
                                  <View style={styles.rowContent}>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                      <Text style={[styles.rowName, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>{item.name}</Text>
                                      {item.completedAt ? (
                                        <Text style={{ backgroundColor: theme.colors.success, color: theme.colors.successText, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, fontSize: 10, fontWeight: "600", overflow: "hidden" }}>✓ Done</Text>
                                      ) : item.isActive ? (
                                        <Text style={{ backgroundColor: theme.colors.danger, color: theme.colors.dangerText, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, fontSize: 10, fontWeight: "600", overflow: "hidden" }}>● Active</Text>
                                      ) : null}
                                    </View>
                                    <Text style={[styles.rowMeta, { color: theme.colors.muted }]}>
                                      {fmtDate(item.date)}
                                      {item.exercises.length > 0
                                        ? ` · ${item.exercises.length} exercise${item.exercises.length !== 1 ? "s" : ""} · ${item.exercises.reduce((a, ex) => a + ex.sets.filter(s => s.completed).length, 0)}/${item.exercises.reduce((a, ex) => a + ex.sets.length, 0)} sets`
                                        : ""}
                                    </Text>
                                    {/* Exercise breakdown */}
                                    {item.exercises.length > 0 && (
                                      <View style={styles.exBreakdown}>
                                        {item.exercises.map((ex) => {
                                          const timed = isExerciseTimed(ex.name);
                                          const summary = exerciseSetSummary(ex);
                                          if (!summary) return null;
                                          const completedSets = ex.sets.filter((s) => s.completed);
                                          const isUnilateral = completedSets.some((s) => (s as any).side != null);
                                          const totalSecs = timed
                                            ? completedSets.reduce((a, s) => a + (parseInt(s.reps, 10) || 0), 0)
                                            : 0;
                                          // For unilateral timed: compute per-side totals
                                          const leftTotalSecs = (timed && isUnilateral)
                                            ? completedSets.filter((s) => (s as any).side === 'L').reduce((a, s) => a + (parseInt(s.reps, 10) || 0), 0)
                                            : 0;
                                          const rightTotalSecs = (timed && isUnilateral)
                                            ? completedSets.filter((s) => (s as any).side === 'R').reduce((a, s) => a + (parseInt(s.reps, 10) || 0), 0)
                                            : 0;
                                          return (
                                            <View key={ex.exerciseId} style={styles.exRow}>
                                              <View style={styles.exNameRow}>
                                                {timed && (
                                                  <Ionicons name="timer-outline" size={14} color={theme.colors.muted} />
                                                )}
                                                <Text style={[styles.exName, { color: theme.colors.text }]} numberOfLines={1}>
                                                  {ex.name}
                                                </Text>
                                                <Text style={[styles.exSets, { color: theme.colors.muted }]}>
                                                  {summary}
                                                </Text>
                                              </View>
                                              {timed && totalSecs > 0 && (
                                                <Text style={[styles.exTotal, { color: theme.colors.muted }]}>
                                                  {isUnilateral
                                                    ? leftTotalSecs === rightTotalSecs
                                                      ? `Total per side: ${fmtDuration(leftTotalSecs)} held`
                                                      : `L: ${fmtDuration(leftTotalSecs)} / R: ${fmtDuration(rightTotalSecs)} held`
                                                    : `Total: ${fmtDuration(totalSecs)} held`}
                                                </Text>
                                              )}
                                            </View>
                                          );
                                        })}
                                      </View>
                                    )}
                                  </View>
                                  <Text style={[styles.chevron, { color: theme.colors.muted }]}>›</Text>
                                </Card>
                              </Pressable>
                            </Swipeable>
                          </Animated.View>
                        ))}
                    </View>
                  );
                })
              )}
            </ScrollView>
          )
        ) : (
          /* ── Progress view ── */
          exerciseNames.length === 0 ? (
            <EmptyState
              icon="📈"
              title="No data yet"
              subtitle="Complete sessions to track your progress. Even wolves start somewhere."
            />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 60 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
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
                  const data = exerciseDataMap[name] ?? [];
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
  row: { marginBottom: spacing.sm, flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
  rowContent: { flex: 1, gap: 4 },
  rowName: { fontSize: 15, fontWeight: "600" },
  rowMeta: { fontSize: 11, marginTop: 2 },
  chevron: { fontSize: 20 },
  deleteAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  deleteText: { fontWeight: "700", fontSize: 14 },
  listHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm + 4, marginTop: spacing.sm },
  listTitle: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.0 },
  dateChip: { flexDirection: "row", alignItems: "center" },
  dateChipText: { fontSize: 13, fontWeight: "700" },
  dateChipClear: { fontSize: 16, fontWeight: "400" },
  dateGroup: { marginBottom: spacing.xs },
  dateGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xs,
  },
  dateGroupLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  dateGroupTitle: { fontSize: 14, fontWeight: "700" },
  dateGroupCount: { fontSize: 12, fontWeight: "500" },
  // Progress styles
  volumeBanner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md },
  volumeBannerLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 },
  volumeBannerValue: { fontSize: 20, fontWeight: "800" },
  volumeChangePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8 },
  noResults: { textAlign: "center", marginTop: 20, fontSize: 14 },
  // Exercise breakdown inside session card
  exBreakdown: { marginTop: 6, gap: 3 },
  exRow: { gap: 1 },
  exNameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  exName: { fontSize: 12, fontWeight: "500", flexShrink: 1 },
  exSets: { fontSize: 11 },
  exTotal: { fontSize: 10, marginLeft: 18 },
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

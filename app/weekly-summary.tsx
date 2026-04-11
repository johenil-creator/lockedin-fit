import { View, Text, ScrollView, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useCallback, useEffect } from "react";
import { useAppTheme } from "../contexts/ThemeContext";
import { usePerformance } from "../hooks/usePerformance";
import { useStreak } from "../hooks/useStreak";
import { useXP } from "../hooks/useXP";
import { BackButton } from "../components/BackButton";
import { Card } from "../components/Card";
import { LockeMascot } from "../components/Locke/LockeMascot";
import { RANK_IMAGES } from "../components/RankEvolutionPath";
import { glowColors, spacing, typography } from "../lib/theme";
import { pickMessage } from "../lib/lockeMessages";
import type { LockeState, LockeTrigger, PerformanceWeek } from "../lib/types";

const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Convert "YYYY-Www" to a human-readable date range like "Apr 7 – Apr 13, 2026". */
function formatWeekRange(weekKey: string): string {
  const [yearStr, wStr] = weekKey.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(wStr, 10);
  // Jan 4 is always in ISO week 1
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - (jan4Day - 1) + (week - 1) * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const monMonth = SHORT_MONTHS[monday.getMonth()];
  const sunMonth = SHORT_MONTHS[sunday.getMonth()];
  const sunYear = sunday.getFullYear();

  if (monMonth === sunMonth) {
    return `${monMonth} ${monday.getDate()} \u2013 ${sunday.getDate()}, ${sunYear}`;
  }
  return `${monMonth} ${monday.getDate()} \u2013 ${sunMonth} ${sunday.getDate()}, ${sunYear}`;
}

function getScoreTier(score: number): string {
  if (score >= 80) return "Elite";
  if (score >= 60) return "Strong";
  if (score >= 40) return "Building";
  return "Starting";
}

function ScoreRing({ score }: { score: number }) {
  const { theme } = useAppTheme();
  const color = score >= 70 ? glowColors.viridian : score >= 40 ? theme.colors.accent : theme.colors.danger;
  const tier = getScoreTier(score);

  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(0.8, { duration: 1800 }),
      -1,
      true,
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  return (
    <View style={ringStyles.wrapper}>
      <Animated.View
        style={[
          ringStyles.outer,
          { borderColor: theme.colors.border, shadowColor: color },
          glowStyle,
        ]}
      >
        <View style={[ringStyles.inner, { borderColor: color }]}>
          <Text style={[ringStyles.value, { color }]}>{score}</Text>
          <Text style={[ringStyles.label, { color: theme.colors.muted }]}>SCORE</Text>
        </View>
      </Animated.View>
      <Text style={[ringStyles.tier, { color }]}>{tier}</Text>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  wrapper: { alignItems: "center" },
  outer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    elevation: 8,
  },
  inner: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontSize: 36, fontWeight: "800" },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  tier: { fontSize: 14, fontWeight: "700", letterSpacing: 1.5, marginTop: 10, textTransform: "uppercase" },
});

function WeekDelta({ current, previous }: { current: PerformanceWeek; previous: PerformanceWeek | null }) {
  const { theme } = useAppTheme();
  if (!previous) return null;

  const delta = current.score - previous.score;
  const arrow = delta > 0 ? "arrow-up" : delta < 0 ? "arrow-down" : "remove-outline";
  const color = delta > 0 ? theme.colors.success : delta < 0 ? theme.colors.danger : theme.colors.muted;
  const label = delta > 0 ? `+${delta} from last week` : delta < 0 ? `${delta} from last week` : "Same as last week";

  return (
    <Card style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, marginBottom: spacing.lg }}>
      <Ionicons name={arrow as any} size={18} color={color} />
      <Text style={[typography.body, { color, fontWeight: "600" }]}>{label}</Text>
    </Card>
  );
}

function ScoreBreakdown({ week, streakDays }: { week: PerformanceWeek; streakDays: number }) {
  const { theme } = useAppTheme();
  // Calculate individual components (from calcWeeklyScore formula):
  // Sets: min(setsCompleted / targetSets, 1) * 60 — target is sessionsCompleted * 15
  // Streak: min(streakDays, 7) * 3 = max 21
  // PRs: min(prsHit, 3) * 6 = max 18

  const targetSets = week.sessionsCompleted > 0 ? week.sessionsCompleted * 15 : week.setsCompleted || 1;
  const setScore = Math.round(Math.min(week.setsCompleted / targetSets, 1) * 60);
  const streakScore = Math.min(streakDays, 7) * 3;
  const prScore = Math.min(week.prsHit, 3) * 6;

  const rows = [
    { label: "Volume", value: setScore, max: 60, color: theme.colors.primary },
    { label: "Consistency", value: streakScore, max: 21, color: theme.colors.success },
    { label: "PRs", value: prScore, max: 18, color: theme.colors.accent },
  ];

  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <Text style={[typography.caption, { color: theme.colors.muted, marginBottom: 12, letterSpacing: 1 }]}>SCORE BREAKDOWN</Text>
      {rows.map((row) => (
        <View key={row.label} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={[typography.small, { color: theme.colors.text }]}>{row.label}</Text>
            <Text style={[typography.small, { color: theme.colors.muted }]}>{row.value}/{row.max}</Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.mutedBg }}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: row.color, width: `${(row.value / row.max) * 100}%` }} />
          </View>
        </View>
      ))}
    </Card>
  );
}

function PreviousWeeks({ weeks }: { weeks: PerformanceWeek[] }) {
  const { theme } = useAppTheme();
  // Show all weeks except the current (last) one, in reverse chronological order
  const previous = weeks.slice(0, -1).reverse().slice(0, 4);
  if (previous.length === 0) return null;

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={[typography.caption, { color: theme.colors.muted, letterSpacing: 1, marginBottom: 12 }]}>PREVIOUS WEEKS</Text>
      {previous.map((week) => {
        const color = week.score >= 70 ? glowColors.viridian : week.score >= 40 ? theme.colors.accent : theme.colors.danger;
        return (
          <View key={week.weekKey} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
            <Text style={[typography.small, { color: theme.colors.muted }]}>{formatWeekRange(week.weekKey)}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={[typography.small, { color: theme.colors.muted }]}>{week.sessionsCompleted} workouts</Text>
              <Text style={[typography.body, { color, fontWeight: "700", minWidth: 30, textAlign: "right" }]}>{week.score}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function WeeklySummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { performance } = usePerformance();
  const { streak } = useStreak();
  const { rank } = useXP();

  // Get the most recent week
  const currentWeek = performance.length > 0 ? performance[performance.length - 1] : null;

  const trigger: LockeTrigger = currentWeek && currentWeek.score >= 60 ? "high_performance" : "low_performance";
  const mood: LockeState = currentWeek && currentWeek.score >= 70 ? "celebrating" : currentWeek && currentWeek.score >= 40 ? "encouraging" : "disappointed";
  const lockeMsg = pickMessage(trigger, mood);

  const handleShare = useCallback(async () => {
    if (!currentWeek) return;
    try {
      const { Share } = require("react-native");
      await Share.share({
        message: `LockedInFIT Weekly Summary (${currentWeek.weekKey})\n\nScore: ${currentWeek.score}/100\nWorkouts: ${currentWeek.sessionsCompleted}\nSets: ${currentWeek.setsCompleted}\nPRs: ${currentWeek.prsHit}\nStreak: ${streak.current}d\n\n#LockedInFIT`,
      });
    } catch {}
  }, [currentWeek, streak]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.lg }}>
        <View style={{ flex: 1 }}>
          <BackButton />
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={[typography.title, { color: theme.colors.text, marginBottom: 4 }]}>Weekly Summary</Text>
            <Text style={[typography.caption, { color: theme.colors.muted }]}>
              {currentWeek ? formatWeekRange(currentWeek.weekKey) : "No data yet"}
            </Text>
          </Animated.View>
        </View>
        {currentWeek && (
          <Pressable
            onPress={handleShare}
            style={{ padding: 8, marginTop: 8 }}
            accessibilityLabel="Share weekly summary"
            accessibilityRole="button"
          >
            <Ionicons name="share-outline" size={24} color={theme.colors.primary} />
          </Pressable>
        )}
      </View>

      {currentWeek ? (
        <>
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.scoreSection}>
            <ScoreRing score={currentWeek.score} />
          </Animated.View>

          <WeekDelta current={currentWeek} previous={performance.length >= 2 ? performance[performance.length - 2] : null} />

          <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <Ionicons name="barbell-outline" size={24} color={theme.colors.primary} />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{currentWeek.sessionsCompleted}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Workouts</Text>
            </Card>
            <Card style={styles.statCard}>
              <Ionicons name="layers-outline" size={24} color={theme.colors.primary} />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{currentWeek.setsCompleted}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Sets</Text>
            </Card>
            <Card style={styles.statCard}>
              <Ionicons name="trophy-outline" size={24} color={theme.colors.primary} />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{currentWeek.prsHit}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.muted }]}>PRs</Text>
            </Card>
            <Card style={styles.statCard}>
              <Ionicons name="flame-outline" size={24} color={theme.colors.primary} />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{streak.current}d</Text>
              <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Streak</Text>
            </Card>
          </Animated.View>

          <ScoreBreakdown week={currentWeek} streakDays={streak.current} />

          {/* Locke commentary */}
          <Animated.View entering={FadeInDown.delay(500).duration(400)}>
          <Card style={styles.lockeCard}>
            <View style={styles.lockeRow}>
              <Image source={RANK_IMAGES[rank] ?? RANK_IMAGES.Runt} style={{ width: 72, height: 72 }} resizeMode="contain" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[typography.caption, { color: theme.colors.muted, letterSpacing: 1, marginBottom: 4 }]}>LOCKE SAYS</Text>
                <Text style={[typography.body, { color: theme.colors.text, fontStyle: "italic" }]}>
                  "{lockeMsg}"
                </Text>
              </View>
            </View>
          </Card>
          </Animated.View>
        </>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
          <LockeMascot size={80} mood="neutral" />
          <Text style={[typography.subheading, { color: theme.colors.text, marginTop: spacing.md, marginBottom: spacing.sm }]}>
            No data yet
          </Text>
          <Text style={[typography.body, { color: theme.colors.muted, textAlign: "center", paddingHorizontal: spacing.lg }]}>
            Complete your first workout this week and Locke will track your performance score here.
          </Text>
        </View>
      )}

      <PreviousWeeks weeks={performance} />

      <View style={{ height: spacing.lg }} />
      <Animated.View entering={FadeInDown.delay(600).duration(400)}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[typography.body, { color: theme.colors.primary, fontWeight: "600" }]}>Back to Home</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  scoreSection: { alignItems: "center", marginBottom: spacing.lg },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.lg },
  statCard: { flex: 1, minWidth: "45%", alignItems: "center", padding: 14, gap: 8 },
  statValue: { fontSize: 24, fontWeight: "800", marginBottom: 2 },
  statLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  lockeCard: { marginBottom: spacing.lg },
  lockeRow: { flexDirection: "row", alignItems: "center" },
  backBtn: { alignItems: "center", paddingVertical: 12 },
});

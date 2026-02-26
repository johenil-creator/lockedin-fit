import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../contexts/ThemeContext";
import { usePerformance } from "../hooks/usePerformance";
import { useStreak } from "../hooks/useStreak";
import { useXP } from "../hooks/useXP";
import { BackButton } from "../components/BackButton";
import { RankBadge } from "../components/RankBadge";
import { Card } from "../components/Card";
import { glowColors, spacing, typography } from "../lib/theme";
import { pickMessage } from "../lib/lockeMessages";
import type { LockeState, LockeTrigger } from "../lib/types";

function ScoreRing({ score }: { score: number }) {
  const { theme } = useAppTheme();
  const color = score >= 70 ? glowColors.viridian : score >= 40 ? theme.colors.accent : theme.colors.danger;
  return (
    <View style={[ringStyles.outer, { borderColor: theme.colors.border }]}>
      <View style={[ringStyles.inner, { borderColor: color }]}>
        <Text style={[ringStyles.value, { color }]}>{score}</Text>
        <Text style={[ringStyles.label, { color: theme.colors.muted }]}>SCORE</Text>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  outer: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, alignItems: "center", justifyContent: "center" },
  inner: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  value: { fontSize: 28, fontWeight: "800" },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
});

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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <BackButton />
      <Text style={[typography.title, { color: theme.colors.text, marginBottom: 4 }]}>Weekly Summary</Text>
      <Text style={[typography.caption, { color: theme.colors.muted, marginBottom: spacing.lg }]}>
        {currentWeek?.weekKey ?? "No data yet"}
      </Text>

      {currentWeek ? (
        <>
          <View style={styles.scoreSection}>
            <ScoreRing score={currentWeek.score} />
          </View>

          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{currentWeek.sessionsCompleted}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Workouts</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{currentWeek.setsCompleted}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Sets</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{currentWeek.prsHit}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.muted }]}>PRs</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{streak.current}d</Text>
              <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Streak</Text>
            </Card>
          </View>

          {/* Locke commentary */}
          <Card style={styles.lockeCard}>
            <View style={styles.lockeRow}>
              <RankBadge rank={rank} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[typography.caption, { color: theme.colors.muted, marginBottom: 4 }]}>LOCKE SAYS</Text>
                <Text style={[typography.body, { color: theme.colors.text, fontStyle: "italic" }]}>
                  "{lockeMsg}"
                </Text>
              </View>
            </View>
          </Card>
        </>
      ) : (
        <Card>
          <Text style={[typography.body, { color: theme.colors.muted, textAlign: "center" }]}>
            Complete your first workout to see your weekly summary.
          </Text>
        </Card>
      )}

      <View style={{ height: spacing.lg }} />
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Text style={[typography.body, { color: theme.colors.primary, fontWeight: "600" }]}>Back to Home</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  scoreSection: { alignItems: "center", marginBottom: spacing.lg },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.lg },
  statCard: { flex: 1, minWidth: "45%", alignItems: "center", padding: 14 },
  statValue: { fontSize: 24, fontWeight: "800", marginBottom: 2 },
  statLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  lockeCard: { marginBottom: spacing.lg },
  lockeRow: { flexDirection: "row", alignItems: "center" },
  backBtn: { alignItems: "center", paddingVertical: 12 },
});

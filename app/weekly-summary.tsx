import { View, Text, ScrollView, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import { glowColors, spacing, typography, workoutMetricColors } from "../lib/theme";
import { pickMessage } from "../lib/lockeMessages";
import type { LockeState, LockeTrigger, PerformanceWeek } from "../lib/types";

const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatWeekRange(weekKey: string): string {
  const [yearStr, wStr] = weekKey.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(wStr, 10);
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

type ScoreTier = { label: string; description: string };

function getScoreTier(score: number): ScoreTier {
  if (score >= 80) return { label: "Elite",     description: "Exceptional week" };
  if (score >= 60) return { label: "Strong",    description: "Solid performance" };
  if (score >= 40) return { label: "Building",  description: "Good effort" };
  return               { label: "Starting",   description: "Keep pushing" };
}

function getScoreColor(score: number, theme: ReturnType<typeof useAppTheme>["theme"]): string {
  if (score >= 60) return glowColors.viridian;
  if (score >= 40) return workoutMetricColors.rpe;
  return theme.colors.danger;
}

/** Mirror of calcWeeklyScore formula — purely for display breakdown. */
function getScoreComponents(week: PerformanceWeek) {
  const targetSets  = week.sessionsCompleted > 0 ? week.sessionsCompleted * 15 : (week.setsCompleted || 1);
  const volumeScore = Math.round(Math.min(week.setsCompleted / targetSets, 1) * 60);
  const streakScore = Math.min(week.streakDays, 7) * 3;
  const prScore     = Math.min(week.prsHit, 3) * 6;
  return { volumeScore, streakScore, prScore, targetSets };
}

// ── Score Ring ─────────────────────────────────────────────────────────────────
// Includes tier badge and week-over-week delta — all above the fold.

function ScoreRing({
  score,
  delta,
}: {
  score: number;
  delta: number | null;
}) {
  const { theme } = useAppTheme();
  const color = getScoreColor(score, theme);
  const { label, description } = getScoreTier(score);

  const glowOpacity = useSharedValue(0.3);
  useEffect(() => {
    glowOpacity.value = withRepeat(withTiming(0.8, { duration: 1800 }), -1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const glowStyle = useAnimatedStyle(() => ({ shadowOpacity: glowOpacity.value }));

  const deltaColor =
    delta === null || delta === 0
      ? theme.colors.muted
      : delta > 0
      ? theme.colors.success
      : theme.colors.danger;

  const deltaIcon =
    delta === null || delta === 0
      ? "remove-outline"
      : delta > 0
      ? "arrow-up"
      : "arrow-down";

  const deltaLabel =
    delta === null
      ? null
      : delta > 0
      ? `+${delta} from last week`
      : delta < 0
      ? `${delta} from last week`
      : "Same as last week";

  return (
    <View style={ringStyles.wrapper}>
      {/* Ring */}
      <Animated.View
        style={[
          ringStyles.outer,
          { borderColor: theme.colors.border, shadowColor: color },
          glowStyle,
        ]}
      >
        <View style={[ringStyles.inner, { borderColor: color }]}>
          <Text style={[ringStyles.value, { color }]}>{score}</Text>
          <Text style={[ringStyles.scoreLabel, { color: theme.colors.muted }]}>
            SCORE
          </Text>
        </View>
      </Animated.View>

      {/* Tier badge */}
      <View
        style={[
          ringStyles.tierBadge,
          { backgroundColor: color + "20", borderColor: color + "40" },
        ]}
      >
        <Text style={[ringStyles.tierText, { color }]}>{label}</Text>
      </View>
      <Text style={[ringStyles.description, { color: theme.colors.muted }]}>
        {description}
      </Text>

      {/* Delta — inline under the ring, no separate card needed */}
      {deltaLabel !== null && (
        <View style={ringStyles.deltaRow}>
          <Ionicons name={deltaIcon as any} size={13} color={deltaColor} />
          <Text style={[ringStyles.deltaText, { color: deltaColor }]}>
            {deltaLabel}
          </Text>
        </View>
      )}
    </View>
  );
}

const ringStyles = StyleSheet.create({
  wrapper: { alignItems: "center", marginBottom: spacing.lg },
  outer: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 12,
  },
  inner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  value:       { fontSize: 40, fontWeight: "800" },
  scoreLabel:  { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  tierBadge:   { paddingHorizontal: 18, paddingVertical: 5, borderRadius: 20, borderWidth: 1, marginBottom: 4 },
  tierText:    { fontSize: 15, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase" },
  description: { fontSize: 12, marginBottom: 8 },
  deltaRow:    { flexDirection: "row", alignItems: "center", gap: 4 },
  deltaText:   { fontSize: 13, fontWeight: "600" },
});

// ── Score Pillars ──────────────────────────────────────────────────────────────
// Explains the score immediately — replaces the old ScoreBreakdown card.
// Three labeled bars: Volume · Streak · PRs, with contextual hint text.

function ScorePillars({ week }: { week: PerformanceWeek }) {
  const { theme } = useAppTheme();
  const { volumeScore, streakScore, prScore, targetSets } = getScoreComponents(week);

  const setsGap = targetSets - week.setsCompleted;
  const streakGap = 7 - Math.min(week.streakDays, 7);
  const prGap = 3 - Math.min(week.prsHit, 3);

  const pillars = [
    {
      icon: "barbell-outline" as const,
      label: "Volume",
      color: glowColors.viridian,
      score: volumeScore,
      max: 60,
      // Contextual hint changes based on performance
      hint:
        volumeScore >= 60
          ? "Max volume — great output"
          : setsGap > 0
          ? `${setsGap} more sets to max`
          : `${week.setsCompleted} sets completed`,
    },
    {
      icon: "flame-outline" as const,
      label: "Streak",
      color: workoutMetricColors.rpe,
      score: streakScore,
      max: 21,
      hint:
        streakScore >= 21
          ? "Perfect consistency"
          : streakGap > 0
          ? `Train ${streakGap} more consecutive days`
          : `${week.streakDays}d streak this week`,
    },
    {
      icon: "trophy-outline" as const,
      label: "PRs Hit",
      color: workoutMetricColors.elapsed,
      score: prScore,
      max: 18,
      hint:
        prScore >= 18
          ? "PR bonus maxed"
          : prGap > 0
          ? `${prGap} more PR${prGap !== 1 ? "s" : ""} to max`
          : `${week.prsHit} PR${week.prsHit !== 1 ? "s" : ""} this week`,
    },
  ];

  return (
    <Card elevation="medium" style={{ marginBottom: spacing.lg }}>
      <Text
        style={[
          typography.caption,
          { color: theme.colors.muted, letterSpacing: 1, marginBottom: 16 },
        ]}
      >
        HOW YOUR SCORE IS BUILT
      </Text>
      {pillars.map((p, idx) => (
        <View key={p.label} style={{ marginBottom: idx < pillars.length - 1 ? 16 : 0 }}>
          {/* Label row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flex: 1 }}>
              <Ionicons name={p.icon} size={15} color={p.color} />
              <Text
                style={[
                  typography.small,
                  { color: theme.colors.text, fontWeight: "600" },
                ]}
              >
                {p.label}
              </Text>
              <Text
                style={[typography.caption, { color: theme.colors.muted, flex: 1 }]}
                numberOfLines={1}
              >
                · {p.hint}
              </Text>
            </View>
            <Text
              style={[
                typography.small,
                {
                  color: p.score >= p.max ? p.color : theme.colors.muted,
                  fontWeight: "700",
                  marginLeft: 8,
                },
              ]}
            >
              {p.score}/{p.max}
            </Text>
          </View>
          {/* Progress bar */}
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: theme.colors.mutedBg,
            }}
          >
            <View
              style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: p.color,
                width: `${Math.round((p.score / p.max) * 100)}%`,
                opacity: p.score === 0 ? 0.2 : 1,
              }}
            />
          </View>
        </View>
      ))}
    </Card>
  );
}

// ── Week Stats ─────────────────────────────────────────────────────────────────
// Compact 4-up stat cards with contextual sub-labels ("Aim for 4", "On track").

function WeekStats({
  week,
  currentStreak,
}: {
  week: PerformanceWeek;
  currentStreak: number;
}) {
  const { theme } = useAppTheme();

  const stats = [
    {
      icon: "barbell-outline" as const,
      value: `${week.sessionsCompleted}`,
      label: "Workouts",
      sub:
        week.sessionsCompleted >= 5
          ? "Excellent"
          : week.sessionsCompleted >= 4
          ? "Great week"
          : week.sessionsCompleted >= 3
          ? "Solid"
          : week.sessionsCompleted >= 1
          ? "Aim for 4"
          : "No sessions",
    },
    {
      icon: "layers-outline" as const,
      value: `${week.setsCompleted}`,
      label: "Sets",
      sub:
        week.setsCompleted >= 60
          ? "High volume"
          : week.setsCompleted >= 40
          ? "On track"
          : week.setsCompleted >= 20
          ? "Add more"
          : "Low volume",
    },
    {
      icon: "trophy-outline" as const,
      value: `${week.prsHit}`,
      label: "PRs",
      sub:
        week.prsHit >= 3
          ? "Maxed out!"
          : week.prsHit >= 2
          ? "Strong"
          : week.prsHit >= 1
          ? "Keep going"
          : "Chase a PR",
    },
    {
      icon: "flame-outline" as const,
      value: `${currentStreak}d`,
      label: "Streak",
      sub:
        currentStreak >= 14
          ? "Unstoppable"
          : currentStreak >= 7
          ? "On fire!"
          : currentStreak >= 3
          ? "Building"
          : "Stay consistent",
    },
  ];

  return (
    <View style={{ flexDirection: "row", gap: 8, marginBottom: spacing.lg }}>
      {stats.map((s) => (
        <Card
          key={s.label}
          style={{ flex: 1, alignItems: "center", padding: 10, gap: 3 }}
        >
          <Ionicons name={s.icon} size={18} color={theme.colors.primary} />
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: theme.colors.text,
            }}
          >
            {s.value}
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: theme.colors.muted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {s.label}
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: theme.colors.primary,
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            {s.sub}
          </Text>
        </Card>
      ))}
    </View>
  );
}

// ── Next Week Goal ─────────────────────────────────────────────────────────────
// Forward-looking nudge: what to focus on next week to reach the next tier.

function NextWeekGoal({ week }: { week: PerformanceWeek }) {
  const { theme } = useAppTheme();
  const { volumeScore, streakScore, prScore, targetSets } = getScoreComponents(week);

  if (week.score >= 80) {
    return (
      <Card
        style={{
          marginBottom: spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: glowColors.viridianDim,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="ribbon-outline" size={20} color={glowColors.viridian} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              typography.small,
              { color: theme.colors.text, fontWeight: "700", marginBottom: 2 },
            ]}
          >
            Elite week — keep it going
          </Text>
          <Text style={[typography.caption, { color: theme.colors.muted }]}>
            Maintain this standard next week to build momentum.
          </Text>
        </View>
      </Card>
    );
  }

  // Points needed to reach next tier
  const nextTierScore = week.score < 40 ? 40 : week.score < 60 ? 60 : 80;
  const nextTierLabel = week.score < 40 ? "Building" : week.score < 60 ? "Strong" : "Elite";
  const pointsNeeded = nextTierScore - week.score;

  // Actionable tips, guarded against showing already-maxed components
  const tips: string[] = [];
  const setsGap = targetSets - week.setsCompleted;
  if (volumeScore < 60 && setsGap > 0)
    tips.push(`Complete ${setsGap} more sets`);
  const streakGap = 7 - Math.min(week.streakDays, 7);
  if (streakScore < 21 && streakGap > 0)
    tips.push(`Train ${streakGap} more consecutive day${streakGap !== 1 ? "s" : ""}`);
  const prGap = 3 - Math.min(week.prsHit, 3);
  if (prScore < 18 && prGap > 0)
    tips.push(`Hit ${prGap} more PR${prGap !== 1 ? "s" : ""}`);

  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginBottom: tips.length > 0 ? 10 : 0,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.colors.mutedBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="trending-up-outline" size={18} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              typography.small,
              { color: theme.colors.text, fontWeight: "700" },
            ]}
          >
            {pointsNeeded} points to {nextTierLabel}
          </Text>
          <Text style={[typography.caption, { color: theme.colors.muted }]}>
            Next week's focus
          </Text>
        </View>
      </View>
      {tips.slice(0, 2).map((tip, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 4,
          }}
        >
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: theme.colors.primary,
            }}
          />
          <Text style={[typography.caption, { color: theme.colors.muted }]}>
            {tip}
          </Text>
        </View>
      ))}
    </Card>
  );
}

// ── Previous Weeks ─────────────────────────────────────────────────────────────

function PreviousWeeks({ weeks }: { weeks: PerformanceWeek[] }) {
  const { theme } = useAppTheme();
  const previous = weeks.slice(0, -1).reverse().slice(0, 4);
  if (previous.length === 0) return null;

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text
        style={[
          typography.caption,
          { color: theme.colors.muted, letterSpacing: 1, marginBottom: 12 },
        ]}
      >
        PREVIOUS WEEKS
      </Text>
      {previous.map((week) => {
        const color = getScoreColor(week.score, theme);
        const { label } = getScoreTier(week.score);
        return (
          <View
            key={week.weekKey}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 11,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <View>
              <Text style={[typography.small, { color: theme.colors.text }]}>
                {formatWeekRange(week.weekKey)}
              </Text>
              <Text style={[typography.caption, { color: theme.colors.muted }]}>
                {week.sessionsCompleted} workout{week.sessionsCompleted !== 1 ? "s" : ""} · {week.setsCompleted} sets
                {week.prsHit > 0 ? ` · ${week.prsHit} PR${week.prsHit !== 1 ? "s" : ""}` : ""}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={[typography.caption, { color, fontWeight: "600" }]}>
                {label}
              </Text>
              <Text
                style={[
                  typography.body,
                  {
                    color,
                    fontWeight: "800",
                    minWidth: 28,
                    textAlign: "right",
                  },
                ]}
              >
                {week.score}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function WeeklySummaryScreen() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { performance } = usePerformance();
  const { streak } = useStreak();
  const { rank } = useXP();

  const currentWeek  = performance.length > 0 ? performance[performance.length - 1] : null;
  const previousWeek = performance.length >= 2 ? performance[performance.length - 2] : null;
  const delta        = currentWeek && previousWeek ? currentWeek.score - previousWeek.score : null;

  const trigger: LockeTrigger =
    currentWeek && currentWeek.score >= 60 ? "high_performance" : "low_performance";
  const mood: LockeState =
    currentWeek && currentWeek.score >= 70
      ? "celebrating"
      : currentWeek && currentWeek.score >= 40
      ? "encouraging"
      : "disappointed";
  const lockeMsg = pickMessage(trigger, mood);

  const handleShare = useCallback(async () => {
    if (!currentWeek) return;
    try {
      const { Share } = require("react-native");
      const { label } = getScoreTier(currentWeek.score);
      await Share.share({
        message: [
          `LockedInFIT Weekly Summary`,
          formatWeekRange(currentWeek.weekKey),
          "",
          `Score: ${currentWeek.score} — ${label}`,
          `Workouts: ${currentWeek.sessionsCompleted}  Sets: ${currentWeek.setsCompleted}`,
          `PRs: ${currentWeek.prsHit}  Streak: ${streak.current}d`,
          "",
          "#LockedInFIT",
        ].join("\n"),
      });
    } catch {}
  }, [currentWeek, streak.current]);

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: theme.colors.bg, paddingTop: insets.top },
      ]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <BackButton />
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={[typography.title, { color: theme.colors.text, marginBottom: 2 }]}>
              Weekly Summary
            </Text>
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
          {/* Score ring — tier badge + delta integrated, no separate card */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            style={styles.scoreSection}
          >
            <ScoreRing score={currentWeek.score} delta={delta} />
          </Animated.View>

          {/* Score pillars — explains the score immediately after the ring */}
          <Animated.View entering={FadeInDown.delay(280).duration(400)}>
            <ScorePillars week={currentWeek} />
          </Animated.View>

          {/* Quick stats with contextual hints */}
          <Animated.View entering={FadeInDown.delay(350).duration(400)}>
            <WeekStats week={currentWeek} currentStreak={streak.current} />
          </Animated.View>

          {/* Locke commentary — elevated, not buried at the bottom */}
          <Animated.View entering={FadeInDown.delay(420).duration(400)}>
            <Card elevation="glow" style={styles.lockeCard}>
              <View style={styles.lockeRow}>
                <Image
                  source={RANK_IMAGES[rank] ?? RANK_IMAGES.Runt}
                  style={{ width: 64, height: 64 }}
                  resizeMode="contain"
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: theme.colors.muted,
                        letterSpacing: 1,
                        marginBottom: 4,
                      },
                    ]}
                  >
                    LOCKE SAYS
                  </Text>
                  <Text
                    style={[
                      typography.body,
                      { color: theme.colors.text, fontStyle: "italic" },
                    ]}
                  >
                    "{lockeMsg}"
                  </Text>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Next week goal — forward-looking nudge */}
          <Animated.View entering={FadeInDown.delay(490).duration(400)}>
            <NextWeekGoal week={currentWeek} />
          </Animated.View>

          {/* Previous weeks */}
          <Animated.View entering={FadeInDown.delay(550).duration(400)}>
            <PreviousWeeks weeks={performance} />
          </Animated.View>
        </>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
          <LockeMascot size={80} mood="neutral" />
          <Text
            style={[
              typography.subheading,
              {
                color: theme.colors.text,
                marginTop: spacing.md,
                marginBottom: spacing.sm,
              },
            ]}
          >
            No data yet
          </Text>
          <Text
            style={[
              typography.body,
              {
                color: theme.colors.muted,
                textAlign: "center",
                paddingHorizontal: spacing.lg,
              },
            ]}
          >
            Complete your first workout this week and Locke will track your
            performance score here.
          </Text>
        </View>
      )}

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  content:      { padding: spacing.md, paddingBottom: spacing.xl },
  header:       { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.md },
  scoreSection: { alignItems: "center", marginBottom: spacing.md },
  lockeCard:    { marginBottom: spacing.lg },
  lockeRow:     { flexDirection: "row", alignItems: "center" },
});

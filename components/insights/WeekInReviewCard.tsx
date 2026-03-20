import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import { TrendArrow } from "./TrendArrow";
import type { WeekInReview } from "../../lib/types";

type Props = {
  review: WeekInReview;
};

type StatItem = {
  label: string;
  value: string;
  delta?: number;
  icon: keyof typeof Ionicons.glyphMap;
};

function WeekInReviewCardInner({ review }: Props) {
  const { theme } = useAppTheme();

  const stats: StatItem[] = [
    {
      label: "Workouts",
      value: String(review.workoutsCompleted),
      delta: review.comparedToLastWeek.workouts,
      icon: "barbell-outline",
    },
    {
      label: "Sets",
      value: String(review.totalSets),
      delta: review.comparedToLastWeek.sets,
      icon: "layers-outline",
    },
    {
      label: "XP Earned",
      value: review.totalXpEarned.toLocaleString(),
      delta: review.comparedToLastWeek.xp,
      icon: "flash-outline",
    },
    {
      label: "PRs Hit",
      value: String(review.prsHit),
      icon: "trophy-outline",
    },
    {
      label: "Streak",
      value: `${review.streakDays}d`,
      icon: "flame-outline",
    },
    {
      label: "Avg Duration",
      value: `${review.avgSessionDurationMin}m`,
      icon: "timer-outline",
    },
  ];

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <Ionicons name="stats-chart-outline" size={20} color={theme.colors.primary} />
        <Text
          style={[
            typography.subheading,
            { color: theme.colors.text, marginLeft: spacing.sm },
          ]}
        >
          Week in Review
        </Text>
      </View>

      {review.topExercise !== "\u2014" && (
        <Text
          style={[
            typography.caption,
            { color: theme.colors.muted, marginBottom: spacing.sm },
          ]}
        >
          Top exercise: {review.topExercise}
        </Text>
      )}

      {/* Stats Grid (2x3) */}
      <View style={styles.grid}>
        {stats.map((stat) => (
          <View
            key={stat.label}
            style={[styles.statCell, { backgroundColor: theme.colors.mutedBg }]}
          >
            <Ionicons name={stat.icon} size={16} color={theme.colors.muted} />
            <Text
              style={[
                typography.heading,
                { color: theme.colors.text, marginTop: 2 },
              ]}
            >
              {stat.value}
            </Text>
            <View style={styles.statLabelRow}>
              <Text style={[typography.caption, { color: theme.colors.muted }]}>
                {stat.label}
              </Text>
              {stat.delta !== undefined && <TrendArrow delta={stat.delta} />}
            </View>
          </View>
        ))}
      </View>

      {/* Recommendations */}
      {review.recommendations.length > 0 && (
        <View style={styles.recommendations}>
          <Text
            style={[
              typography.small,
              {
                color: theme.colors.text,
                fontWeight: "600",
                marginBottom: spacing.xs,
              },
            ]}
          >
            Recommendations
          </Text>
          {review.recommendations.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Ionicons
                name="bulb-outline"
                size={14}
                color="#FFD700"
                style={{ marginTop: 1 }}
              />
              <Text
                style={[
                  typography.small,
                  { color: theme.colors.muted, flex: 1, marginLeft: spacing.xs },
                ]}
              >
                {tip}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export const WeekInReviewCard = React.memo(WeekInReviewCardInner);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statCell: {
    width: "31%",
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  statLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  recommendations: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#30363D",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
  },
});

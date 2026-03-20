import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, typography, radius } from "../../lib/theme";
import type { MilestoneType } from "../../lib/types";

const MILESTONE_LABELS: Record<MilestoneType, string> = {
  workout_100: "100 Workouts",
  workout_250: "250 Workouts",
  workout_500: "500 Workouts",
  rank_sentinel: "Sentinel Rank",
  rank_alpha: "Alpha Rank",
  rank_apex: "Apex Rank",
  streak_30: "30-Day Streak",
  streak_100: "100-Day Streak",
  streak_365: "365-Day Streak",
  pr_count_10: "10 PRs",
  pr_count_50: "50 PRs",
};

type Props = {
  displayName: string;
  milestoneType: MilestoneType;
  value: number;
  createdAt?: string;
};

function MilestoneCardInner({ displayName, milestoneType, value, createdAt }: Props) {
  const { theme } = useAppTheme();

  const label = MILESTONE_LABELS[milestoneType] ?? milestoneType;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: "#FFD700",
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{"\uD83C\uDFC6"}</Text>
        <View style={styles.headerText}>
          <Text
            style={[typography.body, { color: theme.colors.text, fontWeight: "700" }]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text style={[typography.caption, { color: theme.colors.muted }]}>
            Milestone Achieved
          </Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text
          style={[typography.subheading, { color: "#FFD700", textAlign: "center" }]}
        >
          {label}
        </Text>
        {value > 0 && (
          <Text style={[typography.caption, { color: theme.colors.muted, textAlign: "center" }]}>
            Reached {value}
          </Text>
        )}
      </View>
      {createdAt && (
        <Text style={[typography.caption, { color: theme.colors.muted, textAlign: "right" }]}>
          {new Date(createdAt).toLocaleDateString()}
        </Text>
      )}
    </View>
  );
}

export const MilestoneCard = React.memo(MilestoneCardInner);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 2,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 28,
  },
  headerText: {
    flex: 1,
  },
  body: {
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
});

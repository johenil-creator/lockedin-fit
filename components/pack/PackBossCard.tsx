import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import { BossHealthBar } from "./BossHealthBar";
import type { PackBoss, PackBossContribution } from "../../lib/types";

type Props = {
  boss: PackBoss;
  contributions: PackBossContribution[];
};

const METRIC_INSTRUCTIONS: Record<string, string> = {
  sets: "Complete sets in your workouts to deal damage.",
  sessions: "Finish workout sessions to deal damage.",
  xp: "Earn XP from workouts to deal damage.",
  streak: "Each day you maintain your streak deals damage.",
};

function PackBossCardInner({ boss, contributions }: Props) {
  const { theme } = useAppTheme();
  const isDefeated = boss.status === "defeated";
  const isEscaped = boss.status === "escaped";
  const topContributors = contributions.slice(0, 5);
  const instruction = METRIC_INSTRUCTIONS[boss.metric] ?? "Work out to deal damage.";

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      {/* Boss header */}
      <View style={styles.header}>
        <Text style={styles.emoji}>{boss.bossEmoji}</Text>
        <View style={styles.headerText}>
          <Text
            style={[
              typography.subheading,
              { color: theme.colors.text },
            ]}
          >
            {boss.bossName}
          </Text>
          {isDefeated && (
            <View
              style={[
                styles.defeatedBadge,
                { backgroundColor: theme.colors.success + "20" },
              ]}
            >
              <Text
                style={[
                  typography.caption,
                  { color: theme.colors.success, fontWeight: "700" },
                ]}
              >
                DEFEATED
              </Text>
            </View>
          )}
          {isEscaped && (
            <View
              style={[
                styles.defeatedBadge,
                { backgroundColor: theme.colors.danger + "20" },
              ]}
            >
              <Text
                style={[
                  typography.caption,
                  { color: theme.colors.danger, fontWeight: "700" },
                ]}
              >
                ESCAPED
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* How to deal damage */}
      {!isDefeated && !isEscaped && (
        <Text
          style={[
            typography.caption,
            { color: theme.colors.muted, marginTop: spacing.sm },
          ]}
        >
          {instruction}
        </Text>
      )}

      {/* Health bar */}
      <View style={{ marginTop: spacing.md }}>
        <BossHealthBar
          healthRemaining={boss.healthRemaining}
          healthTotal={boss.healthTotal}
        />
      </View>

      {/* Top contributors */}
      {topContributors.length > 0 && (
        <View style={{ marginTop: spacing.md }}>
          <Text
            style={[
              typography.caption,
              { color: theme.colors.muted, marginBottom: spacing.xs },
            ]}
          >
            Top Contributors
          </Text>
          {topContributors.map((c, i) => (
            <View key={c.userId} style={styles.contribRow}>
              <Text
                style={[
                  typography.small,
                  { color: theme.colors.muted, width: 20 },
                ]}
              >
                {i + 1}.
              </Text>
              <Text
                style={[
                  typography.small,
                  { color: theme.colors.text, flex: 1 },
                ]}
                numberOfLines={1}
              >
                {c.displayName}
              </Text>
              <Text
                style={[
                  typography.small,
                  { color: theme.colors.primary, fontWeight: "600" },
                ]}
              >
                {c.damage} dmg
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export const PackBossCard = React.memo(PackBossCardInner);

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
  },
  emoji: {
    fontSize: 36,
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  defeatedBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginTop: 4,
  },
  contribRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
  },
});

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { PackLeaderboardEntry } from "../../lib/types";

type Props = {
  entries: PackLeaderboardEntry[];
  userPackId?: string;
};

function PackLeaderboardCardInner({ entries, userPackId }: Props) {
  const { theme } = useAppTheme();

  if (entries.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, alignItems: "center", paddingVertical: spacing.xl }]}>
        <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
          Pack Leaderboard
        </Text>
        <Text style={[typography.body, { color: theme.colors.muted, textAlign: "center" }]}>
          No rankings yet. Log workouts to climb the board.
        </Text>
      </View>
    );
  }

  const top5 = entries.slice(0, 5);

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
        Pack Leaderboard
      </Text>

      {top5.map((entry, index) => {
        const isUserPack = entry.packId === userPackId;
        return (
          <View
            key={entry.packId}
            style={[
              styles.row,
              isUserPack && { backgroundColor: theme.colors.accent + "15" },
              index < top5.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.rank, { color: theme.colors.muted }]}>
              #{index + 1}
            </Text>
            <View style={styles.info}>
              <Text
                style={[
                  typography.body,
                  { color: isUserPack ? theme.colors.accent : theme.colors.text, fontWeight: "600" },
                ]}
                numberOfLines={1}
              >
                {entry.packName}
              </Text>
              <Text style={[typography.caption, { color: theme.colors.muted }]}>
                {entry.memberCount} members
              </Text>
            </View>
            <Text style={[styles.xp, { color: theme.colors.accent }]}>
              {entry.weeklyXp} XP
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export const PackLeaderboardCard = React.memo(PackLeaderboardCardInner);

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
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: radius.sm,
  },
  rank: {
    fontSize: 14,
    fontWeight: "700",
    width: 32,
  },
  info: {
    flex: 1,
  },
  xp: {
    fontSize: 14,
    fontWeight: "700",
  },
});

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { StreakBattle } from "../../lib/types";

type Props = {
  battle: StreakBattle;
};

function StreakBattleCardInner({ battle }: Props) {
  const { theme } = useAppTheme();
  const isActive = battle.status === "active";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: isActive ? "#FF6B35" : theme.colors.border,
        },
      ]}
    >
      {/* Fire decoration top */}
      <Text style={styles.fireTop}>
        {"\uD83D\uDD25\uD83D\uDD25\uD83D\uDD25"}
      </Text>

      <View style={styles.battleRow}>
        {/* Player 1 */}
        <View style={styles.playerSide}>
          <View
            style={[
              styles.playerAvatar,
              { backgroundColor: theme.colors.primary + "30" },
            ]}
          >
            <Text style={[styles.avatarLetter, { color: theme.colors.primary }]}>
              {battle.player1Name[0].toUpperCase()}
            </Text>
          </View>
          <Text
            style={[styles.playerName, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {battle.player1Name}
          </Text>
          <Text style={[styles.streakCount, { color: theme.colors.primary }]}>
            {battle.player1StreakStart}d
          </Text>
          {battle.player1Broke && (
            <Text style={[styles.brokeLabel, { color: theme.colors.danger }]}>
              Broke
            </Text>
          )}
        </View>

        {/* VS center */}
        <View style={styles.vsContainer}>
          <Text style={[styles.vsText, { color: theme.colors.muted }]}>
            VS
          </Text>
          {isActive && (
            <Text style={[styles.statusLabel, { color: "#FF6B35" }]}>
              ACTIVE
            </Text>
          )}
        </View>

        {/* Player 2 */}
        <View style={styles.playerSide}>
          <View
            style={[
              styles.playerAvatar,
              { backgroundColor: theme.colors.accent + "30" },
            ]}
          >
            <Text style={[styles.avatarLetter, { color: theme.colors.accent }]}>
              {battle.player2Name[0].toUpperCase()}
            </Text>
          </View>
          <Text
            style={[styles.playerName, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {battle.player2Name}
          </Text>
          <Text style={[styles.streakCount, { color: theme.colors.accent }]}>
            {battle.player2StreakStart}d
          </Text>
          {battle.player2Broke && (
            <Text style={[styles.brokeLabel, { color: theme.colors.danger }]}>
              Broke
            </Text>
          )}
        </View>
      </View>

      {/* Reward */}
      <Text style={[styles.reward, { color: theme.colors.muted }]}>
        {battle.fangsReward} Fangs at stake
      </Text>

      {/* Fire decoration bottom */}
      <Text style={styles.fireBottom}>
        {"\uD83D\uDD25\uD83D\uDD25\uD83D\uDD25"}
      </Text>
    </View>
  );
}

export const StreakBattleCard = React.memo(StreakBattleCardInner);

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    borderWidth: 2,
    padding: spacing.md,
    alignItems: "center",
  },
  fireTop: {
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  fireBottom: {
    fontSize: 16,
    marginTop: spacing.sm,
  },
  battleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  playerSide: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: "700",
  },
  playerName: {
    ...typography.caption,
    fontWeight: "600",
    textAlign: "center",
  },
  streakCount: {
    ...typography.subheading,
    fontWeight: "700",
  },
  brokeLabel: {
    ...typography.caption,
    fontWeight: "700",
  },
  vsContainer: {
    paddingHorizontal: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  vsText: {
    ...typography.heading,
    fontWeight: "800",
  },
  statusLabel: {
    ...typography.caption,
    fontWeight: "700",
  },
  reward: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
});

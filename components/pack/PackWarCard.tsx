import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { PackWar } from "../../lib/types";

type Props = {
  war: PackWar;
};

function PackWarCardInner({ war }: Props) {
  const { theme } = useAppTheme();
  const isComplete = war.status === "completed";

  const totalXp = war.pack1Xp + war.pack2Xp;
  const pack1Pct = totalXp > 0 ? war.pack1Xp / totalXp : 0.5;
  const pack2Pct = totalXp > 0 ? war.pack2Xp / totalXp : 0.5;

  const winnerName =
    isComplete && war.winnerId
      ? war.winnerId === war.pack1Id
        ? war.pack1Name
        : war.pack2Name
      : null;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      {/* Header */}
      <Text
        style={[
          typography.subheading,
          { color: theme.colors.text, textAlign: "center", marginBottom: spacing.md },
        ]}
      >
        {isComplete ? "War Complete" : "Pack War"}
      </Text>

      {/* Side-by-side packs */}
      <View style={styles.versus}>
        {/* Pack 1 */}
        <View style={styles.packSide}>
          <Text
            style={[typography.body, { color: theme.colors.text, fontWeight: "700" }]}
            numberOfLines={1}
          >
            {war.pack1Name || "Waiting..."}
          </Text>
          <Text
            style={[
              typography.heading,
              { color: theme.colors.primary, marginTop: spacing.xs },
            ]}
          >
            {war.pack1Xp}
          </Text>
          <Text style={[typography.caption, { color: theme.colors.muted }]}>XP</Text>
        </View>

        {/* VS */}
        <View style={styles.vsContainer}>
          <Text
            style={[
              typography.heading,
              { color: theme.colors.danger, fontWeight: "900" },
            ]}
          >
            VS
          </Text>
        </View>

        {/* Pack 2 */}
        <View style={styles.packSide}>
          <Text
            style={[typography.body, { color: theme.colors.text, fontWeight: "700" }]}
            numberOfLines={1}
          >
            {war.pack2Name || "Waiting..."}
          </Text>
          <Text
            style={[
              typography.heading,
              { color: theme.colors.primary, marginTop: spacing.xs },
            ]}
          >
            {war.pack2Xp}
          </Text>
          <Text style={[typography.caption, { color: theme.colors.muted }]}>XP</Text>
        </View>
      </View>

      {/* Progress bars */}
      <View style={styles.progressRow}>
        <View
          style={[
            styles.progressBar,
            {
              flex: pack1Pct,
              backgroundColor: theme.colors.primary,
              borderTopLeftRadius: 4,
              borderBottomLeftRadius: 4,
            },
          ]}
        />
        <View
          style={[
            styles.progressBar,
            {
              flex: pack2Pct,
              backgroundColor: theme.colors.accent,
              borderTopRightRadius: 4,
              borderBottomRightRadius: 4,
            },
          ]}
        />
      </View>

      {/* Status / Winner */}
      {isComplete && winnerName && (
        <View
          style={[
            styles.winnerBadge,
            { backgroundColor: theme.colors.success + "20" },
          ]}
        >
          <Text
            style={[
              typography.small,
              { color: theme.colors.success, fontWeight: "700" },
            ]}
          >
            Winner: {winnerName}
          </Text>
        </View>
      )}

      {isComplete && !winnerName && (
        <Text
          style={[
            typography.small,
            { color: theme.colors.muted, textAlign: "center", marginTop: spacing.sm },
          ]}
        >
          Draw — no winner
        </Text>
      )}

      {war.status === "matchmaking" && (
        <Text
          style={[
            typography.caption,
            { color: theme.colors.muted, textAlign: "center", marginTop: spacing.sm },
          ]}
        >
          Searching for opponent...
        </Text>
      )}
    </View>
  );
}

export const PackWarCard = React.memo(PackWarCardInner);

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
  versus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  packSide: {
    flex: 1,
    alignItems: "center",
  },
  vsContainer: {
    paddingHorizontal: spacing.md,
  },
  progressRow: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: spacing.md,
  },
  progressBar: {
    height: "100%",
  },
  winnerBadge: {
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
});

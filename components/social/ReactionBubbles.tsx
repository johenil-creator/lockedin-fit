import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { REACTION_EMOJI } from "../../lib/reactionService";
import { radius, spacing } from "../../lib/theme";
import type { ReactionType } from "../../lib/types";

type Props = {
  reactions: Record<ReactionType, number>;
};

function ReactionBubblesInner({ reactions }: Props) {
  const { theme } = useAppTheme();

  const active = (Object.entries(reactions) as [ReactionType, number][])
    .filter(([, count]) => count > 0);

  if (active.length === 0) return null;

  return (
    <View style={styles.container}>
      {active.map(([type, count]) => (
        <View
          key={type}
          style={[styles.bubble, { backgroundColor: theme.colors.mutedBg }]}
        >
          <Text style={styles.emoji}>{REACTION_EMOJI[type]}</Text>
          <Text style={[styles.count, { color: theme.colors.muted }]}>{count}</Text>
        </View>
      ))}
    </View>
  );
}

export const ReactionBubbles = React.memo(ReactionBubblesInner);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    gap: 3,
  },
  emoji: {
    fontSize: 12,
  },
  count: {
    fontSize: 11,
    fontWeight: "600",
  },
});

import React, { useCallback } from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { impact, ImpactStyle } from "../../lib/haptics";
import { useAppTheme } from "../../contexts/ThemeContext";
import { REACTION_EMOJI, REACTION_LABELS } from "../../lib/reactionService";
import { radius, spacing } from "../../lib/theme";
import type { ReactionType } from "../../lib/types";

const REACTION_TYPES: ReactionType[] = ["howl", "fire", "flex", "crown"];

type Props = {
  onSelect: (type: ReactionType) => void;
  selected?: ReactionType;
};

function ReactionBarInner({ onSelect, selected }: Props) {
  const { theme } = useAppTheme();

  const handlePress = useCallback((type: ReactionType) => {
    impact(ImpactStyle.Light);
    onSelect(type);
  }, [onSelect]);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
    >
      {REACTION_TYPES.map((type) => (
        <Pressable
          key={type}
          style={[
            styles.button,
            selected === type && { backgroundColor: theme.colors.primary + "20" },
          ]}
          onPress={() => handlePress(type)}
        >
          <Text style={styles.emoji}>{REACTION_EMOJI[type]}</Text>
          <Text style={[styles.label, { color: theme.colors.muted }]}>
            {REACTION_LABELS[type]}
          </Text>
        </Pressable>
      ))}
    </Animated.View>
  );
}

export const ReactionBar = React.memo(ReactionBarInner);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  button: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  emoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
  },
});

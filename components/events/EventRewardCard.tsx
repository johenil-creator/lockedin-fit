import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { SeasonalEvent } from "../../lib/types";

type Props = {
  event: SeasonalEvent;
  currentScore: number;
};

const TIER_LABELS = ["Bronze", "Silver", "Gold"] as const;
const TIER_COLORS = ["#CD7F32", "#C0C0C0", "#FFD700"] as const;
const TIER_ICONS = ["ribbon-outline", "medal-outline", "trophy-outline"] as const;

function EventRewardCardInner({ event, currentScore }: Props) {
  const { theme } = useAppTheme();

  // Determine current tier
  let currentTier = -1;
  for (let i = event.rewards.length - 1; i >= 0; i--) {
    if (currentScore >= event.rewards[i]) {
      currentTier = i;
      break;
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Text
        style={[
          typography.subheading,
          { color: theme.colors.text, marginBottom: spacing.md },
        ]}
      >
        Event Rewards
      </Text>

      <View style={styles.tiersRow}>
        {event.rewards.map((threshold, i) => {
          const isReached = currentScore >= threshold;
          const isCurrent = currentTier === i;

          return (
            <View
              key={TIER_LABELS[i]}
              style={[
                styles.tierItem,
                {
                  backgroundColor: isCurrent
                    ? TIER_COLORS[i] + "20"
                    : theme.colors.mutedBg,
                  borderColor: isCurrent ? TIER_COLORS[i] : theme.colors.border,
                },
              ]}
            >
              <Ionicons
                name={TIER_ICONS[i] as any}
                size={24}
                color={isReached ? TIER_COLORS[i] : theme.colors.muted}
              />
              <Text
                style={[
                  typography.caption,
                  {
                    color: isReached ? TIER_COLORS[i] : theme.colors.muted,
                    fontWeight: "700",
                    marginTop: 4,
                  },
                ]}
              >
                {TIER_LABELS[i]}
              </Text>
              <Text
                style={[
                  typography.small,
                  {
                    color: isReached ? theme.colors.text : theme.colors.muted,
                    fontWeight: "600",
                    marginTop: 2,
                  },
                ]}
              >
                {threshold} Fangs
              </Text>
              {isReached && (
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={TIER_COLORS[i]}
                  style={{ marginTop: 4 }}
                />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export const EventRewardCard = React.memo(EventRewardCardInner);

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
  tiersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  tierItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});

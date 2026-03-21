import React from "react";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { WeeklyObjective } from "../../lib/types";

type Props = {
  objective: WeeklyObjective | null;
  onClaim: (questId: string) => void;
};

function WeeklyObjectiveCardInner({ objective, onClaim }: Props) {
  const { theme } = useAppTheme();

  if (!objective) return null;

  const { quest, progress } = objective;
  const progressPct = Math.min(progress.current / quest.target, 1);
  const canClaim = progress.completed && !progress.claimedAt;
  const claimed = !!progress.claimedAt;

  // Circular progress
  const size = 64;
  const strokeWidth = 6;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - progressPct);

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <Ionicons name="flag-outline" size={20} color={theme.colors.accent} />
        <Text style={[typography.subheading, { color: theme.colors.text, flex: 1, marginLeft: spacing.sm }]}>
          Weekly Objective
        </Text>
      </View>

      <View style={styles.body}>
        {/* Circular progress indicator */}
        <View style={[styles.circleContainer, { width: size, height: size }]}>
          <View style={[styles.circleTrack, { width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: theme.colors.mutedBg }]} />
          <View style={[styles.circleFill, { width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: claimed ? theme.colors.muted : theme.colors.accent }]}>
            <Text style={[styles.circleText, { color: theme.colors.text }]}>
              {Math.round(progressPct * 100)}%
            </Text>
          </View>
        </View>

        <View style={styles.info}>
          <Text style={[typography.body, { color: theme.colors.text, fontWeight: "600" }]}>
            {quest.title}
          </Text>
          <Text style={[typography.caption, { color: theme.colors.muted }]}>
            {quest.description}
          </Text>
          <Text style={[typography.caption, { color: theme.colors.muted, marginTop: 4 }]}>
            {Math.min(progress.current, quest.target)} / {quest.target}
          </Text>
        </View>

        <View style={styles.rewardSection}>
          {canClaim ? (
            <Pressable
              style={[styles.claimBtn, { backgroundColor: theme.colors.accent }]}
              onPress={() => onClaim(quest.id)}
            >
              <Text style={[styles.claimText, { color: "#fff" }]}>Claim</Text>
            </Pressable>
          ) : claimed ? (
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.accent} />
          ) : (
            <View style={styles.rewardBadge}>
              <Image source={require("../../assets/fangs_icon.png")} style={{ width: 22, height: 22, tintColor: "#FFD700" }} resizeMode="contain" />
              <Text style={[styles.rewardText, { color: "#FFD700" }]}>{quest.reward}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export const WeeklyObjectiveCard = React.memo(WeeklyObjectiveCardInner);

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
    marginBottom: spacing.md,
  },
  body: {
    flexDirection: "row",
    alignItems: "center",
  },
  circleContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  circleTrack: {
    position: "absolute",
  },
  circleFill: {
    alignItems: "center",
    justifyContent: "center",
  },
  circleText: {
    fontSize: 14,
    fontWeight: "800",
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  rewardSection: {
    marginLeft: spacing.sm,
    alignItems: "center",
  },
  claimBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  claimText: {
    fontSize: 13,
    fontWeight: "700",
  },
  rewardBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: "700",
  },
});

import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { PackChallenge, PackChallengeType } from "../../lib/types";

type Props = {
  challenge: PackChallenge | null;
  isLeader: boolean;
  onCreate: (type: PackChallengeType, target: number) => Promise<boolean>;
};

const CHALLENGE_LABELS: Record<PackChallengeType, string> = {
  sets: "Complete Sets",
  sessions: "Complete Workouts",
  xp: "Earn XP",
  streak: "Maintain Streak (days)",
};

const CHALLENGE_ICONS: Record<PackChallengeType, string> = {
  sets: "barbell-outline",
  sessions: "fitness-outline",
  xp: "flash-outline",
  streak: "flame-outline",
};

const PRESET_TARGETS: Record<PackChallengeType, number[]> = {
  sets: [50, 100, 200],
  sessions: [5, 10, 20],
  xp: [100, 250, 500],
  streak: [3, 5, 7],
};

function PackChallengeCardInner({ challenge, isLeader, onCreate }: Props) {
  const { theme } = useAppTheme();
  const [creating, setCreating] = useState(false);

  function handleCreate() {
    const types: PackChallengeType[] = ["sets", "sessions", "xp", "streak"];
    Alert.alert("New Pack Challenge", "Choose a challenge type:", [
      ...types.map((t) => ({
        text: CHALLENGE_LABELS[t],
        onPress: () => {
          const targets = PRESET_TARGETS[t];
          Alert.alert(`Target for ${CHALLENGE_LABELS[t]}`, "Choose target:", [
            ...targets.map((target) => ({
              text: String(target),
              onPress: async () => {
                setCreating(true);
                await onCreate(t, target);
                setCreating(false);
              },
            })),
            { text: "Cancel", style: "cancel" },
          ]);
        },
      })),
      { text: "Cancel", style: "cancel" },
    ]);
  }

  if (!challenge && !isLeader) return null;

  if (!challenge) {
    return (
      <Pressable
        style={[styles.card, { backgroundColor: theme.colors.surface, borderStyle: "dashed", borderWidth: 1.5, borderColor: theme.colors.accent + "60" }]}
        onPress={handleCreate}
        disabled={creating}
      >
        <Ionicons name="add-circle-outline" size={24} color={theme.colors.accent} />
        <Text style={[typography.body, { color: theme.colors.accent, fontWeight: "600", marginTop: 4 }]}>
          {creating ? "Creating..." : "Create Pack Challenge"}
        </Text>
        <Text style={[typography.caption, { color: theme.colors.muted, marginTop: 2 }]}>
          Set a weekly goal for your pack
        </Text>
      </Pressable>
    );
  }

  const progress = Math.min(challenge.current / challenge.target, 1);
  const isComplete = challenge.status === "completed";
  const iconName = CHALLENGE_ICONS[challenge.type] ?? "trophy-outline";

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <Ionicons name={iconName as any} size={20} color={theme.colors.accent} />
        <Text style={[typography.subheading, { color: theme.colors.text, flex: 1, marginLeft: spacing.sm }]}>
          Pack Challenge
        </Text>
        {isComplete && (
          <View style={[styles.completeBadge, { backgroundColor: theme.colors.accent + "20" }]}>
            <Text style={[typography.caption, { color: theme.colors.accent, fontWeight: "700" }]}>
              COMPLETE
            </Text>
          </View>
        )}
      </View>

      <Text style={[typography.body, { color: theme.colors.text, marginTop: spacing.sm }]}>
        {CHALLENGE_LABELS[challenge.type]}: {challenge.target}
      </Text>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: theme.colors.mutedBg }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%`, backgroundColor: isComplete ? theme.colors.accent : theme.colors.primary },
          ]}
        />
      </View>

      <Text style={[typography.caption, { color: theme.colors.muted, marginTop: 4 }]}>
        {challenge.current} / {challenge.target}
      </Text>
    </View>
  );
}

export const PackChallengeCard = React.memo(PackChallengeCardInner);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  completeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
});

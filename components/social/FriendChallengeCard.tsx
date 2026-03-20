import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { FriendChallenge } from "../../lib/types";

type Props = {
  challenges: FriendChallenge[];
  pending: FriendChallenge[];
  userId: string;
  onRespond: (challengeId: string, accept: boolean) => void;
};

const METRIC_LABELS: Record<string, string> = {
  xp: "XP",
  sets: "Sets",
  sessions: "Workouts",
};

function FriendChallengeCardInner({ challenges, pending, userId, onRespond }: Props) {
  const { theme } = useAppTheme();

  if (challenges.length === 0 && pending.length === 0) return null;

  const active = challenges.filter((c) => c.status === "active");

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <Ionicons name="trophy-outline" size={20} color={theme.colors.accent} />
        <Text style={[typography.subheading, { color: theme.colors.text, marginLeft: spacing.sm }]}>
          1v1 Challenges
        </Text>
      </View>

      {/* Pending challenges (accept/decline) */}
      {pending.map((c) => (
        <View key={c.id} style={[styles.challengeRow, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.challengeInfo}>
            <Text style={[typography.body, { color: theme.colors.text, fontWeight: "600" }]}>
              {c.challengerName}
            </Text>
            <Text style={[typography.caption, { color: theme.colors.muted }]}>
              {METRIC_LABELS[c.metric]} challenge
            </Text>
          </View>
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: theme.colors.accent }]}
              onPress={() => onRespond(c.id, true)}
            >
              <Text style={[styles.actionText, { color: "#fff" }]}>Accept</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: theme.colors.mutedBg }]}
              onPress={() => onRespond(c.id, false)}
            >
              <Text style={[styles.actionText, { color: theme.colors.muted }]}>Decline</Text>
            </Pressable>
          </View>
        </View>
      ))}

      {/* Active challenges */}
      {active.map((c) => {
        const isChallenger = c.challengerId === userId;
        const myScore = isChallenger ? c.challengerScore : c.opponentScore;
        const theirScore = isChallenger ? c.opponentScore : c.challengerScore;
        const opponentName = isChallenger ? c.opponentName : c.challengerName;
        const winning = myScore > theirScore;

        return (
          <View key={c.id} style={[styles.challengeRow, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.challengeInfo}>
              <Text style={[typography.body, { color: theme.colors.text, fontWeight: "600" }]}>
                vs {opponentName}
              </Text>
              <Text style={[typography.caption, { color: theme.colors.muted }]}>
                {METRIC_LABELS[c.metric]}
              </Text>
            </View>
            <View style={styles.scoreSection}>
              <Text
                style={[
                  styles.score,
                  { color: winning ? theme.colors.accent : theme.colors.text },
                ]}
              >
                {myScore}
              </Text>
              <Text style={[styles.scoreSep, { color: theme.colors.muted }]}> - </Text>
              <Text
                style={[
                  styles.score,
                  { color: !winning && theirScore > myScore ? theme.colors.danger : theme.colors.text },
                ]}
              >
                {theirScore}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export const FriendChallengeCard = React.memo(FriendChallengeCardInner);

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
    marginBottom: spacing.sm,
  },
  challengeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  challengeInfo: {
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  scoreSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  score: {
    fontSize: 18,
    fontWeight: "800",
  },
  scoreSep: {
    fontSize: 14,
    fontWeight: "500",
  },
});

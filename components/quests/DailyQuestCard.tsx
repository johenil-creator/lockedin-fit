import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { Quest, QuestProgress } from "../../lib/types";

type QuestWithProgress = Quest & { progress: QuestProgress };

type Props = {
  quests: QuestWithProgress[];
  onClaim: (questId: string) => void;
};

function getMidnightCountdown(): string {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function DailyQuestCardInner({ quests, onClaim }: Props) {
  const { theme } = useAppTheme();
  const [countdown, setCountdown] = useState(getMidnightCountdown());

  useEffect(() => {
    const interval = setInterval(() => setCountdown(getMidnightCountdown()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (quests.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <Ionicons name="compass-outline" size={20} color={theme.colors.accent} />
        <Text style={[typography.subheading, { color: theme.colors.text, flex: 1, marginLeft: spacing.sm }]}>
          Daily Trials
        </Text>
        <Text style={[typography.caption, { color: theme.colors.muted }]}>
          Resets in {countdown}
        </Text>
      </View>

      {quests.map((q) => {
        const progress = Math.min(q.progress.current / q.target, 1);
        const canClaim = q.progress.completed && !q.progress.claimedAt;
        const claimed = !!q.progress.claimedAt;

        return (
          <View key={q.id} style={[styles.questRow, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.questInfo}>
              <Text style={[typography.body, { color: theme.colors.text, fontWeight: "600" }]}>
                {q.title}
              </Text>
              <Text style={[typography.caption, { color: theme.colors.muted }]}>
                {q.description}
              </Text>

              {/* Progress bar */}
              <View style={[styles.progressTrack, { backgroundColor: theme.colors.mutedBg }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress * 100}%`,
                      backgroundColor: claimed ? theme.colors.muted : theme.colors.accent,
                    },
                  ]}
                />
              </View>
              <Text style={[typography.caption, { color: theme.colors.muted, marginTop: spacing.xs }]}>
                {Math.min(q.progress.current, q.target)} / {q.target}
              </Text>
            </View>

            <View style={styles.rewardSection}>
              {canClaim ? (
                <Pressable
                  style={[styles.claimBtn, { backgroundColor: theme.colors.accent }]}
                  onPress={() => onClaim(q.id)}
                >
                  <Text style={[styles.claimText, { color: "#fff" }]}>Claim</Text>
                </Pressable>
              ) : claimed ? (
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.accent} />
              ) : (
                <View style={styles.rewardBadge}>
                  <Image source={require("../../assets/fangs_icon.png")} style={{ width: 22, height: 22, tintColor: "#FFD700" }} resizeMode="contain" />
                  <Text style={[styles.rewardText, { color: "#FFD700" }]}>{q.reward}</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export const DailyQuestCard = React.memo(DailyQuestCardInner);

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
  questRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  questInfo: {
    flex: 1,
  },
  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  rewardSection: {
    marginLeft: spacing.sm,
    alignItems: "center",
    minWidth: 50,
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

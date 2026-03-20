import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import { rankDisplayName } from "../../lib/rankService";
import { LockePreview } from "./LockePreview";
import type { GlobalLeaderboardEntry } from "../../lib/types";

type Props = {
  entries: GlobalLeaderboardEntry[];
  period: "weekly" | "alltime";
  onTogglePeriod: () => void;
  currentUserId?: string;
};

function GlobalLeaderboardCardInner({ entries, period, onTogglePeriod, currentUserId }: Props) {
  const { theme } = useAppTheme();

  const top10 = entries.slice(0, 10);

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <Ionicons name="podium-outline" size={20} color={theme.colors.accent} />
        <Text style={[typography.subheading, { color: theme.colors.text, flex: 1, marginLeft: spacing.sm }]}>
          Global Leaderboard
        </Text>
        <Pressable
          style={[styles.toggleBtn, { backgroundColor: theme.colors.mutedBg }]}
          onPress={onTogglePeriod}
        >
          <Text style={[styles.toggleText, { color: theme.colors.accent }]}>
            {period === "weekly" ? "Weekly" : "All Time"}
          </Text>
        </Pressable>
      </View>

      {top10.length === 0 ? (
        <Text style={[typography.body, { color: theme.colors.muted, textAlign: "center", paddingVertical: spacing.lg }]}>
          No data yet. Get training, wolf.
        </Text>
      ) : (
        top10.map((entry, index) => {
          const isUser = entry.userId === currentUserId;
          const xp = period === "weekly" ? entry.weeklyXp : entry.allTimeXp;

          return (
            <View
              key={entry.userId}
              style={[
                styles.row,
                isUser && { backgroundColor: theme.colors.accent + "15" },
                index < top10.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
              ]}
            >
              <Text style={[styles.rank, { color: index < 3 ? theme.colors.accent : theme.colors.muted }]}>
                {index === 0 ? "\uD83E\uDD47" : index === 1 ? "\uD83E\uDD48" : index === 2 ? "\uD83E\uDD49" : `#${index + 1}`}
              </Text>

              <LockePreview size={28} customization={entry.lockeCustomization} />

              <View style={styles.info}>
                <Text
                  style={[typography.body, { color: isUser ? theme.colors.accent : theme.colors.text, fontWeight: "600" }]}
                  numberOfLines={1}
                >
                  {entry.displayName}
                </Text>
                <Text style={[typography.caption, { color: theme.colors.muted }]}>
                  {rankDisplayName(entry.rank)}
                </Text>
              </View>

              <Text style={[styles.xp, { color: theme.colors.accent }]}>
                {xp.toLocaleString()} XP
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

export const GlobalLeaderboardCard = React.memo(GlobalLeaderboardCardInner);

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
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: radius.sm,
    gap: spacing.sm,
  },
  rank: {
    fontSize: 14,
    fontWeight: "700",
    width: 28,
    textAlign: "center",
  },
  info: {
    flex: 1,
  },
  xp: {
    fontSize: 13,
    fontWeight: "700",
  },
});

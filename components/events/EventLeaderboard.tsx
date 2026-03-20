import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { EventLeaderboardEntry } from "../../lib/types";

type Props = {
  entries: EventLeaderboardEntry[];
  currentUserId?: string;
};

function LeaderboardRow({
  entry,
  isCurrentUser,
}: {
  entry: EventLeaderboardEntry;
  isCurrentUser: boolean;
}) {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: theme.colors.border,
          backgroundColor: isCurrentUser
            ? theme.colors.primary + "15"
            : "transparent",
        },
      ]}
    >
      <Text
        style={[
          styles.rank,
          {
            color: isCurrentUser ? theme.colors.primary : theme.colors.muted,
          },
        ]}
      >
        #{entry.rank}
      </Text>
      <Text
        style={[
          typography.body,
          {
            flex: 1,
            color: theme.colors.text,
            fontWeight: isCurrentUser ? "700" : "400",
          },
        ]}
        numberOfLines={1}
      >
        {entry.displayName}
      </Text>
      <Text
        style={[
          typography.body,
          {
            color: isCurrentUser ? theme.colors.primary : theme.colors.text,
            fontWeight: "600",
          },
        ]}
      >
        {entry.score.toLocaleString()}
      </Text>
    </View>
  );
}

const MemoizedRow = React.memo(LeaderboardRow);

function EventLeaderboardInner({ entries, currentUserId }: Props) {
  const { theme } = useAppTheme();

  if (entries.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[typography.body, { color: theme.colors.muted, textAlign: "center" }]}>
          No participants yet. Be the first to join!
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Text
        style={[
          typography.subheading,
          { color: theme.colors.text, marginBottom: spacing.sm },
        ]}
      >
        Leaderboard
      </Text>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <MemoizedRow
            entry={item}
            isCurrentUser={item.userId === currentUserId}
          />
        )}
        scrollEnabled={false}
      />
    </View>
  );
}

export const EventLeaderboard = React.memo(EventLeaderboardInner);

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
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
  },
  rank: {
    fontSize: 14,
    fontWeight: "700",
    width: 40,
  },
});

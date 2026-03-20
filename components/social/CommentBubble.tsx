import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { Comment } from "../../lib/types";

type Props = {
  comment: Comment;
};

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function CommentBubbleInner({ comment }: Props) {
  const { theme } = useAppTheme();
  const initial = (comment.displayName ?? "?")[0].toUpperCase();

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.avatar,
          { backgroundColor: theme.colors.primary + "30" },
        ]}
      >
        <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
          {initial}
        </Text>
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[styles.name, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {comment.displayName}
          </Text>
          <Text style={[styles.time, { color: theme.colors.muted }]}>
            {formatRelativeTime(comment.createdAt)}
          </Text>
        </View>
        <Text style={[styles.text, { color: theme.colors.text }]}>
          {comment.text}
        </Text>
      </View>
    </View>
  );
}

export const CommentBubble = React.memo(CommentBubbleInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 2,
  },
  name: {
    ...typography.caption,
    fontWeight: "600",
  },
  time: {
    ...typography.caption,
  },
  text: {
    ...typography.small,
  },
});

import React, { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { LockePreview } from "./LockePreview";
import { ReactionBubbles } from "./ReactionBubbles";
import { ReactionBar } from "./ReactionBar";
import { getActivityDescription, } from "../../lib/activityService";
import { REACTION_EMOJI } from "../../lib/reactionService";
import { spacing, typography, radius } from "../../lib/theme";
import { impact, ImpactStyle } from "../../lib/haptics";
import type { ActivityEvent, ReactionType } from "../../lib/types";

type Props = {
  event: ActivityEvent;
  reactions?: Record<ReactionType, number>;
  onReact: (activityId: string, type: ReactionType) => void;
  commentCount?: number;
  onCommentPress?: (activityId: string) => void;
};

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TYPE_EMOJI: Record<string, string> = {
  workout_complete: "\uD83D\uDCAA",
  rank_up: "\u2B06\uFE0F",
  pr_hit: "\uD83C\uDFC6",
  streak_milestone: "\uD83D\uDD25",
  pack_joined: "\uD83D\uDC3A",
  user_post: "\uD83D\uDCAC",
  milestone: "\uD83C\uDFC5",
};

function ActivityFeedItemInner({ event, reactions, onReact, commentCount, onCommentPress }: Props) {
  const { theme } = useAppTheme();
  const [showReactions, setShowReactions] = useState(false);

  const handleReact = useCallback((type: ReactionType) => {
    onReact(event.id, type);
    setShowReactions(false);
  }, [event.id, onReact]);

  const handleLongPress = useCallback(() => {
    impact(ImpactStyle.Light);
    setShowReactions((prev) => !prev);
  }, []);

  const description = getActivityDescription(event);
  const emoji = TYPE_EMOJI[event.type] ?? "\u2728";
  const isMilestone = event.type === "milestone";

  return (
    <View style={[
      styles.container,
      isMilestone && { borderWidth: 1.5, borderColor: "#FFD700", borderRadius: radius.md, padding: spacing.sm, backgroundColor: "#FFD70008" },
    ]}>
      <View style={styles.row}>
        <Text style={styles.typeEmoji}>{emoji}</Text>

        <View style={styles.content}>
          <Text style={[typography.body, { color: theme.colors.text }]} numberOfLines={2}>
            <Text style={{ fontWeight: "700" }}>{event.displayName}</Text>
            {" "}
            {description}
          </Text>
          <Text style={[typography.caption, { color: theme.colors.muted, marginTop: spacing.xs }]}>
            {getTimeAgo(event.createdAt)}
          </Text>
        </View>

        <View style={styles.actionRow}>
          {onCommentPress && (
            <Pressable onPress={() => onCommentPress(event.id)} hitSlop={8} style={styles.reactBtn}>
              <View style={styles.commentBtn}>
                <Ionicons name="chatbubble-outline" size={14} color={theme.colors.muted} />
                {(commentCount ?? 0) > 0 && (
                  <Text style={[styles.commentCount, { color: theme.colors.muted }]}>
                    {commentCount}
                  </Text>
                )}
              </View>
            </Pressable>
          )}
          <Pressable onPress={handleLongPress} hitSlop={8} style={styles.reactBtn}>
            <Text style={{ fontSize: 16 }}>{"\uD83D\uDC3E"}</Text>
          </Pressable>
        </View>
      </View>

      {reactions && <ReactionBubbles reactions={reactions} />}

      {showReactions && (
        <ReactionBar onSelect={handleReact} />
      )}
    </View>
  );
}

export const ActivityFeedItem = React.memo(ActivityFeedItemInner);

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  typeEmoji: {
    fontSize: 20,
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
  },
  reactBtn: {
    padding: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  commentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  commentCount: {
    fontSize: 11,
    fontWeight: "600",
  },
});

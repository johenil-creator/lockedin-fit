import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { ActivityFeedItem } from "./ActivityFeedItem";
import { useFriendActivity } from "../../hooks/useFriendActivity";
import { sendReaction } from "../../lib/reactionService";
import { useAuth } from "../../contexts/AuthContext";
import { spacing, typography, radius } from "../../lib/theme";
import type { ReactionType } from "../../lib/types";

type ActivityFeedCardProps = {
  refreshKey?: number;
};

export function ActivityFeedCard({ refreshKey }: ActivityFeedCardProps) {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { activities, reactions, loading, refresh } = useFriendActivity();

  // Re-fetch when refreshKey changes (e.g. after posting)
  React.useEffect(() => {
    if (refreshKey && refreshKey > 0) {
      refresh();
    }
  }, [refreshKey, refresh]);

  const handleReact = useCallback(async (activityId: string, type: ReactionType) => {
    if (!user) return;
    const event = activities.find((a) => a.id === activityId);
    if (!event) return;
    await sendReaction(user.uid, event.userId, activityId, type);
  }, [user, activities]);

  // Show nothing if no user or loading
  if (!user || (loading && activities.length === 0)) return null;

  // Show nothing if no activities
  if (activities.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
          Activity Feed
        </Text>
        <Text style={[typography.caption, { color: theme.colors.muted, textAlign: "center" }]}>
          Add friends to see their workouts here!
        </Text>
      </View>
    );
  }

  const displayed = activities.slice(0, 5);

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
        Activity Feed
      </Text>

      {displayed.map((event) => (
        <View
          key={event.id}
          style={[styles.separator, { borderBottomColor: theme.colors.border }]}
        >
          <ActivityFeedItem
            event={event}
            reactions={reactions[event.id]}
            onReact={handleReact}
          />
        </View>
      ))}

      {activities.length > 5 && (
        <Pressable style={styles.seeAll}>
          <Text style={[typography.caption, { color: theme.colors.primary, fontWeight: "700" }]}>
            See all activity
          </Text>
        </Pressable>
      )}
    </View>
  );
}

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
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  seeAll: {
    alignItems: "center",
    paddingTop: spacing.sm,
  },
});

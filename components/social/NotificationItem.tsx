import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { InAppNotification, NotificationType } from "../../lib/types";

type Props = {
  notification: InAppNotification;
  onPress: () => void;
};

const NOTIF_ICONS: Record<NotificationType, { name: string; color: string }> = {
  friend_workout: { name: "fitness-outline", color: "#00875A" },
  challenge_received: { name: "flash-outline", color: "#FFD700" },
  challenge_update: { name: "trophy-outline", color: "#FF6B35" },
  gift_received: { name: "gift-outline", color: "#FF69B4" },
  pack_challenge_complete: { name: "flag-outline", color: "#2196F3" },
  quest_expiring: { name: "compass-outline", color: "#FF5722" },
  nudge_received: { name: "notifications-outline", color: "#FF9800" },
  streak_battle_lost: { name: "flame-outline", color: "#F44336" },
  milestone_friend: { name: "medal-outline", color: "#FFD700" },
  comment_received: { name: "chatbubble-outline", color: "#4CAF50" },
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

function NotificationItemInner({ notification, onPress }: Props) {
  const { theme } = useAppTheme();
  const iconInfo = NOTIF_ICONS[notification.type] ?? { name: "notifications-outline", color: theme.colors.muted };

  return (
    <Pressable
      style={[
        styles.container,
        { borderBottomColor: theme.colors.border },
        !notification.read && { backgroundColor: theme.colors.accent + "08" },
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconInfo.color + "20" }]}>
        <Ionicons name={iconInfo.name as any} size={18} color={iconInfo.color} />
      </View>

      <View style={styles.content}>
        <Text style={[typography.body, { color: theme.colors.text, fontWeight: notification.read ? "400" : "600" }]} numberOfLines={1}>
          {notification.title}
        </Text>
        <Text style={[typography.caption, { color: theme.colors.muted }]} numberOfLines={2}>
          {notification.body}
        </Text>
        <Text style={[styles.time, { color: theme.colors.muted }]}>
          {getTimeAgo(notification.createdAt)}
        </Text>
      </View>

      {!notification.read && (
        <View style={[styles.unreadDot, { backgroundColor: theme.colors.accent }]} />
      )}
    </Pressable>
  );
}

export const NotificationItem = React.memo(NotificationItemInner);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  time: {
    fontSize: 11,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

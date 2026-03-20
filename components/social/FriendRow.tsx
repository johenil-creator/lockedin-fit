import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { LockePreview } from "./LockePreview";
import { spacing, typography } from "../../lib/theme";
import { rankDisplayName } from "../../lib/rankService";
import type { FriendProfile } from "../../lib/types";

type Props = {
  friend: FriendProfile;
  onPress?: () => void;
  onChallenge?: () => void;
};

function getTimeAgo(dateStr: string): string {
  if (!dateStr) return "Unknown";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function FriendRowInner({ friend, onPress, onChallenge }: Props) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      style={[styles.container, { borderBottomColor: theme.colors.border }]}
      onPress={onPress}
    >
      <LockePreview size={40} customization={friend.lockeCustomization} />

      <View style={styles.info}>
        <Text
          style={[typography.body, { color: theme.colors.text, fontWeight: "600" }]}
          numberOfLines={1}
        >
          {friend.displayName}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[typography.caption, { color: theme.colors.muted }]}>
            {rankDisplayName(friend.rank)}
          </Text>
          <Text style={[typography.caption, { color: theme.colors.muted }]}>
            {" \u00B7 "}
          </Text>
          <Text style={[typography.caption, { color: theme.colors.muted }]}>
            {getTimeAgo(friend.lastActiveAt)}
          </Text>
        </View>
        {friend.lastWorkoutSummary && (
          <Text
            style={[typography.caption, { color: theme.colors.accent, marginTop: 2 }]}
            numberOfLines={1}
          >
            {friend.lastWorkoutSummary.sessionName}
          </Text>
        )}
      </View>

      {onChallenge && (
        <Pressable onPress={onChallenge} hitSlop={8} style={styles.challengeBtn}>
          <Ionicons name="flash-outline" size={18} color={theme.colors.accent} />
        </Pressable>
      )}

      <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
    </Pressable>
  );
}

export const FriendRow = React.memo(FriendRowInner);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  info: {
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  challengeBtn: {
    padding: 6,
    marginRight: 4,
  },
});

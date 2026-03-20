import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";

type Props = {
  unreadCount: number;
  onPress: () => void;
};

function NotificationBellInner({ unreadCount, onPress }: Props) {
  const { theme } = useAppTheme();

  return (
    <Pressable onPress={onPress} style={styles.container} hitSlop={8} accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`} accessibilityRole="button">
      <Ionicons name="notifications-outline" size={22} color={theme.colors.text} />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.colors.danger }]}>
          <Text style={styles.badgeText}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export const NotificationBell = React.memo(NotificationBellInner);

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
});

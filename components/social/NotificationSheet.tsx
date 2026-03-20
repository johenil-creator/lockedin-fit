import React from "react";
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import { NotificationItem } from "./NotificationItem";
import type { InAppNotification } from "../../lib/types";

type Props = {
  visible: boolean;
  notifications: InAppNotification[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
};

export function NotificationSheet({ visible, notifications, onClose, onMarkRead, onMarkAllRead }: Props) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={[typography.subheading, { color: theme.colors.text }]}>
              Notifications
            </Text>
            {notifications.some((n) => !n.read) && (
              <Pressable onPress={onMarkAllRead}>
                <Text style={[typography.caption, { color: theme.colors.accent, fontWeight: "700" }]}>
                  Mark all read
                </Text>
              </Pressable>
            )}
          </View>

          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <NotificationItem notification={item} onPress={() => onMarkRead(item.id)} />
            )}
            ListEmptyComponent={
              <Text style={[typography.body, { color: theme.colors.muted, textAlign: "center", paddingVertical: 40 }]}>
                No notifications yet
              </Text>
            }
            style={styles.list}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: "80%",
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#666", alignSelf: "center", marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  list: {
    maxHeight: 400,
  },
});

import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Modal, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import { LockePreview } from "./LockePreview";
import type { FriendProfile, CosmeticItem } from "../../lib/types";

type Props = {
  visible: boolean;
  friends: FriendProfile[];
  items: CosmeticItem[];
  onClose: () => void;
  onSend: (toUserId: string, itemId: string, itemPrice: number, message: string) => void;
};

export function GiftBottomSheet({ visible, friends, items, onClose, onSend }: Props) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [selectedItem, setSelectedItem] = useState<CosmeticItem | null>(null);
  const [message, setMessage] = useState("");

  function handleSend() {
    if (!selectedFriend || !selectedItem) return;
    onSend(selectedFriend.userId, selectedItem.id, selectedItem.price, message);
    setSelectedFriend(null);
    setSelectedItem(null);
    setMessage("");
    onClose();
  }

  function handleClose() {
    setSelectedFriend(null);
    setSelectedItem(null);
    setMessage("");
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.handle} />

          <Text style={[typography.subheading, { color: theme.colors.text, textAlign: "center", marginBottom: spacing.md }]}>
            Send a Gift
          </Text>

          {/* Friend picker */}
          <Text style={[typography.caption, { color: theme.colors.muted, marginBottom: spacing.sm }]}>
            TO
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.friendScroll}>
            {friends.map((f) => (
              <Pressable
                key={f.userId}
                style={[
                  styles.friendChip,
                  { borderColor: selectedFriend?.userId === f.userId ? theme.colors.accent : theme.colors.border },
                ]}
                onPress={() => setSelectedFriend(f)}
              >
                <LockePreview size={28} customization={f.lockeCustomization} />
                <Text style={[typography.caption, { color: theme.colors.text, fontWeight: "600", marginLeft: 4 }]}>
                  {f.displayName}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Item picker */}
          <Text style={[typography.caption, { color: theme.colors.muted, marginTop: spacing.md, marginBottom: spacing.sm }]}>
            ITEM
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemScroll}>
            {items.map((item) => (
              <Pressable
                key={item.id}
                style={[
                  styles.itemChip,
                  {
                    borderColor: selectedItem?.id === item.id ? theme.colors.accent : theme.colors.border,
                    backgroundColor: selectedItem?.id === item.id ? theme.colors.accent + "10" : "transparent",
                  },
                ]}
                onPress={() => setSelectedItem(item)}
              >
                <View style={[styles.itemPreview, { backgroundColor: item.preview.startsWith("#") ? item.preview : theme.colors.mutedBg }]}>
                  {!item.preview.startsWith("#") && (
                    <Ionicons name={item.preview as any} size={16} color={theme.colors.accent} />
                  )}
                </View>
                <Text style={[typography.caption, { color: theme.colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.priceText, { color: "#FFD700" }]}>
                  {"\u26A1"}{item.price}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Message */}
          <Text style={[typography.caption, { color: theme.colors.muted, marginTop: spacing.md, marginBottom: spacing.sm }]}>
            MESSAGE (OPTIONAL)
          </Text>
          <TextInput
            style={[styles.messageInput, { backgroundColor: theme.colors.mutedBg, color: theme.colors.text }]}
            value={message}
            onChangeText={setMessage}
            placeholder="Add a note..."
            placeholderTextColor={theme.colors.muted}
            maxLength={100}
          />

          {/* Send button */}
          <Pressable
            style={[
              styles.sendBtn,
              { backgroundColor: selectedFriend && selectedItem ? theme.colors.primary : theme.colors.mutedBg },
            ]}
            onPress={handleSend}
            disabled={!selectedFriend || !selectedItem}
          >
            <Text
              style={[
                styles.sendBtnText,
                { color: selectedFriend && selectedItem ? theme.colors.primaryText : theme.colors.muted },
              ]}
            >
              Send Gift
            </Text>
          </Pressable>
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
    maxHeight: "85%",
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#666", alignSelf: "center", marginBottom: spacing.md,
  },
  friendScroll: { maxHeight: 50 },
  friendChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6, paddingHorizontal: 10,
    borderRadius: radius.full, borderWidth: 1.5,
    marginRight: 8,
  },
  itemScroll: { maxHeight: 90 },
  itemChip: {
    alignItems: "center",
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: radius.md, borderWidth: 1.5,
    marginRight: 8, width: 90,
  },
  itemPreview: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  priceText: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  messageInput: {
    height: 40, borderRadius: radius.md,
    paddingHorizontal: 12, fontSize: 14,
  },
  sendBtn: {
    height: 52, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    marginTop: spacing.lg,
  },
  sendBtnText: { fontSize: 16, fontWeight: "700" },
});

import React, { useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import { LockePreview } from "./LockePreview";
import type { FriendProfile, FriendChallengeMetric } from "../../lib/types";

type Props = {
  visible: boolean;
  friends: FriendProfile[];
  onClose: () => void;
  onCreate: (opponentId: string, opponentName: string, metric: FriendChallengeMetric) => void;
};

const METRICS: { key: FriendChallengeMetric; label: string; icon: string }[] = [
  { key: "xp", label: "Most XP", icon: "flash-outline" },
  { key: "sets", label: "Most Sets", icon: "barbell-outline" },
  { key: "sessions", label: "Most Workouts", icon: "fitness-outline" },
];

export function ChallengeBottomSheet({ visible, friends, onClose, onCreate }: Props) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<FriendChallengeMetric>("xp");

  function handleCreate() {
    if (!selectedFriend) return;
    onCreate(selectedFriend.userId, selectedFriend.displayName, selectedMetric);
    setSelectedFriend(null);
    onClose();
  }

  function handleClose() {
    setSelectedFriend(null);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.handle} />

          <Text style={[typography.subheading, { color: theme.colors.text, textAlign: "center", marginBottom: spacing.md }]}>
            Challenge a Friend
          </Text>

          {/* Friend picker */}
          <Text style={[typography.caption, { color: theme.colors.muted, marginBottom: spacing.sm }]}>
            SELECT OPPONENT
          </Text>
          <ScrollView style={styles.friendList} horizontal={false}>
            {friends.map((f) => (
              <Pressable
                key={f.userId}
                style={[
                  styles.friendRow,
                  { borderColor: selectedFriend?.userId === f.userId ? theme.colors.accent : theme.colors.border },
                  selectedFriend?.userId === f.userId && { backgroundColor: theme.colors.accent + "10" },
                ]}
                onPress={() => setSelectedFriend(f)}
              >
                <LockePreview size={32} customization={f.lockeCustomization} />
                <Text style={[typography.body, { color: theme.colors.text, fontWeight: "600", flex: 1, marginLeft: spacing.sm }]}>
                  {f.displayName}
                </Text>
                {selectedFriend?.userId === f.userId && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />
                )}
              </Pressable>
            ))}
          </ScrollView>

          {/* Metric picker */}
          <Text style={[typography.caption, { color: theme.colors.muted, marginTop: spacing.md, marginBottom: spacing.sm }]}>
            CHALLENGE TYPE
          </Text>
          <View style={styles.metricRow}>
            {METRICS.map((m) => (
              <Pressable
                key={m.key}
                style={[
                  styles.metricChip,
                  {
                    backgroundColor: selectedMetric === m.key ? theme.colors.accent + "20" : theme.colors.mutedBg,
                    borderColor: selectedMetric === m.key ? theme.colors.accent : "transparent",
                  },
                ]}
                onPress={() => setSelectedMetric(m.key)}
              >
                <Ionicons
                  name={m.icon as any}
                  size={16}
                  color={selectedMetric === m.key ? theme.colors.accent : theme.colors.muted}
                />
                <Text
                  style={[
                    typography.caption,
                    {
                      color: selectedMetric === m.key ? theme.colors.accent : theme.colors.muted,
                      fontWeight: "700",
                      marginLeft: 4,
                    },
                  ]}
                >
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Create button */}
          <Pressable
            style={[
              styles.createBtn,
              { backgroundColor: selectedFriend ? theme.colors.primary : theme.colors.mutedBg },
            ]}
            onPress={handleCreate}
            disabled={!selectedFriend}
          >
            <Text
              style={[
                styles.createBtnText,
                { color: selectedFriend ? theme.colors.primaryText : theme.colors.muted },
              ]}
            >
              Send Challenge
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: "80%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#666",
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  friendList: {
    maxHeight: 200,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    marginBottom: 6,
  },
  metricRow: {
    flexDirection: "row",
    gap: 8,
  },
  metricChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  createBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});

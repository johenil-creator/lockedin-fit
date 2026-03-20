import React from "react";
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import { rankDisplayName } from "../../lib/rankService";
import { LockePreview } from "./LockePreview";
import type { PublicProfile } from "../../lib/types";

type Props = {
  visible: boolean;
  profile: PublicProfile | null;
  onClose: () => void;
  onAddFriend?: () => void;
  onChallenge?: () => void;
};

export function PublicProfileSheet({ visible, profile, onClose, onAddFriend, onChallenge }: Props) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  if (!profile) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.handle} />

          {/* Avatar + Name */}
          <View style={styles.profileHeader}>
            <LockePreview size={80} customization={profile.lockeCustomization} />
            <Text style={[typography.heading, { color: theme.colors.text, marginTop: spacing.sm }]}>
              {profile.displayName}
            </Text>
            <Text style={[typography.body, { color: theme.colors.accent }]}>
              {rankDisplayName(profile.rank)}
            </Text>
            {profile.packName && (
              <Text style={[typography.caption, { color: theme.colors.muted, marginTop: 2 }]}>
                Pack: {profile.packName}
              </Text>
            )}
          </View>

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.colors.mutedBg }]}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {profile.totalXp.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Total XP</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.mutedBg }]}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {profile.totalWorkouts}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Workouts</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.mutedBg }]}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {profile.streakDays}d
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Streak</Text>
            </View>
          </View>

          {/* Badges */}
          {profile.badges.length > 0 && (
            <View style={styles.badgeSection}>
              <Text style={[typography.caption, { color: theme.colors.muted, marginBottom: spacing.sm }]}>
                BADGES
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {profile.badges.slice(0, 6).map((badge) => (
                  <View key={badge.id} style={[styles.badgeChip, { backgroundColor: theme.colors.mutedBg }]}>
                    <Text style={[typography.caption, { color: theme.colors.text, fontWeight: "600" }]}>
                      {badge.name}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionRow}>
            {!profile.isFriend && onAddFriend && (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                onPress={onAddFriend}
              >
                <Ionicons name="person-add" size={18} color={theme.colors.primaryText} />
                <Text style={[styles.actionBtnText, { color: theme.colors.primaryText }]}>
                  Add Friend
                </Text>
              </Pressable>
            )}
            {onChallenge && (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: theme.colors.accent + "20", borderColor: theme.colors.accent, borderWidth: 1 }]}
                onPress={onChallenge}
              >
                <Ionicons name="flash" size={18} color={theme.colors.accent} />
                <Text style={[styles.actionBtnText, { color: theme.colors.accent }]}>
                  Challenge
                </Text>
              </Pressable>
            )}
          </View>
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
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#666", alignSelf: "center", marginBottom: spacing.md,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  statsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  badgeSection: {
    marginBottom: spacing.lg,
  },
  badgeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginRight: 8,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 48,
    borderRadius: radius.md,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});

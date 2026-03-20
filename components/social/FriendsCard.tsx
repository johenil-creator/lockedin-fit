import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Clipboard,
  Share,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useProfileContext } from "../../contexts/ProfileContext";
import { spacing, typography, radius } from "../../lib/theme";
import { impact, notification, ImpactStyle, NotificationType } from "../../lib/haptics";
import { FriendRow } from "./FriendRow";
import type { Friend, FriendProfile } from "../../lib/types";

type FriendsCardProps = {
  onChallenge?: (userId: string) => void;
  friendProfiles?: FriendProfile[];
};

function FriendsCardInner({ onChallenge, friendProfiles = [] }: FriendsCardProps) {
  const { theme } = useAppTheme();
  const { profile, updateProfile } = useProfileContext();

  const [friendInput, setFriendInput] = useState("");
  const [friendError, setFriendError] = useState("");
  const [copyFlash, setCopyFlash] = useState(false);
  const copyFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyFlashTimer.current) clearTimeout(copyFlashTimer.current);
  }, []);

  const myCode = profile.friendCode ?? "";
  const friends: Friend[] = profile.friends ?? [];

  function handleCopyCode() {
    if (!myCode) return;
    Clipboard.setString(myCode);
    notification(NotificationType.Success);
    setCopyFlash(true);
    if (copyFlashTimer.current) clearTimeout(copyFlashTimer.current);
    copyFlashTimer.current = setTimeout(() => setCopyFlash(false), 1500);
  }

  function handleShareCode() {
    if (!myCode) return;
    impact(ImpactStyle.Light);
    Share.share({
      message: `Add me on LockedInFIT! My friend code is: ${myCode}`,
    });
  }

  function handleAddFriend() {
    setFriendError("");
    const code = friendInput.trim().toUpperCase();
    if (!code || code.length !== 6 || !/^[A-Z0-9]{6}$/.test(code)) {
      setFriendError("Enter a valid 6-character code.");
      return;
    }
    if (code === myCode) {
      setFriendError("That's your own code!");
      return;
    }
    if (friends.some((f) => f.code === code)) {
      setFriendError("Already added.");
      return;
    }
    const newFriend: Friend = { code, addedAt: new Date().toISOString() };
    updateProfile({ friends: [...friends, newFriend] });
    setFriendInput("");
    notification(NotificationType.Success);
  }

  function handleRemoveFriend(code: string) {
    Alert.alert(
      "Remove Friend?",
      "This will remove this friend from your list.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            impact(ImpactStyle.Light);
            updateProfile({ friends: friends.filter((f) => f.code !== code) });
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.headerRow}>
        <Text style={[typography.subheading, { color: theme.colors.text }]}>
          Friends
        </Text>
        <Text style={[typography.caption, { color: theme.colors.muted }]}>
          {friends.length}/50
        </Text>
      </View>

      {/* Your Code */}
      <Text style={[typography.small, { color: theme.colors.muted, fontWeight: "500", marginBottom: 6 }]}>
        Your Code
      </Text>
      <View style={styles.codeRow}>
        <View style={[styles.codeBadge, { backgroundColor: theme.colors.mutedBg }]}>
          <Text style={[styles.codeText, { color: theme.colors.accent }]}>
            {myCode || "------"}
          </Text>
        </View>
        <Pressable onPress={handleCopyCode} style={styles.iconBtn} hitSlop={8}>
          <Ionicons
            name={copyFlash ? "checkmark-circle" : "copy-outline"}
            size={22}
            color={copyFlash ? theme.colors.accent : theme.colors.muted}
          />
        </Pressable>
        <Pressable onPress={handleShareCode} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="share-outline" size={22} color={theme.colors.muted} />
        </Pressable>
      </View>

      {/* Add a Friend */}
      <Text style={[typography.small, { color: theme.colors.muted, fontWeight: "500", marginBottom: 6, marginTop: spacing.md }]}>
        Add a Friend
      </Text>
      <View style={styles.addRow}>
        <TextInput
          style={[
            styles.input,
            styles.friendInput,
            {
              backgroundColor: theme.colors.mutedBg,
              color: theme.colors.text,
              borderColor: friendError ? theme.colors.danger : theme.colors.border,
            },
          ]}
          value={friendInput}
          onChangeText={(val) => {
            setFriendInput(val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
            if (friendError) setFriendError("");
          }}
          placeholder="Enter code"
          placeholderTextColor="#BDC4CE"
          autoCapitalize="characters"
          maxLength={6}
          returnKeyType="done"
          onSubmitEditing={handleAddFriend}
        />
        <Pressable
          onPress={handleAddFriend}
          style={[styles.addBtn, { backgroundColor: theme.colors.accent }]}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>
      {friendError ? (
        <Text style={[typography.caption, { color: theme.colors.danger, marginTop: 4 }]}>
          {friendError}
        </Text>
      ) : null}

      {/* Friend List */}
      {friends.length === 0 && friendProfiles.length === 0 ? (
        <Text style={[typography.caption, { color: theme.colors.muted, marginTop: spacing.md, textAlign: "center" }]}>
          No friends yet — share your code and add theirs!
        </Text>
      ) : (
        <View style={{ marginTop: spacing.md }}>
          {friendProfiles.map((friend) => (
            <FriendRow
              key={friend.userId}
              friend={friend}
              onChallenge={onChallenge ? () => onChallenge(friend.userId) : undefined}
            />
          ))}
          {friends.map((f) => (
            <View key={f.code} style={[styles.friendRow, { borderBottomColor: theme.colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: theme.colors.text, fontWeight: "600" }]}>
                  {f.nickname ?? f.code}
                </Text>
                {f.nickname ? (
                  <Text style={[typography.caption, { color: theme.colors.muted }]}>{f.code}</Text>
                ) : null}
              </View>
              <Pressable onPress={() => handleRemoveFriend(f.code)} hitSlop={8}>
                <Ionicons name="close-circle-outline" size={22} color={theme.colors.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export const FriendsCard = React.memo(FriendsCardInner);

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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  codeBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.md,
  },
  codeText: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 4,
    fontVariant: ["tabular-nums"],
  },
  iconBtn: {
    padding: 6,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  friendInput: {
    flex: 1,
    letterSpacing: 2,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

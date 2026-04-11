import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/ThemeContext";
import { BackButton } from "../components/BackButton";
import { useAuth } from "../contexts/AuthContext";
import { usePublicProfile } from "../hooks/usePublicProfile";
import { useFriendChallenges } from "../hooks/useFriendChallenges";
import { useAccountability } from "../hooks/useAccountability";
import { PublicProfileSheet } from "../components/social/PublicProfileSheet";
import { ChallengeBottomSheet } from "../components/social/ChallengeBottomSheet";
import { addFriendById } from "../lib/xpSync";
import { spacing, typography, radius } from "../lib/theme";
import { Skeleton } from "../components/Skeleton";

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { profile, loading } = usePublicProfile(userId ?? null);
  const { create: createChallenge } = useFriendChallenges();
  const { partner, pair, unpair } = useAccountability();
  const [showChallenge, setShowChallenge] = useState(false);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <BackButton />
          <Text style={[typography.heading, { color: theme.colors.text, marginLeft: spacing.sm }]}>
            Profile
          </Text>
        </View>
        <View style={{ padding: spacing.md }}>
          <Skeleton.Group>
            <Skeleton.Circle size={64} />
            <Skeleton.Rect width="60%" height={20} />
            <Skeleton.Rect width="40%" height={14} />
            <Skeleton.Card />
          </Skeleton.Group>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton />
        <Text style={[typography.heading, { color: theme.colors.text, flex: 1, marginLeft: spacing.sm }]}>
          {profile?.displayName ?? "Profile"}
        </Text>
      </View>

      <PublicProfileSheet
        visible={true}
        profile={profile}
        onClose={() => router.back()}
        onAddFriend={async () => {
          if (!user || !userId) return;
          const success = await addFriendById(user.uid, userId);
          if (success) {
            Alert.alert("Friend Added", `${profile?.displayName ?? "User"} has been added as a friend.`);
          } else {
            Alert.alert("Error", "Could not add friend. Please try again.");
          }
        }}
        onChallenge={() => {
          setShowChallenge(true);
        }}
      />

      {/* Accountability buttons */}
      {profile && userId && user && userId !== user.uid && (
        <View style={styles.socialActions}>
          {!partner ? (
            <Pressable
              style={[styles.socialBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={async () => {
                await pair(userId, profile.displayName);
                Alert.alert("Partner Set", `${profile.displayName} is now your accountability partner!`);
              }}
            >
              <Ionicons name="people" size={18} color={theme.colors.primary} />
              <Text style={[typography.body, { color: theme.colors.primary, fontWeight: "600" }]}>
                Accountability Partner
              </Text>
            </Pressable>
          ) : partner.partnerId === userId ? (
            <Pressable
              style={[styles.socialBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.danger }]}
              onPress={() => {
                Alert.alert(
                  "Remove Partner?",
                  "This will remove your accountability partner.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Remove",
                      style: "destructive",
                      onPress: async () => {
                        await unpair();
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={[typography.body, { color: theme.colors.danger, fontWeight: "600" }]}>
                Remove Partner
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {profile && (
        <ChallengeBottomSheet
          visible={showChallenge}
          friends={[
            {
              userId: profile.userId,
              displayName: profile.displayName,
              rank: profile.rank,
              lastActiveAt: new Date().toISOString(),
              lockeCustomization: profile.lockeCustomization,
            },
          ]}
          onClose={() => setShowChallenge(false)}
          onCreate={async (opponentId, opponentName, metric) => {
            const success = await createChallenge(opponentId, opponentName, metric);
            if (success) {
              Alert.alert("Challenge Sent", `Challenge sent to ${opponentName}!`);
            } else {
              Alert.alert("Error", "Could not send challenge. Please try again.");
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  socialActions: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});

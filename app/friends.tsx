import { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BackButton } from "../components/BackButton";
import { useAppTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { FriendsCard } from "../components/social/FriendsCard";
import { FriendChallengeCard } from "../components/social/FriendChallengeCard";
import { AccountabilityCard } from "../components/social/AccountabilityCard";
import { ChallengeBottomSheet } from "../components/social/ChallengeBottomSheet";
import { PostComposer } from "../components/social/PostComposer";
import { ActivityFeedCard } from "../components/social/ActivityFeedCard";
import { useFriendChallenges } from "../hooks/useFriendChallenges";
import { useAccountability } from "../hooks/useAccountability";
import { useUserPosts } from "../hooks/useUserPosts";
import { spacing, typography } from "../lib/theme";

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { challenges, pending, respond, create } = useFriendChallenges();
  const { partner, nudge, canNudge } = useAccountability();
  const { createPost, posting } = useUserPosts();
  const [challengeTarget, setChallengeTarget] = useState<string | null>(null);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);

  const handlePost = useCallback(async (text: string) => {
    await createPost(text);
    setFeedRefreshKey((k) => k + 1);
  }, [createPost]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <BackButton />
        <Text style={[typography.title, { color: theme.colors.text, flex: 1, marginLeft: 8 }]}>
          The Den
        </Text>
      </View>

      {/* Friends List + Add Friend */}
      <FriendsCard onChallenge={(userId) => setChallengeTarget(userId)} />

      {/* 1v1 Challenges */}
      <FriendChallengeCard
        challenges={challenges}
        pending={pending}
        userId={user?.uid ?? ""}
        onRespond={respond}
      />

      {/* Accountability Partner */}
      {partner && (
        <AccountabilityCard
          partner={partner}
          canNudge={canNudge}
          onNudge={nudge}
        />
      )}

      {/* Community Feed */}
      <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>
        COMMUNITY
      </Text>
      <PostComposer onSubmit={handlePost} posting={posting} />
      <View style={{ height: spacing.md }} />
      <ActivityFeedCard refreshKey={feedRefreshKey} />

      <ChallengeBottomSheet
        visible={challengeTarget !== null}
        friends={challengeTarget ? [{ userId: challengeTarget, displayName: "Friend", rank: "Runt" as const, lastActiveAt: new Date().toISOString() }] : []}
        onClose={() => setChallengeTarget(null)}
        onCreate={(opponentId, opponentName, metric) => {
          create(opponentId, opponentName, metric);
          setChallengeTarget(null);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
});

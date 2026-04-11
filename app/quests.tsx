import { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { BackButton } from "../components/BackButton";
import { DailyQuestCard } from "../components/quests/DailyQuestCard";
import { WeeklyObjectiveCard } from "../components/quests/WeeklyObjectiveCard";
import { QuestRewardToast } from "../components/quests/QuestRewardToast";
import { EventBanner } from "../components/events/EventBanner";
import { EventLeaderboard } from "../components/events/EventLeaderboard";
import { useQuests } from "../hooks/useQuests";
import { useSeasonalEvent } from "../hooks/useSeasonalEvent";
import { useChallenge } from "../hooks/useChallenge";
import { workDayProgressPct } from "../lib/challengeService";
import { radius, spacing, typography } from "../lib/theme";

export default function QuestsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { dailyQuests, weeklyObjective, claim } = useQuests();
  const router = useRouter();
  const { event, participation, leaderboard, signedIn, joinEvent } = useSeasonalEvent();
  const {
    progress: challengeProgress,
    def: challengeDef,
    currentDay: challengeCurrentDay,
  } = useChallenge();
  const [toastAmount, setToastAmount] = useState(0);
  const [showToast, setShowToast] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton />
        <Text style={[typography.heading, { color: theme.colors.text, marginLeft: spacing.sm }]}>
          Activity
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {event && (
          <>
            <EventBanner
              event={event}
              participation={participation}
              signedIn={signedIn}
              onJoin={() => joinEvent()}
              onSignIn={() => router.push("/auth")}
            />
            {leaderboard.length > 0 && (
              <EventLeaderboard
                entries={leaderboard}
                currentUserId={user?.uid}
              />
            )}
          </>
        )}

        {challengeProgress && challengeDef ? (
          <Pressable
            style={[
              styles.challengeCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.primary,
              },
            ]}
            onPress={() => router.push(`/challenges/${challengeDef.id}`)}
          >
            <View style={styles.challengeCardTopRow}>
              <View style={[styles.challengeCardIcon, { backgroundColor: theme.colors.primary + "20" }]}>
                <Ionicons name="flame" size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.challengeCardEyebrow, { color: theme.colors.primary }]}>
                  30-DAY CHALLENGE
                </Text>
                <Text
                  style={[styles.challengeCardTitle, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {challengeDef.title}
                </Text>
              </View>
              <Text style={[styles.challengeCardDayNum, { color: theme.colors.muted }]}>
                Day {Math.min(challengeProgress.currentDayNumber, challengeDef.totalDays)}/
                {challengeDef.totalDays}
              </Text>
            </View>
            <View style={[styles.challengeCardTrack, { backgroundColor: theme.colors.mutedBg }]}>
              <View
                style={[
                  styles.challengeCardFill,
                  {
                    backgroundColor: theme.colors.primary,
                    width: `${Math.round(workDayProgressPct(challengeProgress, challengeDef) * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.challengeCardHint, { color: theme.colors.muted }]}>
              {challengeCurrentDay?.isRest
                ? "Today is a rest day — tap to log it"
                : challengeCurrentDay?.sets
                ? `Today: ${challengeCurrentDay.totalReps} ${
                    challengeDef.id === "plank-30" ? "sec" : "reps"
                  } · tap to start`
                : "Tap to view"}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.challengeLinkCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={() => router.push("/challenges")}
          >
            <View style={[styles.challengeLinkIcon, { backgroundColor: theme.colors.primary + "18" }]}>
              <Ionicons name="flame-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.challengeLinkTitle, { color: theme.colors.text }]}>
                30-Day Challenges
              </Text>
              <Text style={[styles.challengeLinkSub, { color: theme.colors.muted }]}>
                Calisthenics ladders — start anytime
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
          </Pressable>
        )}

        <WeeklyObjectiveCard objective={weeklyObjective} onClaim={claim} />

        <DailyQuestCard
          quests={dailyQuests}
          onClaim={async (questId) => {
            const reward = await claim(questId);
            if (reward > 0) {
              setToastAmount(reward);
              setShowToast(true);
            }
          }}
        />
      </ScrollView>

      <QuestRewardToast
        amount={toastAmount}
        visible={showToast}
        onDismiss={() => setShowToast(false)}
      />
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
  content: {
    padding: spacing.md,
  },
  challengeCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 10,
  },
  challengeCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  challengeCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  challengeCardEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  challengeCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 1,
  },
  challengeCardDayNum: {
    fontSize: 12,
    fontWeight: "600",
  },
  challengeCardTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  challengeCardFill: {
    height: 6,
    borderRadius: 3,
  },
  challengeCardHint: {
    fontSize: 12,
  },
  challengeLinkCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 12,
  },
  challengeLinkIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  challengeLinkTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  challengeLinkSub: {
    fontSize: 12,
    marginTop: 2,
  },
});

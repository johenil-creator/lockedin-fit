import { useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Text } from "react-native";
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
import { spacing, typography } from "../lib/theme";

export default function QuestsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { dailyQuests, weeklyObjective, claim } = useQuests();
  const router = useRouter();
  const { event, participation, leaderboard, signedIn, joinEvent } = useSeasonalEvent();
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
});

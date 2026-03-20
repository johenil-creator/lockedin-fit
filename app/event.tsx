import { View, ScrollView, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { BackButton } from "../components/BackButton";
import { EventBanner } from "../components/events/EventBanner";
import { EventLeaderboard } from "../components/events/EventLeaderboard";
import { useSeasonalEvent } from "../hooks/useSeasonalEvent";
import { spacing, typography } from "../lib/theme";

export default function EventScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { event, participation, leaderboard, joinEvent } = useSeasonalEvent();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton />
        <Text style={[typography.heading, { color: theme.colors.text, marginLeft: spacing.sm }]}>
          Event
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {event ? (
          <>
            <EventBanner
              event={event}
              participation={participation}
              onJoin={() => joinEvent()}
            />

            {leaderboard.length > 0 && (
              <>
                <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm, marginTop: spacing.sm }]}>
                  Leaderboard
                </Text>
                <EventLeaderboard
                  entries={leaderboard}
                  currentUserId={user?.uid}
                />
              </>
            )}
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={[typography.body, { color: theme.colors.muted, textAlign: "center" }]}>
              No active event right now. Check back soon.
            </Text>
          </View>
        )}
      </ScrollView>
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
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
});

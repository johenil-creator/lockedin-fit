import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useXP } from "../../hooks/useXP";
import { useLeague } from "../../hooks/useLeague";
import { TierCarousel } from "../../components/leagues/TierCarousel";
import { LeagueStandings } from "../../components/leagues/LeagueStandings";
import { PromotionBanner } from "../../components/leagues/PromotionBanner";
import { ProfileButton } from "../../components/ProfileButton";
import { sendReaction } from "../../lib/reactionService";
import { spacing, typography, radius } from "../../lib/theme";
import { useGlobalLeaderboard } from "../../hooks/useGlobalLeaderboard";
import { useNotifications } from "../../hooks/useNotifications";
import { useSeasonalEvent } from "../../hooks/useSeasonalEvent";
import { GlobalLeaderboardCard } from "../../components/social/GlobalLeaderboardCard";
import { NotificationBell } from "../../components/social/NotificationBell";
import { NotificationSheet } from "../../components/social/NotificationSheet";
import { EventLeaderboard } from "../../components/events/EventLeaderboard";
import { Skeleton } from "../../components/Skeleton";
import type { RankLevel, ReactionType } from "../../lib/types";

// ── Countdown to next Monday 00:00 UTC ──────────────────────────────────────

function getTimeUntilReset(): { days: number; hours: number; minutes: number } {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

  const nextMonday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilMonday,
      0,
      0,
      0,
    ),
  );

  const diffMs = nextMonday.getTime() - now.getTime();
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  return { days, hours, minutes };
}

export default function LeaguesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { rank } = useXP();
  const {
    league,
    standings,
    userPosition,
    lastWeekResult,
    friendIds,
    loading,
    refresh,
  } = useLeague(rank);

  const { entries: globalEntries, period: globalPeriod, setPeriod: setGlobalPeriod } = useGlobalLeaderboard();
  const { notifications, unreadCount, markRead: markNotifRead, markAllRead: markAllNotifsRead } = useNotifications();
  const { event: activeEvent, leaderboard: eventLeaderboard } = useSeasonalEvent();
  const [activeTab, setActiveTab] = useState<"league" | "global">("league");
  const [showFriendsOnly, setShowFriendsOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [leagueHelpOpen, setLeagueHelpOpen] = useState(false);
  const [globalHelpOpen, setGlobalHelpOpen] = useState(false);

  const countdown = useMemo(() => getTimeUntilReset(), []);

  const handleReact = useCallback(async (toUserId: string, type: ReactionType) => {
    if (!user) return;
    // Use a pseudo activity ID based on user+week for league reactions
    const activityId = `league__${toUserId}`;
    await sendReaction(user.uid, toUserId, activityId, type);
  }, [user]);

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  // ── Not signed in ─────────────────────────────────────────────────────────
  if (!user) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: theme.colors.bg, paddingTop: insets.top },
        ]}
      >
        <Text style={styles.emptyIcon}>🏆</Text>
        <Text
          style={[
            typography.heading,
            { color: theme.colors.text, textAlign: "center" },
          ]}
        >
          Weekly Leagues
        </Text>
        <Text
          style={[
            typography.body,
            {
              color: theme.colors.muted,
              textAlign: "center",
              marginTop: spacing.sm,
              paddingHorizontal: spacing.xl,
            },
          ]}
        >
          Compete against ~30 players in your rank tier. Top 5 promote, bottom 5
          relegate.
        </Text>
        <Pressable
          style={[styles.ctaButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => router.push("/auth")}
        >
          <Text
            style={[styles.ctaText, { color: theme.colors.primaryText }]}
          >
            Sign In to Compete
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: theme.colors.bg, paddingTop: insets.top + spacing.md },
      ]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
        />
      }
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.leagueTitle, { color: theme.colors.text }]}>
            Leaderboards
          </Text>
          <View style={styles.countdownRow}>
            <Ionicons
              name="time-outline"
              size={16}
              color={theme.colors.muted}
            />
            <Text style={[styles.countdownText, { color: theme.colors.muted }]}>
              {countdown.days} {countdown.days === 1 ? "DAY" : "DAYS"}
            </Text>
          </View>
        </View>
        <NotificationBell unreadCount={unreadCount} onPress={() => setShowNotifs(true)} />
        <ProfileButton />
      </View>

      {/* ── Segmented Toggle ─────────────────────────────────────────── */}
      <View style={[styles.segmentRow, { backgroundColor: theme.colors.mutedBg }]}>
        {(["league", "global"] as const).map((tab) => (
          <Pressable
            key={tab}
            style={[
              styles.segmentPill,
              activeTab === tab && { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.segmentText,
                { color: activeTab === tab ? theme.colors.primaryText : theme.colors.muted },
              ]}
            >
              {tab === "league" ? `${rank} League` : "Global"}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ padding: spacing.md }}>
          <Skeleton.Group>
            <Skeleton.Card />
            <Skeleton.Card />
            <Skeleton.Card />
          </Skeleton.Group>
        </View>
      ) : activeTab === "league" ? (
        <>
          {/* ── League Explainer (collapsible) ────────────────────────── */}
          <Pressable
            style={[
              styles.explainerCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={() => setLeagueHelpOpen((v) => !v)}
          >
            <View style={styles.explainerTrigger}>
              <Ionicons name="help-circle-outline" size={16} color={theme.colors.muted} />
              <Text style={[typography.small, { color: theme.colors.muted, flex: 1 }]}>
                How do leagues work?
              </Text>
              <Ionicons
                name={leagueHelpOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color={theme.colors.muted}
              />
            </View>
            {leagueHelpOpen && (
              <View style={styles.explainerBody}>
                <Text style={[typography.caption, { color: theme.colors.text, marginBottom: 4 }]}>
                  {"\u2022"} Compete weekly against ~30 players at your rank tier.
                </Text>
                <Text style={[typography.caption, { color: theme.colors.text, marginBottom: 4 }]}>
                  {"\u2022"} Top 5 ascend to the next tier. Bottom 5 fall.
                </Text>
                <Text style={[typography.caption, { color: theme.colors.text, marginBottom: 4 }]}>
                  {"\u2022"} Rankings reset every Monday at midnight UTC.
                </Text>
                <Text style={[typography.caption, { color: theme.colors.text }]}>
                  {"\u2022"} Earn XP from workouts to climb the standings.
                </Text>
              </View>
            )}
          </Pressable>

          {/* ── Last Week Result Banner ──────────────────────────────── */}
          {lastWeekResult && (
            <View style={styles.bannerWrapper}>
              <PromotionBanner result={lastWeekResult} />
            </View>
          )}

          {/* ── Tier Carousel ────────────────────────────────────────── */}
          <View style={styles.carouselSection}>
            <TierCarousel currentRank={rank} />
          </View>

          {/* ── Friend Filter Toggle ─────────────────────────────────── */}
          {friendIds.length > 0 && (
            <View style={styles.filterRow}>
              <Pressable
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: !showFriendsOnly
                      ? theme.colors.primary
                      : theme.colors.mutedBg,
                    borderColor: !showFriendsOnly
                      ? theme.colors.primary
                      : theme.colors.border,
                  },
                ]}
                onPress={() => setShowFriendsOnly(false)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: !showFriendsOnly
                        ? theme.colors.primaryText
                        : theme.colors.text,
                    },
                  ]}
                >
                  All
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: showFriendsOnly
                      ? theme.colors.primary
                      : theme.colors.mutedBg,
                    borderColor: showFriendsOnly
                      ? theme.colors.primary
                      : theme.colors.border,
                  },
                ]}
                onPress={() => setShowFriendsOnly(true)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: showFriendsOnly
                        ? theme.colors.primaryText
                        : theme.colors.text,
                    },
                  ]}
                >
                  Friends
                </Text>
              </Pressable>
            </View>
          )}

          {/* ── League Standings ──────────────────────────────────────── */}
          <View style={styles.standingsSection}>
            {standings.length > 0 ? (
              <LeagueStandings
                standings={standings}
                friendIds={friendIds}
                showFriendsOnly={showFriendsOnly}
                onReact={handleReact}
              />
            ) : (
              <View style={styles.emptyStandings}>
                <Text
                  style={[
                    typography.body,
                    { color: theme.colors.muted, textAlign: "center" },
                  ]}
                >
                  No standings yet. Complete a workout to earn XP!
                </Text>
              </View>
            )}
          </View>
        </>
      ) : (
        <>
          {/* ── Global Explainer (collapsible) ──────────────────────── */}
          <Pressable
            style={[
              styles.explainerCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={() => setGlobalHelpOpen((v) => !v)}
          >
            <View style={styles.explainerTrigger}>
              <Ionicons name="help-circle-outline" size={16} color={theme.colors.muted} />
              <Text style={[typography.small, { color: theme.colors.muted, flex: 1 }]}>
                How does the global leaderboard work?
              </Text>
              <Ionicons
                name={globalHelpOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color={theme.colors.muted}
              />
            </View>
            {globalHelpOpen && (
              <View style={styles.explainerBody}>
                <Text style={[typography.caption, { color: theme.colors.text, marginBottom: 4 }]}>
                  {"\u2022"} All-time and weekly rankings across every player.
                </Text>
                <Text style={[typography.caption, { color: theme.colors.text }]}>
                  {"\u2022"} Toggle between weekly and all-time to see different standings.
                </Text>
              </View>
            )}
          </Pressable>

          {/* ── Global Leaderboard ────────────────────────────────────── */}
          <View style={{ paddingHorizontal: spacing.md }}>
            <GlobalLeaderboardCard
              entries={globalEntries}
              period={globalPeriod}
              onTogglePeriod={() => setGlobalPeriod(globalPeriod === "weekly" ? "alltime" : "weekly")}
              currentUserId={user?.uid}
            />
          </View>

          {/* Event Leaderboard — shown during active events */}
          {activeEvent && eventLeaderboard.length > 0 && (
            <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.md }}>
              <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
                {activeEvent.name} Leaderboard
              </Text>
              <EventLeaderboard
                entries={eventLeaderboard}
                currentUserId={user?.uid}
              />
            </View>
          )}
        </>
      )}

      {/* Notification sheet */}
      <NotificationSheet
        visible={showNotifs}
        notifications={notifications}
        onClose={() => setShowNotifs(false)}
        onMarkRead={markNotifRead}
        onMarkAllRead={markAllNotifsRead}
      />
    </ScrollView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl + spacing.lg,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },

  // ── Not signed in state ─────────────────────────────────────────────────
  emptyIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  ctaButton: {
    marginTop: spacing.lg,
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: radius.md,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
  },

  // ── Last week banner ────────────────────────────────────────────────────
  bannerWrapper: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  leagueTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.2,
  },

  // ── Tier carousel ───────────────────────────────────────────────────────
  carouselSection: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  // ── Filter toggle ───────────────────────────────────────────────────────
  filterRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  filterPill: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // ── Explainer card ─────────────────────────────────────────────────────
  explainerCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
  },
  explainerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  explainerBody: {
    marginTop: spacing.sm,
    paddingLeft: 22,
  },

  // ── Standings ───────────────────────────────────────────────────────────
  standingsSection: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  emptyStandings: {
    padding: spacing.xl,
  },

  // ── Segmented toggle ─────────────────────────────────────────────────
  segmentRow: {
    flexDirection: "row",
    borderRadius: radius.md,
    padding: 3,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  segmentPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.md - 2,
    alignItems: "center",
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
  },
});

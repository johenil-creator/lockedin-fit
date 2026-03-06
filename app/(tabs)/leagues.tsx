import { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
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
import { spacing, typography, radius } from "../../lib/theme";
import type { RankLevel } from "../../lib/types";

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

  const [showFriendsOnly, setShowFriendsOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const countdown = useMemo(() => getTimeUntilReset(), []);

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

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: theme.colors.bg, paddingTop: insets.top },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: theme.colors.bg, paddingTop: insets.top + 12 },
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
      {/* ── Last Week Result Banner (floating, before header) ──────────── */}
      {lastWeekResult && (
        <View style={styles.bannerWrapper}>
          <PromotionBanner result={lastWeekResult} />
        </View>
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.leagueTitle, { color: theme.colors.text }]}>
            {rank} League
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
        <ProfileButton />
      </View>

      {/* ── Tier Carousel ──────────────────────────────────────────────── */}
      <View style={styles.carouselSection}>
        <TierCarousel currentRank={rank} />
      </View>

      {/* ── Friend Filter Toggle ───────────────────────────────────────── */}
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

      {/* ── Leaderboard (full-bleed, no Card wrapper) ──────────────────── */}
      <View style={styles.standingsSection}>
        {standings.length > 0 ? (
          <LeagueStandings
            standings={standings}
            friendIds={friendIds}
            showFriendsOnly={showFriendsOnly}
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

  // ── Standings ───────────────────────────────────────────────────────────
  standingsSection: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  emptyStandings: {
    padding: spacing.xl,
  },
});

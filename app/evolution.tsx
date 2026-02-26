import { useEffect, useRef, useCallback, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
  withDelay,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppTheme } from "../contexts/ThemeContext";
import { BackButton } from "../components/BackButton";
import { useXP } from "../hooks/useXP";
import { useStreak } from "../hooks/useStreak";
import { XP_AWARDS } from "../lib/xpService";
import { glowColors, spacing, radius, typography } from "../lib/theme";
import { RANK_IMAGES, EVOLUTION_RANKS } from "../components/RankEvolutionPath";
import type { RankLevel } from "../lib/types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const NODE_SIZE = 64;
const NODE_COLUMN_WIDTH = 96;
const CONNECTOR_WIDTH = 28;

// ── Path node ───────────────────────────────────────────────────────────────

function PathNode({
  tier,
  state,
  isFirst,
}: {
  tier: (typeof EVOLUTION_RANKS)[number];
  state: "completed" | "current" | "locked";
  isFirst: boolean;
}) {
  const { theme } = useAppTheme();

  const pulse = useSharedValue(0);
  useEffect(() => {
    if (state === "current") {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1300, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [state]);

  const pulseStyle = useAnimatedStyle(() => {
    if (state !== "current") return {};
    return { transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.06]) }] };
  });

  const glowStyle = useAnimatedStyle(() => {
    if (state !== "current") return { opacity: 0 };
    return { opacity: interpolate(pulse.value, [0, 1], [0.25, 0.7]) };
  });

  return (
    <View style={styles.nodeColumn}>
      <View style={styles.nodeRow}>
        {/* Horizontal connector */}
        {!isFirst && (
          <View
            style={[
              styles.connector,
              {
                backgroundColor:
                  state === "completed" || state === "current"
                    ? glowColors.pathLineLit
                    : glowColors.pathLine,
              },
            ]}
          />
        )}

        <Animated.View style={pulseStyle}>
          <View style={styles.nodeOuter}>
            {/* Glow ring */}
            <Animated.View
              style={[
                styles.glowRing,
                {
                  width: NODE_SIZE + 10,
                  height: NODE_SIZE + 10,
                  borderRadius: (NODE_SIZE + 10) / 2,
                  borderColor: glowColors.viridian,
                },
                glowStyle,
              ]}
            />

            {state === "completed" && (
              <View
                style={[
                  styles.completedRing,
                  {
                    width: NODE_SIZE + 5,
                    height: NODE_SIZE + 5,
                    borderRadius: (NODE_SIZE + 5) / 2,
                  },
                ]}
              />
            )}

            <View
              style={[
                styles.nodeCircle,
                {
                  borderColor:
                    state === "completed"
                      ? glowColors.viridian
                      : state === "current"
                      ? glowColors.currentPulse
                      : theme.colors.border,
                  borderWidth: state === "locked" ? 1 : 2,
                },
              ]}
            >
              <Image
                source={RANK_IMAGES[tier.rank]}
                style={[
                  styles.nodeImage,
                  { opacity: state === "locked" ? 0.3 : 1 },
                ]}
                resizeMode="contain"
              />

              {state === "locked" && (
                <View style={styles.lockOverlay}>
                  <Text style={{ fontSize: 16, opacity: 0.7 }}>🔒</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Label */}
      <Text
        style={[
          styles.nodeLabel,
          {
            color:
              state === "locked"
                ? theme.colors.border
                : state === "current"
                ? glowColors.viridian
                : theme.colors.text,
            fontWeight: state === "current" ? "800" : "600",
          },
        ]}
      >
        {tier.rank}
      </Text>

      <Text
        style={[
          styles.nodeXP,
          {
            color:
              state === "locked"
                ? theme.colors.border
                : state === "current"
                ? glowColors.viridian
                : theme.colors.muted,
          },
        ]}
      >
        {tier.xp} XP
      </Text>

      {state === "current" && (
        <View style={styles.currentDot} />
      )}
    </View>
  );
}

// ── Evolution Detail Screen ─────────────────────────────────────────────────

export default function EvolutionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { xp, rank, progress, toNext, nextTier } = useXP();
  const { streak } = useStreak();

  const displayRank = rank === "Runt" ? "Scout" : rank;
  const currentIdx = EVOLUTION_RANKS.findIndex((t) => t.rank === displayRank);

  const scrollRef = useRef<ScrollView>(null);
  const nodePositions = useRef<Record<string, number>>({});
  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH);

  const getNodeState = useCallback(
    (tierRank: RankLevel): "completed" | "current" | "locked" => {
      const cIdx = EVOLUTION_RANKS.findIndex((t) => t.rank === displayRank);
      const tIdx = EVOLUTION_RANKS.findIndex((t) => t.rank === tierRank);
      if (tIdx < cIdx) return "completed";
      if (tIdx === cIdx) return "current";
      return "locked";
    },
    [displayRank]
  );

  const totalContentWidth =
    EVOLUTION_RANKS.length * NODE_COLUMN_WIDTH +
    (EVOLUTION_RANKS.length - 1) * CONNECTOR_WIDTH;
  const sidePadding = Math.max(spacing.md, (containerWidth - totalContentWidth) / 2);

  const handleNodeLayout = useCallback(
    (rankName: string) => (event: LayoutChangeEvent) => {
      nodePositions.current[rankName] = event.nativeEvent.layout.x;
      const state = getNodeState(rankName as RankLevel);
      if (state === "current" && scrollRef.current) {
        setTimeout(() => {
          const x = nodePositions.current[rankName];
          if (x !== undefined) {
            scrollRef.current?.scrollTo({
              x: Math.max(0, x - containerWidth / 2 + NODE_COLUMN_WIDTH / 2),
              animated: true,
            });
          }
        }, 400);
      }
    },
    [getNodeState, containerWidth]
  );

  // XP bar animation
  const barWidth = useSharedValue(0);
  useEffect(() => {
    barWidth.value = withDelay(
      300,
      withTiming(progress, { duration: 900, easing: Easing.out(Easing.cubic) })
    );
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.max(barWidth.value * 100, 2)}%`,
  }));

  // XP breakdown from history
  const xpBreakdown = (() => {
    const cats: Record<string, { label: string; icon: string; total: number }> = {
      sessions: { label: "Sessions",        icon: "~", total: 0 },
      sets:     { label: "Sets Completed",   icon: "#", total: 0 },
      prs:      { label: "Personal Records", icon: "!", total: 0 },
      streaks:  { label: "Streaks",          icon: "+", total: 0 },
      rankups:  { label: "Rank-Ups",         icon: "^", total: 0 },
      other:    { label: "Other",            icon: "*", total: 0 },
    };
    for (const entry of xp.history) {
      const r = entry.reason.toLowerCase();
      if (r.includes("session complete"))       cats.sessions.total += entry.amount;
      else if (r.includes("sets"))              cats.sets.total += entry.amount;
      else if (r.includes("personal record") || r.includes("pr"))
                                                 cats.prs.total += entry.amount;
      else if (r.includes("streak"))            cats.streaks.total += entry.amount;
      else if (r.includes("ranked up") || r.includes("rank up"))
                                                 cats.rankups.total += entry.amount;
      else                                       cats.other.total += entry.amount;
    }
    return Object.values(cats).filter((c) => c.total > 0);
  })();

  const rankUpTips = [
    { text: "Complete a workout session", xp: `+${XP_AWARDS.SESSION_COMPLETE} XP` },
    { text: "Hit a personal record",     xp: `+${XP_AWARDS.PR_HIT} XP` },
    { text: "Build a 3-day streak",      xp: `+${XP_AWARDS.STREAK_3_DAYS} XP` },
    { text: "Build a 7-day streak",      xp: `+${XP_AWARDS.STREAK_7_DAYS} XP` },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={[typography.heading, { color: theme.colors.text }]}>
          Evolution Path
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody}>
        {/* Current rank hero */}
        <View style={[styles.heroCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.heroImageWrap}>
            <View style={styles.heroGlow} />
            <View style={styles.heroBorder}>
              <Image
                source={RANK_IMAGES[displayRank]}
                style={styles.heroImage}
                resizeMode="contain"
              />
            </View>
          </View>

          <Text style={[styles.heroRankName, { color: glowColors.viridian }]}>
            {displayRank}
          </Text>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>CURRENT RANK</Text>
          </View>

          {/* XP bar */}
          <View style={styles.heroXpSection}>
            <View style={[styles.heroTrack, { backgroundColor: theme.colors.mutedBg }]}>
              <Animated.View
                style={[styles.heroFill, { backgroundColor: glowColors.viridian }, barStyle]}
              />
            </View>
            <View style={styles.heroXpLabels}>
              <Text style={[styles.heroXpText, { color: theme.colors.muted }]}>
                {xp.total} XP
              </Text>
              {nextTier ? (
                <Text style={[styles.heroXpText, { color: theme.colors.muted }]}>
                  {toNext} to {nextTier.rank}
                </Text>
              ) : (
                <Text style={[styles.heroXpText, { color: glowColors.viridian }]}>
                  MAX RANK
                </Text>
              )}
            </View>
          </View>

          {/* Streak row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: streak.current >= 3 ? glowColors.viridian : theme.colors.text }]}>
                {streak.current}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Day Streak</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {streak.longest}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Best Streak</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: glowColors.viridian }]}>
                {xp.total}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Total XP</Text>
            </View>
          </View>
        </View>

        {/* Horizontal evolution path */}
        <View
          style={[styles.pathCard, { backgroundColor: theme.colors.surface }]}
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          <Text style={[styles.pathTitle, { color: theme.colors.text }]}>
            All Ranks
          </Text>

          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.pathScroll,
              { paddingHorizontal: sidePadding },
            ]}
          >
            {EVOLUTION_RANKS.map((tier, index) => {
              const state = getNodeState(tier.rank);
              return (
                <View key={tier.rank} onLayout={handleNodeLayout(tier.rank)}>
                  <PathNode tier={tier} state={state} isFirst={index === 0} />
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* XP Breakdown */}
        {xpBreakdown.length > 0 && (
          <View style={[styles.detailCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.detailTitle, { color: theme.colors.text }]}>
              XP Breakdown
            </Text>
            {xpBreakdown.map((cat) => (
              <View key={cat.label} style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <Text style={[styles.breakdownIcon, { color: glowColors.viridian }]}>{cat.icon}</Text>
                  <Text style={[typography.caption, { color: theme.colors.text }]}>{cat.label}</Text>
                </View>
                <Text style={[typography.caption, { color: theme.colors.muted, fontWeight: "600" }]}>
                  {cat.total} XP
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* How to rank up */}
        {nextTier && (
          <View style={[styles.detailCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.detailTitle, { color: theme.colors.text }]}>
              How to Rank Up
            </Text>
            {rankUpTips.map((tip) => (
              <View key={tip.text} style={styles.tipRow}>
                <Text style={[typography.caption, { color: glowColors.viridian }]}>{">"}</Text>
                <Text style={[typography.caption, { color: theme.colors.text, flex: 1 }]}>{tip.text}</Text>
                <Text style={[typography.caption, { color: theme.colors.muted, fontWeight: "600" }]}>{tip.xp}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  scrollBody: { padding: spacing.md },

  // Hero card
  heroCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.sm + 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  heroImageWrap: {
    width: 150,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  heroGlow: {
    position: "absolute",
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: glowColors.viridian,
    opacity: 0.2,
  },
  heroBorder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2.5,
    borderColor: glowColors.viridian,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroImage: {
    width: 130,
    height: 130,
  },
  heroRankName: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heroBadge: {
    backgroundColor: glowColors.viridianDim,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: glowColors.viridian,
    letterSpacing: 1,
  },
  heroXpSection: {
    width: "100%",
    marginBottom: spacing.md,
  },
  heroTrack: {
    height: 8,
    borderRadius: radius.full,
    overflow: "hidden",
    marginBottom: 6,
  },
  heroFill: {
    height: "100%",
    borderRadius: radius.full,
    minWidth: 4,
  },
  heroXpLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroXpText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    opacity: 0.3,
  },

  // Path card
  pathCard: {
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm + 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  pathTitle: {
    fontSize: 15,
    fontWeight: "700",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  pathScroll: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 10,
    paddingBottom: spacing.sm,
  },

  // Path nodes
  nodeColumn: {
    alignItems: "center",
    width: NODE_COLUMN_WIDTH,
  },
  nodeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  connector: {
    width: CONNECTOR_WIDTH,
    height: 2,
    borderRadius: 1,
  },
  nodeOuter: {
    width: NODE_SIZE + 12,
    height: NODE_SIZE + 12,
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    borderWidth: 2,
    backgroundColor: "transparent",
  },
  completedRing: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: glowColors.viridian,
    backgroundColor: "transparent",
    opacity: 0.5,
  },
  nodeCircle: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  nodeImage: {
    width: NODE_SIZE - 6,
    height: NODE_SIZE - 6,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(13, 17, 23, 0.55)",
    borderRadius: 999,
  },
  nodeLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 4,
    textAlign: "center",
  },
  nodeXP: {
    fontSize: 9,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    marginTop: 1,
  },
  currentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: glowColors.viridian,
    marginTop: 4,
  },

  // Detail cards
  detailCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  breakdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  breakdownIcon: {
    fontSize: 14,
    fontWeight: "700",
    width: 18,
    textAlign: "center",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 4,
  },
});

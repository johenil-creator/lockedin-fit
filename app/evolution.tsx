import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  useWindowDimensions,
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
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/ThemeContext";
import { BackButton } from "../components/BackButton";
import { useXP } from "../hooks/useXP";
import { useStreak } from "../hooks/useStreak";
import { useProfileContext } from "../contexts/ProfileContext";
import { useWorkouts } from "../hooks/useWorkouts";
import { XP_AWARDS } from "../lib/xpService";
import { BADGE_DEFINITIONS, getBadgeProgress, type BadgeStats } from "../lib/badgeService";
import { glowColors, spacing, radius, typography } from "../lib/theme";
import { RANK_IMAGES, EVOLUTION_RANKS } from "../components/RankEvolutionPath";
import { rankDisplayName } from "../lib/rankService";
import { Skeleton } from "../components/Skeleton";
import type { RankLevel, Badge } from "../lib/types";

// ── Badge constants ─────────────────────────────────────────────────────────

const BADGE_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  footprint: "footsteps-outline", flag: "flag-outline", fire: "flame-outline",
  zap: "flash-outline", heart: "heart-outline", dumbbell: "barbell-outline",
  layers: "layers-outline", trophy: "trophy-outline", flame: "flame-outline",
  award: "ribbon-outline", calendar: "calendar-outline", map: "map-outline",
  stopwatch: "stopwatch-outline", body: "body-outline", fitness: "fitness-outline",
  "swap-horizontal": "swap-horizontal-outline", star: "star-outline",
  diamond: "diamond-outline", medal: "medal-outline",
};

const BADGE_CATEGORIES: { label: string; ids: string[] }[] = [
  { label: "Cardio", ids: ["first_run", "5k_finisher", "10k_finisher", "60_min_beast", "marathon_prep", "interval_warrior", "consistent_cardio"] },
  { label: "Strength", ids: ["first_lift", "100_sets_club", "500_sets_club", "1rm_breaker", "iron_regular"] },
  { label: "Consistency", ids: ["streak_7", "streak_30", "streak_100", "streak_365"] },
  { label: "Milestones", ids: ["double_threat", "quarter_century", "half_century", "centurion"] },
];

function formatBadgeDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function BadgeRow({ def, unlocked, progress }: {
  def: (typeof BADGE_DEFINITIONS)[number];
  unlocked: Badge | undefined;
  progress: string | null;
}) {
  const { theme } = useAppTheme();
  const isUnlocked = !!unlocked;
  const iconName = BADGE_ICON_MAP[def.icon] ?? "help-circle-outline";
  return (
    <View style={[styles.badgeRow, { opacity: isUnlocked ? 1 : 0.4 }]}>
      <View style={[styles.badgeIconCircle, { backgroundColor: isUnlocked ? glowColors.viridianDim : theme.colors.mutedBg }]}>
        <Ionicons name={iconName} size={20} color={isUnlocked ? glowColors.viridian : theme.colors.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.badgeName, { color: theme.colors.text }]}>{def.name}</Text>
        <Text style={[styles.badgeDesc, { color: theme.colors.muted }]}>{def.description}</Text>
        {isUnlocked && unlocked.unlockedAt && (
          <Text style={[styles.badgeDate, { color: glowColors.viridian }]}>{formatBadgeDate(unlocked.unlockedAt)}</Text>
        )}
        {!isUnlocked && progress && (
          <Text style={[styles.badgeProgress, { color: theme.colors.primary }]}>{progress}</Text>
        )}
      </View>
      {isUnlocked && <Ionicons name="checkmark-circle" size={20} color={glowColors.viridian} />}
    </View>
  );
}

function BadgeCategoryCard({ cat, defs, unlockedMap, badgeStats }: {
  cat: { label: string };
  defs: (typeof BADGE_DEFINITIONS)[number][];
  unlockedMap: Map<string, Badge>;
  badgeStats: BadgeStats;
}) {
  const { theme } = useAppTheme();
  const earned = defs.filter((d) => unlockedMap.has(d.id)).length;
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.detailCard, { backgroundColor: theme.colors.surface }]}>
      <Pressable style={styles.badgeCategoryHeader} onPress={() => setExpanded((v) => !v)}>
        <Text style={[styles.detailTitle, { color: theme.colors.text, marginBottom: 0, flex: 1 }]}>{cat.label}</Text>
        <Text style={[styles.badgeCategoryCount, { color: theme.colors.muted }]}>
          {earned}/{defs.length}
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={theme.colors.muted}
          style={{ marginLeft: 6 }}
        />
      </Pressable>
      {expanded && defs.map((def) => (
        <BadgeRow
          key={def.id}
          def={def}
          unlocked={unlockedMap.get(def.id)}
          progress={unlockedMap.has(def.id) ? null : getBadgeProgress(def.id, badgeStats)}
        />
      ))}
    </View>
  );
}

const NODE_SIZE = 64;

// Pre-index ranks for O(1) lookups
const RANK_INDEX_MAP: Record<string, number> = {};
EVOLUTION_RANKS.forEach((t, i) => { RANK_INDEX_MAP[t.rank] = i; });
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

      {/* Label — offset right by half the connector width for non-first nodes
           so the text stays centered under the circle */}
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
            marginLeft: isFirst ? 0 : CONNECTOR_WIDTH,
          },
        ]}
      >
        {rankDisplayName(tier.rank)}
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
            marginLeft: isFirst ? 0 : CONNECTOR_WIDTH,
          },
        ]}
      >
        {tier.xp} XP
      </Text>

      {state === "current" && (
        <View style={[styles.currentDot, { marginLeft: isFirst ? 0 : CONNECTOR_WIDTH }]} />
      )}
    </View>
  );
}

// ── Evolution Detail Screen ─────────────────────────────────────────────────

export default function EvolutionScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { xp, rank, progress, toNext, nextTier, loading } = useXP();
  const { streak } = useStreak();
  const { profile } = useProfileContext();
  const { workouts } = useWorkouts();

  // Badge data
  const unlockedMap = useMemo(() => {
    const map = new Map<string, Badge>();
    for (const b of profile.badges ?? []) map.set(b.id, b);
    return map;
  }, [profile.badges]);

  const badgeStats: BadgeStats = useMemo(() => {
    const completed = workouts.filter((w) => !!w.completedAt);
    return {
      cardioCount: completed.filter((w) => w.sessionType === "cardio").length,
      strengthCount: completed.filter(
        (w) => w.sessionType === "strength" || (w.sessionType !== "cardio" && w.exercises.some((e) => e.sets.some((s) => s.completed)))
      ).length,
      totalWorkouts: completed.length,
      totalSets: completed.reduce((sum, w) => sum + w.exercises.flatMap((e) => e.sets).filter((s) => s.completed).length, 0),
      streakDays: streak.current,
      has1RM: !!(profile.estimated1RM && Object.values(profile.estimated1RM).some((v) => v != null && v !== "")),
    };
  }, [workouts, streak.current, profile.estimated1RM]);

  const badgeEarned = unlockedMap.size;
  const badgeTotal = BADGE_DEFINITIONS.length;

  const displayRank = rank;
  const currentIdx = RANK_INDEX_MAP[displayRank] ?? 0;

  const scrollRef = useRef<ScrollView>(null);
  const nodePositions = useRef<Record<string, number>>({});
  const [containerWidth, setContainerWidth] = useState(screenWidth);
  const [showRankTips, setShowRankTips] = useState(false);

  const getNodeState = useCallback(
    (tierRank: RankLevel): "completed" | "current" | "locked" => {
      const cIdx = RANK_INDEX_MAP[displayRank] ?? 0;
      const tIdx = RANK_INDEX_MAP[tierRank] ?? 0;
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

  // XP breakdown from history (memoized)
  const xpBreakdown = useMemo(() => {
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
  }, [xp.history]);

  const rankUpTips = [
    { text: "Complete a workout session", xp: `+${XP_AWARDS.SESSION_BASE}–${XP_AWARDS.SESSION_MAX} XP` },
    { text: "Hit a personal record",     xp: `+${XP_AWARDS.PR_HIT} XP` },
    { text: "Build a 3-day streak",      xp: `+${XP_AWARDS.STREAK_3_DAYS} XP` },
    { text: "Build a 7-day streak",      xp: `+${XP_AWARDS.STREAK_7_DAYS} XP` },
  ];

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <BackButton />
          <Text style={[typography.heading, { color: theme.colors.text }]}>
            Evolution Path
          </Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ padding: spacing.md }}>
          <Skeleton.Group>
            <Skeleton.Card />
            <Skeleton.Rect width="80%" height={16} />
            <Skeleton.Rect width="100%" height={10} />
            <Skeleton.Card />
          </Skeleton.Group>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={[typography.heading, { color: theme.colors.text }]}>
          Evolution Path
        </Text>
        {nextTier ? (
          <Pressable hitSlop={12} onPress={() => setShowRankTips(true)} style={{ width: 44, alignItems: "flex-end" }}>
            <Ionicons name="help-circle-outline" size={22} color="#FFD700" />
          </Pressable>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <Modal visible={showRankTips} transparent animationType="fade" onRequestClose={() => setShowRankTips(false)}>
        <Pressable style={styles.tipModalOverlay} onPress={() => setShowRankTips(false)}>
          <View style={[styles.tipModalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}>
              <Ionicons name="trending-up-outline" size={22} color={glowColors.viridian} />
              <Text style={[typography.heading, { color: theme.colors.text, marginLeft: 8 }]}>
                How to Rank Up
              </Text>
            </View>
            {rankUpTips.map((tip) => (
              <View key={tip.text} style={styles.tipRow}>
                <Text style={[typography.caption, { color: glowColors.viridian }]}>{">"}</Text>
                <Text style={[typography.caption, { color: theme.colors.text, flex: 1 }]}>{tip.text}</Text>
                <Text style={[typography.caption, { color: theme.colors.muted, fontWeight: "600" }]}>{tip.xp}</Text>
              </View>
            ))}
            <Pressable
              style={[styles.tipModalButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowRankTips(false)}
            >
              <Text style={[typography.body, { color: theme.colors.primaryText, fontWeight: "700" }]}>Got it</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

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
            {rankDisplayName(displayRank as RankLevel)}
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
                  {toNext} to {rankDisplayName(nextTier.rank)}
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

        {/* How to rank up — modal tooltip */}

        {/* Badges */}
        <View style={[styles.detailCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.badgeSummaryRow}>
            <Text style={[styles.detailTitle, { color: theme.colors.text, marginBottom: 0 }]}>Badges</Text>
            <Text style={[styles.badgeSummaryCount, { color: glowColors.viridian }]}>
              {badgeEarned} / {badgeTotal}
            </Text>
          </View>
          <View style={[styles.badgeTrack, { backgroundColor: theme.colors.mutedBg }]}>
            <View style={[styles.badgeFill, { backgroundColor: glowColors.viridian, width: `${Math.max((badgeEarned / badgeTotal) * 100, 2)}%` }]} />
          </View>
        </View>

        {BADGE_CATEGORIES.map((cat) => {
          const defs = cat.ids
            .map((id) => BADGE_DEFINITIONS.find((d) => d.id === id))
            .filter(Boolean) as (typeof BADGE_DEFINITIONS)[number][];
          return (
            <BadgeCategoryCard
              key={cat.label}
              cat={cat}
              defs={defs}
              unlockedMap={unlockedMap}
              badgeStats={badgeStats}
            />
          );
        })}

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
    marginBottom: spacing.md,
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
    marginTop: spacing.xs,
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
    marginBottom: spacing.md,
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
    marginBottom: spacing.md,
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
  tipModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  tipModalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  tipModalButton: {
    marginTop: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
  },

  // Badges
  badgeCategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  badgeCategoryCount: {
    fontSize: 13,
    fontWeight: "700",
  },
  badgeSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  badgeSummaryCount: {
    fontSize: 15,
    fontWeight: "800",
  },
  badgeTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  badgeFill: {
    height: "100%",
    borderRadius: 999,
    minWidth: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: spacing.sm,
  },
  badgeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeName: {
    fontSize: 14,
    fontWeight: "700",
  },
  badgeDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  badgeDate: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  badgeProgress: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
});

import { useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  type ImageSourcePropType,
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
import { useRouter } from "expo-router";
import { useAppTheme } from "../contexts/ThemeContext";
import { glowColors, spacing, radius } from "../lib/theme";
import { RANK_LADDER } from "../lib/rankService";
import type { RankLevel } from "../lib/types";

// ── Rank images ─────────────────────────────────────────────────────────────
export const RANK_IMAGES: Record<string, ImageSourcePropType> = {
  Scout:    require("../assets/locke/ranks/Scout.png"),
  Stalker:  require("../assets/locke/ranks/Stalker.png"),
  Hunter:   require("../assets/locke/ranks/Hunter.png"),
  Sentinel: require("../assets/locke/ranks/Sentinel.png"),
  Alpha:    require("../assets/locke/ranks/Alpha.png"),
  Apex:     require("../assets/locke/ranks/Apex.png"),
};

export const EVOLUTION_RANKS = RANK_LADDER.filter((t) => t.rank !== "Runt");

type Props = {
  currentRank: RankLevel;
  currentXP: number;
  xpForNextRank: number;
  progress: number;
};

/**
 * Compact current-rank card for the Profile screen.
 * Shows centered Locke image + rank info + XP bar.
 * Tapping navigates to the full Evolution Path detail screen.
 */
export function RankEvolutionPath({ currentRank, currentXP, xpForNextRank, progress }: Props) {
  const { theme } = useAppTheme();
  const router = useRouter();
  const displayRank = currentRank === "Runt" ? "Scout" : currentRank;
  const imageSource = RANK_IMAGES[displayRank];

  // Find next rank
  const currentIdx = EVOLUTION_RANKS.findIndex((t) => t.rank === displayRank);
  const nextRankName =
    currentIdx >= 0 && currentIdx < EVOLUTION_RANKS.length - 1
      ? EVOLUTION_RANKS[currentIdx + 1].rank
      : null;

  // Pulse animation
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.03]) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.2, 0.55]),
  }));

  // XP bar animation
  const barWidth = useSharedValue(0);
  useEffect(() => {
    barWidth.value = withDelay(
      250,
      withTiming(progress, { duration: 800, easing: Easing.out(Easing.cubic) })
    );
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.max(barWidth.value * 100, 2)}%`,
  }));

  return (
    <Pressable onPress={() => router.push("/evolution")}>
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        {/* Centered Locke image */}
        <View style={styles.imageSection}>
          <Animated.View style={[styles.glowCircle, glowStyle]} />
          <Animated.View style={scaleStyle}>
            <View style={styles.avatarBorder}>
              <Image
                source={imageSource}
                style={styles.avatar}
                resizeMode="contain"
              />
            </View>
          </Animated.View>
        </View>

        {/* Rank name */}
        <Text style={[styles.rankName, { color: glowColors.viridian }]}>
          {displayRank}
        </Text>

        <View style={styles.badgeRow}>
          <View style={styles.rankBadge}>
            <Text style={styles.rankBadgeText}>CURRENT RANK</Text>
          </View>
        </View>

        {/* XP bar */}
        <View style={styles.xpSection}>
          <View style={[styles.track, { backgroundColor: theme.colors.mutedBg }]}>
            <Animated.View
              style={[styles.fill, { backgroundColor: glowColors.viridian }, barStyle]}
            />
          </View>
          <View style={styles.xpLabels}>
            <Text style={[styles.xpText, { color: theme.colors.muted }]}>
              {currentXP} XP
            </Text>
            {nextRankName ? (
              <Text style={[styles.xpText, { color: theme.colors.muted }]}>
                {xpForNextRank} to {nextRankName}
              </Text>
            ) : (
              <Text style={[styles.xpText, { color: glowColors.viridian }]}>
                MAX RANK
              </Text>
            )}
          </View>
        </View>

        {/* Tap hint */}
        <Text style={[styles.tapHint, { color: theme.colors.muted }]}>
          Tap to view evolution path
        </Text>
      </View>
    </Pressable>
  );
}

const AVATAR_SIZE = 120;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  imageSection: {
    width: AVATAR_SIZE + 24,
    height: AVATAR_SIZE + 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  glowCircle: {
    position: "absolute",
    width: AVATAR_SIZE + 28,
    height: AVATAR_SIZE + 28,
    borderRadius: (AVATAR_SIZE + 28) / 2,
    backgroundColor: glowColors.viridian,
  },
  avatarBorder: {
    width: AVATAR_SIZE + 4,
    height: AVATAR_SIZE + 4,
    borderRadius: (AVATAR_SIZE + 4) / 2,
    borderWidth: 2,
    borderColor: glowColors.viridian,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  rankName: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  badgeRow: {
    marginTop: 4,
    marginBottom: spacing.md,
  },
  rankBadge: {
    backgroundColor: glowColors.viridianDim,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 6,
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: glowColors.viridian,
    letterSpacing: 1.2,
  },
  xpSection: {
    width: "100%",
    marginBottom: spacing.sm,
  },
  track: {
    height: 8,
    borderRadius: radius.full,
    overflow: "hidden",
    marginBottom: 6,
  },
  fill: {
    height: "100%",
    borderRadius: radius.full,
    minWidth: 4,
  },
  xpLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  xpText: {
    fontSize: 13,
    fontWeight: "600",
  },
  tapHint: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 8,
  },
});

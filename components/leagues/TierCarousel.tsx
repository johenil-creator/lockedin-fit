import React, { useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { useAppTheme } from "../../contexts/ThemeContext";
import { glowColors, spacing, radius } from "../../lib/theme";
import { RANK_LADDER } from "../../lib/rankService";
import { RANK_IMAGES } from "../RankEvolutionPath";
import type { RankLevel } from "../../lib/types";

// ── Constants ───────────────────────────────────────────────────────────────

const CURRENT_SIZE = 80;
const OTHER_SIZE = 60;
const ITEM_GAP = spacing.md;

// ── Props ───────────────────────────────────────────────────────────────────

type Props = {
  currentRank: RankLevel;
};

// ── Trophy Item (current rank — animated) ───────────────────────────────────

function CurrentTrophyItem({ rank }: { rank: RankLevel }) {
  const { theme } = useAppTheme();
  const imageSource = RANK_IMAGES[rank] ?? RANK_IMAGES["Runt"];

  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.06]) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.15, 0.5]),
  }));

  return (
    <View style={styles.itemContainer}>
      <View style={styles.currentImageWrapper}>
        {/* Glow circle behind the trophy */}
        <Animated.View
          style={[
            styles.glowCircle,
            {
              width: CURRENT_SIZE + 20,
              height: CURRENT_SIZE + 20,
              borderRadius: (CURRENT_SIZE + 20) / 2,
              backgroundColor: glowColors.viridian,
            },
            glowStyle,
          ]}
        />
        <Animated.View style={scaleStyle}>
          <View
            style={[
              styles.trophyBorder,
              {
                width: CURRENT_SIZE + 4,
                height: CURRENT_SIZE + 4,
                borderRadius: (CURRENT_SIZE + 4) / 2,
                borderColor: glowColors.viridian,
              },
            ]}
          >
            <Image
              source={imageSource}
              style={{ width: CURRENT_SIZE, height: CURRENT_SIZE }}
              resizeMode="contain"
            />
          </View>
        </Animated.View>
      </View>

      <Text
        style={[
          styles.rankLabel,
          styles.currentLabel,
          { color: glowColors.viridian },
        ]}
      >
        {rank}
      </Text>
    </View>
  );
}

// ── Trophy Item (unlocked — past ranks) ─────────────────────────────────────

function UnlockedTrophyItem({ rank }: { rank: RankLevel }) {
  const { theme } = useAppTheme();
  const imageSource = RANK_IMAGES[rank] ?? RANK_IMAGES["Runt"];

  return (
    <View style={styles.itemContainer}>
      <View style={styles.otherImageWrapper}>
        <View
          style={[
            styles.trophyBorder,
            {
              width: OTHER_SIZE + 4,
              height: OTHER_SIZE + 4,
              borderRadius: (OTHER_SIZE + 4) / 2,
              borderColor: glowColors.viridianDim,
            },
          ]}
        >
          <Image
            source={imageSource}
            style={{ width: OTHER_SIZE, height: OTHER_SIZE, opacity: 0.7 }}
            resizeMode="contain"
          />
        </View>
      </View>

      <Text style={[styles.rankLabel, { color: theme.colors.text, opacity: 0.7 }]}>
        {rank}
      </Text>
    </View>
  );
}

// ── Trophy Item (locked — future ranks) ─────────────────────────────────────

function LockedTrophyItem({ rank }: { rank: RankLevel }) {
  const { theme } = useAppTheme();
  const imageSource = RANK_IMAGES[rank] ?? RANK_IMAGES["Runt"];

  return (
    <View style={[styles.itemContainer, { opacity: 0.3 }]}>
      <View style={styles.otherImageWrapper}>
        <View
          style={[
            styles.trophyBorder,
            {
              width: OTHER_SIZE + 4,
              height: OTHER_SIZE + 4,
              borderRadius: (OTHER_SIZE + 4) / 2,
              borderColor: theme.colors.muted,
            },
          ]}
        >
          <Image
            source={imageSource}
            style={{
              width: OTHER_SIZE,
              height: OTHER_SIZE,
              tintColor: theme.colors.muted,
            }}
            resizeMode="contain"
          />
        </View>
      </View>

      <Text style={[styles.rankLabel, { color: theme.colors.muted }]}>
        {rank}
      </Text>
    </View>
  );
}

// ── Main Carousel ───────────────────────────────────────────────────────────

export function TierCarousel({ currentRank }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const containerWidth = useRef(0);

  const currentIdx = useMemo(
    () => RANK_LADDER.findIndex((t) => t.rank === currentRank),
    [currentRank],
  );

  // Compute scroll offset to center the current rank item
  const scrollToCurrentRank = () => {
    if (currentIdx < 0 || containerWidth.current === 0) return;

    // Each item width: image wrapper + gap
    // Current item is wider (CURRENT_SIZE + 4 + padding) while others are (OTHER_SIZE + 4 + padding)
    const itemPadding = spacing.sm * 2; // horizontal padding per item container
    let offsetX = spacing.md; // initial contentContainerStyle paddingHorizontal

    for (let i = 0; i < currentIdx; i++) {
      const itemWidth = OTHER_SIZE + 4 + itemPadding;
      offsetX += itemWidth + ITEM_GAP;
    }

    // Current item width
    const currentItemWidth = CURRENT_SIZE + 4 + itemPadding;

    // Center the current item in the visible area
    const targetX = offsetX + currentItemWidth / 2 - containerWidth.current / 2;

    scrollRef.current?.scrollTo({
      x: Math.max(0, targetX),
      animated: false,
    });
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    containerWidth.current = e.nativeEvent.layout.width;
    scrollToCurrentRank();
  };

  // Also scroll when currentRank changes
  useEffect(() => {
    // Small delay to ensure layout is settled after mount
    const timer = setTimeout(scrollToCurrentRank, 50);
    return () => clearTimeout(timer);
  }, [currentRank, currentIdx]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      onLayout={handleLayout}
      style={styles.scrollView}
    >
      {RANK_LADDER.map((tier, idx) => {
        if (idx === currentIdx) {
          return <CurrentTrophyItem key={tier.rank} rank={tier.rank} />;
        }
        if (idx < currentIdx) {
          return <UnlockedTrophyItem key={tier.rank} rank={tier.rank} />;
        }
        return <LockedTrophyItem key={tier.rank} rank={tier.rank} />;
      })}
    </ScrollView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: "transparent",
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: ITEM_GAP,
  },
  itemContainer: {
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  currentImageWrapper: {
    width: CURRENT_SIZE + 24,
    height: CURRENT_SIZE + 24,
    alignItems: "center",
    justifyContent: "center",
  },
  otherImageWrapper: {
    width: CURRENT_SIZE + 24, // same wrapper height to keep items vertically aligned
    height: CURRENT_SIZE + 24,
    alignItems: "center",
    justifyContent: "center",
  },
  glowCircle: {
    position: "absolute",
  },
  trophyBorder: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  rankLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  currentLabel: {
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 1,
  },
});

export default TierCarousel;

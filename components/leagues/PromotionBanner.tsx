import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius } from "../../lib/theme";
import type { WeekResult } from "../../lib/leagueService";

type Props = {
  result: WeekResult;
};

export function PromotionBanner({ result }: Props) {
  const { theme } = useAppTheme();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(0, { duration: 0 }),
      withDelay(200, withSpring(1, { damping: 12, stiffness: 100 }))
    );
    opacity.value = withDelay(200, withTiming(1, { duration: 400 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const isPromotion = result.result === "promoted";
  const isRelegation = result.result === "relegated";

  const bgColor = isPromotion
    ? theme.colors.success + "20"
    : isRelegation
      ? theme.colors.danger + "20"
      : theme.colors.mutedBg;

  const borderColor = isPromotion
    ? theme.colors.success + "60"
    : isRelegation
      ? theme.colors.danger + "60"
      : theme.colors.border;

  const textColor = isPromotion
    ? theme.colors.success
    : isRelegation
      ? theme.colors.danger
      : theme.colors.text;

  const emoji = isPromotion ? "▲" : isRelegation ? "▼" : "—";
  const title = isPromotion
    ? "Promoted!"
    : isRelegation
      ? "Relegated"
      : "Maintained";
  const subtitle = isPromotion
    ? "You moved up a tier. Keep it up!"
    : isRelegation
      ? "You dropped a tier. Time to grind!"
      : "You held your position. Solid work.";

  return (
    <Animated.View style={animatedStyle}>
      <View style={[styles.banner, { backgroundColor: bgColor, borderColor }]}>
        <Text style={[styles.emoji, { color: textColor }]}>{emoji}</Text>
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            {subtitle}
          </Text>
          <Text style={[styles.stats, { color: theme.colors.muted }]}>
            #{result.position} of {result.totalMembers} · {result.xpEarned.toLocaleString()} XP
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  emoji: {
    fontSize: 28,
    fontWeight: "700",
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  stats: {
    fontSize: 12,
    marginTop: 4,
  },
});

import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useAppTheme } from "../contexts/ThemeContext";
import { radius } from "../lib/theme";
import type { RankLevel } from "../lib/types";

type Props = {
  totalXP:   number;
  progress:  number;     // 0–1 within current rank band
  toNext:    number;     // XP remaining to next rank
  nextRank:  RankLevel | null;
};

export function XPBar({ totalXP, progress, toNext, nextRank }: Props) {
  const { theme } = useAppTheme();
  const fillPct = Math.max(0, Math.min(progress, 1)) * 100;
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withDelay(
      200,
      withTiming(fillPct, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, [fillPct]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  return (
    <View style={styles.container}>
      {/* Labels */}
      <View style={styles.labels}>
        <Text style={[styles.xpText, { color: theme.colors.muted }]}>
          {totalXP} XP
        </Text>
        {nextRank ? (
          <Text style={[styles.nextText, { color: theme.colors.muted }]}>
            {toNext} to {nextRank}
          </Text>
        ) : (
          <Text style={[styles.nextText, { color: theme.colors.primary }]}>
            APEX
          </Text>
        )}
      </View>

      {/* Track */}
      <View style={[styles.track, { backgroundColor: theme.colors.mutedBg }]}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: theme.colors.primary },
            fillStyle,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 5 },
  labels: {
    flexDirection:  "row",
    justifyContent: "space-between",
  },
  xpText:   { fontSize: 11, fontWeight: "600" },
  nextText: { fontSize: 11, fontWeight: "600" },
  track: {
    height:       8,
    borderRadius: radius.full,
    overflow:     "hidden",
  },
  fill: {
    height:       "100%",
    borderRadius: radius.full,
    minWidth:     4,
  },
});

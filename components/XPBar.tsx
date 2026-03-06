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
import type { RankLevel } from "../lib/types";

type Props = {
  totalXP:      number;
  bandCurrent:  number;     // XP earned within current rank band
  bandTotal:    number;     // total XP required for current band (0 at Apex)
  progress:     number;     // 0–1 within current rank band
  nextRank:     RankLevel | null;
};

export function XPBar({ totalXP, bandCurrent, bandTotal, progress, nextRank }: Props) {
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

  const isApex = !nextRank;

  return (
    <View style={styles.container}>
      {/* Labels */}
      <View style={styles.labels}>
        {isApex ? (
          <Text style={[styles.xpText, { color: theme.colors.primary }]}>
            APEX {"\u00B7"} {totalXP} XP
          </Text>
        ) : (
          <>
            <Text style={[styles.xpText, { color: theme.colors.muted }]}>
              {bandCurrent} / {bandTotal} XP
            </Text>
            <Text style={[styles.nextText, { color: theme.colors.muted }]}>
              {"\u2192"} {nextRank}
            </Text>
          </>
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
    borderRadius: 4,
    overflow:     "hidden",
  },
  fill: {
    height:       "100%",
    borderRadius: 4,
    minWidth:     4,
  },
});

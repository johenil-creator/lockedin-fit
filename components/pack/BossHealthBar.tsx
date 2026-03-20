import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";

type Props = {
  healthRemaining: number;
  healthTotal: number;
};

function BossHealthBarInner({ healthRemaining, healthTotal }: Props) {
  const { theme } = useAppTheme();
  const pct = healthTotal > 0 ? healthRemaining / healthTotal : 0;
  const widthAnim = useSharedValue(pct);

  useEffect(() => {
    widthAnim.value = withTiming(pct, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [pct]);

  const barColor =
    pct > 0.5 ? "#3FB950" : pct > 0.25 ? "#FFD60A" : "#F85149";

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${widthAnim.value * 100}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.track, { backgroundColor: theme.colors.mutedBg }]}>
        <Animated.View
          style={[styles.fill, { backgroundColor: barColor }, animatedStyle]}
        />
      </View>
      <Text style={[typography.caption, { color: theme.colors.muted, marginTop: 4 }]}>
        {healthRemaining} / {healthTotal} HP
      </Text>
    </View>
  );
}

export const BossHealthBar = React.memo(BossHealthBarInner);

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
  },
  track: {
    width: "100%",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 6,
  },
});

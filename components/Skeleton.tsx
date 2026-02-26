import { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useAppTheme } from "../contexts/ThemeContext";
import { radius, spacing } from "../lib/theme";

function usePulse() {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      false
    );
  }, []);
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

function Rect({
  width,
  height = 14,
  borderRadius: br = radius.sm,
  style,
}: {
  width: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  const { theme } = useAppTheme();
  const pulseStyle = usePulse();

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: br,
          backgroundColor: theme.colors.mutedBg,
        },
        pulseStyle,
        style,
      ]}
    />
  );
}

function Group({ gap = spacing.sm, children }: { gap?: number; children: React.ReactNode }) {
  return <View style={{ gap }}>{children}</View>;
}

function CardSkeleton({ style }: { style?: ViewStyle }) {
  const { theme } = useAppTheme();
  const pulseStyle = usePulse();

  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        pulseStyle,
        style,
      ]}
    />
  );
}

function Circle({ size = 48, style }: { size?: number; style?: ViewStyle }) {
  const { theme } = useAppTheme();
  const pulseStyle = usePulse();

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.mutedBg,
        },
        pulseStyle,
        style,
      ]}
    />
  );
}

export const Skeleton = {
  Rect,
  Group,
  Card: CardSkeleton,
  Circle,
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 80,
    marginBottom: spacing.sm + 4,
  },
});

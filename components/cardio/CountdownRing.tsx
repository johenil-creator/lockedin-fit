import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  FadeIn,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 160;
const STROKE = 6;
const R = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;
const TOTAL_BEATS = 4; // 3, 2, 1, GO

type Props = {
  visible: boolean;
  onComplete: () => void;
};

export function CountdownRing({ visible, onComplete }: Props) {
  const [beat, setBeat] = useState(0); // 0=3, 1=2, 2=1, 3=GO
  const progress = useSharedValue(0); // 0→1 over the full countdown

  useEffect(() => {
    if (!visible) return;
    setBeat(0);
    progress.value = 0;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Beat 0 → "3" (immediate)
    progress.value = withTiming(0.25, { duration: 800, easing: Easing.linear });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Beat 1 → "2"
    timers.push(
      setTimeout(() => {
        setBeat(1);
        progress.value = withTiming(0.5, { duration: 800, easing: Easing.linear });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, 800)
    );

    // Beat 2 → "1"
    timers.push(
      setTimeout(() => {
        setBeat(2);
        progress.value = withTiming(0.75, { duration: 800, easing: Easing.linear });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, 1600)
    );

    // Beat 3 → "GO"
    timers.push(
      setTimeout(() => {
        setBeat(3);
        progress.value = withTiming(1, { duration: 800, easing: Easing.linear });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 2400)
    );

    // Complete
    timers.push(setTimeout(onComplete, 3500));

    return () => timers.forEach(clearTimeout);
  }, [visible]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  if (!visible) return null;

  const labels = ["3", "2", "1", "GO"];
  const label = labels[beat] ?? "3";
  const isGo = beat === 3;

  return (
    <Animated.View entering={FadeIn.duration(150)} style={styles.overlay}>
      {/* SVG ring */}
      <View style={styles.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={styles.svg}>
          {/* Track */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={R}
            stroke="#1C1C1E"
            strokeWidth={STROKE}
            fill="none"
          />
          {/* Progress */}
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={R}
            stroke="#30D158"
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            animatedProps={animatedProps}
            rotation="-90"
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        </Svg>

        {/* Centered number */}
        <Text
          key={beat}
          style={[styles.number, { color: isGo ? "#30D158" : "#FFFFFF" }]}
        >
          {label}
        </Text>
      </View>

      {/* Skip */}
      <Pressable onPress={onComplete} style={styles.skipBtn}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  svg: {
    position: "absolute",
  },
  number: {
    fontSize: 96,
    fontWeight: "700",
    letterSpacing: -2,
  },
  skipBtn: {
    position: "absolute",
    bottom: 60,
    padding: 16,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#98989D",
  },
});

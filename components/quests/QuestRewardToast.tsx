import React, { useEffect, useRef } from "react";
import { Text, Image, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { radius } from "../../lib/theme";

type Props = {
  amount: number;
  visible: boolean;
  onDismiss: () => void;
};

export function QuestRewardToast({ amount, visible, onDismiss }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (visible && amount > 0) {
      opacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(1800, withTiming(0, { duration: 300 }))
      );
      translateY.value = withSequence(
        withTiming(0, { duration: 200, easing: Easing.out(Easing.back(1.2)) }),
        withDelay(1800, withTiming(-10, { duration: 300 }))
      );

      const timer = setTimeout(() => onDismissRef.current(), 2300);
      return () => clearTimeout(timer);
    }
  }, [visible, amount]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible || amount <= 0) return null;

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <Image source={require("../../assets/fangs_icon.png")} style={{ width: 24, height: 24, tintColor: "#FFD700" }} resizeMode="contain" /><Text style={styles.text}> +{amount} Fangs</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    backgroundColor: "#FFD70020",
    borderColor: "#FFD70040",
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: radius.full,
    zIndex: 999,
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFD700",
  },
});

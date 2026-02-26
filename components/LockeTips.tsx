import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useAppTheme } from "../contexts/ThemeContext";

type Props = {
  tip: string;
};

export function LockeTips({ tip }: Props) {
  const { theme } = useAppTheme();
  const tx = useSharedValue(-16);
  const opacity = useSharedValue(0);

  useEffect(() => {
    tx.value = withTiming(0, { duration: 300 });
    opacity.value = withTiming(1, { duration: 300 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { borderLeftColor: theme.colors.accent },
        animStyle,
      ]}
    >
      <Text style={[styles.prefix, { color: theme.colors.accent }]}>
        Locke Tip:{" "}
      </Text>
      <Text style={[styles.text, { color: theme.colors.muted }]}>{tip}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 8,
    marginTop: 2,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  prefix: {
    fontSize: 12,
    fontWeight: "700",
  },
  text: {
    fontSize: 12,
    fontStyle: "italic",
    flex: 1,
  },
});

import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useAppTheme } from "../contexts/ThemeContext";
import { spacing, typography } from "../lib/theme";
import { Button } from "./Button";

type Props = {
  icon: string;
  title: string;
  subtitle?: string;
  hint?: string;
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ icon, title, subtitle, hint, action }: Props) {
  const { theme } = useAppTheme();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = withDelay(100, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(100, withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: theme.colors.muted }]}>{subtitle}</Text>}
      {hint && <Text style={[styles.hint, { color: theme.colors.muted }]}>{hint}</Text>}
      {action && (
        <View style={styles.actionWrap}>
          <Button label={action.label} onPress={action.onPress} />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 64,
    paddingHorizontal: spacing.lg,
  },
  icon: { fontSize: 56, marginBottom: spacing.md },
  title: { ...typography.heading, marginBottom: spacing.sm, textAlign: "center" },
  subtitle: { fontSize: 14, textAlign: "center", marginBottom: spacing.sm },
  hint: { fontSize: 12, textAlign: "center", lineHeight: 20 },
  actionWrap: { marginTop: spacing.md, width: "100%" },
});

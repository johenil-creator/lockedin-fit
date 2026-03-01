import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing } from "../../lib/theme";

type ControlState = "running" | "paused" | "done";

type Props = {
  state: ControlState;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onFinish: () => void;
};

const SPRING_CONFIG = { damping: 12, stiffness: 300 };

/* ── glass style helpers ────────────────────────────────────────────── */

const glassBase = {
  borderWidth: 1,
} as const;

/** Tinted glass — semi-transparent fill with a matching soft glow */
function glassStyle(tint: string, glowColor: string) {
  return {
    ...glassBase,
    backgroundColor: tint + "22",        // ~13 % fill
    borderColor: tint + "44",            // ~27 % rim
    shadowColor: glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  };
}

/* ── AnimatedCircle ─────────────────────────────────────────────────── */

function AnimatedCircle({
  onPress,
  size,
  style,
  children,
}: {
  onPress: () => void;
  size: number;
  style: any;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.92, SPRING_CONFIG);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING_CONFIG);
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
    >
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: "center",
            justifyContent: "center",
          },
          style,
          animStyle,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

/* ── WorkoutControls ────────────────────────────────────────────────── */

export function WorkoutControls({ state, onPause, onResume, onEnd, onFinish }: Props) {
  const { theme } = useAppTheme();

  if (state === "done") {
    return (
      <View style={styles.centered}>
        <AnimatedCircle
          onPress={onFinish}
          size={72}
          style={glassStyle(theme.colors.primary, theme.colors.primary)}
        >
          <Ionicons name="checkmark" size={28} color={theme.colors.primary} />
        </AnimatedCircle>
      </View>
    );
  }

  if (state === "running") {
    return (
      <View style={styles.row}>
        <AnimatedCircle
          onPress={onEnd}
          size={48}
          style={glassStyle(theme.colors.danger, theme.colors.danger)}
        >
          <Ionicons name="close" size={20} color={theme.colors.danger} />
        </AnimatedCircle>

        <AnimatedCircle
          onPress={onPause}
          size={72}
          style={glassStyle(theme.colors.primary, theme.colors.primary)}
        >
          <Ionicons name="pause" size={28} color={theme.colors.primary} />
        </AnimatedCircle>
      </View>
    );
  }

  // Paused state
  return (
    <View style={styles.centered}>
      <AnimatedCircle
        onPress={onResume}
        size={72}
        style={glassStyle(theme.colors.primary, theme.colors.primary)}
      >
        <Ionicons name="play" size={28} color={theme.colors.primary} />
      </AnimatedCircle>

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onEnd();
        }}
        style={styles.textLink}
        accessibilityRole="button"
        accessibilityLabel="End workout"
      >
        <Text style={[styles.textLinkLabel, { color: theme.colors.danger }]}>
          End Workout
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
  },
  textLink: {
    paddingVertical: spacing.xs,
  },
  textLinkLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
});

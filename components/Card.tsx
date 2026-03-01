import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useAppTheme } from "../contexts/ThemeContext";
import { radius, spacing, shadowPresets, ShadowElevation } from "../lib/theme";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevation?: ShadowElevation;
};

export function Card({ children, style, onPress, elevation = 'light' }: Props) {
  const { theme } = useAppTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const shadow = shadowPresets[elevation];

  const cardStyle = [
    styles.card,
    shadow,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
    style,
  ];

  if (onPress) {
    return (
      <Animated.View style={animatedStyle}>
        <Pressable
          style={cardStyle}
          onPress={onPress}
          onPressIn={() => {
            scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 15, stiffness: 400 });
          }}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md + 2,
    marginBottom: spacing.sm + 4,
  },
});

import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useAppTheme } from "../contexts/ThemeContext";
import { radius, spacing } from "../lib/theme";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
};

export function Card({ children, style, onPress }: Props) {
  const { theme } = useAppTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const cardStyle = [
    styles.card,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
});

import { StyleSheet, View, ViewStyle } from "react-native";
import { useAppTheme } from "../contexts/ThemeContext";
import { radius, spacing } from "../lib/theme";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function Card({ children, style }: Props) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
});

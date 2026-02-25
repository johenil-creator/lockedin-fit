import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../contexts/ThemeContext";
import { radius } from "../lib/theme";

type Variant = "default" | "dark" | "accent";

type Props = {
  label: string;
  variant?: Variant;
};

export function Badge({ label, variant = "default" }: Props) {
  const { theme } = useAppTheme();

  const bg = {
    default: theme.colors.mutedBg,
    dark: theme.colors.primary,
    accent: theme.colors.accent,
  }[variant];

  const textColor = {
    default: theme.colors.muted,
    dark: theme.colors.primaryText,
    accent: theme.colors.accentText,
  }[variant];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.sm,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  text: { fontSize: 12, fontWeight: "600" },
});

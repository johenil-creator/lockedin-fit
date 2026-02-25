import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useAppTheme } from "../contexts/ThemeContext";
import { radius } from "../lib/theme";

type Variant = "primary" | "secondary" | "danger";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
};

export function Button({ label, onPress, variant = "primary", disabled, loading, small }: Props) {
  const { theme } = useAppTheme();

  const bg = {
    primary: theme.colors.primary,
    secondary: theme.colors.mutedBg,
    danger: theme.colors.danger,
  }[variant];

  const textColor = {
    primary: theme.colors.primaryText,
    secondary: theme.colors.muted,
    danger: theme.colors.dangerText,
  }[variant];

  return (
    <Pressable
      style={[
        styles.base,
        { backgroundColor: bg },
        small && styles.small,
        (disabled || loading) && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.text, { color: textColor }, small && styles.smallText]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
  },
  disabled: { opacity: 0.5 },
  text: { fontSize: 15, fontWeight: "600" },
  smallText: { fontSize: 13 },
});

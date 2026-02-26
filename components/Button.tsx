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
    secondary: "transparent",
    danger: theme.colors.danger,
  }[variant];

  const textColor = {
    primary: theme.colors.primaryText,
    secondary: theme.colors.accent,
    danger: theme.colors.dangerText,
  }[variant];

  return (
    <Pressable
      style={[
        styles.base,
        { backgroundColor: bg },
        variant === "secondary" && { borderWidth: 1.5, borderColor: theme.colors.accent },
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
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  small: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
  },
  disabled: { opacity: 0.5 },
  text: { fontSize: 15, fontWeight: "600" },
  smallText: { fontSize: 13 },
});

import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius } from "../../lib/theme";

type Size = "hero" | "compact";

type Props = {
  label: string;
  value: string;
  color?: string;
  size: Size;
};

const sizeMap: Record<Size, { fontSize: number; fontWeight: "600" | "500" }> = {
  hero:    { fontSize: 56, fontWeight: "600" },
  compact: { fontSize: 22, fontWeight: "500" },
};

export function MetricRow({ label, value, color, size }: Props) {
  const { theme } = useAppTheme();
  const spec = sizeMap[size];
  const isHero = size === "hero";

  if (isHero) {
    // Hero: no card, just big centered timer
    return (
      <View style={styles.heroContainer}>
        <Text style={[styles.heroLabel, { color: theme.colors.muted }]}>{label}</Text>
        <Text
          style={[
            styles.heroValue,
            { color: color ?? theme.colors.text, fontSize: spec.fontSize, fontWeight: spec.fontWeight },
          ]}
        >
          {value}
        </Text>
      </View>
    );
  }

  // Compact: small card for secondary metrics
  return (
    <View
      style={[
        styles.compactCard,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <Text style={[styles.compactLabel, { color: theme.colors.muted }]}>{label}</Text>
      <Text
        style={[
          styles.compactValue,
          { color: color ?? theme.colors.text, fontSize: spec.fontSize, fontWeight: spec.fontWeight },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    alignItems: "center",
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  heroValue: {
    fontVariant: ["tabular-nums"],
    letterSpacing: -2,
    lineHeight: 62,
  },
  compactCard: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  compactLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  compactValue: {
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
  },
});

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing } from "../../lib/theme";

type Props = {
  type: "promotion" | "relegation";
};

const CONFIG = {
  promotion: { label: "PROMOTION ZONE", arrow: "\u25B2" },
  relegation: { label: "RELEGATION ZONE", arrow: "\u25BC" },
} as const;

export function ZoneDivider({ type }: Props) {
  const { theme } = useAppTheme();

  const color =
    type === "promotion" ? theme.colors.success : theme.colors.danger;
  const { label, arrow } = CONFIG[type];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: color + "15", marginVertical: spacing.xs },
      ]}
    >
      <View style={[styles.line, { backgroundColor: color + "40" }]} />
      <Text style={[styles.arrow, { color }]}>{arrow}</Text>
      <Text style={[styles.label, { color }]}>{label}</Text>
      <Text style={[styles.arrow, { color }]}>{arrow}</Text>
      <View style={[styles.line, { backgroundColor: color + "40" }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 36,
    paddingHorizontal: spacing.md,
  },
  line: {
    flex: 1,
    height: 1,
  },
  arrow: {
    fontSize: 10,
    marginHorizontal: spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});

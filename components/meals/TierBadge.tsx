import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { CuisineTier } from "../../src/data/mealTypes";

type Props = {
  tier: CuisineTier;
  size?: "sm" | "md";
};

const TIER_CONFIG: Record<CuisineTier, { color: string; label: string }> = {
  scavenge: { color: "#1D9E75", label: "Scavenge" },
  hunt: { color: "#378ADD", label: "Hunt" },
  apex_feast: { color: "#BA7517", label: "Apex Feast" },
};

export const TierBadge = React.memo(function TierBadge({ tier, size = "sm" }: Props) {
  const { theme } = useAppTheme();
  const config = TIER_CONFIG[tier];
  const isMd = size === "md";

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: config.color + "20",
          borderColor: config.color + "50",
          paddingHorizontal: isMd ? spacing.md : spacing.sm,
          paddingVertical: isMd ? spacing.xs + 2 : spacing.xs,
        },
      ]}
    >
      <Text
        style={[
          isMd ? styles.textMd : styles.textSm,
          { color: config.color },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  pill: {
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  textSm: {
    fontSize: typography.caption.fontSize,
    fontWeight: "600",
  },
  textMd: {
    fontSize: typography.small.fontSize,
    fontWeight: "600",
  },
});

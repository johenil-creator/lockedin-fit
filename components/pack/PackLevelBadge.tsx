import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, typography } from "../../lib/theme";
import { PACK_LEVEL_THRESHOLDS } from "../../lib/packLevelService";

type Props = {
  level: number;
  totalXp: number;
};

function PackLevelBadgeInner({ level, totalXp }: Props) {
  const { theme } = useAppTheme();

  // Find current and next threshold for ring progress
  let currentThreshold = PACK_LEVEL_THRESHOLDS[0];
  let nextThreshold: (typeof PACK_LEVEL_THRESHOLDS)[0] | null = null;

  for (let i = 0; i < PACK_LEVEL_THRESHOLDS.length; i++) {
    if (level >= PACK_LEVEL_THRESHOLDS[i].level) {
      currentThreshold = PACK_LEVEL_THRESHOLDS[i];
      nextThreshold = PACK_LEVEL_THRESHOLDS[i + 1] ?? null;
    }
  }

  let progress = 1;
  if (nextThreshold) {
    const xpInLevel = totalXp - currentThreshold.xpRequired;
    const xpNeeded = nextThreshold.xpRequired - currentThreshold.xpRequired;
    progress = xpNeeded > 0 ? Math.min(xpInLevel / xpNeeded, 1) : 1;
  }

  const SIZE = 64;
  const STROKE = 4;
  const INNER = SIZE - STROKE * 2;

  return (
    <View style={styles.container}>
      {/* Ring background */}
      <View
        style={[
          styles.ring,
          {
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            borderWidth: STROKE,
            borderColor: theme.colors.mutedBg,
          },
        ]}
      >
        {/* Progress ring overlay — simplified as a partial border */}
        <View
          style={[
            styles.ringProgress,
            {
              width: SIZE,
              height: SIZE,
              borderRadius: SIZE / 2,
              borderWidth: STROKE,
              borderColor: theme.colors.primary,
              borderTopColor:
                progress >= 0.25 ? theme.colors.primary : "transparent",
              borderRightColor:
                progress >= 0.5 ? theme.colors.primary : "transparent",
              borderBottomColor:
                progress >= 0.75 ? theme.colors.primary : "transparent",
              borderLeftColor:
                progress >= 1 ? theme.colors.primary : "transparent",
            },
          ]}
        />
        {/* Inner circle with level number */}
        <View
          style={[
            styles.inner,
            {
              width: INNER,
              height: INNER,
              borderRadius: INNER / 2,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <Text
            style={[
              typography.heading,
              { color: theme.colors.primary, fontWeight: "900" },
            ]}
          >
            {level}
          </Text>
        </View>
      </View>
      <Text
        style={[
          typography.caption,
          { color: theme.colors.muted, marginTop: spacing.xs },
        ]}
      >
        Pack Level
      </Text>
    </View>
  );
}

export const PackLevelBadge = React.memo(PackLevelBadgeInner);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  ring: {
    alignItems: "center",
    justifyContent: "center",
  },
  ringProgress: {
    position: "absolute",
    top: -4,
    left: -4,
  },
  inner: {
    alignItems: "center",
    justifyContent: "center",
  },
});

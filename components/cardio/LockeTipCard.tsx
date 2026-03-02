/**
 * LockeTipCard.tsx — Collapsible coaching tip card for the cardio session screen.
 *
 * Shows Locke's form cues for the active modality.
 * Starts collapsed; tap anywhere to collapse/expand.
 * Entry animation: FadeInDown on mount.
 */

import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  FadeInDown,
  Easing,
} from "react-native-reanimated";
import { useAppTheme } from "../../contexts/ThemeContext";
import { Card } from "../Card";
import { LockeMascot } from "../Locke/LockeMascot";
import { getLockeTip } from "../../lib/lockeTips";
import { spacing, radius, typography } from "../../lib/theme";

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  modality: string;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function LockeTipCard({ modality }: Props) {
  const { theme } = useAppTheme();
  const tip = getLockeTip(modality);
  const [expanded, setExpanded] = useState(false);

  // Height animation for collapse/expand
  const contentHeight = useSharedValue(0);

  const contentStyle = useAnimatedStyle(() => ({
    overflow: "hidden",
    opacity: withTiming(contentHeight.value, {
      duration: 220,
      easing: Easing.inOut(Easing.quad),
    }),
    maxHeight: withTiming(contentHeight.value === 1 ? 400 : 0, {
      duration: 260,
      easing: Easing.inOut(Easing.quad),
    }),
  }));

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    contentHeight.value = next ? 1 : 0;
  }

  // Derived colors
  const cueGreen = theme.colors.success;
  const avoidRed = theme.colors.danger;
  const mutedRed = theme.colors.danger + "BB";

  return (
    <Animated.View entering={FadeInDown.delay(80).duration(380).springify()}>
      <Card>
        {/* Header row — always visible, tap to toggle */}
        <Pressable onPress={toggle} style={styles.header}>
          {/* Mini Locke icon */}
          <LockeMascot size={36} mood="encouraging" />

          <Text style={[styles.headerText, { color: theme.colors.text }]}>
            Locke's Tip
          </Text>

          {/* Chevron */}
          <Text style={[styles.chevron, { color: theme.colors.muted }]}>
            {expanded ? "▲" : "▼"}
          </Text>
        </Pressable>

        {/* Collapsible body */}
        <Animated.View style={contentStyle}>
          <View style={styles.body}>
            {/* Setup line */}
            <Text style={[styles.setup, { color: theme.colors.text }]}>
              {tip.setup}
            </Text>

            {/* Cue bullets */}
            <View style={styles.section}>
              {tip.cues.map((cue, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={[styles.bullet, { color: cueGreen }]}>✓</Text>
                  <Text style={[styles.bulletText, { color: theme.colors.text }]}>
                    {cue}
                  </Text>
                </View>
              ))}
            </View>

            {/* Avoid bullets */}
            <View style={styles.section}>
              {tip.avoid.map((item, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={[styles.bullet, { color: mutedRed }]}>✗</Text>
                  <Text style={[styles.bulletText, { color: theme.colors.muted }]}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
      </Card>
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
    ...typography.subheading,
  },
  chevron: {
    fontSize: 12,
  },
  body: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  setup: {
    ...typography.body,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  section: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  bullet: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
    width: 16,
  },
  bulletText: {
    ...typography.body,
    flex: 1,
    lineHeight: 21,
  },
});

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import { impact, ImpactStyle } from "../../lib/haptics";
import type { SmartHuntResult, IntensityTier } from "../../lib/smartHuntEngine";

/* ── Intensity colors ──────────────────────────────────────────────────────── */

export const TIER_COLORS: Record<IntensityTier, string> = {
  full_send: "#22c55e",
  solid_hunt: "#84cc16",
  light_prowl: "#f97316",
  den_day: "#ef4444",
};

/* ── Component ─────────────────────────────────────────────────────────────── */

type Props = {
  hunt: SmartHuntResult | null;
  loading: boolean;
  starting: string | null;
  onStart: (name: string, exercises: { exercise: string; sets: string; reps: string }[]) => void;
  onShuffle: () => void;
};

export const LockeHuntCard = React.memo(function LockeHuntCard({
  hunt,
  loading,
  starting,
  onStart,
  onShuffle,
}: Props) {
  const { theme } = useAppTheme();
  const [expanded, setExpanded] = useState(false);

  if (loading || !hunt) {
    return (
      <View
        style={[
          styles.card,
          styles.lockeCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary + "40" },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + "18" }]}>
            <Ionicons name="paw" size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[typography.subheading, { color: theme.colors.text }]}>Locke's Hunt</Text>
            <Text style={[typography.caption, { color: theme.colors.muted }]}>Analyzing recovery...</Text>
          </View>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  const tierColor = TIER_COLORS[hunt.intensityTier];
  const isStarting = starting === hunt.name;
  const disabled = !!starting;

  const toggleExpand = () => {
    impact(ImpactStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  const handleStart = () => {
    impact(ImpactStyle.Medium);
    onStart(hunt.name, hunt.exercises);
  };

  const handleShuffle = () => {
    impact(ImpactStyle.Light);
    onShuffle();
  };

  return (
    <Pressable
      onPress={toggleExpand}
      style={[
        styles.card,
        styles.lockeCard,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary + "40" },
      ]}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + "18" }]}>
          <Ionicons name="paw" size={22} color={theme.colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[typography.subheading, { color: theme.colors.text }]}>Locke's Hunt</Text>
          <Text style={[typography.caption, { color: theme.colors.muted }]}>
            {hunt.focusLabel}{" · "}
            {hunt.exerciseCount} exercises{" · "}~{hunt.estimatedMinutes} min
          </Text>
        </View>
        <View style={[styles.tierBadge, { backgroundColor: tierColor + "20" }]}>
          <Text style={[styles.tierBadgeText, { color: tierColor }]}>{hunt.subtitle}</Text>
        </View>
      </View>

      {/* Muscle recovery pills */}
      <View style={styles.pillRow}>
        {hunt.muscleTargets.map((t) => {
          const pctColor = t.recoveryPct >= 80 ? "#22c55e" : t.recoveryPct >= 60 ? "#FFD700" : "#f97316";
          return (
            <View key={t.muscle} style={[styles.pill, { backgroundColor: pctColor + "1A" }]}>
              <Text style={[styles.pillText, { color: pctColor }]}>
                {t.muscle.charAt(0).toUpperCase() + t.muscle.slice(1).replace(/_/g, " ")} {t.recoveryPct}%
              </Text>
            </View>
          );
        })}
      </View>

      {/* Reasoning */}
      <Text style={[styles.reasoningText, { color: theme.colors.muted }]}>{hunt.reasoning}</Text>

      {/* Expanded exercise list */}
      {expanded && (
        <View style={[styles.exerciseList, { borderTopColor: theme.colors.border }]}>
          {hunt.exercises.map((e, i) => (
            <View key={i} style={styles.exerciseRow}>
              <Text
                style={[typography.small, { color: theme.colors.text, flex: 1 }]}
                numberOfLines={1}
              >
                {e.exercise}
              </Text>
              <Text style={[typography.caption, { color: theme.colors.muted, marginLeft: spacing.sm }]}>
                {e.sets} × {e.reps}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.lockeActions}>
        <Pressable onPress={handleShuffle} style={styles.shuffleBtn}>
          <Ionicons name="shuffle" size={16} color={theme.colors.muted} />
          <Text style={[styles.shuffleBtnText, { color: theme.colors.muted }]}>Shuffle</Text>
        </Pressable>
        <Pressable
          onPress={handleStart}
          disabled={disabled}
          style={({ pressed }) => [
            styles.huntButton,
            styles.lockeHuntButton,
            {
              backgroundColor: disabled
                ? theme.colors.mutedBg
                : pressed
                  ? theme.colors.accent
                  : theme.colors.primary,
            },
          ]}
        >
          <Ionicons
            name="paw"
            size={16}
            color={disabled ? theme.colors.muted : theme.colors.primaryText}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.huntButtonText,
              { color: disabled ? theme.colors.muted : theme.colors.primaryText },
            ]}
          >
            {isStarting ? "Tracking..." : "Start the Hunt"}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
});

/* ── Styles ─────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  lockeCard: {
    borderWidth: 1.5,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.sm,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  reasoningText: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  exerciseList: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lockeActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: spacing.md,
  },
  shuffleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  shuffleBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  huntButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: radius.sm,
    marginTop: spacing.md,
  },
  huntButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  lockeHuntButton: {
    flex: 1,
  },
});

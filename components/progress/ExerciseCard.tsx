import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { Sparkline } from "./Sparkline";
import { ProgressChart } from "../ProgressChart";
import { spacing, radius } from "../../lib/theme";
import type { ExerciseProgress, TrendDirection } from "../../lib/progress";

type Props = {
  name: string;
  data: ExerciseProgress[];
  trend: TrendDirection;
  weightUnit: string;
};

const TREND_ICONS: Record<TrendDirection, { icon: string; color: string }> = {
  up: { icon: "trending-up", color: "" },
  flat: { icon: "remove-outline", color: "" },
  down: { icon: "trending-down", color: "" },
};

function ExerciseCardInner({ name, data, trend, weightUnit }: Props) {
  const { theme } = useAppTheme();
  const [expanded, setExpanded] = useState(false);

  const sparkData = data.map((d) => d.estimated1RM || d.maxWeight);
  const latestPR = data.length > 0 && data[data.length - 1].isPR;
  const best1RM = data.length > 0 ? Math.max(...data.map((d) => d.estimated1RM)) : 0;
  const bestWeight = data.length > 0 ? Math.max(...data.map((d) => d.maxWeight)) : 0;
  const totalSessions = data.length;

  const trendColor =
    trend === "up" ? theme.colors.success : trend === "down" ? theme.colors.danger : theme.colors.muted;
  const trendInfo = TREND_ICONS[trend];

  return (
    <Pressable onPress={() => setExpanded((p) => !p)}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: latestPR ? "#FFD70050" : theme.colors.border,
            borderWidth: latestPR ? 1.5 : 1,
          },
        ]}
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={styles.nameCol}>
            {latestPR && (
              <Text style={styles.prBadge}>
                👑
              </Text>
            )}
            <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
              {name}
            </Text>
          </View>
          <Sparkline data={sparkData} hasPR={latestPR} />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {bestWeight > 0 ? `${bestWeight}` : "—"}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.muted }]}>
              Best {weightUnit}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {best1RM > 0 ? `${best1RM}` : "—"}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.muted }]}>e1RM</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {totalSessions}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Sessions</Text>
          </View>
          <View style={[styles.stat, styles.trendStat]}>
            <Ionicons name={trendInfo.icon as any} size={18} color={trendColor} />
            <Text style={[styles.statLabel, { color: trendColor }]}>
              {trend === "up" ? "Rising" : trend === "down" ? "Falling" : "Steady"}
            </Text>
          </View>
        </View>

        {/* Expanded chart */}
        {expanded && (
          <Animated.View entering={FadeIn.duration(250)} style={styles.expandedSection}>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <ProgressChart data={data.slice(-8)} metric="maxWeight" weightUnit={weightUnit} />

            {/* Volume load trend */}
            {data.length > 1 && (
              <View style={styles.volumeRow}>
                <Text style={[styles.volumeLabel, { color: theme.colors.muted }]}>
                  Volume Load (last session)
                </Text>
                <Text style={[styles.volumeValue, { color: theme.colors.text }]}>
                  {data[data.length - 1].volumeLoad.toLocaleString()} {weightUnit}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Expand indicator */}
        <View style={styles.expandIndicator}>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={theme.colors.muted}
          />
        </View>
      </View>
    </Pressable>
  );
}

export const ExerciseCard = React.memo(ExerciseCardInner);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  nameCol: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  prBadge: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 1,
  },
  trendStat: {
    marginLeft: "auto",
    gap: 2,
  },
  expandedSection: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  volumeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  volumeLabel: {
    fontSize: 12,
  },
  volumeValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  expandIndicator: {
    alignItems: "center",
    marginTop: 6,
  },
});

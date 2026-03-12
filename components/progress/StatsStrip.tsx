import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius } from "../../lib/theme";

type StatItem = {
  icon: string;
  value: string | number;
  label: string;
  color?: string;
};

type Props = {
  stats: StatItem[];
};

function StatsStripInner({ stats }: Props) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.row}>
      {stats.map((stat, i) => (
        <View
          key={stat.label}
          style={[styles.pill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <Ionicons
            name={stat.icon as any}
            size={16}
            color={stat.color || theme.colors.primary}
          />
          <Text style={[styles.value, { color: theme.colors.text }]}>{stat.value}</Text>
          <Text style={[styles.label, { color: theme.colors.muted }]}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

export const StatsStrip = React.memo(StatsStripInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: spacing.md,
  },
  pill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
  },
  value: {
    fontSize: 17,
    fontWeight: "700",
  },
  label: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});

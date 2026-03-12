import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius } from "../../lib/theme";

type PRItem = {
  exercise: string;
  value: number;
  date: string;
};

type Props = {
  prs: PRItem[];
  weightUnit: string;
};

function PRHighlightsInner({ prs, weightUnit }: Props) {
  const { theme } = useAppTheme();
  if (prs.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.colors.muted }]}>RECENT PRs</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {prs.map((pr, i) => {
          const d = new Date(pr.date);
          const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return (
            <Animated.View
              key={`${pr.exercise}-${pr.date}`}
              entering={FadeInRight.delay(i * 60).duration(300)}
              style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: "#FFD70040" }]}
            >
              <Text style={styles.crown}>👑</Text>
              <Text style={[styles.exerciseName, { color: theme.colors.text }]} numberOfLines={1}>
                {pr.exercise}
              </Text>
              <Text style={[styles.prValue, { color: "#FFD700" }]}>
                {pr.value} {weightUnit}
              </Text>
              <Text style={[styles.date, { color: theme.colors.muted }]}>{dateStr}</Text>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const PRHighlights = React.memo(PRHighlightsInner);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },
  scroll: {
    gap: 10,
    paddingRight: 4,
  },
  card: {
    width: 120,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    gap: 3,
  },
  crown: {
    fontSize: 18,
    marginBottom: 2,
  },
  exerciseName: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  prValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  date: {
    fontSize: 10,
  },
});

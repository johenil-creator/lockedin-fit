import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { LockeMascot } from "../Locke/LockeMascot";
import type { LockeMascotMood } from "../Locke/LockeMascot";
import { spacing, radius } from "../../lib/theme";

type Props = {
  weekSessions: number;
  volumeChange: number;
  recentPRCount: number;
  streak: number;
};

function getCommentary(props: Props): { mood: LockeMascotMood; headline: string; subtext: string } {
  const { weekSessions, volumeChange, recentPRCount, streak } = props;

  if (recentPRCount >= 2) {
    return {
      mood: "celebrating",
      headline: "You're on fire!",
      subtext: `${recentPRCount} new PRs recently. The pack fears you.`,
    };
  }
  if (recentPRCount === 1) {
    return {
      mood: "proud",
      headline: "New PR unlocked",
      subtext: "Keep pushing — more records will fall.",
    };
  }
  if (streak >= 7) {
    return {
      mood: "savage",
      headline: `${streak}-day streak!`,
      subtext: "Relentless. The alpha mentality.",
    };
  }
  if (volumeChange > 10) {
    return {
      mood: "encouraging",
      headline: "Volume climbing",
      subtext: `Up ${volumeChange}% from last week. Strong trend.`,
    };
  }
  if (volumeChange < -15) {
    return {
      mood: "concerned",
      headline: "Volume dip detected",
      subtext: "Recovery week, or time to push harder?",
    };
  }
  if (weekSessions >= 4) {
    return {
      mood: "proud",
      headline: "Consistent work",
      subtext: `${weekSessions} sessions this week. That's discipline.`,
    };
  }
  if (weekSessions === 0) {
    return {
      mood: "encouraging",
      headline: "Ready when you are",
      subtext: "No sessions this week yet. Let's change that.",
    };
  }
  return {
    mood: "analytical",
    headline: "Building momentum",
    subtext: `${weekSessions} session${weekSessions !== 1 ? "s" : ""} this week. Keep stacking.`,
  };
}

function LockeCommentaryInner(props: Props) {
  const { theme } = useAppTheme();
  const { mood, headline, subtext } = getCommentary(props);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <LockeMascot size={64} mood={mood} />
      <View style={styles.textCol}>
        <Text style={[styles.headline, { color: theme.colors.text }]}>{headline}</Text>
        <Text style={[styles.subtext, { color: theme.colors.muted }]}>{subtext}</Text>
      </View>
    </View>
  );
}

export const LockeCommentary = React.memo(LockeCommentaryInner);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  textCol: {
    flex: 1,
  },
  headline: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 2,
  },
  subtext: {
    fontSize: 13,
    lineHeight: 18,
  },
});

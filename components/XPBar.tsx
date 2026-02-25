import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../contexts/ThemeContext";
import { radius } from "../lib/theme";
import type { RankLevel } from "../lib/types";

type Props = {
  totalXP:   number;
  progress:  number;     // 0–1 within current rank band
  toNext:    number;     // XP remaining to next rank
  nextRank:  RankLevel | null;
};

export function XPBar({ totalXP, progress, toNext, nextRank }: Props) {
  const { theme } = useAppTheme();
  const fillPct = Math.max(0, Math.min(progress, 1)) * 100;

  return (
    <View style={styles.container}>
      {/* Labels */}
      <View style={styles.labels}>
        <Text style={[styles.xpText, { color: theme.colors.muted }]}>
          {totalXP} XP
        </Text>
        {nextRank ? (
          <Text style={[styles.nextText, { color: theme.colors.muted }]}>
            {toNext} to {nextRank}
          </Text>
        ) : (
          <Text style={[styles.nextText, { color: theme.colors.primary }]}>
            APEX
          </Text>
        )}
      </View>

      {/* Track */}
      <View style={[styles.track, { backgroundColor: theme.colors.mutedBg }]}>
        <View
          style={[
            styles.fill,
            {
              width:           `${fillPct}%`,
              backgroundColor: theme.colors.primary,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 5 },
  labels: {
    flexDirection:  "row",
    justifyContent: "space-between",
  },
  xpText:   { fontSize: 11, fontWeight: "600" },
  nextText: { fontSize: 11, fontWeight: "600" },
  track: {
    height:       6,
    borderRadius: radius.full,
    overflow:     "hidden",
  },
  fill: {
    height:       "100%",
    borderRadius: radius.full,
    minWidth:     4,
  },
});

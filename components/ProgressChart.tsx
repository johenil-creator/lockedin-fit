import { View, Text, StyleSheet, type DimensionValue } from "react-native";
import { useAppTheme } from "../contexts/ThemeContext";
import type { ExerciseProgress } from "../lib/progress";

const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Format an ISO date string to "Apr 11" style. */
function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

type Props = {
  data: ExerciseProgress[];
  metric?: "maxWeight" | "totalReps";
  weightUnit?: string;
};

export function ProgressChart({ data, metric = "maxWeight", weightUnit = "kg" }: Props) {
  const { theme } = useAppTheme();
  if (!data.length) return null;

  const values = data.map((d) => d[metric]);
  const maxVal = Math.max(...values, 1);
  const unit = metric === "maxWeight" ? ` ${weightUnit}` : " reps";

  return (
    <View style={styles.container}>
      {data.map((point, i) => (
        <View key={point.sessionId} style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.muted }]} numberOfLines={1}>
            {formatShortDate(point.date)}
          </Text>
          <View style={[styles.barTrack, { backgroundColor: theme.colors.mutedBg }]}>
            <View
              style={[
                styles.bar,
                {
                  width: `${Math.max((values[i] / maxVal) * 100, 4)}%` as DimensionValue,
                  backgroundColor: theme.colors.accent,
                },
              ]}
            />
          </View>
          <Text style={[styles.value, { color: theme.colors.text }]}>
            {values[i]}{unit}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { width: 72, fontSize: 11 },
  barTrack: { flex: 1, height: 22, borderRadius: 8, overflow: "hidden" },
  bar: { height: "100%", borderRadius: 8 },
  value: { width: 52, fontSize: 12, fontWeight: "600", textAlign: "right" },
});

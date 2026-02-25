import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../contexts/ThemeContext";
import type { ExerciseProgress } from "../lib/progress";

type Props = {
  data: ExerciseProgress[];
  metric?: "maxWeight" | "totalReps";
};

export function ProgressChart({ data, metric = "maxWeight" }: Props) {
  const { theme } = useAppTheme();
  if (!data.length) return null;

  const values = data.map((d) => d[metric]);
  const maxVal = Math.max(...values, 1);
  const unit = metric === "maxWeight" ? " kg" : " reps";

  return (
    <View style={styles.container}>
      {data.map((point, i) => (
        <View key={point.sessionId} style={styles.row}>
          <Text style={[styles.label, { color: theme.colors.muted }]} numberOfLines={1}>
            {point.date}
          </Text>
          <View style={[styles.barTrack, { backgroundColor: theme.colors.mutedBg }]}>
            <View
              style={[
                styles.bar,
                {
                  width: `${Math.max((values[i] / maxVal) * 100, 4)}%` as any,
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
  barTrack: { flex: 1, height: 20, borderRadius: 4, overflow: "hidden" },
  bar: { height: "100%", borderRadius: 4 },
  value: { width: 52, fontSize: 12, fontWeight: "600", textAlign: "right" },
});

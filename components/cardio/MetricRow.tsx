import { View, Text, StyleSheet } from "react-native";

type Size = "hero" | "secondary" | "tertiary";

type Props = {
  label: string;
  value: string;
  color: string;
  size: Size;
};

const sizeMap: Record<Size, { fontSize: number; fontWeight: "600" | "500" }> = {
  hero:      { fontSize: 52, fontWeight: "600" },
  secondary: { fontSize: 32, fontWeight: "500" },
  tertiary:  { fontSize: 24, fontWeight: "500" },
};

export function MetricRow({ label, value, color, size }: Props) {
  const spec = sizeMap[size];
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text
        style={[
          styles.value,
          { color, fontSize: spec.fontSize, fontWeight: spec.fontWeight },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#98989D",
  },
  value: {
    fontVariant: ["tabular-nums"],
    letterSpacing: -1,
  },
});

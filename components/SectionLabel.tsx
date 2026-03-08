import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { useAppTheme } from "../contexts/ThemeContext";

type Props = {
  label: string;
  style?: ViewStyle;
};

export function SectionLabel({ label, style }: Props) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
      <Text style={[styles.label, { color: theme.colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
});

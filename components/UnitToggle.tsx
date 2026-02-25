import { View, Text, Pressable, StyleSheet, type ViewStyle } from "react-native";
import { useAppTheme } from "../contexts/ThemeContext";

type Props = {
  value: "kg" | "lbs";
  onChange: (unit: "kg" | "lbs") => void;
  style?: ViewStyle;
};

export function UnitToggle({ value, onChange, style }: Props) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.mutedBg }, style]}>
      {(["kg", "lbs"] as const).map((unit) => {
        const active = value === unit;
        return (
          <Pressable
            key={unit}
            style={[
              styles.pill,
              { backgroundColor: active ? theme.colors.primary : "transparent" },
            ]}
            onPress={() => onChange(unit)}
          >
            <Text
              style={[
                styles.label,
                { color: active ? theme.colors.primaryText : theme.colors.muted },
              ]}
            >
              {unit}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 3,
    alignSelf: "flex-start",
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
});

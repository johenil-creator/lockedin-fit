import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { useAppTheme } from "../contexts/ThemeContext";

type LogoProps = { style?: ViewStyle };

export default function Logo({ style }: LogoProps) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.accentBar, { backgroundColor: theme.colors.primary }]} />
      <Text style={[styles.locked, { color: theme.colors.text }]}>LOCKED</Text>
      <Text style={[styles.inText, { color: theme.colors.primary }]}>IN</Text>
      <Text style={[styles.fit, { color: theme.colors.text }]}> FIT</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  accentBar: {
    width: 4,
    height: 26,
    borderRadius: 2,
    marginRight: 8,
  },
  locked: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  inText: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  fit: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
});

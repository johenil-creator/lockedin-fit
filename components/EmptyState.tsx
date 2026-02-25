import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../contexts/ThemeContext";
import { spacing, typography } from "../lib/theme";

type Props = {
  icon: string;
  title: string;
  subtitle?: string;
  hint?: string;
};

export function EmptyState({ icon, title, subtitle, hint }: Props) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: theme.colors.muted }]}>{subtitle}</Text>}
      {hint && <Text style={[styles.hint, { color: theme.colors.muted }]}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 64,
    paddingHorizontal: spacing.lg,
  },
  icon: { fontSize: 48, marginBottom: spacing.md },
  title: { ...typography.heading, marginBottom: spacing.sm, textAlign: "center" },
  subtitle: { fontSize: 14, textAlign: "center", marginBottom: spacing.sm },
  hint: { fontSize: 12, textAlign: "center", lineHeight: 20 },
});

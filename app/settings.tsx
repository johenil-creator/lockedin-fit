import { View, Text, ScrollView, StyleSheet, Pressable, Switch } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../contexts/ThemeContext";
import { useProfileContext } from "../contexts/ProfileContext";
import { Card } from "../components/Card";
import { BackButton } from "../components/BackButton";
import { spacing, typography } from "../lib/theme";

const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 0.453592;

function convertValue(val: string | undefined, factor: number): string {
  if (!val) return "";
  const num = parseFloat(val);
  if (isNaN(num) || num === 0) return val;
  return String(Math.round(num * factor * 10) / 10);
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark, toggleTheme } = useAppTheme();
  const { profile, updateProfile } = useProfileContext();

  function handleUnitChange(newUnit: "kg" | "lbs") {
    if (newUnit === profile.weightUnit) return;
    const factor = newUnit === "lbs" ? KG_TO_LBS : LBS_TO_KG;

    const convertedWeight = convertValue(profile.weight, factor);
    const convertedManual: Record<string, string> = {};
    for (const key of ["deadlift", "squat", "ohp", "bench"] as const) {
      convertedManual[key] = convertValue(profile.manual1RM?.[key], factor);
    }
    const convertedEstimated: Record<string, string> = {};
    if (profile.estimated1RM) {
      for (const key of ["deadlift", "squat", "ohp", "bench"] as const) {
        convertedEstimated[key] = convertValue(profile.estimated1RM?.[key], factor);
      }
    }

    updateProfile({
      weightUnit: newUnit,
      weight: convertedWeight,
      manual1RM: convertedManual,
      ...(profile.estimated1RM ? { estimated1RM: convertedEstimated } : {}),
    });
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={[typography.title, { color: theme.colors.text }]}>Settings</Text>
      </View>

      {/* Appearance */}
      <Card>
        <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
          Appearance
        </Text>
        <View style={styles.row}>
          <Text style={[typography.body, { color: theme.colors.text }]}>Dark Mode</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#ffffff"
          />
        </View>
      </Card>

      {/* Preferences */}
      <Card>
        <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
          Preferences
        </Text>
        <View style={styles.row}>
          <Text style={[typography.body, { color: theme.colors.text }]}>Weight Unit</Text>
          <View style={[styles.segmentedControl, { backgroundColor: theme.colors.mutedBg }]}>
            {(["kg", "lbs"] as const).map((u) => {
              const active = profile.weightUnit === u;
              return (
                <Pressable
                  key={u}
                  style={[
                    styles.segment,
                    { backgroundColor: active ? theme.colors.primary : "transparent" },
                  ]}
                  onPress={() => handleUnitChange(u)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: active ? theme.colors.primaryText : theme.colors.muted },
                    ]}
                  >
                    {u.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { marginBottom: spacing.lg },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 3,
  },
  segment: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "700",
  },
});

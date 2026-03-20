import { useState, useEffect, useMemo } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BackButton } from "../components/BackButton";
import { useAppTheme } from "../contexts/ThemeContext";
import { useProfileContext } from "../contexts/ProfileContext";
import { useWorkouts } from "../hooks/useWorkouts";
import { sanitizeWeight } from "../lib/sanitizeWeight";
import { Button } from "../components/Button";
import { spacing, radius, typography } from "../lib/theme";

const BIG_4 = [
  { key: "deadlift" as const, label: "Deadlift" },
  { key: "squat" as const, label: "Squat" },
  { key: "ohp" as const, label: "Overhead Press" },
  { key: "bench" as const, label: "Bench Press" },
];

function calcEpley(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export default function LiftsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { profile, updateProfile } = useProfileContext();
  const { workouts } = useWorkouts();
  const [manualOverrides, setManualOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    setManualOverrides({
      deadlift: profile.manual1RM.deadlift ?? "",
      squat: profile.manual1RM.squat ?? "",
      ohp: profile.manual1RM.ohp ?? "",
      bench: profile.manual1RM.bench ?? "",
    });
  }, [profile.manual1RM]);

  const estimated1RMs = useMemo(() => {
    const results: Record<string, number> = {};
    for (const lift of BIG_4) {
      const manual = parseFloat(profile.manual1RM?.[lift.key] ?? "0") || 0;
      const tested = parseFloat(profile.estimated1RM?.[lift.key] ?? "0") || 0;
      let best = Math.max(manual, tested);

      for (const w of workouts) {
        for (const ex of w.exercises) {
          if (!ex.name.toLowerCase().includes(
            lift.key === "ohp" ? "overhead" : lift.key === "bench" ? "bench" : lift.key
          )) continue;
          for (const s of ex.sets) {
            if (!s.completed) continue;
            const wt = parseFloat(s.weight);
            const r = parseFloat(s.reps);
            if (isNaN(wt) || isNaN(r)) continue;
            const est = calcEpley(wt, r);
            if (est > best) best = est;
          }
        }
      }
      results[lift.key] = best;
    }
    return results;
  }, [workouts, profile.manual1RM, profile.estimated1RM]);

  function handleManualBlur(key: string) {
    updateProfile({
      manual1RM: { ...profile.manual1RM, [key]: manualOverrides[key] },
    });
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <BackButton />
        <Text style={[typography.title, { color: theme.colors.text, flex: 1, marginLeft: 8 }]}>
          Big 4 Lifts
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        {BIG_4.map((lift) => {
          const est = estimated1RMs[lift.key];
          return (
            <View key={lift.key} style={styles.liftRow}>
              <Text style={[typography.body, { color: theme.colors.text, fontWeight: "600", marginBottom: 4 }]}>
                {lift.label}
              </Text>
              <Text style={[typography.small, { color: theme.colors.accent, fontWeight: "500", marginBottom: 4 }]}>
                {est > 0
                  ? `Est. 1RM: ${Math.round(est)} ${profile.weightUnit}`
                  : "No data yet"}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.mutedBg, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={manualOverrides[lift.key] ?? ""}
                onChangeText={(val) =>
                  setManualOverrides((prev) => ({ ...prev, [lift.key]: sanitizeWeight(val) }))
                }
                onBlur={() => handleManualBlur(lift.key)}
                placeholder={`Manual override (${profile.weightUnit})`}
                placeholderTextColor={theme.colors.muted}
                keyboardType="decimal-pad"
                maxLength={6}
              />
            </View>
          );
        })}

        <Text style={[typography.caption, { color: theme.colors.muted, marginTop: spacing.sm, marginBottom: spacing.md }]}>
          Recalibrate your maxes to update training loads.
        </Text>
        <Button
          label="Retake 1RM Test"
          onPress={() => router.push("/orm-test?source=retake")}
          variant="secondary"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  liftRow: {
    marginBottom: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
});

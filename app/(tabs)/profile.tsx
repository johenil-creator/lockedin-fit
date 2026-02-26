import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useProfileContext } from "../../contexts/ProfileContext";
import { useWorkouts } from "../../hooks/useWorkouts";
import { useXP } from "../../hooks/useXP";
import { clearAllData } from "../../lib/storage";
import { spacing, radius, typography } from "../../lib/theme";
import { RankEvolutionPath } from "../../components/RankEvolutionPath";
import { Button } from "../../components/Button";

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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { profile, loading: profileLoading, updateProfile } = useProfileContext();
  const { workouts, loading: workoutsLoading } = useWorkouts();
  const { xp, rank, progress, toNext } = useXP();

  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [manualOverrides, setManualOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!profileLoading) {
      setName(profile.name);
      setWeight(profile.weight);
      setManualOverrides({
        deadlift: profile.manual1RM.deadlift ?? "",
        squat: profile.manual1RM.squat ?? "",
        ohp: profile.manual1RM.ohp ?? "",
        bench: profile.manual1RM.bench ?? "",
      });
    }
  }, [profileLoading, profile.manual1RM]);

  const estimated1RMs = useMemo(() => {
    const results: Record<string, number> = {};
    for (const lift of BIG_4) {
      // Start with the value from the ORM test (manual1RM or estimated1RM)
      const manual = parseFloat(profile.manual1RM?.[lift.key] ?? "0") || 0;
      const tested = parseFloat(profile.estimated1RM?.[lift.key] ?? "0") || 0;
      let best = Math.max(manual, tested);

      // Also check workout history — take the highest estimate
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

  function handleNameBlur() {
    updateProfile({ name });
  }

  function handleWeightBlur() {
    updateProfile({ weight });
  }

  function handleManualBlur(key: string) {
    updateProfile({
      manual1RM: { ...profile.manual1RM, [key]: manualOverrides[key] },
    });
  }

  function handleClearData() {
    Alert.alert(
      "Clear All Data",
      "This will delete all workouts, your plan, and reset the app.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: async () => {
            await clearAllData();
            setName("");
            setWeight("");
            setManualOverrides({ deadlift: "", squat: "", ohp: "", bench: "" });
            updateProfile({
              name: "",
              weight: "",
              weightUnit: "kg",
              manual1RM: {},
            });
          },
        },
      ]
    );
  }

  if (profileLoading || workoutsLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.profileHeader}>
        <Text style={[typography.title, { color: theme.colors.text }]}>
          Profile
        </Text>
        <Pressable onPress={() => router.push("/settings")} style={styles.gearBtn}>
          <Text style={{ fontSize: 22, color: theme.colors.muted }}>{"⚙"}</Text>
        </Pressable>
      </View>

      {/* Section 1: Profile Card */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
          Your Info
        </Text>

        <Text style={[typography.caption, { color: theme.colors.muted, marginBottom: 4 }]}>Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.mutedBg, color: theme.colors.text, borderColor: theme.colors.border }]}
          value={name}
          onChangeText={setName}
          onBlur={handleNameBlur}
          placeholder="Enter your name"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={[typography.caption, { color: theme.colors.muted, marginBottom: 4, marginTop: spacing.sm }]}>
          Body Weight
        </Text>
        <View style={styles.weightRow}>
          <TextInput
            style={[styles.input, styles.weightInput, { backgroundColor: theme.colors.mutedBg, color: theme.colors.text, borderColor: theme.colors.border }]}
            value={weight}
            onChangeText={setWeight}
            onBlur={handleWeightBlur}
            placeholder="0"
            placeholderTextColor={theme.colors.muted}
            keyboardType="numeric"
          />
          <View style={[styles.unitLabel, { backgroundColor: theme.colors.mutedBg }]}>
            <Text style={[typography.body, { color: theme.colors.muted, fontWeight: "600" }]}>
              {profile.weightUnit}
            </Text>
          </View>
        </View>
      </View>

      {/* Section 2: Evolution Path */}
      <RankEvolutionPath
        currentRank={rank}
        currentXP={xp.total}
        xpForNextRank={toNext}
        progress={progress}
      />

      {/* Section 3: 1RM Tracker */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
          Big 4 Lifts — Est. 1RM
        </Text>

        {BIG_4.map((lift) => {
          const est = estimated1RMs[lift.key];
          return (
            <View key={lift.key} style={styles.liftRow}>
              <Text style={[typography.body, { color: theme.colors.text, fontWeight: "600", marginBottom: 4 }]}>
                {lift.label}
              </Text>
              <Text style={[typography.small, { color: theme.colors.muted, marginBottom: 4 }]}>
                {est > 0
                  ? `Est. 1RM: ${Math.round(est)} ${profile.weightUnit}`
                  : "No data yet"}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.mutedBg, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={manualOverrides[lift.key] ?? ""}
                onChangeText={(val) =>
                  setManualOverrides((prev) => ({ ...prev, [lift.key]: val }))
                }
                onBlur={() => handleManualBlur(lift.key)}
                placeholder={`Manual override (${profile.weightUnit})`}
                placeholderTextColor={theme.colors.muted}
                keyboardType="numeric"
              />
            </View>
          );
        })}

        <Text style={[typography.caption, { color: theme.colors.muted, marginBottom: spacing.sm }]}>
          Recalibrate your maxes to update training loads.
        </Text>
        <Button
          label="Retake 1RM Test"
          onPress={() => router.push("/orm-test?source=retake")}
          variant="secondary"
        />
      </View>

      {/* Section 4: Danger Zone */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.danger, borderWidth: 1 }]}>
        <Text style={[typography.subheading, { color: theme.colors.danger, marginBottom: spacing.sm }]}>
          Danger Zone
        </Text>
        <Pressable
          style={[styles.dangerButton, { backgroundColor: theme.colors.danger }]}
          onPress={handleClearData}
        >
          <Text style={[typography.body, { color: theme.colors.dangerText, fontWeight: "600" }]}>
            Clear All Data
          </Text>
        </Pressable>
      </View>

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    marginBottom: spacing.sm + 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  weightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  weightInput: { flex: 1 },
  unitLabel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  liftRow: {
    marginBottom: spacing.md,
  },
  dangerButton: {
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  profileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  gearBtn: {
    padding: 8,
  },
});

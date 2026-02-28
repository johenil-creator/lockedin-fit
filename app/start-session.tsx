import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWorkouts } from "../hooks/useWorkouts";
import { Button } from "../components/Button";
import { useAppTheme } from "../contexts/ThemeContext";
import { makeId } from "../lib/helpers";

const QUICK_NAMES = ["Push Day", "Pull Day", "Leg Day", "Upper Body", "Lower Body", "Full Body"];

export default function StartSessionScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { addWorkout, getActiveSession } = useWorkouts();
  const [name, setName] = useState("");

  async function handleBegin(sessionName?: string) {
    const active = getActiveSession();
    if (active) {
      Alert.alert(
        "Active Session",
        "You already have an active session. Resume or end it first.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Resume Session", onPress: () => router.push(`/session/${active.id}`) },
        ]
      );
      return;
    }
    const finalName = (sessionName ?? name).trim() || "Quick Workout";
    const id = makeId();
    await addWorkout({
      id,
      name: finalName,
      date: new Date().toISOString(),
      exercises: [],
      isActive: true,
      startedAt: new Date().toISOString(),
    });
    router.replace(`/session/${id}`);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 16 }]}>
      {/* Back */}
      <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
        <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
      </Pressable>

      <Text style={[styles.title, { color: theme.colors.text }]}>Quick Workout</Text>
      <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
        Name it, or pick a template below
      </Text>

      {/* Name input */}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            color: theme.colors.text,
            borderColor: theme.colors.border,
          },
        ]}
        placeholder="e.g. Push Day, Leg Day..."
        placeholderTextColor={theme.colors.muted}
        value={name}
        onChangeText={setName}
        autoFocus
        returnKeyType="go"
        onSubmitEditing={() => handleBegin()}
      />

      {/* Quick name chips */}
      <View style={styles.chipsRow}>
        {QUICK_NAMES.map((n) => (
          <Pressable
            key={n}
            style={[styles.chip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => handleBegin(n)}
          >
            <Text style={[styles.chipText, { color: theme.colors.muted }]}>{n}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ height: 24 }} />
      <Button label="Begin Session" onPress={() => handleBegin()} />
      <View style={{ height: 12 }} />
      <Button label="Browse Plans" onPress={() => router.push("/catalog")} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    marginLeft: -8,
  },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  input: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, fontWeight: "500" },
});

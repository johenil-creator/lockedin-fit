import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useWorkouts } from "../hooks/useWorkouts";
import { Button } from "../components/Button";
import { useAppTheme } from "../contexts/ThemeContext";

function makeId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 6);
}

export default function StartSessionScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { addWorkout, getActiveSession } = useWorkouts();
  const [name, setName] = useState("");

  function handleBegin() {
    const active = getActiveSession();
    if (active) {
      Alert.alert(
        "Active Session",
        "You already have an active session. Resume or end it first.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Resume Session",
            onPress: () => router.push(`/session/${active.id}`),
          },
        ]
      );
      return;
    }
    const id = makeId();
    addWorkout({
      id,
      name: name.trim() || "Untitled Session",
      date: new Date().toISOString(),
      exercises: [],
      isActive: true,
      startedAt: new Date().toISOString(),
    });
    router.replace(`/session/${id}`);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: theme.colors.primary }]}>←</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.text }]}>New Session</Text>
      </View>

      <View style={styles.body}>
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
        />

        <Button label="Begin Session" onPress={handleBegin} />
        <View style={{ height: 12 }} />
        <Button label="Browse Plans" onPress={() => router.push("/catalog")} variant="secondary" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 8,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 24 },
  title: { fontSize: 24, fontWeight: "700" },
  body: { paddingHorizontal: 24, paddingTop: 24 },
  input: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
});

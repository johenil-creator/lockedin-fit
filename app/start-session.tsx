import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { BackButton } from "../components/BackButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWorkouts } from "../hooks/useWorkouts";
import { Button } from "../components/Button";
import { useAppTheme } from "../contexts/ThemeContext";
import { spacing, radius, typography } from "../lib/theme";
import { impact, ImpactStyle } from "../lib/haptics";
import { makeId } from "../lib/helpers";
import { Ionicons } from "@expo/vector-icons";

const QUICK_NAMES: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "Push Day", icon: "arrow-up-circle-outline" },
  { label: "Pull Day", icon: "arrow-down-circle-outline" },
  { label: "Leg Day", icon: "footsteps-outline" },
  { label: "Upper Body", icon: "body-outline" },
  { label: "Lower Body", icon: "fitness-outline" },
  { label: "Full Body", icon: "barbell-outline" },
];

export default function StartSessionScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { addWorkout, getActiveSession } = useWorkouts();
  const [name, setName] = useState("");
  const [selectedChip, setSelectedChip] = useState<string | null>(null);

  async function handleBegin(sessionName?: string) {
    const active = getActiveSession();
    if (active) {
      Alert.alert(
        "Active Hunt",
        "You already have an active session. Resume or end it first.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Resume Hunt", onPress: () => router.push(`/session/${active.id}`) },
        ]
      );
      return;
    }
    const finalName = (sessionName ?? name).trim() || "Quick Hunt";
    const id = makeId();
    await addWorkout({
      id,
      name: finalName,
      date: new Date().toISOString(),
      exercises: [],
      isActive: true,
      startedAt: new Date().toISOString(),
    });
    impact(ImpactStyle.Medium);
    router.replace(`/session/${id}`);
  }

  function handleChipPress(label: string) {
    impact(ImpactStyle.Light);
    if (selectedChip === label) {
      setSelectedChip(null);
      setName("");
    } else {
      setSelectedChip(label);
      setName(label);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top + spacing.md }]}>
      {/* Back */}
      <View style={styles.backBtn}>
        <BackButton />
      </View>

      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.titleRow}>
          <Ionicons name="paw" size={28} color={theme.colors.primary} style={{ marginRight: spacing.sm }} />
          <Text style={[styles.title, { color: theme.colors.text }]}>Quick Hunt</Text>
        </View>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          No plan? No problem. Track as you go.
        </Text>
      </View>

      {/* Name input card */}
      <View style={[styles.inputCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.inputLabel, { color: theme.colors.muted }]}>Name Your Hunt</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.mutedBg,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          placeholder="e.g. Chest & Triceps, Back Attack..."
          placeholderTextColor={theme.colors.muted}
          value={name}
          onChangeText={(text) => {
            setName(text);
            setSelectedChip(null);
          }}
          returnKeyType="go"
          onSubmitEditing={() => handleBegin()}
        />
      </View>

      {/* Quick name chips */}
      <View style={styles.chipsSection}>
        <Text style={[styles.chipsLabel, { color: theme.colors.muted }]}>Quick Pick</Text>
        <View style={styles.chipsRow}>
          {QUICK_NAMES.map(({ label, icon }) => {
            const isSelected = selectedChip === label;
            return (
              <Pressable
                key={label}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => handleChipPress(label)}
              >
                <Ionicons
                  name={icon}
                  size={16}
                  color={isSelected ? theme.colors.primaryText : theme.colors.muted}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? theme.colors.primaryText : theme.colors.text },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Start Hunt button */}
      <View style={styles.startBtnContainer}>
        <Button label="Start Hunt" onPress={() => handleBegin()} />
        <Pressable
          style={styles.templateLink}
          onPress={() => {
            impact(ImpactStyle.Light);
            router.push("/quick-workout");
          }}
        >
          <Ionicons name="list-outline" size={16} color={theme.colors.primary} />
          <Text style={[styles.templateLinkText, { color: theme.colors.primary }]}>
            Or use a template
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    marginLeft: -spacing.sm,
  },
  headerSection: {
    marginBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.title,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    ...typography.body,
    marginLeft: 36, // align with title text (after icon)
  },
  inputCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.small,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  chipsSection: {
    marginBottom: spacing.lg,
  },
  chipsLabel: {
    ...typography.small,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: {
    ...typography.small,
    fontWeight: "600",
  },
  startBtnContainer: {
    marginTop: spacing.sm,
  },
  templateLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    gap: 6,
  },
  templateLinkText: {
    ...typography.body,
    fontWeight: "600",
  },
});

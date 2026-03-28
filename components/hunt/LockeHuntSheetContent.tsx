import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSmartHunt } from "../../hooks/useSmartHunt";
import { useWorkouts } from "../../hooks/useWorkouts";
import { useProfileContext } from "../../contexts/ProfileContext";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import { impact, ImpactStyle } from "../../lib/haptics";

type Props = {
  onClose: () => void;
};

export function LockeHuntSheetContent({ onClose }: Props) {
  const { hunt, loading } = useSmartHunt();
  const { startSessionFromExercises, getActiveSession } = useWorkouts();
  const { profileRef } = useProfileContext();
  const { theme } = useAppTheme();
  const router = useRouter();
  const [starting, setStarting] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const handleStart = useCallback(async () => {
    if (starting || !hunt) return;

    const active = getActiveSession();
    if (active) {
      Alert.alert(
        "Active Hunt",
        "You already have an active session. Resume or end it first.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Resume Hunt", onPress: () => { onClose(); router.push(`/session/${active.id}`); } },
        ]
      );
      return;
    }

    impact(ImpactStyle.Medium);
    setStarting(hunt.name);
    const id = await startSessionFromExercises(hunt.name, hunt.exercises, profileRef.current);
    if (!mountedRef.current) return;
    onClose();
    router.replace(`/session/${id}`);
  }, [starting, hunt, startSessionFromExercises, getActiveSession, profileRef, router, onClose]);

  if (loading || !hunt) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>
          Locke's Pick
        </Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[typography.caption, { color: theme.colors.muted, marginLeft: 8 }]}>
            Analyzing your recovery...
          </Text>
        </View>
      </View>
    );
  }

  const isStarting = starting === hunt.name;

  return (
    <View style={styles.container}>
      <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>
        Locke's Pick
      </Text>
      <Text style={[styles.reasoningText, { color: theme.colors.muted }]}>
        {hunt.reasoning}
      </Text>
      <Text style={[typography.caption, { color: theme.colors.primary, marginBottom: spacing.md, textAlign: "center" }]}>
        {hunt.focusLabel} · {hunt.exerciseCount} exercises · ~{hunt.estimatedMinutes} min
      </Text>

      {/* Exercise list — always visible */}
      <View style={[styles.exerciseList, { borderColor: theme.colors.border }]}>
        {hunt.exercises.map((e, i) => (
          <View key={i} style={styles.exerciseRow}>
            <Text
              style={[typography.small, { color: theme.colors.text, flex: 1 }]}
              numberOfLines={1}
            >
              {e.exercise}
            </Text>
            <Text style={[typography.caption, { color: theme.colors.muted, marginLeft: spacing.sm }]}>
              {e.sets} × {e.reps}
            </Text>
          </View>
        ))}
      </View>

      {/* Start button */}
      <Pressable
        onPress={handleStart}
        disabled={isStarting}
        style={({ pressed }) => [
          styles.startButton,
          {
            backgroundColor: isStarting
              ? theme.colors.mutedBg
              : pressed
                ? theme.colors.accent
                : theme.colors.primary,
          },
        ]}
      >
        <Ionicons
          name="paw"
          size={18}
          color={isStarting ? theme.colors.muted : theme.colors.primaryText}
          style={{ marginRight: 8 }}
        />
        <Text
          style={[
            styles.startButtonText,
            { color: isStarting ? theme.colors.muted : theme.colors.primaryText },
          ]}
        >
          {isStarting ? "Starting..." : "Start This Hunt"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
  },
  reasoningText: {
    fontSize: 12,
    lineHeight: 17,
  },
  exerciseList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    gap: 8,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: radius.sm,
    marginTop: spacing.lg,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});

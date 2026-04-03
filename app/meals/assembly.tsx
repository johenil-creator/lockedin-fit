/**
 * Assembly Guide — app/meals/assembly.tsx
 *
 * Shows how to quickly assemble a meal from prepped components.
 * Accessed from the daily meal view when prep is active.
 */
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import { generateAssembly } from "../../lib/prepAnalysisEngine";
import { usePrepDay } from "../../hooks/usePrepDay";

export default function AssemblyScreen() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const { progress } = usePrepDay();

  const assembly = useMemo(() => {
    if (!recipeId) return null;
    return generateAssembly(recipeId, progress.completedTaskIds);
  }, [recipeId, progress.completedTaskIds]);

  if (!assembly) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg }]}>
        <Text style={[typography.body, { color: theme.colors.muted }]}>Recipe not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={[typography.screenTitle, { color: theme.colors.text }]} numberOfLines={1}>
              Quick Assembly
            </Text>
            <Text style={[typography.small, { color: theme.colors.muted }]}>
              {assembly.flag} {assembly.recipeName}
            </Text>
          </View>
        </Animated.View>

        {/* Time comparison */}
        <Animated.View entering={FadeInDown.delay(80).duration(350)}>
          <View style={[styles.timeCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.timeCol}>
              <Text style={[styles.timeValue, { color: theme.colors.muted, textDecorationLine: "line-through" }]}>
                {assembly.fullCookTimeMin} min
              </Text>
              <Text style={[typography.caption, { color: theme.colors.muted }]}>full cook</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.muted} />
            <View style={styles.timeCol}>
              <Text style={[styles.timeValue, { color: theme.colors.success }]}>
                {assembly.assemblyTimeMin} min
              </Text>
              <Text style={[typography.caption, { color: theme.colors.muted }]}>assembly</Text>
            </View>
          </View>
        </Animated.View>

        {/* Prep status badge */}
        <Animated.View entering={FadeInDown.delay(140).duration(350)}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: assembly.isFullyPrepped
                  ? theme.colors.success + "15"
                  : theme.colors.primary + "15",
                borderColor: assembly.isFullyPrepped
                  ? theme.colors.success + "40"
                  : theme.colors.primary + "40",
              },
            ]}
          >
            <Ionicons
              name={assembly.isFullyPrepped ? "checkmark-circle" : "time-outline"}
              size={16}
              color={assembly.isFullyPrepped ? theme.colors.success : theme.colors.primary}
            />
            <Text
              style={[
                typography.small,
                {
                  color: assembly.isFullyPrepped ? theme.colors.success : theme.colors.primary,
                  marginLeft: spacing.xs,
                  fontWeight: "600",
                },
              ]}
            >
              {assembly.isFullyPrepped ? "Fully prepped — just assemble!" : "Partially prepped"}
            </Text>
          </View>
        </Animated.View>

        {/* Assembly Steps */}
        <Text style={[typography.subheading, { color: theme.colors.text, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
          Steps
        </Text>

        {assembly.steps.map((step, idx) => (
          <Animated.View
            key={idx}
            entering={FadeInDown.delay(200 + idx * 60).duration(350)}
          >
            <View
              style={[
                styles.stepCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary + "20" }]}>
                <Text style={[typography.body, { color: theme.colors.primary, fontWeight: "700" }]}>
                  {idx + 1}
                </Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[typography.body, { color: theme.colors.text, fontWeight: "600" }]}>
                  {step.action}
                </Text>
                <Text style={[typography.small, { color: theme.colors.muted, marginTop: 2 }]}>
                  {step.instruction}
                </Text>
              </View>
              <Text style={[typography.caption, { color: theme.colors.muted }]}>
                {step.timeMin}m
              </Text>
            </View>
          </Animated.View>
        ))}

        {/* Fresh items note */}
        {assembly.freshItems.length > 0 && (
          <Animated.View entering={FadeInDown.delay(400).duration(350)}>
            <View style={[styles.freshNote, { backgroundColor: theme.colors.mutedBg, borderColor: theme.colors.border }]}>
              <Ionicons name="leaf-outline" size={16} color={theme.colors.success} />
              <Text style={[typography.small, { color: theme.colors.muted, flex: 1, marginLeft: spacing.sm }]}>
                Fresh items to add at serving: {assembly.freshItems.join(", ")}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Macros */}
        <Animated.View entering={FadeInDown.delay(460).duration(350)}>
          <View style={styles.macroRow}>
            {[
              { label: "Cal", value: assembly.macros.calories },
              { label: "Protein", value: `${assembly.macros.protein}g` },
              { label: "Carbs", value: `${assembly.macros.carbs}g` },
              { label: "Fat", value: `${assembly.macros.fat}g` },
            ].map((m) => (
              <View key={m.label} style={styles.macroCol}>
                <Text style={[styles.macroValue, { color: theme.colors.text }]}>{m.value}</Text>
                <Text style={[typography.caption, { color: theme.colors.muted }]}>{m.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { paddingHorizontal: spacing.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  timeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  timeCol: { alignItems: "center" },
  timeValue: { fontSize: 22, fontWeight: "700" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  stepContent: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  freshNote: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  macroCol: { alignItems: "center" },
  macroValue: { fontSize: 18, fontWeight: "700" },
});

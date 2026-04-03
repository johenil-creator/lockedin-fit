import React, { useCallback } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../../lib/theme";
import type { DietaryFilter } from "../../../src/data/mealTypes";

// ── Types ────────────────────────────────────────────────────────────────────

type Props = {
  draft: { restrictions: DietaryFilter[] };
  onUpdate: (patch: { restrictions: DietaryFilter[] }) => void;
  onContinue: () => void;
  onBack: () => void;
};

// ── Config ───────────────────────────────────────────────────────────────────

type FilterItem = { label: string; value: DietaryFilter };
type Section = { label: string; items: FilterItem[] };

const SECTIONS: Section[] = [
  {
    label: "Allergens",
    items: [
      { label: "Dairy-Free", value: "dairy" },
      { label: "Gluten-Free", value: "gluten" },
      { label: "Nut-Free", value: "nuts" },
      { label: "Egg-Free", value: "eggs" },
      { label: "Shellfish-Free", value: "shellfish" },
      { label: "Soy-Free", value: "soy" },
    ],
  },
  {
    label: "Lifestyle",
    items: [
      { label: "Vegetarian", value: "vegetarian" },
      { label: "Pescatarian", value: "pescatarian" },
      { label: "No Pork", value: "pork" },
      { label: "No Red Meat", value: "red-meat" },
    ],
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export function RestrictionsStep({
  draft,
  onUpdate,
  onContinue,
  onBack,
}: Props) {
  const { theme } = useAppTheme();
  const selected = draft.restrictions;

  const toggle = useCallback(
    (value: DietaryFilter) => {
      const next = selected.includes(value)
        ? selected.filter((r) => r !== value)
        : [...selected, value];
      onUpdate({ restrictions: next });
    },
    [selected, onUpdate],
  );

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>
          DIETARY
        </Text>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Any restrictions?
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          We'll filter recipes to match. Skip if none apply.
        </Text>

        {/* Sections + chips */}
        {SECTIONS.map((section) => (
          <View key={section.label} style={styles.sectionWrap}>
            <Text
              style={[styles.sectionLabel, { color: theme.colors.muted }]}
            >
              {section.label}
            </Text>
            <View style={styles.chipGrid}>
              {section.items.map((item) => {
                const isOn = selected.includes(item.value);
                return (
                  <Pressable
                    key={item.value}
                    accessibilityRole="button"
                    accessibilityLabel={`Toggle ${item.label}`}
                    onPress={() => toggle(item.value)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isOn
                          ? theme.colors.primary + "26"
                          : theme.colors.surface,
                        borderColor: isOn
                          ? theme.colors.primary
                          : theme.colors.border,
                      },
                    ]}
                  >
                    {isOn && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={theme.colors.primary}
                        style={styles.chipCheck}
                      />
                    )}
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: isOn
                            ? theme.colors.primary
                            : theme.colors.text,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Continue */}
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue"
          onPress={onContinue}
          style={[styles.continueBtn, { backgroundColor: theme.colors.primary }]}
        >
          <Text
            style={[styles.continueTxt, { color: theme.colors.primaryText }]}
          >
            Continue
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: 120,
    paddingBottom: spacing.xl + 80,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.heading,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  sectionWrap: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipCheck: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  continueBtn: {
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  continueTxt: {
    ...typography.subheading,
  },
});

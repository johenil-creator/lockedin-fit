import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../contexts/ThemeContext";
import { useProfileContext } from "../../../contexts/ProfileContext";
import { spacing, radius, typography } from "../../../lib/theme";
import { LockeMascot } from "../../Locke/LockeMascot";
import type { LockeMascotMood } from "../../Locke/LockeMascot";

// ── Types ────────────────────────────────────────────────────────────────────

type NutritionGoal = "aggressive_cut" | "cut" | "maintain" | "bulk";

type Props = {
  draft: { nutritionGoal: NutritionGoal; goalWeightKg?: number };
  onUpdate: (patch: { nutritionGoal?: NutritionGoal; goalWeightKg?: number }) => void;
  onContinue: () => void;
  onBack: () => void;
};

// ── Config ───────────────────────────────────────────────────────────────────

const GOAL_OPTIONS: {
  key: NutritionGoal;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  subtitle: string;
}[] = [
  {
    key: "aggressive_cut",
    label: "Shred Season",
    icon: "flash-outline",
    accent: "#D32F2F",
    subtitle: "~750 cal deficit — rapid fat loss, not for beginners",
  },
  {
    key: "cut",
    label: "Lean Hunt",
    icon: "flame-outline",
    accent: "#B07615",
    subtitle: "~500 cal deficit to lose fat, keep muscle",
  },
  {
    key: "maintain",
    label: "Hold Territory",
    icon: "shield-outline",
    accent: "#00875A",
    subtitle: "Eat at maintenance for performance",
  },
  {
    key: "bulk",
    label: "Pack On Mass",
    icon: "trending-up-outline",
    accent: "#378ADD",
    subtitle: "~300 cal surplus to build muscle",
  },
];

const MOOD_MAP: Record<NutritionGoal, LockeMascotMood> = {
  aggressive_cut: "focused",
  cut: "savage",
  maintain: "neutral",
  bulk: "intense",
};

const QUOTE_MAP: Record<NutritionGoal, string> = {
  aggressive_cut: "No mercy. Maximum discipline.",
  cut: "Precision mode. Every calorie counts.",
  maintain: "Hold the line. Fuel what you\u2019ve built.",
  bulk: "More fuel. More growth. Controlled aggression.",
};

// ── Component ────────────────────────────────────────────────────────────────

export function GoalStep({ draft, onUpdate, onContinue, onBack }: Props) {
  const { theme } = useAppTheme();
  const { profile } = useProfileContext();
  const selected = draft.nutritionGoal;
  const c = theme.colors;

  // Current weight from profile (convert lbs→kg for display if needed)
  const currentWeightRaw = parseFloat(profile.weight) || 0;
  const isLbs = profile.weightUnit === "lbs";
  const currentWeightKg = isLbs ? currentWeightRaw * 0.453592 : currentWeightRaw;
  const unit = profile.weightUnit ?? "kg";

  // Goal weight local state — show in user's preferred unit
  const initialGoalDisplay = draft.goalWeightKg
    ? String(Math.round(isLbs ? draft.goalWeightKg * 2.20462 : draft.goalWeightKg))
    : "";
  const [goalText, setGoalText] = useState(initialGoalDisplay);

  function handleGoalBlur() {
    const val = parseFloat(goalText);
    if (!val || val <= 0) {
      onUpdate({ goalWeightKg: undefined });
      return;
    }
    const kg = isLbs ? val * 0.453592 : val;
    onUpdate({ goalWeightKg: Math.round(kg * 10) / 10 });
  }

  // Auto-suggest goal based on goal weight vs current weight
  function handleGoalWeightEnd() {
    handleGoalBlur();
    const val = parseFloat(goalText);
    if (!val || val <= 0 || !currentWeightRaw) return;
    const diff = val - currentWeightRaw; // in user's unit
    const pct = (diff / currentWeightRaw) * 100;
    if (pct < -10) onUpdate({ nutritionGoal: "aggressive_cut" });
    else if (pct < -2) onUpdate({ nutritionGoal: "cut" });
    else if (pct > 5) onUpdate({ nutritionGoal: "bulk" });
    else onUpdate({ nutritionGoal: "maintain" });
  }

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Mascot */}
        <View style={styles.mascotWrap}>
          <LockeMascot size={160} mood={MOOD_MAP[selected]} />
        </View>

        {/* Quote */}
        <Text style={[styles.quote, { color: c.muted }]}>
          {QUOTE_MAP[selected]}
        </Text>

        {/* Goal weight input */}
        <View style={styles.goalWeightSection}>
          {currentWeightRaw > 0 && (
            <Text style={[styles.currentWeightText, { color: c.muted }]}>
              Current weight: {Math.round(currentWeightRaw)} {unit}
            </Text>
          )}
          <Text style={[styles.fieldLabel, { color: c.text }]}>
            Goal Weight ({unit})
          </Text>
          <TextInput
            style={[
              styles.goalInput,
              {
                backgroundColor: c.surface,
                borderColor: c.border,
                color: c.text,
              },
            ]}
            value={goalText}
            onChangeText={setGoalText}
            onBlur={handleGoalBlur}
            onEndEditing={handleGoalWeightEnd}
            placeholder={`e.g. ${currentWeightRaw > 0 ? Math.round(currentWeightRaw - 5) : "75"}`}
            placeholderTextColor={c.muted}
            keyboardType="decimal-pad"
            maxLength={5}
            returnKeyType="done"
          />
          <Text style={[styles.goalHint, { color: c.muted }]}>
            We'll auto-suggest a goal below based on this
          </Text>
        </View>

        {/* Goal cards */}
        <View style={[styles.cardsWrap, !draft.goalWeightKg && { opacity: 0.4 }]}>
          {GOAL_OPTIONS.map((opt) => {
            const isSelected = !!draft.goalWeightKg && selected === opt.key;
            return (
              <Pressable
                key={opt.key}
                accessibilityRole="button"
                accessibilityLabel={`Select ${opt.label} goal`}
                onPress={draft.goalWeightKg ? () => onUpdate({ nutritionGoal: opt.key }) : undefined}
                style={[
                  styles.card,
                  {
                    backgroundColor: isSelected
                      ? opt.accent + "18"
                      : c.surface,
                    borderColor: isSelected ? opt.accent : c.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: opt.accent + "20" },
                  ]}
                >
                  <Ionicons name={opt.icon} size={22} color={opt.accent} />
                </View>
                <View style={styles.cardText}>
                  <Text style={[styles.cardLabel, { color: c.text }]}>
                    {opt.label}
                  </Text>
                  <Text
                    style={[styles.cardSub, { color: c.muted }]}
                    numberOfLines={2}
                  >
                    {opt.subtitle}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={opt.accent}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Continue */}
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue"
          onPress={draft.goalWeightKg ? onContinue : undefined}
          style={[
            styles.continueBtn,
            {
              backgroundColor: draft.goalWeightKg ? c.primary : c.border,
            },
          ]}
        >
          <Text
            style={[
              styles.continueTxt,
              { color: draft.goalWeightKg ? c.primaryText : c.muted },
            ]}
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
  mascotWrap: {
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  quote: {
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: spacing.md,
  },
  goalWeightSection: {
    marginBottom: spacing.lg,
  },
  currentWeightText: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    ...typography.subheading,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  goalInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  goalHint: {
    fontSize: 11,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  cardsWrap: {
    gap: spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: {
    flex: 1,
  },
  cardLabel: {
    ...typography.subheading,
  },
  cardSub: {
    fontSize: 13,
    marginTop: 2,
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

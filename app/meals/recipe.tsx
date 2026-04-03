import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, radius, typography } from "../../lib/theme";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useFoodLog } from "../../hooks/useFoodLog";
import { useMealPlan } from "../../hooks/useMealPlan";
import { MacroRings } from "../../components/meals";
import { recipeMap } from "../../src/data/recipeCatalog";
import type { Recipe, MealSlot } from "../../src/data/mealTypes";

// ---------------------------------------------------------------------------
// Slot display labels
// ---------------------------------------------------------------------------

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack1: "Snack 1",
  snack2: "Snack 2",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RecipeDetailScreen() {
  const router = useRouter();
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const { logRecipe } = useFoodLog();
  const { macroTargets } = useMealPlan();

  const [logged, setLogged] = useState(false);

  const recipe: Recipe | undefined = useMemo(
    () => (recipeId ? recipeMap.get(recipeId) : undefined),
    [recipeId]
  );

  const handleLog = useCallback(async () => {
    if (!recipe || logged) return;
    try {
      const today = new Date();
      const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      await logRecipe(recipe, dateKey, recipe.slot);
      setLogged(true);
      // Brief feedback then navigate back
      setTimeout(() => router.back(), 600);
    } catch {
      Alert.alert("Error", "Failed to log this meal. Please try again.");
    }
  }, [recipe, logged, logRecipe, router]);

  if (!recipe) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Recipe</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.muted }]}>Recipe not found.</Text>
        </View>
      </View>
    );
  }

  const { macros } = recipe;
  const metaParts = [
    `${macros.calories} cal`,
    `${macros.protein}g protein`,
    `${macros.carbs}g carbs`,
    `${macros.fat}g fat`,
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      {/* ── Header ─────────────────────────────────── */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {recipe.name}
        </Text>
        <View style={{ width: 26 }} />
      </Animated.View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl + 72 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(50).duration(350)} style={styles.hero}>
          <Text style={styles.heroEmoji}>{recipe.flag}</Text>
          <Text style={[styles.heroName, { color: theme.colors.text }]}>{recipe.name}</Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.muted }]}>{recipe.subtitle}</Text>
        </Animated.View>

        {/* ── Meta Row ─────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100).duration(350)} style={styles.metaRow}>
          <Text style={[styles.metaText, { color: theme.colors.muted }]}>{metaParts.join("  ·  ")}</Text>
          <View style={styles.metaBadges}>
            <View style={[styles.slotBadge, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.badgeText, { color: theme.colors.text }]}>{SLOT_LABELS[recipe.slot]}</Text>
            </View>
            <View style={[styles.cuisineBadge, { backgroundColor: theme.colors.primary + "18", borderColor: theme.colors.primary + "40" }]}>
              <Text style={[styles.badgeText, { color: theme.colors.primary }]}>{recipe.cuisineBadge}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Macro Rings ──────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(150).duration(350)} style={[styles.ringsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <MacroRings current={recipe.macros} target={macroTargets} />
        </Animated.View>

        {/* ── Ingredients ──────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(200).duration(350)} style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Ingredients</Text>
          {recipe.ingredients.map((ing, i) => (
            <View key={i} style={styles.ingredientRow}>
              <Text style={[styles.bullet, { color: theme.colors.primary }]}>{"\u2022"}</Text>
              <Text style={[styles.ingredientText, { color: theme.colors.text }]}>{ing}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ── Method ───────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(250).duration(350)} style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Method</Text>
          {recipe.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepBadge, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.stepBadgeText}>{i + 1}</Text>
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepTitleRow}>
                  <Text style={[styles.stepTitle, { color: theme.colors.text }]}>{step.title}</Text>
                  {step.time && (
                    <View style={[styles.timeBadge, { backgroundColor: theme.colors.border }]}>
                      <Ionicons name="time-outline" size={12} color={theme.colors.muted} />
                      <Text style={[styles.timeText, { color: theme.colors.muted }]}>{step.time}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.stepDetail, { color: theme.colors.text }]}>{step.detail}</Text>
                {step.look && (
                  <Text style={[styles.stepLook, { color: theme.colors.muted }]}>Look for: {step.look}</Text>
                )}
              </View>
            </View>
          ))}
        </Animated.View>

        {/* ── Tip Box ──────────────────────────────── */}
        {recipe.tip ? (
          <Animated.View
            entering={FadeInDown.delay(300).duration(350)}
            style={[styles.tipBox, { borderColor: theme.colors.primary }]}
          >
            <Ionicons name="bulb-outline" size={18} color={theme.colors.primary} style={{ marginRight: spacing.sm }} />
            <Text style={[styles.tipText, { color: theme.colors.text }]}>{recipe.tip}</Text>
          </Animated.View>
        ) : null}
      </ScrollView>

      {/* ── Log Button ─────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.delay(350).duration(350)}
        style={[styles.logBtnWrap, { paddingBottom: insets.bottom + spacing.md }]}
      >
        <Pressable
          onPress={handleLog}
          disabled={logged}
          style={({ pressed }) => [
            styles.logBtn,
            {
              backgroundColor: logged ? theme.colors.primary + "80" : theme.colors.primary,
              opacity: pressed && !logged ? 0.85 : 1,
            },
          ]}
        >
          {logged ? (
            <View style={styles.logBtnInner}>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.logBtnText}>Logged!</Text>
            </View>
          ) : (
            <View style={styles.logBtnInner}>
              <Ionicons name="add-circle-outline" size={22} color="#fff" />
              <Text style={styles.logBtnText}>Log this meal</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    ...typography.heading,
    flex: 1,
    textAlign: "center",
    marginHorizontal: spacing.sm,
  },
  scroll: {
    paddingHorizontal: spacing.md,
  },

  // ── Empty state ──
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    ...typography.body,
    fontStyle: "italic",
  },

  // ── Hero ──
  hero: {
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  heroEmoji: {
    fontSize: 64,
    marginBottom: spacing.sm,
  },
  heroName: {
    ...typography.title,
    textAlign: "center",
  },
  heroSubtitle: {
    ...typography.body,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: spacing.xs,
  },

  // ── Meta row ──
  metaRow: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  metaText: {
    ...typography.small,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  metaBadges: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  slotBadge: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cuisineBadge: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: "600",
  },

  // ── Macro rings card ──
  ringsCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: "center",
  },

  // ── Section card ──
  sectionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    ...typography.subheading,
    marginBottom: spacing.md,
  },

  // ── Ingredients ──
  ingredientRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
    paddingLeft: spacing.xs,
  },
  bullet: {
    fontSize: 16,
    lineHeight: 22,
    marginRight: spacing.sm,
  },
  ingredientText: {
    ...typography.body,
    flex: 1,
    lineHeight: 22,
  },

  // ── Method steps ──
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
    marginTop: 2,
  },
  stepBadgeText: {
    color: "#FFFFFF",
    ...typography.small,
    fontWeight: "700",
  },
  stepContent: {
    flex: 1,
  },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  stepTitle: {
    ...typography.body,
    fontWeight: "700",
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  timeText: {
    ...typography.caption,
  },
  stepDetail: {
    ...typography.body,
    lineHeight: 22,
  },
  stepLook: {
    ...typography.small,
    fontStyle: "italic",
    marginTop: spacing.xs,
  },

  // ── Tip box ──
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  tipText: {
    ...typography.body,
    flex: 1,
    lineHeight: 22,
  },

  // ── Log button ──
  logBtnWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: "#0D1117F0",
  },
  logBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  logBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logBtnText: {
    color: "#FFFFFF",
    ...typography.subheading,
  },
});

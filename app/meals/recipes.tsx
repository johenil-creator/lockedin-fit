import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, radius, typography } from "../../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import type { CuisineTier, MealSlot, Recipe } from "../../src/data/mealTypes";
import { getRecipesBySlot } from "../../src/data/recipeCatalog";
import { RecipeCard } from "../../components/meals";

const TIERS: { key: CuisineTier; label: string }[] = [
  { key: "scavenge", label: "Scavenge" },
  { key: "hunt", label: "Hunt" },
  { key: "apex_feast", label: "Apex Feast" },
];

const SLOTS: { key: MealSlot; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack1", label: "Snack 1" },
  { key: "snack2", label: "Snack 2" },
];

export default function RecipesScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [selectedTier, setSelectedTier] = useState<CuisineTier>("scavenge");

  const grouped = useMemo(() => {
    return SLOTS.map((slot) => ({
      slot,
      recipes: getRecipesBySlot(selectedTier, slot.key),
    })).filter((g) => g.recipes.length > 0);
  }, [selectedTier]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.text }]}>Recipe Gallery</Text>
      </View>

      {/* Tier pills */}
      <View style={styles.tierRow}>
        {TIERS.map((t) => {
          const active = t.key === selectedTier;
          return (
            <Pressable
              key={t.key}
              onPress={() => setSelectedTier(t.key)}
              style={[
                styles.tierPill,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.tierLabel,
                  { color: active ? theme.colors.primaryText : theme.colors.muted },
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: insets.bottom + 40 }}
      >
        {grouped.map(({ slot, recipes }) => (
          <View key={slot.key} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {slot.label}
            </Text>
            <View style={styles.grid}>
              {recipes.map((recipe, idx) => (
                <View key={recipe.id} style={styles.gridItem}>
                  <RecipeCard
                    recipe={recipe}
                    onPress={() =>
                      router.push({
                        pathname: "/meals/recipe",
                        params: { recipeId: recipe.id },
                      })
                    }
                  />
                </View>
              ))}
              {/* If odd number of recipes, add spacer for even grid */}
              {recipes.length % 2 !== 0 && <View style={styles.gridItem} />}
            </View>
          </View>
        ))}

        {grouped.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={48} color={theme.colors.muted} />
            <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
              No recipes found for this tier.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    flex: 1,
    ...typography.heading,
  },
  tierRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  tierPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  tierLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.subheading,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  gridItem: {
    width: "48%",
    flexGrow: 1,
  },
  empty: {
    alignItems: "center",
    gap: spacing.md,
    marginTop: 80,
  },
  emptyText: {
    ...typography.body,
    textAlign: "center",
  },
});

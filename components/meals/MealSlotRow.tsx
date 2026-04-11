import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import { recipeMap } from "../../src/data/recipeCatalog";
import type { MealSlot } from "../../src/data/mealTypes";

type Props = {
  slot: MealSlot;
  recipeId: string;
  onPress: () => void;
  onLongPress?: () => void;
  logged?: boolean;
};

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack1: "Snack 1",
  snack2: "Snack 2",
};

function MealSlotRowInner({ slot, recipeId, onPress, onLongPress, logged }: Props) {
  const { theme } = useAppTheme();
  const recipe = recipeMap.get(recipeId);

  if (!recipe) return null;

  return (
    <Pressable
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={`${SLOT_LABELS[slot]}: ${recipe.name}`}
      accessibilityRole="button"
    >
      <View style={styles.slotCol}>
        <Text style={[styles.slotLabel, { color: theme.colors.muted }]}>
          {SLOT_LABELS[slot]}
        </Text>
      </View>

      <View style={styles.recipeCol}>
        <View style={styles.recipeLine}>
          <Text style={styles.flag}>{recipe.flag}</Text>
          <Text
            style={[styles.recipeName, { color: theme.colors.text }]}
          >
            {recipe.name}
          </Text>
        </View>
        <Text style={[styles.calText, { color: theme.colors.muted }]}>
          {recipe.macros.calories} cal
        </Text>
      </View>

      <View style={styles.trailCol}>
        {logged && (
          <Ionicons
            name="checkmark-circle"
            size={18}
            color={theme.colors.success}
            style={styles.checkIcon}
          />
        )}
        <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
      </View>
    </Pressable>
  );
}

export const MealSlotRow = React.memo(MealSlotRowInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  slotCol: {
    width: 72,
  },
  slotLabel: {
    fontSize: typography.small.fontSize,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  recipeCol: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  recipeLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  flag: {
    fontSize: 16,
  },
  recipeName: {
    fontSize: typography.body.fontSize,
    fontWeight: "600",
    flexShrink: 1,
  },
  calText: {
    fontSize: typography.caption.fontSize,
    marginTop: 2,
  },
  trailCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  checkIcon: {
    marginRight: 2,
  },
});

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, typography } from "../../lib/theme";
import { Card } from "../Card";
import { TierBadge } from "./TierBadge";
import type { Recipe } from "../../src/data/mealTypes";

type Props = {
  recipe: Recipe;
  onPress: () => void;
  logged?: boolean;
};

function RecipeCardInner({ recipe, onPress, logged }: Props) {
  const { theme } = useAppTheme();

  return (
    <Card onPress={onPress}>
      <View style={styles.content}>
        {logged && (
          <View style={styles.checkOverlay}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
          </View>
        )}
        <Text style={styles.flag}>{recipe.flag}</Text>
        <Text
          style={[styles.name, { color: theme.colors.text }]}
          numberOfLines={2}
        >
          {recipe.name}
        </Text>
        <Text
          style={[styles.subtitle, { color: theme.colors.muted }]}
          numberOfLines={1}
        >
          {recipe.subtitle}
        </Text>
        <Text style={[styles.macroText, { color: theme.colors.muted }]}>
          {recipe.macros.calories} cal{" \u00B7 "}
          {recipe.macros.protein}g protein
        </Text>
        <View style={styles.badgeRow}>
          <TierBadge tier={recipe.tier} />
          {recipe.cuisineBadge ? (
            <Text style={[styles.cuisineLabel, { color: theme.colors.muted }]}>
              {recipe.cuisineBadge}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

export const RecipeCard = React.memo(RecipeCardInner);

const styles = StyleSheet.create({
  content: {
    gap: spacing.xs,
  },
  flag: {
    fontSize: 32,
  },
  name: {
    fontSize: typography.subheading.fontSize,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: typography.small.fontSize,
    fontStyle: "italic",
  },
  macroText: {
    fontSize: typography.small.fontSize,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cuisineLabel: {
    fontSize: typography.caption.fontSize,
  },
  checkOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 1,
  },
});

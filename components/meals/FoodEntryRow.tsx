import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { FoodLogEntry } from "../../src/data/mealTypes";

type Props = {
  entry: FoodLogEntry;
  onDelete: () => void;
};

function FoodEntryRowInner({ entry, onDelete }: Props) {
  const { theme } = useAppTheme();
  const { macros } = entry;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text style={styles.flag}>
        {entry.flag || "\u{1F374}"}
      </Text>

      <View style={styles.infoCol}>
        <Text
          style={[styles.name, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {entry.name}
        </Text>
        <Text style={[styles.macroText, { color: theme.colors.muted }]}>
          {macros.calories}cal{" \u00B7 "}
          {macros.protein}gP{" \u00B7 "}
          {macros.carbs}gC{" \u00B7 "}
          {macros.fat}gF
        </Text>
      </View>

      <Pressable
        onPress={onDelete}
        hitSlop={12}
        style={styles.deleteBtn}
      >
        <Ionicons name="close-circle" size={22} color={theme.colors.danger} />
      </Pressable>
    </View>
  );
}

export const FoodEntryRow = React.memo(FoodEntryRowInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  flag: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: typography.body.fontSize,
    fontWeight: "600",
  },
  macroText: {
    fontSize: typography.caption.fontSize,
  },
  deleteBtn: {
    marginLeft: spacing.sm,
  },
});

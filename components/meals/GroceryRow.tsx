import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { GroceryItem } from "../../src/data/mealTypes";

type Props = {
  item: GroceryItem;
  onToggle: () => void;
};

function GroceryRowInner({ item, onToggle }: Props) {
  const { theme } = useAppTheme();
  const checked = item.checked;

  return (
    <Pressable
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          borderColor: checked ? theme.colors.success + "40" : theme.colors.border,
          opacity: checked ? 0.6 : 1,
        },
      ]}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${item.name}, ${item.quantity}`}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: checked ? theme.colors.success : theme.colors.muted + "60",
            backgroundColor: checked ? theme.colors.success + "20" : "transparent",
          },
        ]}
      >
        {checked && (
          <Ionicons name="checkmark" size={13} color={theme.colors.success} />
        )}
      </View>

      <View style={styles.nameCol}>
        <Text
          style={[
            styles.name,
            { color: checked ? theme.colors.muted : theme.colors.text },
            checked && styles.strikethrough,
          ]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {item.substitution ? (
          <Text
            style={[styles.substitution, { color: theme.colors.accent }]}
            numberOfLines={1}
          >
            Sub: {item.substitution}
          </Text>
        ) : null}
        {item.usedIn ? (
          <Text
            style={[styles.usedIn, { color: theme.colors.muted }]}
            numberOfLines={2}
          >
            {item.usedIn}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.qtyBadge,
          {
            backgroundColor: checked ? theme.colors.success + "15" : theme.colors.border + "60",
            borderColor: checked ? theme.colors.success + "40" : theme.colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.qtyText,
            { color: checked ? theme.colors.success : theme.colors.muted },
          ]}
        >
          {item.quantity}
        </Text>
      </View>
    </Pressable>
  );
}

export const GroceryRow = React.memo(GroceryRowInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  nameCol: {
    flex: 1,
  },
  name: {
    fontSize: typography.body.fontSize,
    fontWeight: "600",
  },
  substitution: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
    fontStyle: "italic",
  },
  usedIn: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  strikethrough: {
    textDecorationLine: "line-through",
  },
  qtyBadge: {
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    minWidth: 32,
    alignItems: "center",
  },
  qtyText: {
    fontSize: typography.caption.fontSize,
    fontWeight: "700",
  },
});

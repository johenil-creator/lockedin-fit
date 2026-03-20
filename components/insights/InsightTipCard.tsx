import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { InsightTip } from "../../lib/types";

type Props = {
  tip: InsightTip;
};

function InsightTipCardInner({ tip }: Props) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Ionicons name="bulb-outline" size={20} color="#FFD700" />
      <Text
        style={[
          typography.body,
          { color: theme.colors.text, flex: 1, marginLeft: spacing.sm },
        ]}
      >
        {tip.text}
      </Text>
    </View>
  );
}

export const InsightTipCard = React.memo(InsightTipCardInner);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
});

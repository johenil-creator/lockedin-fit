import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "../../contexts/ThemeContext";
import { LockePreview } from "./LockePreview";
import { FangsDisplay } from "./FangsDisplay";
import { spacing, typography, radius } from "../../lib/theme";
import { impact, ImpactStyle } from "../../lib/haptics";
import type { LockeCustomization } from "../../lib/types";

type Props = {
  customization: LockeCustomization;
  fangsBalance: number;
};

function LockeStudioCardInner({ customization, fangsBalance }: Props) {
  const { theme } = useAppTheme();
  const router = useRouter();

  function handlePress() {
    impact(ImpactStyle.Light);
    router.push("/locke-studio");
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <Text style={[typography.subheading, { color: theme.colors.text }]}>
          Avatar Studio
        </Text>
        <FangsDisplay balance={fangsBalance} showInfo />
      </View>

      <View style={styles.previewSection}>
        <LockePreview size={120} customization={customization} />
      </View>

      <Pressable
        style={[styles.button, { backgroundColor: theme.colors.primary }]}
        onPress={handlePress}
      >
        <Text style={[styles.buttonText, { color: theme.colors.primaryText }]}>
          Customize
        </Text>
      </Pressable>
    </View>
  );
}

export const LockeStudioCard = React.memo(LockeStudioCardInner);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  previewSection: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  button: {
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});

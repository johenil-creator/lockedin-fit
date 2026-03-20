import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, typography, radius } from "../../lib/theme";
import type { AuraCosmeticItem, ElementalEffect } from "../../lib/types";

const AURA_COLORS: Record<ElementalEffect, string> = {
  fire: "#FF4500",
  frost: "#58A6FF",
  lightning: "#FFD60A",
  shadow: "#6A0DAD",
  nature: "#228B22",
};

type Props = {
  catalog: AuraCosmeticItem[];
  ownedAuras: string[];
  activeEffect?: ElementalEffect;
  onPurchase: (auraId: string) => void;
  onEquip: (effect: ElementalEffect) => void;
};

function AuraSelectorInner({ catalog, ownedAuras, activeEffect, onPurchase, onEquip }: Props) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.container}>
      <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
        Aura Effects
      </Text>
      <View style={styles.grid}>
        {catalog.map((aura) => {
          const owned = ownedAuras.includes(aura.id);
          const isActive = activeEffect === aura.effect;

          return (
            <Pressable
              key={aura.id}
              style={[
                styles.gridItem,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: isActive ? AURA_COLORS[aura.effect] : theme.colors.border,
                  borderWidth: isActive ? 2 : 1,
                },
              ]}
              onPress={() => (owned ? onEquip(aura.effect) : onPurchase(aura.id))}
            >
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: AURA_COLORS[aura.effect],
                    shadowColor: AURA_COLORS[aura.effect],
                    shadowOpacity: 0.6,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 0 },
                  },
                ]}
              />
              <Text
                style={[
                  typography.caption,
                  { color: theme.colors.text, fontWeight: "600", textAlign: "center" },
                ]}
                numberOfLines={1}
              >
                {aura.name}
              </Text>
              {owned ? (
                <Text style={[typography.caption, { color: theme.colors.success, fontSize: 10 }]}>
                  {isActive ? "Active" : "Owned"}
                </Text>
              ) : (
                <Text style={[styles.priceText, { color: "#FFD700" }]}>
                  {"\u26A1"} {aura.price}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const AuraSelector = React.memo(AuraSelectorInner);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  gridItem: {
    width: "31%",
    aspectRatio: 0.85,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 6,
  },
  priceText: {
    fontSize: 11,
    fontWeight: "700",
  },
});

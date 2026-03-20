import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, typography, radius } from "../../lib/theme";
import type { ArmorTier } from "../../lib/types";

const ARMOR_TIERS: { tier: ArmorTier; label: string; icon: string; rank: string }[] = [
  { tier: "none",      label: "No Armor",   icon: "\u2014",              rank: "Runt" },
  { tier: "light",     label: "Light",      icon: "\uD83E\uDDE5",       rank: "Scout" },
  { tier: "medium",    label: "Medium",     icon: "\uD83D\uDEE1\uFE0F", rank: "Hunter" },
  { tier: "heavy",     label: "Heavy",      icon: "\u2694\uFE0F",       rank: "Sentinel" },
  { tier: "legendary", label: "Legendary",  icon: "\uD83D\uDC8E",       rank: "Alpha" },
  { tier: "mythic",    label: "Mythic",     icon: "\uD83D\uDD31",       rank: "Apex" },
];

type Props = {
  currentTier: ArmorTier;
  activeTier: ArmorTier;
  onSelect: (tier: ArmorTier) => void;
};

function ArmorDisplayInner({ currentTier, activeTier, onSelect }: Props) {
  const { theme } = useAppTheme();

  const maxIndex = ARMOR_TIERS.findIndex((t) => t.tier === currentTier);

  return (
    <View style={styles.container}>
      <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: 4 }]}>
        Armor
      </Text>
      <Text style={[typography.caption, { color: theme.colors.muted, marginBottom: spacing.md }]}>
        Armor unlocks automatically as you rank up from workouts.
      </Text>
      {ARMOR_TIERS.map((armor, index) => {
        const isActive = armor.tier === activeTier;
        const isUnlocked = index <= maxIndex;
        const isLocked = !isUnlocked;

        return (
          <Pressable
            key={armor.tier}
            style={[
              styles.row,
              {
                backgroundColor: isActive ? theme.colors.mutedBg : theme.colors.surface,
                borderColor: isActive ? theme.colors.primary : theme.colors.border,
                borderWidth: isActive ? 2 : 1,
                opacity: isLocked ? 0.4 : 1,
              },
            ]}
            onPress={() => isUnlocked && onSelect(armor.tier)}
            disabled={isLocked}
          >
            <Text style={styles.icon}>{armor.icon}</Text>
            <View style={styles.labelContainer}>
              <Text
                style={[
                  typography.body,
                  {
                    color: isActive ? theme.colors.primary : theme.colors.text,
                    fontWeight: isActive ? "700" : "400",
                  },
                ]}
              >
                {armor.label}
              </Text>
              {isActive && (
                <Text style={[typography.caption, { color: theme.colors.success }]}>
                  Equipped
                </Text>
              )}
              {isLocked && (
                <Text style={[typography.caption, { color: theme.colors.muted }]}>
                  Reach {armor.rank} to unlock
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export const ArmorDisplay = React.memo(ArmorDisplayInner);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.md,
  },
  icon: {
    fontSize: 24,
  },
  labelContainer: {
    flex: 1,
  },
});

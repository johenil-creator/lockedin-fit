import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/ThemeContext";
import { radius } from "../lib/theme";
import type { RankLevel } from "../lib/types";

const RANK_ICONS: Record<RankLevel, keyof typeof Ionicons.glyphMap> = {
  Runt:     "paw-outline",
  Scout:    "eye-outline",
  Stalker:  "footsteps-outline",
  Hunter:   "locate-outline",
  Sentinel: "shield-half-outline",
  Alpha:    "star-outline",
  Apex:     "diamond-outline",
};

type Props = {
  rank: RankLevel;
  /** Show the icon + name (default) or just the icon */
  compact?: boolean;
};

export function RankBadge({ rank, compact = false }: Props) {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: theme.colors.mutedBg, borderColor: theme.colors.border },
      ]}
    >
      <Ionicons name={RANK_ICONS[rank]} size={14} color={theme.colors.primary} />
      {!compact && (
        <Text style={[styles.label, { color: theme.colors.text }]}>{rank}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
});

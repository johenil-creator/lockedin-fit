import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../contexts/ThemeContext";
import { radius } from "../lib/theme";
import type { RankLevel } from "../lib/types";

// Rank-specific icon characters (text-based, no image assets needed)
const RANK_ICONS: Record<RankLevel, string> = {
  Runt:     "·",
  Scout:    "›",
  Stalker:  "»",
  Hunter:   "◆",
  Sentinel: "▲",
  Alpha:    "★",
  Apex:     "⬡",
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
      <Text style={[styles.icon, { color: theme.colors.primary }]}>
        {RANK_ICONS[rank]}
      </Text>
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
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  icon:  { fontSize: 13, fontWeight: "700" },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
});

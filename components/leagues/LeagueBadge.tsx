import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { radius } from "../../lib/theme";
import type { RankLevel } from "../../lib/types";

const TIER_ICONS: Record<RankLevel, string> = {
  Runt:        "·",
  Scout:       "›",
  Stalker:     "»",
  Hunter:      "◆",
  Sentinel:    "▲",
  Alpha:       "★",
  Apex:        "⬡",
  Apex_Bronze: "⬡",
  Apex_Silver: "⬡",
  Apex_Gold:   "⬡",
};

const TIER_COLORS: Record<RankLevel, string> = {
  Runt:        "#7D8590",
  Scout:       "#58A6FF",
  Stalker:     "#A371F7",
  Hunter:      "#F0883E",
  Sentinel:    "#F85149",
  Alpha:       "#FFD60A",
  Apex:        "#00875A",
  Apex_Bronze: "#CD7F32",
  Apex_Silver: "#C0C0C0",
  Apex_Gold:   "#FFD700",
};

type Props = {
  tier: string;
  groupNumber?: number;
};

export function LeagueBadge({ tier, groupNumber }: Props) {
  const { theme } = useAppTheme();
  const rank = tier as RankLevel;
  const color = TIER_COLORS[rank] ?? theme.colors.primary;

  return (
    <View style={[styles.container, { borderColor: color + "40" }]}>
      <View style={[styles.iconCircle, { backgroundColor: color + "20" }]}>
        <Text style={[styles.icon, { color }]}>
          {TIER_ICONS[rank] ?? "·"}
        </Text>
      </View>
      <View>
        <Text style={[styles.tierName, { color }]}>
          {tier.replace(/_/g, " ")} League
        </Text>
        {groupNumber != null && (
          <Text style={[styles.group, { color: theme.colors.muted }]}>
            Group {groupNumber}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  icon: {
    fontSize: 18,
    fontWeight: "700",
  },
  tierName: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  group: {
    fontSize: 12,
    marginTop: 1,
  },
});

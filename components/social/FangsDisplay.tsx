import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { InfoTooltip } from "../InfoTooltip";
import { radius } from "../../lib/theme";

const FANGS_ICON = require("../../assets/fangs_icon.png");

type Props = {
  balance: number;
  size?: "sm" | "md";
  showInfo?: boolean;
};

function FangsDisplayInner({ balance, size = "md", showInfo = false }: Props) {
  const { theme } = useAppTheme();
  const isSmall = size === "sm";

  return (
    <View style={styles.row}>
      <View style={[
        styles.pill,
        {
          backgroundColor: "#FFD70020",
          borderColor: "#FFD70040",
          paddingVertical: isSmall ? 3 : 5,
          paddingHorizontal: isSmall ? 8 : 12,
        },
      ]}>
        <Image
          source={FANGS_ICON}
          style={{
            width: isSmall ? 14 : 18,
            height: isSmall ? 14 : 18,
            tintColor: "#FFD700",
          }}
          resizeMode="contain"
        />
        <Text style={[
          styles.value,
          {
            color: "#FFD700",
            fontSize: isSmall ? 12 : 14,
          },
        ]}>
          {balance.toLocaleString()}
        </Text>
      </View>
      {showInfo && (
        <InfoTooltip
          term="Fangs"
          definition="Fangs are your in-app currency. Earn them by completing workouts, hitting streaks, and finishing quests. Spend them in Locke Studio to unlock cosmetics for your wolf."
        />
      )}
    </View>
  );
}

export const FangsDisplay = React.memo(FangsDisplayInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 4,
  },
  value: {
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
